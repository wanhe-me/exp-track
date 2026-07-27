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
const { subscriptions, loading, filterCategoryId, searchKeyword } = storeToRefs(subscriptionStore)

const actions = useSubscriptionActions('active')

onMounted(async () => {
  await Promise.all([categoryStore.fetchAll(), subscriptionStore.setView('active')])
})

const onSubmit = async (input: SubscriptionInput, id: number | null): Promise<void> => {
  await actions.handleSubmit(input, id)
}

const onSearch = (): void => {
  void subscriptionStore.fetchAll()
}
</script>

<template>
  <div class="dashboard">
    <div class="page-header">
      <div>
        <h1 class="page-title">到期看板</h1>
        <p class="page-desc">按剩余天数升序排列，临期与已过期项突出展示</p>
      </div>
      <button class="btn btn-primary" @click="actions.openCreate">+ 添加订阅</button>
    </div>

    <div class="toolbar">
      <input
        v-model="searchKeyword"
        class="input search-input"
        placeholder="搜索订阅名称..."
        @keyup.enter="onSearch"
      />
      <select v-model.number="filterCategoryId" class="select filter-select" @change="onSearch">
        <option :value="undefined">全部分类</option>
        <option v-for="c in categoryStore.categories" :key="c.id" :value="c.id">
          {{ c.name }}
        </option>
      </select>
      <button class="btn btn-sm" @click="onSearch">筛选</button>
    </div>

    <div v-if="loading" class="loading-state">加载中...</div>

    <EmptyState
      v-else-if="subscriptions.length === 0"
      title="暂无订阅"
      description="点击「添加订阅」开始管理你的到期提醒"
    >
      <button class="btn btn-primary" style="margin-top: 16px" @click="actions.openCreate">
        添加订阅
      </button>
    </EmptyState>

    <div v-else class="card-grid">
      <SubscriptionCard
        v-for="sub in subscriptions"
        :key="sub.id"
        :subscription="sub"
        view="active"
        @edit="actions.openEdit"
        @delete="actions.requestDelete"
        @archive="actions.requestArchive"
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

    <ConfirmDialog
      ref="actions.archiveDialog"
      title="归档订阅"
      :message="`确定要归档订阅「${actions.archiveTarget.value?.name}」吗？归档后可在已归档视图查看。`"
      confirm-text="归档"
      @confirm="actions.confirmArchive"
    />
  </div>
</template>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
}

.page-title {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  margin-bottom: var(--space-1);
}

.page-desc {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
}

.toolbar {
  display: flex;
  gap: var(--space-3);
  align-items: center;
}

.search-input {
  flex: 1;
  max-width: 320px;
}

.filter-select {
  width: auto;
  min-width: 160px;
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
