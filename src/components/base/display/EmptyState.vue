<script setup lang="ts">
defineProps<{
  title?: string
  description?: string
}>()
</script>

<template>
  <div class="empty-state">
    <div class="empty-icon">
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
        <rect
          x="12" y="14" width="40" height="36" rx="6"
          stroke="var(--color-text-disabled)" stroke-width="2"
        />
        <line
          x1="12" y1="26" x2="52" y2="26"
          stroke="var(--color-text-disabled)" stroke-width="2"
        />
        <circle cx="20" cy="20" r="2" fill="var(--color-text-disabled)" />
        <circle cx="26" cy="20" r="2" fill="var(--color-text-disabled)" />
      </svg>
    </div>
    <p v-if="title" class="empty-title">{{ title }}</p>
    <p v-if="description" class="empty-desc">{{ description }}</p>
    <slot />
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-12) var(--space-6);
  text-align: center;
}

.empty-icon {
  margin-bottom: var(--space-4);
  opacity: 0.5;
}

.empty-title {
  font-size: var(--font-size-md);
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: var(--space-2);
}

.empty-desc {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  line-height: var(--line-height-base);
}
</style>
