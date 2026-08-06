<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useCategoryStore } from '@/stores/category'
import { useSubscriptionStore } from '@/stores/subscription'
import { useSubscriptionActions } from '@/composables/useSubscriptionActions'
import SubscriptionCard from '@/components/subscription/SubscriptionCard.vue'
import SubscriptionDetailDialog from '@/components/subscription/SubscriptionDetailDialog.vue'
import SubscriptionFormDialog from '@/components/subscription/SubscriptionFormDialog.vue'
import ConfirmDialog from '@/components/base/dialog/ConfirmDialog.vue'
import EmptyState from '@/components/base/display/EmptyState.vue'
import type { Subscription, SubscriptionInput } from '@exp-track/shared'

const categoryStore = useCategoryStore()
const subscriptionStore = useSubscriptionStore()
const { subscriptions, loading } = storeToRefs(subscriptionStore)

const actions = useSubscriptionActions('archived')

const detailVisible = ref(false)
const detailTarget = ref<Subscription | null>(null)

const openDetail = (sub: Subscription): void => {
  detailTarget.value = sub
  detailVisible.value = true
}

const onDetailEdit = (sub: Subscription): void => {
  detailVisible.value = false
  actions.openEdit(sub)
}

const onDetailDelete = (sub: Subscription): void => {
  detailVisible.value = false
  actions.requestDelete(sub)
}

const onDetailUnarchive = (sub: Subscription): void => {
  detailVisible.value = false
  actions.handleUnarchive(sub)
}

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
        @detail="openDetail"
      />
    </div>

    <SubscriptionDetailDialog
      v-model="detailVisible"
      :subscription="detailTarget"
      view="archived"
      @edit="onDetailEdit"
      @delete="onDetailDelete"
      @unarchive="onDetailUnarchive"
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
</style>
