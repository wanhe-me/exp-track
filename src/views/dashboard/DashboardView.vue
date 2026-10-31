<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useCategoryStore } from '@/stores/category'
import { useSubscriptionStore } from '@/stores/subscription'
import { useQuotaPackStore } from '@/stores/quotaPack'
import SubscriptionCard from '@/components/subscription/SubscriptionCard.vue'
import SubscriptionDetailDialog from '@/components/subscription/SubscriptionDetailDialog.vue'
import EmptyState from '@/components/base/display/EmptyState.vue'
import { AppButton } from '@/components/base'
import type { Subscription } from '@exp-track/shared'

const router = useRouter()
const categoryStore = useCategoryStore()
const subscriptionStore = useSubscriptionStore()
const quotaPackStore = useQuotaPackStore()
const { subscriptions, loading } = storeToRefs(subscriptionStore)

const detailVisible = ref(false)
const detailTarget = ref<Subscription | null>(null)

const openDetail = (sub: Subscription): void => {
  detailTarget.value = sub
  detailVisible.value = true
}

// 从详情跳转到订阅管理（数据维护集中在管理页）
const goToManagement = (): void => {
  detailVisible.value = false
  void router.push('/management')
}

onMounted(async () => {
  await Promise.all([categoryStore.fetchAll(), subscriptionStore.setView('active')])
  // 只有额度型订阅才有额度包槽位；按类型过滤后再拉，避免为每个订阅各发一次请求
  const ids = subscriptions.value
    .filter((s) => s.subscriptionType === 'quota')
    .map((s) => s.id)
  if (ids.length > 0) {
    void quotaPackStore.fetchSlots(ids)
  }
})
</script>

<template>
  <div class="dashboard">
    <div class="page-header">
      <h1 class="page-title">到期看板</h1>
      <p class="page-desc">集中查看订阅到期，临期自动提醒</p>
    </div>

    <div v-if="loading" class="loading-state">加载中...</div>

    <EmptyState
      v-else-if="subscriptions.length === 0"
      title="暂无订阅"
      description="前往「订阅管理」添加你的第一项订阅"
    >
      <AppButton variant="primary" style="margin-top: 1rem" @click="router.push('/management')">
        去订阅管理
      </AppButton>
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
      readonly
      @go-management="goToManagement"
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
  flex-direction: column;
  gap: var(--space-1);
}

.page-desc {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  margin: 0;
}
</style>
