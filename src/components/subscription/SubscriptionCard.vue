<script setup lang="ts">
import { computed } from 'vue'
import { QUOTA_CYCLE_LABELS, type Subscription } from '@exp-track/shared'
import { remainingDaysLabel } from '@/utils/date'
import StatusBadge from '@/components/base/display/StatusBadge.vue'
import CategoryTag from '@/components/base/display/CategoryTag.vue'

const props = defineProps<{
  subscription: Subscription
}>()

const emit = defineEmits<{
  detail: [subscription: Subscription]
}>()

const isQuota = computed(() => props.subscription.subscriptionType === 'quota')

const barPercent = computed(() => {
  const sub = props.subscription
  if (isQuota.value) {
    if (sub.quotaTotal == null || sub.quotaTotal <= 0) return 0
    const pct = ((sub.quotaRemaining ?? 0) / sub.quotaTotal) * 100
    return Math.max(0, Math.min(100, Math.round(pct * 100) / 100))
  }
  const start = new Date(sub.startDate).getTime()
  const end = new Date(sub.expireDate).getTime()
  const totalDays = (end - start) / (1000 * 60 * 60 * 24)
  if (totalDays <= 0) return 0
  const pct = (sub.remainingDays / totalDays) * 100
  return Math.max(0, Math.min(100, Math.round(pct * 100) / 100))
})

const barLabel = computed(() => {
  const sub = props.subscription
  if (isQuota.value) {
    if (!sub.quotaCycle) return `${barPercent.value}%`
    return `${QUOTA_CYCLE_LABELS[sub.quotaCycle] ?? ''}限额 ${barPercent.value}%`
  }
  return `剩余 ${barPercent.value}%`
})

const barColor = computed(() => {
  const p = barPercent.value
  if (p <= 25) return 'var(--color-status-expired)'
  if (p <= 50) return 'var(--color-status-soon7)'
  if (p <= 75) return 'var(--color-status-soon30)'
  return 'var(--color-status-sufficient)'
})
</script>

<template>
  <div class="sub-card" @click="emit('detail', props.subscription)">
    <div class="sub-card-header">
      <div class="sub-card-title-row">
        <h3 class="sub-card-name">{{ props.subscription.name }}</h3>
        <StatusBadge :status="props.subscription.status" />
      </div>
      <p v-if="props.subscription.note" class="sub-card-note">{{ props.subscription.note }}</p>
    </div>

    <div class="sub-card-meta">
      <span class="sub-card-remaining">{{ remainingDaysLabel(props.subscription.remainingDays) }}</span>
      <CategoryTag :name="props.subscription.categoryName || '未分类'" />
    </div>

    <div class="sub-card-bar">
      <div class="bar-track">
        <div class="bar-fill" :style="{ width: barPercent + '%', background: barColor }"></div>
      </div>
      <span class="bar-label">{{ barLabel }}</span>
    </div>
  </div>
</template>

<style scoped>
.sub-card {
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-light);
  background: var(--color-bg-card);
  padding: var(--space-4) var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  cursor: pointer;
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast);
}

.sub-card:hover {
  border-color: var(--color-border);
  box-shadow: var(--shadow-sm);
}

.sub-card-header {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.sub-card-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.sub-card-name {
  font-size: var(--font-size-md);
  font-weight: 600;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sub-card-note {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin: 0;
}

.sub-card-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.sub-card-remaining {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-text-secondary);
}

.sub-card-bar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.bar-track {
  flex: 1;
  height: 0.25rem;
  background: var(--color-bg-hover);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width var(--transition-fast), background var(--transition-fast);
}

.bar-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  white-space: nowrap;
}
</style>
