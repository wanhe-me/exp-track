<script setup lang="ts">
import { ref } from 'vue'
import {
  BILLING_CYCLE_LABELS,
  SUBSCRIPTION_TYPE_LABELS,
  domainConfig,
  type Subscription,
  type SubscriptionView,
} from '@exp-track/shared'
import { formatDate, remainingDaysLabel } from '@/utils/date'
import StatusBadge from '@/components/base/display/StatusBadge.vue'
import EmptyState from '@/components/base/display/EmptyState.vue'
import { AppButton } from '@/components/base'
import QuotaPackPanel from '@/components/quota-pack/QuotaPackPanel.vue'

const props = withDefaults(
  defineProps<{
    subscriptions: Subscription[]
    loading?: boolean
    view?: SubscriptionView
    /** 是否允许展开额度包面板（默认 active/archived 允许，deleted 禁用） */
    expandable?: boolean
  }>(),
  {
    loading: false,
    view: 'active',
    expandable: true,
  },
)

const emit = defineEmits<{
  edit: [subscription: Subscription]
  archive: [subscription: Subscription]
  unarchive: [subscription: Subscription]
  delete: [subscription: Subscription]
  restore: [subscription: Subscription]
}>()

// 展开的订阅行（按 id 记录）
const expandedIds = ref<Set<number>>(new Set())

const toggleExpand = (sub: Subscription): void => {
  if (!props.expandable) return
  if (expandedIds.value.has(sub.id)) {
    expandedIds.value.delete(sub.id)
  } else {
    expandedIds.value.add(sub.id)
  }
}

const isExpanded = (id: number): boolean => expandedIds.value.has(id)

const isQuota = (sub: Subscription): boolean => sub.subscriptionType === 'quota'
</script>

<template>
  <div class="sub-table-wrap">
    <div v-if="loading" class="loading-state">加载中...</div>

    <EmptyState
      v-else-if="subscriptions.length === 0"
      title="暂无订阅"
      description="在上方点击「添加订阅」开始管理"
    />

    <div v-else class="sub-table-scroll">
      <table class="sub-table">
        <thead>
          <tr>
            <th class="col-expand"></th>
            <th class="col-name">名称</th>
            <th class="col-category">分类</th>
            <th class="col-price">价格</th>
            <th class="col-cycle">周期</th>
            <th class="col-expire">到期日</th>
            <th class="col-remaining">剩余</th>
            <th class="col-status">状态</th>
            <th class="col-actions">操作</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="sub in subscriptions" :key="sub.id">
            <tr
              class="sub-row"
              :class="{ 'sub-row-expanded': isExpanded(sub.id) }"
            >
              <td class="col-expand">
                <button
                  v-if="expandable"
                  class="expand-btn"
                  :title="isExpanded(sub.id) ? '收起额度包' : '展开额度包'"
                  @click="toggleExpand(sub)"
                >
                  <FaIcon
                    :icon="isExpanded(sub.id) ? 'chevron-down' : 'chevron-right'"
                    fixed-width
                  />
                </button>
              </td>
              <td class="col-name">
                <span class="sub-name">{{ sub.name }}</span>
                <span v-if="isQuota(sub)" class="sub-type-tag">
                  {{ SUBSCRIPTION_TYPE_LABELS.quota }}
                </span>
              </td>
              <td class="col-category">{{ sub.categoryName || '未分类' }}</td>
              <td class="col-price">
                {{ domainConfig.currencySymbol }}{{ sub.price.toFixed(2) }}
              </td>
              <td class="col-cycle">{{ BILLING_CYCLE_LABELS[sub.billingCycle] }}</td>
              <td class="col-expire">{{ formatDate(sub.expireDate) }}</td>
              <td class="col-remaining">{{ remainingDaysLabel(sub.remainingDays) }}</td>
              <td class="col-status">
                <StatusBadge :status="sub.status" />
              </td>
              <td class="col-actions">
                <div class="row-actions">
                  <template v-if="view === 'deleted'">
                    <AppButton size="sm" icon="arrow-rotate-left" title="恢复" @click="emit('restore', sub)">恢复</AppButton>
                  </template>
                  <template v-else>
                    <button class="btn btn-sm" title="编辑" @click="emit('edit', sub)">
                      <FaIcon icon="pen" fixed-width />
                    </button>
                    <button
                      v-if="view === 'archived'"
                      class="btn btn-sm"
                      title="取消归档"
                      @click="emit('unarchive', sub)"
                    >
                      <FaIcon icon="box-archive" fixed-width />
                    </button>
                    <button
                      v-else
                      class="btn btn-sm"
                      title="归档"
                      @click="emit('archive', sub)"
                    >
                      <FaIcon icon="box-archive" fixed-width />
                    </button>
                    <button
                      class="btn btn-sm btn-danger"
                      title="删除"
                      @click="emit('delete', sub)"
                    >
                      <FaIcon icon="trash-can" fixed-width />
                    </button>
                  </template>
                </div>
              </td>
            </tr>
            <tr v-if="expandable && isExpanded(sub.id)" class="sub-row-expand">
              <td colspan="9" class="expand-cell">
                <QuotaPackPanel :subscription="sub" :view="view" />
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.sub-table-wrap {
  width: 100%;
}

.sub-table-scroll {
  width: 100%;
  overflow-x: auto;
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
}

.sub-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
  min-width: 48rem;
}

.sub-table thead {
  background: var(--color-bg-hover);
}

.sub-table th {
  text-align: left;
  padding: var(--space-2) var(--space-3);
  font-weight: 600;
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  white-space: nowrap;
  border-bottom: 1px solid var(--color-border);
}

.sub-table td {
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-border-light);
  color: var(--color-text-primary);
  vertical-align: middle;
}

.sub-row {
  transition: background-color var(--transition-fast);
}

.sub-row:hover {
  background-color: var(--color-bg-hover);
}

.sub-row-expanded {
  background-color: var(--color-bg-hover);
}

.col-expand {
  width: 2.5rem;
  text-align: center;
}

.col-actions {
  width: 1%;
  white-space: nowrap;
}

.col-price,
.col-cycle,
.col-expire,
.col-remaining,
.col-status {
  white-space: nowrap;
}

.expand-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-tertiary);
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast);
}

.expand-btn:hover {
  background-color: var(--color-bg-active);
  color: var(--color-text-primary);
}

.sub-name {
  font-weight: 500;
}

.sub-type-tag {
  display: inline-block;
  margin-left: var(--space-2);
  padding: 0 var(--space-2);
  border-radius: var(--radius-full);
  background-color: var(--color-primary-soft);
  color: var(--color-primary);
  font-size: var(--font-size-xs);
  line-height: 1.5;
}

.row-actions {
  display: flex;
  gap: var(--space-1);
}

.sub-row-expand .expand-cell {
  padding: 0;
  background: var(--color-bg-page);
}
</style>
