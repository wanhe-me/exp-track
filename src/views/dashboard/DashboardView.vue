<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useCategoryStore } from '@/stores/category'
import { useSubscriptionStore } from '@/stores/subscription'
import { useSubscriptionActions } from '@/composables/useSubscriptionActions'
import SubscriptionCard from '@/components/SubscriptionCard.vue'
import SubscriptionDetailDialog from '@/components/SubscriptionDetailDialog.vue'
import SubscriptionFormDialog from '@/components/SubscriptionFormDialog.vue'
import ConfirmDialog from '@/components/base/dialog/ConfirmDialog.vue'
import EmptyState from '@/components/base/display/EmptyState.vue'
import type { Subscription, SubscriptionInput } from '@/types'

const categoryStore = useCategoryStore()
const subscriptionStore = useSubscriptionStore()
const { subscriptions, loading, filterCategoryId, searchKeyword, sortOrder } = storeToRefs(subscriptionStore)

const actions = useSubscriptionActions('active')

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

const onDetailArchive = (sub: Subscription): void => {
  detailVisible.value = false
  actions.requestArchive(sub)
}

onMounted(async () => {
  await Promise.all([categoryStore.fetchAll(), subscriptionStore.setView('active')])
})

const onSubmit = async (input: SubscriptionInput, id: number | null): Promise<void> => {
  await actions.handleSubmit(input, id)
}

const onSearch = (): void => {
  void subscriptionStore.fetchAll()
}

const onSortChange = (): void => {
  void subscriptionStore.fetchAll()
}
</script>

<template>
  <div class="dashboard">
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">到期看板</h1>
        <p class="page-desc">管理订阅到期时间，临期自动提醒</p>
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
      <select v-model="sortOrder" class="select sort-select" @change="onSortChange">
        <option value="asc">到期时间 ↑</option>
        <option value="desc">到期时间 ↓</option>
      </select>
      <button class="btn btn-sm" @click="onSearch">筛选</button>
    </div>

    <div v-if="loading" class="loading-state">加载中...</div>

    <EmptyState
      v-else-if="subscriptions.length === 0"
      title="暂无订阅"
      description="点击「添加订阅」开始管理你的到期提醒"
    >
      <button class="btn btn-primary" style="margin-top: 1rem" @click="actions.openCreate">
        添加订阅
      </button>
    </EmptyState>

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
      view="active"
      @edit="onDetailEdit"
      @delete="onDetailDelete"
      @archive="onDetailArchive"
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

    <ConfirmDialog
      v-model="actions.archiveDialogVisible.value"
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
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}

.page-header-left {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.page-desc {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  margin: 0;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  align-items: center;
}

.search-input {
  flex: 1;
  min-width: 12.5rem;
  max-width: 20rem;
}

.filter-select {
  width: auto;
  min-width: 10rem;
}

.sort-select {
  width: auto;
  min-width: 8rem;
}

@media (max-width: 768px) {
  .search-input,
  .filter-select,
  .sort-select {
    max-width: 100%;
    width: 100%;
  }

  .toolbar .btn {
    width: 100%;
  }
}
</style>
