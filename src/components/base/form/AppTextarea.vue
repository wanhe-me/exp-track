<script setup lang="ts">
import { computed, ref } from 'vue'
import type { FormSize } from './types'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    modelValue?: string
    placeholder?: string
    disabled?: boolean
    readonly?: boolean
    size?: FormSize
    rows?: number
    label?: string
    hint?: string
    error?: string
    required?: boolean
    name?: string
    maxlength?: number | string
  }>(),
  {
    modelValue: '',
    placeholder: '',
    disabled: false,
    readonly: false,
    size: 'md',
    rows: 3,
    label: '',
    hint: '',
    error: '',
    required: false,
    name: '',
    maxlength: undefined,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  focus: [event: FocusEvent]
  blur: [event: FocusEvent]
  change: [event: Event]
  input: [event: Event]
}>()

const textareaRef = ref<HTMLTextAreaElement | null>(null)
const focused = ref(false)

const uid = `app-textarea-${Math.random().toString(36).slice(2, 9)}`

const taClass = computed(() => [
  'ta',
  `ta--${props.size}`,
  {
    'ta--focused': focused.value,
    'ta--has-error': !!props.error,
  },
])

const onInput = (event: Event): void => {
  const target = event.target as HTMLTextAreaElement
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

const focus = (): void => {
  textareaRef.value?.focus()
}

defineExpose({ focus })
</script>

<template>
  <div class="app-textarea">
    <label v-if="label" :for="uid" class="ta-label">
      {{ label }}
      <span v-if="required" class="ta-required">*</span>
    </label>

    <textarea
      :id="uid"
      ref="textareaRef"
      v-bind="$attrs"
      :class="taClass"
      :value="modelValue"
      :name="name"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonly"
      :required="required"
      :rows="rows"
      :maxlength="maxlength"
      @input="onInput"
      @change="onChange"
      @focus="onFocus"
      @blur="onBlur"
    />

    <p v-if="error" class="ta-error">{{ error }}</p>
    <p v-else-if="hint" class="ta-hint">{{ hint }}</p>
  </div>
</template>

<style scoped>
.app-textarea {
  display: flex;
  flex-direction: column;
}

.ta-label {
  display: block;
  margin-bottom: var(--space-2);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  font-weight: 500;
}

.ta-required {
  color: var(--color-status-expired);
  margin-left: var(--space-1);
}

.ta {
  width: 100%;
  min-height: 5rem;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-bg-card);
  color: var(--color-text-primary);
  font-size: var(--font-size-base);
  line-height: var(--line-height-base);
  font-family: inherit;
  resize: vertical;
  outline: none;
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast),
    background-color var(--transition-fast);
}

.ta::placeholder {
  color: var(--color-text-disabled);
}

.ta:hover:not(:disabled):not([readonly]) {
  border-color: var(--color-primary);
}

.ta:focus,
.ta.ta--focused {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-focus);
}

.ta.ta--has-error {
  border-color: var(--color-status-expired);
}

.ta.ta--has-error:focus,
.ta.ta--has-error.ta--focused {
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.22);
}

.ta:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background-color: var(--color-bg-hover);
}

.ta[readonly] {
  background: var(--color-bg-hover);
  color: var(--color-text-tertiary);
  cursor: default;
}

/* ---- 尺寸 ---- */
.ta--sm {
  font-size: var(--font-size-xs);
}

.ta--lg {
  font-size: var(--font-size-md);
}

/* ---- 错误 / 提示 ---- */
.ta-error {
  margin-top: var(--space-1);
  font-size: var(--font-size-xs);
  color: var(--color-status-expired);
}

.ta-hint {
  margin-top: var(--space-1);
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}
</style>
