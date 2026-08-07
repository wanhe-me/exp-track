<script setup lang="ts">
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useCategoryStore } from '@/stores/category'
import { useSubscriptionStore } from '@/stores/subscription'
import { useSubscriptionActions } from '@/composables/useSubscriptionActions'
import SubscriptionTable from '@/components/management/SubscriptionTable.vue'
import SubscriptionFormDialog from '@/components/subscription/SubscriptionFormDialog.vue'
import ConfirmDialog from '@/components/base/dialog/ConfirmDialog.vue'
import { AppButton, AppInput, AppSelect } from '@/components/base'
import type { Subscription, SubscriptionInput } from '@exp-track/shared'

const categoryStore = useCategoryStore()
const subscriptionStore = useSubscriptionStore()
const { subscriptions, loading, searchKeyword, sortOrder } = storeToRefs(subscriptionStore)

const sortOptions: { value: 'asc' | 'desc'; label: string }[] = [
  { value: 'asc', label: '到期时间 ↑' },
  { value: 'desc', label: '到期时间 ↓' },
]

const actions = useSubscriptionActions('archived')

const onSearch = (): void => {
  void subscriptionStore.fetchAll()
}

const onSortChange = (): void => {
  void subscriptionStore.fetchAll()
}

const onSubmit = async (input: SubscriptionInput, id: number | null): Promise<void> => {
  await actions.handleSubmit(input, id)
}

const onEdit = (sub: Subscription): void => {
  actions.openEdit(sub)
}

onMounted(async () => {
  await Promise.all([categoryStore.fetchAll(), subscriptionStore.setView('archived')])
})
</script>

<template>
  <div class="archived-view">
    <div class="page-header">
      <h1 class="page-title">已归档</h1>
      <p class="page-desc">已归档的订阅不在看板中展示，可随时取消归档恢复</p>
    </div>

    <div class="toolbar">
      <AppInput v-model="searchKeyword" placeholder="搜索订阅名称..." @keyup.enter="onSearch" />
      <AppSelect v-model="sortOrder" :options="sortOptions" @change="onSortChange" />
      <AppButton size="sm" @click="onSearch">筛选</AppButton>
    </div>

    <SubscriptionTable
      :subscriptions="subscriptions"
      :loading="loading"
      view="archived"
      @edit="onEdit"
      @unarchive="actions.handleUnarchive"
      @delete="actions.requestDelete"
    />

    <SubscriptionFormDialog
      v-model="actions.formVisible.value"
      :subscription="actions.editingSubscription.value"
      @submit="onSubmit"
    />

    <ConfirmDialog
      v-model="actions.deleteDialogVisible.value"
      title="删除订阅"
      :message="`确定要删除订阅「${actions.deleteTarget.value?.name}」吗？删除后可在回收站恢复。`"
      confirm-text="删除"
      danger
      @confirm="actions.confirmDelete"
    />
  </div>
</template>

<style scoped>
.archived-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  align-items: center;
}

.toolbar .app-input {
  flex: 1;
  min-width: 12.5rem;
  max-width: 20rem;
}

.toolbar .app-select {
  min-width: 8rem;
}

@media (max-width: 768px) {
  .toolbar .app-input,
  .toolbar .app-select {
    max-width: 100%;
    width: 100%;
  }

  .toolbar .app-btn {
    width: 100%;
  }
}
</style>
