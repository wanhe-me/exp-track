import { defineStore } from 'pinia'
import { ref } from 'vue'
import { quotaPackApi } from '@/api/quotaPack'
import type { QuotaPack, QuotaPackInput, QuotaPackSlotDto, QuotaPackView } from '@exp-track/shared'

/**
 * 额度包状态：按订阅维度组织。
 * - slots：看板卡片槽位（每个订阅一条，FR-12 最近到期 + 总数）
 * - packsBySubscription：订阅管理面板展开时该订阅的额度包列表
 */
export const useQuotaPackStore = defineStore('quotaPack', () => {
  // 订阅 ID -> 槽位 DTO
  const slots = ref<Record<number, QuotaPackSlotDto | undefined>>({})
  // 订阅 ID -> 额度包列表（面板展开时加载）
  const packsBySubscription = ref<Record<number, QuotaPack[] | undefined>>({})
  // 订阅 ID -> 当前面板展示的视图
  const packsView = ref<Record<number, QuotaPackView>>({})

  const loadingSlots = ref(false)
  const loadingPacks = ref<Record<number, boolean>>({})

  // ---- 槽位（看板用）----

  const fetchSlot = async (subscriptionId: number): Promise<void> => {
    const slot = await quotaPackApi.listSlot(subscriptionId)
    slots.value[subscriptionId] = slot
  }

  // 并发拉取多个订阅的槽位（看板加载后批量调用）
  const fetchSlots = async (subscriptionIds: number[]): Promise<void> => {
    if (subscriptionIds.length === 0) return
    loadingSlots.value = true
    try {
      await Promise.all(subscriptionIds.map((id) => fetchSlot(id)))
    } finally {
      loadingSlots.value = false
    }
  }

  const clearSlots = (): void => {
    slots.value = {}
  }

  // ---- 额度包列表（管理面板用）----

  const fetchPacks = async (
    subscriptionId: number,
    view: QuotaPackView = 'active',
  ): Promise<void> => {
    loadingPacks.value[subscriptionId] = true
    try {
      const list = await quotaPackApi.list(subscriptionId, view)
      packsBySubscription.value[subscriptionId] = list
      packsView.value[subscriptionId] = view
    } finally {
      loadingPacks.value[subscriptionId] = false
    }
  }

  const getPacks = (subscriptionId: number): QuotaPack[] => {
    return packsBySubscription.value[subscriptionId] ?? []
  }

  const getPacksView = (subscriptionId: number): QuotaPackView => {
    return packsView.value[subscriptionId] ?? 'active'
  }

  const isLoadingPacks = (subscriptionId: number): boolean => {
    return loadingPacks.value[subscriptionId] ?? false
  }

  const clearPacks = (subscriptionId: number): void => {
    delete packsBySubscription.value[subscriptionId]
    delete packsView.value[subscriptionId]
    delete loadingPacks.value[subscriptionId]
  }

  // ---- CRUD ----

  const create = async (subscriptionId: number, input: QuotaPackInput): Promise<QuotaPack> => {
    const created = await quotaPackApi.create(subscriptionId, input)
    // 刷新槽位 + 当前列表
    await Promise.all([
      fetchSlot(subscriptionId),
      fetchPacks(subscriptionId, getPacksView(subscriptionId)),
    ])
    return created
  }

  const update = async (
    subscriptionId: number,
    id: number,
    input: QuotaPackInput,
  ): Promise<QuotaPack> => {
    const updated = await quotaPackApi.update(id, input)
    await Promise.all([
      fetchSlot(subscriptionId),
      fetchPacks(subscriptionId, getPacksView(subscriptionId)),
    ])
    return updated
  }

  const remove = async (subscriptionId: number, id: number): Promise<void> => {
    await quotaPackApi.remove(id)
    await Promise.all([
      fetchSlot(subscriptionId),
      fetchPacks(subscriptionId, getPacksView(subscriptionId)),
    ])
  }

  const restore = async (subscriptionId: number, id: number): Promise<void> => {
    await quotaPackApi.restore(id)
    await fetchPacks(subscriptionId, getPacksView(subscriptionId))
  }

  const archive = async (subscriptionId: number, id: number): Promise<void> => {
    await quotaPackApi.archive(id)
    await Promise.all([
      fetchSlot(subscriptionId),
      fetchPacks(subscriptionId, getPacksView(subscriptionId)),
    ])
  }

  const unarchive = async (subscriptionId: number, id: number): Promise<void> => {
    await quotaPackApi.unarchive(id)
    await Promise.all([
      fetchSlot(subscriptionId),
      fetchPacks(subscriptionId, getPacksView(subscriptionId)),
    ])
  }

  return {
    slots,
    packsBySubscription,
    loadingSlots,
    fetchSlot,
    fetchSlots,
    clearSlots,
    fetchPacks,
    getPacks,
    getPacksView,
    isLoadingPacks,
    clearPacks,
    create,
    update,
    remove,
    restore,
    archive,
    unarchive,
  }
})
