<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useSubscriptionStore } from '@/stores/subscription'
import { useSubscriptionActions } from '@/composables/useSubscriptionActions'
import SubscriptionCard from '@/components/SubscriptionCard.vue'
import SubscriptionDetailDialog from '@/components/SubscriptionDetailDialog.vue'
import EmptyState from '@/components/base/display/EmptyState.vue'
import type { Subscription } from '@/types'

const subscriptionStore = useSubscriptionStore()
const { subscriptions, loading } = storeToRefs(subscriptionStore)

const actions = useSubscriptionActions('deleted')

const detailVisible = ref(false)
const detailTarget = ref<Subscription | null>(null)

const openDetail = (sub: Subscription): void => {
  detailTarget.value = sub
  detailVisible.value = true
}

const onDetailRestore = (sub: Subscription): void => {
  detailVisible.value = false
  actions.handleRestore(sub)
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

    <div v-if="loading" class="loading-state">加载中...</div>

    <EmptyState
      v-else-if="subscriptions.length === 0"
      title="回收站为空"
      description="删除的订阅会暂存在这里，可恢复"
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
      view="deleted"
      @restore="onDetailRestore"
    />
  </div>
</template>

<style scoped>
.deleted-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}
</style>
