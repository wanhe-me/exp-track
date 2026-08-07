<script setup lang="ts">
import { computed } from 'vue'
import type { FormSize } from './types'

const props = withDefaults(
  defineProps<{
    variant?: 'default' | 'primary' | 'danger'
    size?: FormSize
    disabled?: boolean
    loading?: boolean
    block?: boolean
    type?: 'button' | 'submit' | 'reset'
    icon?: string
  }>(),
  {
    variant: 'default',
    size: 'md',
    disabled: false,
    loading: false,
    block: false,
    type: 'button',
    icon: '',
  },
)

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const isDisabled = computed(() => props.disabled || props.loading)

const variantClass = computed(() => `btn--${props.variant}`)
const sizeClass = computed(() => `btn--${props.size}`)

const handleClick = (event: MouseEvent): void => {
  if (isDisabled.value) {
    event.preventDefault()
    return
  }
  emit('click', event)
}
</script>

<template>
  <button
    :type="type"
    class="app-btn"
    :class="[variantClass, sizeClass, { 'btn--block': block, 'btn--loading': loading }]"
    :disabled="isDisabled"
    @click="handleClick"
  >
    <FaIcon v-if="loading" icon="circle-notch" class="btn-spinner" spin />
    <FaIcon v-else-if="icon" :icon="icon" fixed-width />
    <slot />
  </button>
</template>

<style scoped>
.app-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  height: var(--size-btn-height);
  padding: 0 var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-bg-card);
  color: var(--color-text-primary);
  font-size: var(--font-size-base);
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background-color var(--transition-fast),
    border-color var(--transition-fast),
    color var(--transition-fast),
    box-shadow var(--transition-fast),
    transform var(--transition-fast);
}

.app-btn:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background-color: var(--color-bg-hover);
}

.app-btn:active:not(:disabled) {
  transform: translateY(1px);
}

.app-btn:focus-visible {
  outline: none;
  box-shadow: var(--shadow-focus);
}

.app-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

/* ---- variant ---- */
.btn--primary {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
}

.btn--primary:hover:not(:disabled) {
  background-color: var(--color-primary-hover);
  border-color: var(--color-primary-hover);
  color: #fff;
}

.btn--primary:active:not(:disabled) {
  background-color: var(--color-primary-active);
  border-color: var(--color-primary-active);
}

.btn--danger {
  color: var(--color-status-expired);
  border-color: var(--color-status-expired);
  background-color: transparent;
}

.btn--danger:hover:not(:disabled) {
  background-color: var(--color-status-expired);
  color: #fff;
}

/* ---- size ---- */
.btn--sm {
  height: var(--size-btn-sm-height);
  padding: 0 var(--space-3);
  font-size: var(--font-size-sm);
}

.btn--lg {
  height: var(--size-btn-lg-height);
  padding: 0 var(--space-5);
  font-size: var(--font-size-md);
}

/* ---- block ---- */
.btn--block {
  width: 100%;
}

/* ---- loading spinner ---- */
.btn-spinner {
  width: 1em;
  height: 1em;
}
</style>
