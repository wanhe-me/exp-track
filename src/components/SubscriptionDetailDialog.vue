<script setup lang="ts">
import { computed } from 'vue'
import type { Subscription, SubscriptionView } from '@/types'
import { BILLING_CYCLE_LABELS, QUOTA_CYCLE_LABELS, domainConfig } from '@/types'
import { formatDate, remainingDaysLabel } from '@/utils/date'
import StatusBadge from './base/display/StatusBadge.vue'
import CategoryTag from './base/display/CategoryTag.vue'

const props = defineProps<{
  modelValue: boolean
  subscription: Subscription | null
  view?: SubscriptionView
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  edit: [subscription: Subscription]
  delete: [subscription: Subscription]
  archive: [subscription: Subscription]
  unarchive: [subscription: Subscription]
  restore: [subscription: Subscription]
}>()

const isQuota = computed(() => props.subscription?.subscriptionType === 'quota')

const quotaPercent = computed(() => {
  const sub = props.subscription
  if (!sub || !isQuota.value || sub.quotaTotal == null || sub.quotaTotal <= 0) return 0
  const pct = ((sub.quotaRemaining ?? 0) / sub.quotaTotal) * 100
  return Math.max(0, Math.min(100, Math.round(pct * 100) / 100))
})

const quotaRemainingText = computed(() => {
  const sub = props.subscription
  if (!sub || !isQuota.value) return ''
  const unit = sub.quotaUnit ? ` ${sub.quotaUnit}` : ''
  return `${sub.quotaRemaining ?? 0} / ${sub.quotaTotal ?? 0}${unit}`
})

const quotaCycleText = computed(() => {
  const sub = props.subscription
  if (!sub || !isQuota.value || !sub.quotaCycle) return ''
  return `${QUOTA_CYCLE_LABELS[sub.quotaCycle] ?? ''}限额`
})

const close = (): void => {
  emit('update:modelValue', false)
}
</script>

<template>
  <Teleport to="body">
    <div v-if="props.modelValue && props.subscription" class="detail-overlay" @click.self="close">
      <div class="detail-dialog glass">
        <div class="detail-header">
          <div class="detail-title-row">
            <h2 class="detail-name">{{ props.subscription.name }}</h2>
            <StatusBadge :status="props.subscription.status" />
          </div>
          <button class="detail-close" @click="close">×</button>
        </div>

        <div class="detail-content">
          <div class="detail-meta">
            <CategoryTag :name="props.subscription.categoryName || '未分类'" />
          </div>

          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">到期日期</span>
              <span class="detail-value">{{ formatDate(props.subscription.expireDate) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">剩余天数</span>
              <span class="detail-value highlight" :class="`is-${props.subscription.status}`">
                {{ remainingDaysLabel(props.subscription.remainingDays) }}
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label">价格</span>
              <span class="detail-value">
                {{ domainConfig.currencySymbol }}{{ props.subscription.price.toFixed(2) }} / {{ BILLING_CYCLE_LABELS[props.subscription.billingCycle] }}
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label">开始日期</span>
              <span class="detail-value">{{ formatDate(props.subscription.startDate) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">自动续费</span>
              <span class="detail-value">{{ props.subscription.autoRenew ? '是' : '否' }}</span>
            </div>
          </div>

          <div v-if="isQuota" class="detail-quota">
            <div class="quota-header">
              <span class="quota-label">{{ quotaCycleText }}</span>
              <span class="quota-value">{{ quotaRemainingText }} · {{ quotaPercent }}%</span>
            </div>
            <div class="quota-track">
              <div class="quota-fill" :style="{ width: quotaPercent + '%' }"></div>
            </div>
          </div>

          <p v-if="props.subscription.note" class="detail-note">{{ props.subscription.note }}</p>
        </div>

        <div class="detail-footer">
          <template v-if="props.view === 'deleted'">
            <button class="btn btn-primary" @click="emit('restore', props.subscription!)">恢复</button>
          </template>
          <template v-else>
            <button class="btn" @click="emit('edit', props.subscription!)">编辑</button>
            <button
              v-if="props.view === 'archived'"
              class="btn"
              @click="emit('unarchive', props.subscription!)"
            >取消归档</button>
            <button
              v-else
              class="btn"
              @click="emit('archive', props.subscription!)"
            >归档</button>
            <button class="btn btn-danger" @click="emit('delete', props.subscription!)">删除</button>
          </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.detail-overlay {
  position: fixed;
  inset: 0;
  background-color: var(--color-bg-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.detail-dialog {
  border-radius: var(--radius-lg);
  width: 28rem;
  max-width: calc(100vw - var(--space-8));
  max-height: calc(100vh - var(--space-8));
  display: flex;
  flex-direction: column;
}

.detail-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: var(--space-5) var(--space-6);
  border-bottom: 1px solid var(--color-border-light);
}

.detail-title-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}

.detail-name {
  font-size: var(--font-size-lg);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  background: var(--color-bg-hover);
  font-size: 1.375rem;
  line-height: 1;
  color: var(--color-text-tertiary);
  padding: 0;
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast),
    border-color var(--transition-fast);
}

.detail-close:hover {
  color: var(--color-text-primary);
  border-color: var(--color-border);
  background: var(--color-bg-active);
}

.detail-content {
  padding: var(--space-5) var(--space-6);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.detail-meta {
  display: flex;
  align-items: center;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3) var(--space-4);
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.detail-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.detail-value {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
}

.detail-value.highlight {
  font-weight: 600;
}

.detail-value.is-expired {
  color: var(--color-status-expired);
}

.detail-value.is-soon7 {
  color: var(--color-status-soon7);
}

.detail-value.is-soon30 {
  color: var(--color-status-soon30);
}

.detail-quota {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.quota-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.quota-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.quota-value {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  font-weight: 600;
}

.quota-track {
  height: 0.5rem;
  background: var(--color-bg-hover);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.quota-fill {
  height: 100%;
  background: var(--color-primary);
  border-radius: var(--radius-sm);
  transition: width var(--transition-fast);
}

.detail-note {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  background-color: var(--color-bg-hover);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  line-height: var(--line-height-base);
}

.detail-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-6);
  border-top: 1px solid var(--color-border-light);
}
</style>
