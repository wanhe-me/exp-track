<script setup lang="ts">
import { computed } from 'vue'
import type { Subscription, SubscriptionView } from '@/types'
import { BILLING_CYCLE_LABELS, QUOTA_CYCLE_LABELS } from '@/types'
import { domainConfig } from '@/types'
import { formatDate, remainingDaysLabel } from '@/utils/date'
import StatusBadge from './base/display/StatusBadge.vue'
import CategoryTag from './base/display/CategoryTag.vue'

const props = defineProps<{
  subscription: Subscription
  view?: SubscriptionView
}>()

const emit = defineEmits<{
  edit: [subscription: Subscription]
  delete: [subscription: Subscription]
  archive: [subscription: Subscription]
  unarchive: [subscription: Subscription]
  restore: [subscription: Subscription]
}>()

const isQuota = computed(() => props.subscription.subscriptionType === 'quota')

const quotaPercent = computed(() => {
  const sub = props.subscription
  if (!isQuota.value || sub.quotaTotal == null || sub.quotaTotal <= 0) return 0
  const pct = ((sub.quotaRemaining ?? 0) / sub.quotaTotal) * 100
  return Math.max(0, Math.min(100, Math.round(pct * 100) / 100))
})

const quotaRemainingText = computed(() => {
  const sub = props.subscription
  if (!isQuota.value) return ''
  const unit = sub.quotaUnit ? ` ${sub.quotaUnit}` : ''
  return `${sub.quotaRemaining ?? 0} / ${sub.quotaTotal ?? 0}${unit}`
})

const quotaCycleText = computed(() => {
  const sub = props.subscription
  if (!isQuota.value || !sub.quotaCycle) return ''
  return `${QUOTA_CYCLE_LABELS[sub.quotaCycle] ?? ''}限额`
})
</script>

<template>
  <div class="sub-card glass" :class="`is-${props.subscription.status}`">
    <div class="sub-card-header">
      <div class="sub-card-title-row">
        <h3 class="sub-card-name">{{ props.subscription.name }}</h3>
        <StatusBadge :status="props.subscription.status" />
      </div>
      <CategoryTag :name="props.subscription.categoryName || '未分类'" />
    </div>

    <div class="sub-card-body">
      <div class="sub-card-info">
        <div class="info-item">
          <span class="info-label">到期日期</span>
          <span class="info-value">{{ formatDate(props.subscription.expireDate) }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">剩余天数</span>
          <span class="info-value remaining">{{ remainingDaysLabel(props.subscription.remainingDays) }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">价格</span>
          <span class="info-value">{{ domainConfig.currencySymbol }}{{ props.subscription.price.toFixed(2) }} / {{ BILLING_CYCLE_LABELS[props.subscription.billingCycle] }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">自动续费</span>
          <span class="info-value">{{ props.subscription.autoRenew ? '是' : '否' }}</span>
        </div>
      </div>

      <div v-if="isQuota" class="quota-bar">
        <div class="quota-bar-header">
          <span class="quota-bar-label">{{ quotaCycleText }}</span>
          <span class="quota-bar-value">{{ quotaRemainingText }} · {{ quotaPercent }}%</span>
        </div>
        <div class="quota-bar-track">
          <div class="quota-bar-fill" :style="{ width: quotaPercent + '%' }"></div>
        </div>
      </div>

      <p v-if="props.subscription.note" class="sub-card-note">{{ props.subscription.note }}</p>
    </div>

    <div class="sub-card-actions">
      <template v-if="props.view === 'deleted'">
        <button class="btn btn-sm btn-primary" @click="emit('restore', props.subscription)">
          恢复
        </button>
      </template>
      <template v-else>
        <button class="btn btn-sm" @click="emit('edit', props.subscription)">编辑</button>
        <template v-if="props.view === 'archived'">
          <button class="btn btn-sm" @click="emit('unarchive', props.subscription)">取消归档</button>
        </template>
        <template v-else>
          <button class="btn btn-sm" @click="emit('archive', props.subscription)">归档</button>
        </template>
        <button class="btn btn-sm btn-danger" @click="emit('delete', props.subscription)">删除</button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.sub-card {
  border-radius: var(--radius-lg);
  padding: var(--space-4) var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  transition:
    box-shadow var(--transition-fast),
    border-color var(--transition-fast),
    background-color var(--transition-fast),
    transform var(--transition-fast);
}

.sub-card:hover {
  background: var(--glass-bg-hover);
  box-shadow: var(--glass-shadow-hover);
}

.sub-card.is-expired {
  border-left: 0.25rem solid var(--color-status-expired);
}

.sub-card.is-soon7 {
  border-left: 0.25rem solid var(--color-status-soon7);
}

.sub-card.is-soon30 {
  border-left: 0.25rem solid var(--color-status-soon30);
}

.sub-card.is-sufficient {
  border-left: 0.25rem solid var(--color-status-sufficient);
}

.sub-card-header {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
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

.sub-card-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.sub-card-info {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-2) var(--space-4);
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.info-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.info-value {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
}

.info-value.remaining {
  font-weight: 600;
}

.sub-card.is-expired .info-value.remaining {
  color: var(--color-status-expired);
}

.sub-card.is-soon7 .info-value.remaining {
  color: var(--color-status-soon7);
}

.sub-card.is-soon30 .info-value.remaining {
  color: var(--color-status-soon30);
}

.quota-bar {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.quota-bar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.quota-bar-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.quota-bar-value {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  font-weight: 600;
}

.quota-bar-track {
  height: 0.375rem;
  background: var(--color-bg-hover);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.quota-bar-fill {
  height: 100%;
  background: var(--color-primary);
  border-radius: var(--radius-sm);
  transition: width var(--transition-fast);
}

.sub-card-note {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  background-color: var(--color-bg-hover);
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-3);
  line-height: var(--line-height-base);
}

.sub-card-actions {
  display: flex;
  gap: var(--space-2);
  padding-top: var(--space-2);
  border-top: 1px solid var(--color-border-light);
}
</style>
