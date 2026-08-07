<script setup lang="ts">
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useSubscriptionStore } from '@/stores/subscription'
import { useSubscriptionActions } from '@/composables/useSubscriptionActions'
import SubscriptionTable from '@/components/management/SubscriptionTable.vue'
import { AppButton, AppInput, AppSelect } from '@/components/base'
import type { Subscription } from '@exp-track/shared'

const subscriptionStore = useSubscriptionStore()
const { subscriptions, loading, searchKeyword, sortOrder } = storeToRefs(subscriptionStore)

const sortOptions: { value: 'asc' | 'desc'; label: string }[] = [
  { value: 'asc', label: '到期时间 ↑' },
  { value: 'desc', label: '到期时间 ↓' },
]

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
      <AppInput v-model="searchKeyword" placeholder="搜索订阅名称..." @keyup.enter="onSearch" />
      <AppSelect v-model="sortOrder" :options="sortOptions" @change="onSortChange" />
      <AppButton size="sm" @click="onSearch">筛选</AppButton>
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
