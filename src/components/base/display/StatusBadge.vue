<script setup lang="ts">
import type { SubscriptionStatus } from '@/types'
import { statusLabel } from '@/utils/status'

const props = defineProps<{
  status: SubscriptionStatus
}>()

const colorVar = (s: SubscriptionStatus): string => {
  const map: Record<SubscriptionStatus, string> = {
    expired: 'var(--color-status-expired)',
    soon7: 'var(--color-status-soon7)',
    soon30: 'var(--color-status-soon30)',
    sufficient: 'var(--color-status-sufficient)',
  }
  return map[s]
}

const bgVar = (s: SubscriptionStatus): string => {
  const map: Record<SubscriptionStatus, string> = {
    expired: 'var(--color-status-expired-bg)',
    soon7: 'var(--color-status-soon7-bg)',
    soon30: 'var(--color-status-soon30-bg)',
    sufficient: 'var(--color-status-sufficient-bg)',
  }
  return map[s]
}
</script>

<template>
  <span
    class="status-badge"
    :style="{
      color: colorVar(props.status),
      backgroundColor: bgVar(props.status),
    }"
  >
    {{ statusLabel(props.status) }}
  </span>
</template>

<style scoped>
.status-badge {
  display: inline-flex;
  align-items: center;
  min-height: var(--size-badge-height);
  padding: 0 var(--space-2);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
}
</style>
