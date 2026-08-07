<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useQuotaPackStore } from '@/stores/quotaPack'
import { formatDate, remainingDaysLabel } from '@/utils/date'
import StatusBadge from '@/components/base/display/StatusBadge.vue'
import EmptyState from '@/components/base/display/EmptyState.vue'
import { AppButton } from '@/components/base'
import ConfirmDialog from '@/components/base/dialog/ConfirmDialog.vue'
import QuotaPackFormDialog from './QuotaPackFormDialog.vue'
import type { QuotaPack, QuotaPackInput, QuotaPackView, Subscription, SubscriptionView } from '@exp-track/shared'

const props = defineProps<{
  subscription: Subscription
  view?: SubscriptionView
}>()

const quotaPackStore = useQuotaPackStore()
const { slots } = storeToRefs(quotaPackStore)

const subId = computed(() => props.subscription.id)

// 当前面板展示的额度包视图（active/archived/deleted）
const currentView = ref<QuotaPackView>('active')

const packs = computed<QuotaPack[]>(() => quotaPackStore.getPacks(subId.value))
const isLoading = computed(() => quotaPackStore.isLoadingPacks(subId.value))

const loadPacks = async (): Promise<void> => {
  await quotaPackStore.fetchPacks(subId.value, currentView.value)
}

onMounted(() => {
  void loadPacks()
})

// 视图切换时重新加载
watch(currentView, () => {
  void loadPacks()
})

// view tabs
const viewTabs: { value: QuotaPackView; label: string }[] = [
  { value: 'active', label: '有效' },
  { value: 'archived', label: '已归档' },
  { value: 'deleted', label: '已删除' },
]

// ---- 表单弹窗 ----
const formVisible = ref(false)
const editingPack = ref<QuotaPack | null>(null)

const openCreate = (): void => {
  editingPack.value = null
  formVisible.value = true
}

const openEdit = (pack: QuotaPack): void => {
  editingPack.value = pack
  formVisible.value = true
}

const onSubmit = async (input: QuotaPackInput, id: number | null): Promise<void> => {
  if (id !== null) {
    await quotaPackStore.update(subId.value, id, input)
  } else {
    await quotaPackStore.create(subId.value, input)
  }
}

// ---- 删除/归档/恢复确认 ----
const deleteTarget = ref<QuotaPack | null>(null)
const deleteDialogVisible = ref(false)

const requestDelete = (pack: QuotaPack): void => {
  deleteTarget.value = pack
  deleteDialogVisible.value = true
}

const confirmDelete = async (): Promise<void> => {
  if (!deleteTarget.value) return
  await quotaPackStore.remove(subId.value, deleteTarget.value.id)
  deleteTarget.value = null
}

const handleArchive = async (pack: QuotaPack): Promise<void> => {
  await quotaPackStore.archive(subId.value, pack.id)
}

const handleUnarchive = async (pack: QuotaPack): Promise<void> => {
  await quotaPackStore.unarchive(subId.value, pack.id)
}

const handleRestore = async (pack: QuotaPack): Promise<void> => {
  await quotaPackStore.restore(subId.value, pack.id)
}

// 是否禁用增删（订阅已删除时不允许维护额度包）
const readOnly = computed(() => props.view === 'deleted')

// 槽位提示（来自看板槽位数据，可空）
const slotInfo = computed(() => slots.value[subId.value])
</script>

<template>
  <div class="qp-panel">
    <div class="qp-panel-header">
      <div class="qp-panel-title">
        <FaIcon icon="layer-group" fixed-width />
        <span>额度包</span>
        <span v-if="slotInfo && slotInfo.totalActive > 0" class="qp-slot-hint">
          有效 {{ slotInfo.totalActive }} 个
        </span>
      </div>
      <div class="qp-panel-controls">
        <div class="qp-view-tabs">
          <button
            v-for="tab in viewTabs"
            :key="tab.value"
            class="qp-tab"
            :class="{ 'qp-tab-active': currentView === tab.value }"
            @click="currentView = tab.value"
          >{{ tab.label }}</button>
        </div>
        <AppButton
          v-if="!readOnly"
          variant="primary"
          size="sm"
          icon="plus"
          @click="openCreate"
        >添加</AppButton>
      </div>
    </div>

    <div v-if="isLoading" class="loading-state">加载中...</div>

    <EmptyState
      v-else-if="packs.length === 0"
      :title="currentView === 'active' ? '暂无额度包' : currentView === 'archived' ? '暂无归档额度包' : '暂无已删除额度包'"
      description="添加额度包后可在此维护"
    />

    <div v-else class="qp-list-scroll">
      <table class="qp-table">
        <thead>
          <tr>
            <th class="qp-col-name">名称</th>
            <th class="qp-col-qty">数量</th>
            <th class="qp-col-date">获得日</th>
            <th class="qp-col-date">失效日</th>
            <th class="qp-col-remain">剩余</th>
            <th class="qp-col-status">状态</th>
            <th class="qp-col-actions">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="pack in packs" :key="pack.id" class="qp-row">
            <td class="qp-col-name">
              <span class="qp-pack-name">{{ pack.name }}</span>
              <span v-if="pack.source" class="qp-pack-source">{{ pack.source }}</span>
            </td>
            <td class="qp-col-qty">{{ pack.quantity }} {{ pack.unit }}</td>
            <td class="qp-col-date">{{ formatDate(pack.obtainedDate) }}</td>
            <td class="qp-col-date">{{ formatDate(pack.expireDate) }}</td>
            <td class="qp-col-remain">{{ remainingDaysLabel(pack.remainingDays) }}</td>
            <td class="qp-col-status"><StatusBadge :status="pack.status" /></td>
            <td class="qp-col-actions">
              <div class="qp-row-actions">
                <template v-if="currentView === 'deleted'">
                  <AppButton size="sm" icon="arrow-rotate-left" title="恢复" @click="handleRestore(pack)">恢复</AppButton>
                </template>
                <template v-else>
                  <button
                    v-if="!readOnly"
                    class="btn btn-sm"
                    title="编辑"
                    @click="openEdit(pack)"
                  >
                    <FaIcon icon="pen" fixed-width />
                  </button>
                  <button
                    v-if="currentView === 'archived'"
                    class="btn btn-sm"
                    title="取消归档"
                    @click="handleUnarchive(pack)"
                  >
                    <FaIcon icon="box-archive" fixed-width />
                  </button>
                  <button
                    v-else
                    class="btn btn-sm"
                    title="归档"
                    @click="handleArchive(pack)"
                  >
                    <FaIcon icon="box-archive" fixed-width />
                  </button>
                  <button
                    class="btn btn-sm btn-danger"
                    title="删除"
                    @click="requestDelete(pack)"
                  >
                    <FaIcon icon="trash-can" fixed-width />
                  </button>
                </template>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <QuotaPackFormDialog
      v-model="formVisible"
      :quota-pack="editingPack"
      @submit="onSubmit"
    />

    <ConfirmDialog
      v-model="deleteDialogVisible"
      title="删除额度包"
      :message="`确定要删除额度包「${deleteTarget?.name}」吗？删除后可在已删除视图恢复。`"
      confirm-text="删除"
      danger
      @confirm="confirmDelete"
    />
  </div>
</template>

<style scoped>
.qp-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-5);
}

.qp-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.qp-panel-title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-primary);
}

.qp-slot-hint {
  font-size: var(--font-size-xs);
  font-weight: 400;
  color: var(--color-text-tertiary);
  background-color: var(--color-bg-hover);
  padding: 0 var(--space-2);
  border-radius: var(--radius-full);
}

.qp-panel-controls {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.qp-view-tabs {
  display: flex;
  gap: 0.125rem;
  padding: 0.125rem;
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  background: var(--color-bg-hover);
}

.qp-tab {
  padding: 0.25rem var(--space-3);
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast);
}

.qp-tab:hover {
  color: var(--color-text-primary);
}

.qp-tab-active {
  background-color: var(--color-bg-card);
  color: var(--color-primary);
  font-weight: 500;
  box-shadow: var(--shadow-sm);
}

.qp-list-scroll {
  width: 100%;
  overflow-x: auto;
}

.qp-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
  min-width: 36rem;
}

.qp-table th {
  text-align: left;
  padding: var(--space-2) var(--space-3);
  font-weight: 600;
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  white-space: nowrap;
  border-bottom: 1px solid var(--color-border);
}

.qp-table td {
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-border-light);
  color: var(--color-text-primary);
  vertical-align: middle;
}

.qp-row:hover {
  background-color: var(--color-bg-hover);
}

.qp-col-name {
  min-width: 8rem;
}

.qp-pack-source {
  display: block;
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-top: 0.125rem;
}

.qp-col-date,
.qp-col-remain,
.qp-col-status {
  white-space: nowrap;
}

.qp-col-actions {
  width: 1%;
  white-space: nowrap;
}

.qp-row-actions {
  display: flex;
  gap: var(--space-1);
}
</style>
