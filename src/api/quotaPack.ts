import { api, unwrap, type ApiEnvelope } from '@/helper/api'
import type { QuotaPack, QuotaPackInput, QuotaPackSlotDto, QuotaPackView } from '@exp-track/shared'

export const quotaPackApi = {
  // 卡片槽位：最近一个快到期的 + 未删除未归档总数（FR-12）
  listSlot: async (subscriptionId: number): Promise<QuotaPackSlotDto> => {
    const res = await api.get<ApiEnvelope<QuotaPackSlotDto>>(
      `/api/subscriptions/${subscriptionId}/quota-packs/slot`,
    )
    return unwrap(res)
  },

  list: async (subscriptionId: number, view: QuotaPackView = 'active'): Promise<QuotaPack[]> => {
    const res = await api.get<ApiEnvelope<QuotaPack[]>>(
      `/api/subscriptions/${subscriptionId}/quota-packs`,
      { params: { view } },
    )
    return unwrap(res)
  },

  create: async (subscriptionId: number, input: QuotaPackInput): Promise<QuotaPack> => {
    const res = await api.post<ApiEnvelope<QuotaPack>>(
      `/api/subscriptions/${subscriptionId}/quota-packs`,
      input,
    )
    return unwrap(res)
  },

  update: async (id: number, input: QuotaPackInput): Promise<QuotaPack> => {
    const res = await api.put<ApiEnvelope<QuotaPack>>(`/api/quota-packs/${id}`, input)
    return unwrap(res)
  },

  remove: async (id: number): Promise<void> => {
    await api.delete(`/api/quota-packs/${id}`)
  },

  restore: async (id: number): Promise<QuotaPack> => {
    const res = await api.post<ApiEnvelope<QuotaPack>>(`/api/quota-packs/${id}/restore`)
    return unwrap(res)
  },

  archive: async (id: number): Promise<QuotaPack> => {
    const res = await api.post<ApiEnvelope<QuotaPack>>(`/api/quota-packs/${id}/archive`)
    return unwrap(res)
  },

  unarchive: async (id: number): Promise<QuotaPack> => {
    const res = await api.post<ApiEnvelope<QuotaPack>>(`/api/quota-packs/${id}/unarchive`)
    return unwrap(res)
  },
}
