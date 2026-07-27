<script setup lang="ts">
defineProps<{
  name: string
}>()
</script>

<template>
  <span class="category-tag">{{ name }}</span>
</template>

<style scoped>
.category-tag {
  display: inline-flex;
  align-items: center;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  background-color: var(--color-primary-soft);
  color: var(--color-primary);
  font-size: var(--font-size-xs);
  line-height: 1;
  white-space: nowrap;
}
</style>
