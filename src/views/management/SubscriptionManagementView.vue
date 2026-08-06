<script setup lang="ts">
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useCategoryStore } from '@/stores/category'
import { useSubscriptionStore } from '@/stores/subscription'
import { useSubscriptionActions } from '@/composables/useSubscriptionActions'
import CategoryTree from '@/components/management/CategoryTree.vue'
import SubscriptionTable from '@/components/management/SubscriptionTable.vue'
import SubscriptionFormDialog from '@/components/subscription/SubscriptionFormDialog.vue'
import ConfirmDialog from '@/components/base/dialog/ConfirmDialog.vue'
import type { Subscription, SubscriptionInput } from '@exp-track/shared'

const categoryStore = useCategoryStore()
const subscriptionStore = useSubscriptionStore()
const { subscriptions, loading, searchKeyword, sortOrder } = storeToRefs(subscriptionStore)

const actions = useSubscriptionActions('active')

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
  await Promise.all([categoryStore.fetchAll(), subscriptionStore.setView('active')])
})
</script>

<template>
  <div class="management">
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">订阅管理</h1>
        <p class="page-desc">集中管理订阅与分类，点击行首图标展开额度包维护</p>
      </div>
      <button class="btn btn-primary" @click="actions.openCreate">
        <FaIcon icon="plus" fixed-width /> 添加订阅
      </button>
    </div>

    <div class="toolbar">
      <input
        v-model="searchKeyword"
        class="input search-input"
        placeholder="搜索订阅名称..."
        @keyup.enter="onSearch"
      />
      <select v-model="sortOrder" class="select sort-select" @change="onSortChange">
        <option value="asc">到期时间 ↑</option>
        <option value="desc">到期时间 ↓</option>
      </select>
      <button class="btn btn-sm" @click="onSearch">筛选</button>
    </div>

    <div class="management-body">
      <aside class="management-side">
        <CategoryTree />
      </aside>

      <section class="management-main">
        <SubscriptionTable
          :subscriptions="subscriptions"
          :loading="loading"
          view="active"
          @edit="onEdit"
          @archive="actions.requestArchive"
          @delete="actions.requestDelete"
        />
      </section>
    </div>

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
.management {
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

.sort-select {
  width: auto;
  min-width: 8rem;
}

.management-body {
  display: grid;
  grid-template-columns: 16rem 1fr;
  gap: var(--space-4);
  align-items: start;
}

.management-side {
  position: sticky;
  top: var(--space-6);
  max-height: calc(100vh - 8rem);
  overflow: hidden;
}

.management-main {
  min-width: 0;
}

@media (max-width: 768px) {
  .management-body {
    grid-template-columns: 1fr;
  }

  .management-side {
    position: static;
    max-height: none;
  }

  .search-input,
  .sort-select {
    max-width: 100%;
    width: 100%;
  }

  .toolbar .btn {
    width: 100%;
  }
}
</style>
