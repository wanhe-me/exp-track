<script setup lang="ts">
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useCategoryStore } from '@/stores/category'
import { useSubscriptionStore } from '@/stores/subscription'
import { useSubscriptionActions } from '@/composables/useSubscriptionActions'
import SubscriptionCard from '@/components/SubscriptionCard.vue'
import SubscriptionFormDialog from '@/components/SubscriptionFormDialog.vue'
import ConfirmDialog from '@/components/base/ConfirmDialog.vue'
import EmptyState from '@/components/base/EmptyState.vue'
import type { SubscriptionInput } from '@/types'

const categoryStore = useCategoryStore()
const subscriptionStore = useSubscriptionStore()
const { subscriptions, loading } = storeToRefs(subscriptionStore)

const actions = useSubscriptionActions('archived')

onMounted(async () => {
  await Promise.all([categoryStore.fetchAll(), subscriptionStore.setView('archived')])
})

const onSubmit = async (input: SubscriptionInput, id: number | null): Promise<void> => {
  await actions.handleSubmit(input, id)
}
</script>

<template>
  <div class="archived-view">
    <div class="page-header">
      <h1 class="page-title">已归档</h1>
      <p class="page-desc">已归档的订阅不在看板中展示，可随时取消归档恢复</p>
    </div>

    <div v-if="loading" class="loading-state">加载中...</div>

    <EmptyState
      v-else-if="subscriptions.length === 0"
      title="暂无归档订阅"
      description="归档后的订阅会显示在这里"
    />

    <div v-else class="card-grid">
      <SubscriptionCard
        v-for="sub in subscriptions"
        :key="sub.id"
        :subscription="sub"
        view="archived"
        @edit="actions.openEdit"
        @delete="actions.requestDelete"
        @unarchive="actions.handleUnarchive"
      />
    </div>

    <SubscriptionFormDialog
      v-model="actions.formVisible.value"
      :subscription="actions.editingSubscription.value"
      @submit="onSubmit"
    />

    <ConfirmDialog
      ref="actions.deleteDialog"
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

.page-header {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.page-title {
  font-size: var(--font-size-2xl);
  font-weight: 700;
}

.page-desc {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
}

.loading-state {
  padding: var(--space-12);
  text-align: center;
  color: var(--color-text-tertiary);
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: var(--space-4);
}
</style>
