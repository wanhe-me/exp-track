<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useQuotaPackStore } from '@/stores/quotaPack'
import { remainingDaysLabel } from '@/utils/date'
import type { SubscriptionStatus } from '@exp-track/shared'

const props = defineProps<{
  subscriptionId: number
}>()

const quotaPackStore = useQuotaPackStore()
const { slots } = storeToRefs(quotaPackStore)

const slot = computed(() => slots.value[props.subscriptionId])

const pack = computed(() => slot.value?.pack ?? null)
const totalActive = computed(() => slot.value?.totalActive ?? 0)

const statusColor = (status: SubscriptionStatus | undefined): string => {
  if (!status) return 'var(--color-text-tertiary)'
  const map: Record<SubscriptionStatus, string> = {
    expired: 'var(--color-status-expired)',
    soon7: 'var(--color-status-soon7)',
    soon30: 'var(--color-status-soon30)',
    sufficient: 'var(--color-status-sufficient)',
  }
  return map[status]
}
</script>

<template>
  <div class="qp-slot">
    <div v-if="pack" class="qp-slot-has">
      <div class="qp-slot-main">
        <span
          class="qp-slot-dot"
          :style="{ background: statusColor(pack.status) }"
        ></span>
        <span class="qp-slot-name">{{ pack.name }}</span>
      </div>
      <div class="qp-slot-meta">
        <span class="qp-slot-qty">{{ pack.quantity }} {{ pack.unit }}</span>
        <span
          class="qp-slot-remain"
          :style="{ color: statusColor(pack.status) }"
        >{{ remainingDaysLabel(pack.remainingDays) }}</span>
      </div>
      <p v-if="totalActive > 1" class="qp-slot-more">等共 {{ totalActive }} 个</p>
    </div>
    <div v-else class="qp-slot-empty">
      <span>无额度包</span>
    </div>
  </div>
</template>

<style scoped>
/* 槽位高度恒定（FR-12 硬约束），有无额度包均不改变卡片整体高度 */
.qp-slot {
  min-height: 3rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.125rem;
  padding: var(--space-2) 0;
  border-top: 1px dashed var(--color-border-light);
}

.qp-slot-has {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.qp-slot-main {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.qp-slot-dot {
  width: 0.375rem;
  height: 0.375rem;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.qp-slot-name {
  font-size: var(--font-size-xs);
  font-weight: 500;
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.qp-slot-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.qp-slot-qty {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.qp-slot-remain {
  font-size: var(--font-size-xs);
  font-weight: 500;
  white-space: nowrap;
}

.qp-slot-more {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin: 0;
}

.qp-slot-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: var(--font-size-xs);
  color: var(--color-text-disabled);
}
</style>
