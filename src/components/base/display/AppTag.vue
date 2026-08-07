<script setup lang="ts">
import { computed } from 'vue'
import type { TagVariant } from '../form/types'

const props = withDefaults(
  defineProps<{
    variant?: TagVariant
    size?: 'sm' | 'md'
    closable?: boolean
    rounded?: boolean
  }>(),
  {
    variant: 'default',
    size: 'md',
    closable: false,
    rounded: false,
  },
)

const emit = defineEmits<{
  close: [event: MouseEvent]
}>()

const tagClass = computed(() => [
  'app-tag',
  `tag--${props.variant}`,
  `tag--${props.size}`,
  { 'tag--rounded': props.rounded },
])

const handleClose = (event: MouseEvent): void => {
  emit('close', event)
}
</script>

<template>
  <span :class="tagClass">
    <slot />
    <button
      v-if="closable"
      type="button"
      class="tag-close"
      aria-label="关闭"
      @click="handleClose"
    >
      <FaIcon icon="xmark" />
    </button>
  </span>
</template>

<style scoped>
.app-tag {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  min-height: var(--size-badge-height);
  padding: 0 var(--space-2);
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
}

.tag--rounded {
  border-radius: var(--radius-full);
}

/* ---- 尺寸 ---- */
.tag--sm {
  min-height: 1.125rem;
  padding: 0 var(--space-1);
  font-size: 0.6875rem;
}

/* ---- 颜色变体 ---- */
.tag--default {
  background-color: var(--color-bg-hover);
  border-color: var(--color-border);
  color: var(--color-text-secondary);
}

.tag--primary {
  background-color: var(--color-primary-soft);
  color: var(--color-primary);
}

.tag--success {
  background-color: var(--color-status-sufficient-bg);
  color: var(--color-status-sufficient);
}

.tag--warning {
  background-color: var(--color-status-soon30-bg);
  color: var(--color-status-soon30);
}

.tag--danger {
  background-color: var(--color-status-expired-bg);
  color: var(--color-status-expired);
}

/* ---- 关闭按钮 ---- */
.tag-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 0.875rem;
  height: 0.875rem;
  margin-right: calc(var(--space-1) * -1);
  border: none;
  border-radius: var(--radius-full);
  background: transparent;
  color: inherit;
  font-size: 0.625rem;
  cursor: pointer;
  opacity: 0.7;
  transition:
    background-color var(--transition-fast),
    opacity var(--transition-fast);
}

.tag-close:hover {
  opacity: 1;
  background-color: rgba(0, 0, 0, 0.08);
}
</style>
