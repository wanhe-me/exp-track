<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
  modelValue?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: []
  cancel: []
}>()

const visible = computed({
  get: () => props.modelValue ?? false,
  set: (val: boolean) => emit('update:modelValue', val),
})

const open = (): void => {
  visible.value = true
}

const close = (): void => {
  visible.value = false
}

const onConfirm = (): void => {
  emit('confirm')
  close()
}

const onCancel = (): void => {
  emit('cancel')
  close()
}

defineExpose({ open, close })
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="confirm-overlay" @click.self="onCancel">
      <div class="confirm-dialog glass">
        <h3 v-if="props.title" class="confirm-title">{{ props.title }}</h3>
        <p class="confirm-message">{{ props.message }}</p>
        <div class="confirm-actions">
          <button class="btn" @click="onCancel">
            {{ props.cancelText ?? '取消' }}
          </button>
          <button
            class="btn"
            :class="props.danger ? 'btn-danger' : 'btn-primary'"
            @click="onConfirm"
          >
            {{ props.confirmText ?? '确认' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.confirm-overlay {
  position: fixed;
  inset: 0;
  background-color: var(--color-bg-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.confirm-dialog {
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  width: 25rem;
  max-width: calc(100vw - var(--space-8));
}

.confirm-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  margin-bottom: var(--space-3);
}

.confirm-message {
  font-size: var(--font-size-base);
  color: var(--color-text-secondary);
  line-height: var(--line-height-base);
  margin-bottom: var(--space-6);
}

.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
}
</style>
