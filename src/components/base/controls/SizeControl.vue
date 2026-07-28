<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { UI_SCALE_PRESETS, useSettingsStore } from '@/stores/settings'

const settingsStore = useSettingsStore()
const open = ref(false)

const select = (value: (typeof UI_SCALE_PRESETS)[number]['value']): void => {
  settingsStore.setUiScale(value)
  open.value = false
}

const handleOutsideClick = (event: MouseEvent): void => {
  if (!open.value) return
  const target = event.target as HTMLElement | null
  if (target?.closest('.size-control')) return
  open.value = false
}

onMounted(() => {
  document.addEventListener('click', handleOutsideClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleOutsideClick)
})
</script>

<template>
  <div class="size-control">
    <button
      type="button"
      class="size-trigger"
      aria-label="调整界面尺寸"
      title="调整界面尺寸"
      :aria-expanded="open"
      @click="open = !open"
    >
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M4 7h6" />
        <path d="M4 12h10" />
        <path d="M4 17h8" />
        <path d="M14 7h6" />
        <path d="M16 12h4" />
        <path d="M18 17h2" />
      </svg>
    </button>

    <div v-if="open" class="size-popover" role="menu">
      <div class="popover-title">界面尺寸</div>
      <button
        v-for="preset in UI_SCALE_PRESETS"
        :key="preset.key"
        type="button"
        class="size-option"
        :class="{ active: settingsStore.uiScale === preset.value }"
        role="menuitem"
        @click="select(preset.value)"
      >
        <span class="option-label">{{ preset.label }}</span>
        <span class="option-value">{{ preset.value.toFixed(2) }}x</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.size-control {
  position: relative;
}

.size-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-bg-card);
  color: var(--color-text-secondary);
  transition:
    background-color var(--transition-fast),
    border-color var(--transition-fast),
    color var(--transition-fast),
    box-shadow var(--transition-fast);
}

.size-trigger:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background-color: var(--color-bg-hover);
}

.size-trigger:focus-visible {
  outline: none;
  box-shadow: var(--shadow-focus);
}

.icon {
  width: 1.125rem;
  height: 1.125rem;
}

.size-popover {
  position: absolute;
  top: calc(100% + var(--space-2));
  right: 0;
  min-width: 10rem;
  padding: var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-bg-elevated);
  box-shadow: var(--shadow-lg);
  z-index: 200;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.popover-title {
  padding: var(--space-2) var(--space-3) var(--space-1);
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.size-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) var(--space-3);
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  text-align: left;
  transition: background-color var(--transition-fast);
}

.size-option:hover {
  background-color: var(--color-bg-hover);
}

.size-option.active {
  background-color: var(--color-primary-soft);
  color: var(--color-primary);
  font-weight: 500;
}

.option-value {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.size-option.active .option-value {
  color: var(--color-primary);
}
</style>