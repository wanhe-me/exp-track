import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { subscriptionApi } from '@/api/subscription'
import {
  domainConfig,
  type Subscription,
  type SubscriptionInput,
  type SubscriptionStatus,
  type SubscriptionView,
} from '@exp-track/shared'

export const useSubscriptionStore = defineStore('subscription', () => {
  const subscriptions = ref<Subscription[]>([])
  const total = ref(0)
  const loading = ref(false)
  const currentView = ref<SubscriptionView>('active')
  const filterCategoryId = ref<number | undefined>(undefined)
  const searchKeyword = ref('')
  const filterStatus = ref<SubscriptionStatus | undefined>(undefined)
  const sortBy = ref<'expireDate' | 'createdAt'>('expireDate')
  const sortOrder = ref<'asc' | 'desc'>('asc')

  // 后端列表接口默认每页 20 条。看板 / 时间轴 / 归档 / 回收站都需要全量数据，
  // 传一页就会静默丢数据，故这里按页拉满 total 为止（个人场景通常 1 页即取完）。
  const PAGE_SIZE = 100

  const fetchAll = async (): Promise<void> => {
    loading.value = true
    try {
      const collected: Subscription[] = []
      let page = 1
      let totalCount = 0

      for (;;) {
        const result = await subscriptionApi.list({
          view: currentView.value,
          categoryId: filterCategoryId.value,
          search: searchKeyword.value.trim() || undefined,
          status: filterStatus.value,
          sortBy: sortBy.value,
          sortOrder: sortOrder.value,
          page,
          pageSize: PAGE_SIZE,
        })
        collected.push(...result.items)
        totalCount = result.total
        // 空页即终止：total 与实际返回不一致时避免死循环
        if (result.items.length === 0 || collected.length >= totalCount) break
        page += 1
      }

      subscriptions.value = collected
      total.value = totalCount
    } finally {
      loading.value = false
    }
  }

  // 清空页面级筛选条件
  const resetFilters = (): void => {
    filterCategoryId.value = undefined
    searchKeyword.value = ''
    filterStatus.value = undefined
  }

  const setView = async (view: SubscriptionView): Promise<void> => {
    currentView.value = view
    // 进入任一视图都视为重新开始：清空上一页面遗留的搜索 / 分类 / 状态条件，
    // 否则归档页、回收站、时间轴会继承看板筛选且页面上无处清除。
    resetFilters()
    await fetchAll()
  }

  const create = async (input: SubscriptionInput): Promise<Subscription> => {
    const created = await subscriptionApi.create(input)
    await fetchAll()
    return created
  }

  const update = async (id: number, input: SubscriptionInput): Promise<Subscription> => {
    const updated = await subscriptionApi.update(id, input)
    await fetchAll()
    return updated
  }

  const remove = async (id: number): Promise<void> => {
    await subscriptionApi.remove(id)
    subscriptions.value = subscriptions.value.filter((s) => s.id !== id)
  }

  const restore = async (id: number): Promise<void> => {
    await subscriptionApi.restore(id)
    subscriptions.value = subscriptions.value.filter((s) => s.id !== id)
  }

  const archive = async (id: number): Promise<void> => {
    await subscriptionApi.archive(id)
    subscriptions.value = subscriptions.value.filter((s) => s.id !== id)
  }

  const unarchive = async (id: number): Promise<void> => {
    await subscriptionApi.unarchive(id)
    subscriptions.value = subscriptions.value.filter((s) => s.id !== id)
  }

  // 时间轴数据：未来 N 天内到期的有效订阅
  const timelineSubscriptions = computed<Subscription[]>(() => {
    if (currentView.value !== 'active') return []
    const range = domainConfig.timeline.rangeDays
    return subscriptions.value.filter(
      (s) => s.remainingDays >= 0 && s.remainingDays <= range,
    )
  })

  return {
    subscriptions,
    total,
    loading,
    currentView,
    filterCategoryId,
    searchKeyword,
    filterStatus,
    sortBy,
    sortOrder,
    fetchAll,
    resetFilters,
    setView,
    create,
    update,
    remove,
    restore,
    archive,
    unarchive,
    timelineSubscriptions,
  }
})
