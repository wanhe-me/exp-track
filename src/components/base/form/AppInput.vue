<script setup lang="ts">
import { computed, ref } from 'vue'
import type { FormSize } from './types'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    modelValue?: string | number
    type?: string
    placeholder?: string
    disabled?: boolean
    readonly?: boolean
    size?: FormSize
    label?: string
    hint?: string
    error?: string
    required?: boolean
    clearable?: boolean
    name?: string
    maxlength?: number | string
    step?: number | string
    min?: number | string
    max?: number | string
  }>(),
  {
    modelValue: '',
    type: 'text',
    placeholder: '',
    disabled: false,
    readonly: false,
    size: 'md',
    label: '',
    hint: '',
    error: '',
    required: false,
    clearable: false,
    name: '',
    maxlength: undefined,
    step: undefined,
    min: undefined,
    max: undefined,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  focus: [event: FocusEvent]
  blur: [event: FocusEvent]
  change: [event: Event]
  input: [event: Event]
  clear: []
}>()

const inputRef = ref<HTMLInputElement | null>(null)
const focused = ref(false)

const uid = `app-input-${Math.random().toString(36).slice(2, 9)}`

const sizeClass = computed(() => `ipt--${props.size}`)

const wrapperClass = computed(() => ({
  'ipt-wrapper': true,
  [sizeClass.value]: true,
  'ipt--focused': focused.value,
  'ipt--has-error': !!props.error,
  'ipt--disabled': props.disabled,
  'ipt--readonly': props.readonly,
  'ipt--has-value': props.modelValue !== '',
}))

const onInput = (event: Event): void => {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
  emit('input', event)
}

const onChange = (event: Event): void => {
  emit('change', event)
}

const onFocus = (event: FocusEvent): void => {
  focused.value = true
  emit('focus', event)
}

const onBlur = (event: FocusEvent): void => {
  focused.value = false
  emit('blur', event)
}

const handleClear = (): void => {
  emit('update:modelValue', '')
  emit('clear')
  inputRef.value?.focus()
}

const focus = (): void => {
  inputRef.value?.focus()
}

defineExpose({ focus })
</script>

<template>
  <div class="app-input">
    <label v-if="label" :for="uid" class="ipt-label">
      {{ label }}
      <span v-if="required" class="ipt-required">*</span>
    </label>

    <div :class="wrapperClass">
      <input
        :id="uid"
        ref="inputRef"
        v-bind="$attrs"
        :type="type"
        class="ipt"
        :value="modelValue"
        :name="name"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :required="required"
        :maxlength="maxlength"
        :step="step"
        :min="min"
        :max="max"
        @input="onInput"
        @change="onChange"
        @focus="onFocus"
        @blur="onBlur"
      />

      <span v-if="clearable && modelValue !== '' && !disabled && !readonly" class="ipt-suffix">
        <button
          type="button"
          class="ipt-clear"
          tabindex="-1"
          aria-label="清除"
          @mousedown.prevent
          @click="handleClear"
        >
          <FaIcon icon="xmark" />
        </button>
      </span>
    </div>

    <p v-if="error" class="ipt-error">{{ error }}</p>
    <p v-else-if="hint" class="ipt-hint">{{ hint }}</p>
  </div>
</template>

<style scoped>
.app-input {
  display: flex;
  flex-direction: column;
}

.ipt-label {
  display: block;
  margin-bottom: var(--space-2);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  font-weight: 500;
}

.ipt-required {
  color: var(--color-status-expired);
  margin-left: var(--space-1);
}

.ipt-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  min-height: var(--size-input-height);
  padding: 0 var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-bg-card);
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast),
    background-color var(--transition-fast);
}

.ipt-wrapper:hover:not(.ipt--disabled) {
  border-color: var(--color-primary);
}

.ipt-wrapper.ipt--focused {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-focus);
}

.ipt-wrapper.ipt--has-error {
  border-color: var(--color-status-expired);
}

.ipt-wrapper.ipt--has-error.ipt--focused {
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.22);
}

.ipt-wrapper.ipt--disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background-color: var(--color-bg-hover);
}

.ipt-wrapper.ipt--readonly {
  background: var(--color-bg-hover);
}

.ipt {
  flex: 1;
  width: 100%;
  min-width: 0;
  border: none;
  background: transparent;
  color: var(--color-text-primary);
  font-size: var(--font-size-base);
  line-height: var(--line-height-base);
  font-family: inherit;
  outline: none;
  padding: var(--space-2) 0;
}

.ipt::placeholder {
  color: var(--color-text-disabled);
}

.ipt:disabled {
  cursor: not-allowed;
}

.ipt[readonly] {
  color: var(--color-text-tertiary);
  cursor: default;
}

/* ---- 尺寸 ---- */
.ipt--sm {
  min-height: var(--size-btn-sm-height);
}

.ipt--sm .ipt {
  font-size: var(--font-size-xs);
  padding: var(--space-1) 0;
}

.ipt--lg {
  min-height: var(--size-btn-lg-height);
}

.ipt--lg .ipt {
  font-size: var(--font-size-md);
}

/* ---- 后缀清除按钮 ---- */
.ipt-suffix {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  padding-left: var(--space-2);
  color: var(--color-text-tertiary);
}

.ipt-clear {
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

.ipt-clear:hover {
  background-color: var(--color-bg-active);
  color: var(--color-text-primary);
}

/* ---- 错误 / 提示 ---- */
.ipt-error {
  margin-top: var(--space-1);
  font-size: var(--font-size-xs);
  color: var(--color-status-expired);
}

.ipt-hint {
  margin-top: var(--space-1);
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}
</style>
