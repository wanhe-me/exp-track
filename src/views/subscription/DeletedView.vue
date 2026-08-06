<script setup lang="ts">
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useSubscriptionStore } from '@/stores/subscription'
import { useSubscriptionActions } from '@/composables/useSubscriptionActions'
import SubscriptionTable from '@/components/management/SubscriptionTable.vue'
import type { Subscription } from '@exp-track/shared'

const subscriptionStore = useSubscriptionStore()
const { subscriptions, loading, searchKeyword, sortOrder } = storeToRefs(subscriptionStore)

const actions = useSubscriptionActions('deleted')

const onSearch = (): void => {
  void subscriptionStore.fetchAll()
}

const onSortChange = (): void => {
  void subscriptionStore.fetchAll()
}

const onRestore = (sub: Subscription): void => {
  void actions.handleRestore(sub)
}

onMounted(async () => {
  await subscriptionStore.setView('deleted')
})
</script>

<template>
  <div class="deleted-view">
    <div class="page-header">
      <h1 class="page-title">回收站</h1>
      <p class="page-desc">已软删除的订阅，可随时恢复</p>
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

    <SubscriptionTable
      :subscriptions="subscriptions"
      :loading="loading"
      view="deleted"
      :expandable="false"
      @restore="onRestore"
    />
  </div>
</template>

<style scoped>
.deleted-view {
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

.search-input {
  flex: 1;
  min-width: 12.5rem;
  max-width: 20rem;
}

.sort-select {
  width: auto;
  min-width: 8rem;
}

@media (max-width: 768px) {
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
