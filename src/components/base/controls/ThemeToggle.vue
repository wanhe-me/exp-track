<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

type Theme = 'light' | 'dark'

const STORAGE_KEY = 'exp-track-theme'

const theme = ref<Theme>('light')

const isDark = computed(() => theme.value === 'dark')

const applyTheme = (value: Theme): void => {
  theme.value = value
  document.documentElement.setAttribute('data-theme', value)
  localStorage.setItem(STORAGE_KEY, value)
}

const toggle = (): void => {
  applyTheme(isDark.value ? 'light' : 'dark')
}

const syncSystemTheme = (event?: MediaQueryListEvent | MediaQueryList): void => {
  const prefersDark = event
    ? 'matches' in event && event.matches
    : window.matchMedia('(prefers-color-scheme: dark)').matches
  applyTheme(prefersDark ? 'dark' : 'light')
}

onMounted(() => {
  const saved = localStorage.getItem(STORAGE_KEY) as Theme | null
  if (saved === 'light' || saved === 'dark') {
    applyTheme(saved)
    return
  }

  syncSystemTheme(window.matchMedia('(prefers-color-scheme: dark)'))

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaQuery.addEventListener('change', syncSystemTheme)
})
</script>

<template>
  <button
    type="button"
    class="theme-toggle"
    :aria-label="isDark ? '切换到浅色模式' : '切换到深色模式'"
    :title="isDark ? '切换到浅色模式' : '切换到深色模式'"
    @click="toggle"
  >
    <span class="icon-wrapper" :class="{ 'is-dark': isDark }">
      <svg v-if="isDark" class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
      </svg>
      <svg v-else class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2" />
        <path d="M12 20v2" />
        <path d="m4.93 4.93 1.41 1.41" />
        <path d="m17.66 17.66 1.41 1.41" />
        <path d="M2 12h2" />
        <path d="M20 12h2" />
        <path d="m6.34 17.66-1.41 1.41" />
        <path d="m19.07 4.93-1.41 1.41" />
      </svg>
    </span>
  </button>
</template>

<style scoped>
.theme-toggle {
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

.theme-toggle:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background-color: var(--color-bg-hover);
}

.theme-toggle:focus-visible {
  outline: none;
  box-shadow: var(--shadow-focus);
}

.icon-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform var(--transition-base);
}

.icon-wrapper.is-dark {
  transform: rotate(-15deg);
}

.icon {
  width: 1.125rem;
  height: 1.125rem;
}
</style>
