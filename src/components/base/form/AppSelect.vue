<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { FormSize, SelectOption } from './types'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    modelValue?: string | number
    options: SelectOption[]
    placeholder?: string
    disabled?: boolean
    size?: FormSize
    label?: string
    hint?: string
    error?: string
    required?: boolean
    clearable?: boolean
    name?: string
  }>(),
  {
    modelValue: '',
    placeholder: '请选择',
    disabled: false,
    size: 'md',
    label: '',
    hint: '',
    error: '',
    required: false,
    clearable: false,
    name: '',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
  change: [value: string | number]
}>()

const isOpen = ref(false)
const focused = ref(false)
const activeIndex = ref(-1)
const triggerRef = ref<HTMLDivElement | null>(null)
const panelRef = ref<HTMLDivElement | null>(null)
const panelStyle = ref<Record<string, string>>({})

const uid = `app-select-${Math.random().toString(36).slice(2, 9)}`

const sizeClass = computed(() => `sel--${props.size}`)

const triggerClass = computed(() => [
  'sel-trigger',
  sizeClass.value,
  {
    'sel--focused': focused.value,
    'sel--has-error': !!props.error,
    'sel--disabled': props.disabled,
    'sel--has-value': displayLabel.value !== '',
    'sel--open': isOpen.value,
  },
])

const selectedOption = computed(() => props.options.find((o) => o.value === props.modelValue) ?? null)

const displayLabel = computed(() => selectedOption.value?.label ?? '')

/** 可选项（非 disabled）的索引集合 */
const enabledIndexes = computed(() => {
  const list: number[] = []
  props.options.forEach((o, i) => {
    if (!o.disabled) list.push(i)
  })
  return list
})

function clampActiveIndex(): void {
  if (activeIndex.value < 0 || props.options[activeIndex.value]?.disabled) {
    const sel = props.options.findIndex((o) => o.value === props.modelValue)
    if (sel >= 0 && !props.options[sel]?.disabled) {
      activeIndex.value = sel
    } else if (enabledIndexes.value.length > 0) {
      activeIndex.value = enabledIndexes.value[0] ?? -1
    } else {
      activeIndex.value = -1
    }
  }
}

/** 根据触发器位置计算面板定位 */
function updatePanelPosition(): void {
  if (!triggerRef.value) return
  const rect = triggerRef.value.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const panelEstHeight = Math.min(props.options.length * 2.25 + 0.5, 18.75) * 16

  let top = rect.bottom + 4
  let left = rect.left
  const width = rect.width

  if (top + panelEstHeight > viewportHeight) {
    top = rect.top - panelEstHeight - 4
    if (top < 0) top = 4
  }
  if (left + width > viewportWidth) {
    left = viewportWidth - width - 8
  }
  if (left < 0) left = 8

  panelStyle.value = {
    position: 'fixed',
    top: `${top}px`,
    left: `${left}px`,
    width: `${width}px`,
  }
}

function openPanel(): void {
  if (props.disabled) return
  clampActiveIndex()
  isOpen.value = true
  nextTick(() => {
    updatePanelPosition()
    scrollActiveIntoView()
  })
}

function closePanel(): void {
  isOpen.value = false
}

function togglePanel(): void {
  if (props.disabled) return
  if (isOpen.value) closePanel()
  else openPanel()
}

function selectOption(option: SelectOption): void {
  if (option.disabled) return
  emit('update:modelValue', option.value)
  emit('change', option.value)
  closePanel()
  triggerRef.value?.focus()
}

/** 键盘导航：在可选项间移动 */
function moveActive(direction: 1 | -1): void {
  const enabled = enabledIndexes.value
  if (enabled.length === 0) return
  const currentPos = enabled.indexOf(activeIndex.value)
  let nextPos = currentPos
  if (nextPos === -1) {
    nextPos = direction === 1 ? 0 : enabled.length - 1
  } else {
    nextPos = currentPos + direction
    if (nextPos < 0) nextPos = enabled.length - 1
    if (nextPos >= enabled.length) nextPos = 0
  }
  activeIndex.value = enabled[nextPos] ?? -1
  scrollActiveIntoView()
}

function scrollActiveIntoView(): void {
  nextTick(() => {
    const el = panelRef.value?.querySelector(`[data-idx="${activeIndex.value}"]`) as HTMLElement | null
    el?.scrollIntoView({ block: 'nearest' })
  })
}

function onTriggerKeydown(event: KeyboardEvent): void {
  if (props.disabled) return
  switch (event.key) {
    case 'Enter':
    case ' ':
      event.preventDefault()
      if (!isOpen.value) openPanel()
      break
    case 'Escape':
      closePanel()
      break
    case 'ArrowDown':
      event.preventDefault()
      if (!isOpen.value) {
        openPanel()
      } else {
        moveActive(1)
      }
      break
    case 'ArrowUp':
      event.preventDefault()
      if (!isOpen.value) {
        openPanel()
      } else {
        moveActive(-1)
      }
      break
  }
}

function onPanelKeydown(event: KeyboardEvent): void {
  switch (event.key) {
    case 'Enter':
      event.preventDefault()
      if (activeIndex.value >= 0) {
        const opt = props.options[activeIndex.value]
        if (opt) selectOption(opt)
      }
      break
    case 'Escape':
      event.preventDefault()
      closePanel()
      triggerRef.value?.focus()
      break
    case 'ArrowDown':
      event.preventDefault()
      moveActive(1)
      break
    case 'ArrowUp':
      event.preventDefault()
      moveActive(-1)
      break
  }
}

function handleClear(event: MouseEvent): void {
  event.stopPropagation()
  emit('update:modelValue', '')
  emit('change', '')
}

function handleClickOutside(event: MouseEvent): void {
  if (!isOpen.value) return
  const target = event.target as Node | null
  if (!target) return
  if (panelRef.value?.contains(target)) return
  if (triggerRef.value?.contains(target)) return
  closePanel()
}

function onFocus(): void {
  focused.value = true
}

function onBlur(): void {
  focused.value = false
}

// 面板打开时阻止 body 滚动溢出（可选轻量处理）
watch(isOpen, (open) => {
  if (open) clampActiveIndex()
})

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
  window.addEventListener('scroll', updatePanelPosition, true)
  window.addEventListener('resize', updatePanelPosition)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleClickOutside)
  window.removeEventListener('scroll', updatePanelPosition, true)
  window.removeEventListener('resize', updatePanelPosition)
})
</script>

<template>
  <div class="app-select">
    <label v-if="label" :for="uid" class="sel-label">
      {{ label }}
      <span v-if="required" class="sel-required">*</span>
    </label>

    <div
      :id="uid"
      ref="triggerRef"
      :class="triggerClass"
      role="combobox"
      tabindex="0"
      :aria-expanded="isOpen"
      aria-haspopup="listbox"
      :aria-label="label || placeholder"
      :aria-disabled="disabled"
      :aria-invalid="!!error"
      @click="togglePanel"
      @focus="onFocus"
      @blur="onBlur"
      @keydown="onTriggerKeydown"
    >
      <span class="sel-display" :class="{ 'sel-placeholder': !displayLabel }">
        {{ displayLabel || placeholder }}
      </span>

      <span class="sel-suffix">
        <button
          v-if="clearable && displayLabel !== '' && !disabled"
          type="button"
          class="sel-clear"
          tabindex="-1"
          aria-label="清除"
          @mousedown.prevent
          @click="handleClear"
        >
          <FaIcon icon="xmark" />
        </button>
        <FaIcon icon="chevron-down" class="sel-arrow" :class="{ 'sel-arrow--open': isOpen }" />
      </span>
    </div>

    <p v-if="error" class="sel-error">{{ error }}</p>
    <p v-else-if="hint" class="sel-hint">{{ hint }}</p>

    <Teleport to="body">
      <div
        v-if="isOpen"
        ref="panelRef"
        class="sel-panel"
        :style="panelStyle"
        role="listbox"
        @keydown="onPanelKeydown"
      >
        <button
          v-for="(opt, idx) in options"
          :key="idx"
          type="button"
          class="sel-option"
          :class="{
            'sel-option--selected': opt.value === modelValue,
            'sel-option--active': idx === activeIndex,
            'sel-option--disabled': opt.disabled,
          }"
          :data-idx="idx"
          role="option"
          :aria-selected="opt.value === modelValue"
          :aria-disabled="opt.disabled"
          :disabled="opt.disabled"
          @click="selectOption(opt)"
          @mouseenter="activeIndex = idx"
        >
          <span class="sel-option-label">{{ opt.label }}</span>
          <FaIcon v-if="opt.value === modelValue" icon="check" class="sel-option-check" />
        </button>
        <div v-if="options.length === 0" class="sel-empty">无选项</div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.app-select {
  display: flex;
  flex-direction: column;
}

.sel-label {
  display: block;
  margin-bottom: var(--space-2);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  font-weight: 500;
}

.sel-required {
  color: var(--color-status-expired);
  margin-left: var(--space-1);
}

/* ---- 触发器 ---- */
.sel-trigger {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  min-height: var(--size-input-height);
  padding: 0 var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-bg-card);
  color: var(--color-text-primary);
  cursor: pointer;
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast),
    background-color var(--transition-fast);
  outline: none;
}

.sel-trigger:hover:not(.sel--disabled) {
  border-color: var(--color-primary);
}

.sel-trigger.sel--focused,
.sel-trigger.sel--open {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-focus);
}

.sel-trigger.sel--has-error {
  border-color: var(--color-status-expired);
}

.sel-trigger.sel--has-error.sel--focused {
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.22);
}

.sel-trigger.sel--disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background-color: var(--color-bg-hover);
}

.sel-display {
  flex: 1;
  min-width: 0;
  font-size: var(--font-size-base);
  line-height: var(--line-height-base);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sel-placeholder {
  color: var(--color-text-disabled);
}

.sel-suffix {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  flex-shrink: 0;
  padding-left: var(--space-2);
  color: var(--color-text-tertiary);
}

.sel-arrow {
  transition: transform var(--transition-fast);
  font-size: 0.75rem;
}

.sel-arrow--open {
  transform: rotate(180deg);
}

.sel-clear {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.125rem;
  height: 1.125rem;
  border: none;
  border-radius: var(--radius-full);
  background: transparent;
  color: inherit;
  font-size: 0.75rem;
  cursor: pointer;
  transition: background-color var(--transition-fast), color var(--transition-fast);
}

.sel-clear:hover {
  background-color: var(--color-bg-active);
  color: var(--color-text-primary);
}

/* ---- 尺寸 ---- */
.sel--sm {
  min-height: var(--size-btn-sm-height);
}

.sel--sm .sel-display {
  font-size: var(--font-size-xs);
}

.sel--lg {
  min-height: var(--size-btn-lg-height);
}

.sel--lg .sel-display {
  font-size: var(--font-size-md);
}

/* ---- 错误 / 提示 ---- */
.sel-error {
  margin-top: var(--space-1);
  font-size: var(--font-size-xs);
  color: var(--color-status-expired);
}

.sel-hint {
  margin-top: var(--space-1);
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}
</style>

<!-- 面板经 Teleport 到 body，需非 scoped 样式 -->
<style>
.sel-panel {
  z-index: 1000;
  max-height: 18.75rem;
  overflow-y: auto;
  padding: var(--space-1);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-bg-elevated);
  box-shadow: var(--shadow-lg);
}

.sel-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  text-align: left;
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.sel-option:hover:not(.sel-option--disabled),
.sel-option--active {
  background-color: var(--color-bg-hover);
}

.sel-option--selected {
  color: var(--color-primary);
  font-weight: 500;
}

.sel-option--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.sel-option-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sel-option-check {
  flex-shrink: 0;
  font-size: 0.75rem;
}

.sel-empty {
  padding: var(--space-4) var(--space-3);
  text-align: center;
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
}
</style>
