import { api, unwrap, type ApiEnvelope } from '@/lib/api'
import type { PaginatedResult, Subscription, SubscriptionInput, SubscriptionView } from '@/types'

export const subscriptionApi = {
  list: async (params?: {
    view?: SubscriptionView
    categoryId?: number
    search?: string
    page?: number
    pageSize?: number
  }): Promise<PaginatedResult<Subscription>> => {
    const res = await api.get<ApiEnvelope<PaginatedResult<Subscription>>>('/api/subscriptions', {
      params,
    })
    return unwrap(res)
  },
  getById: async (id: number): Promise<Subscription> => {
    const res = await api.get<ApiEnvelope<Subscription>>(`/api/subscriptions/${id}`)
    return unwrap(res)
  },
  create: async (input: SubscriptionInput): Promise<Subscription> => {
    const res = await api.post<ApiEnvelope<Subscription>>('/api/subscriptions', input)
    return unwrap(res)
  },
  update: async (id: number, input: SubscriptionInput): Promise<Subscription> => {
    const res = await api.put<ApiEnvelope<Subscription>>(`/api/subscriptions/${id}`, input)
    return unwrap(res)
  },
  remove: async (id: number): Promise<void> => {
    await api.delete(`/api/subscriptions/${id}`)
  },
  restore: async (id: number): Promise<Subscription> => {
    const res = await api.post<ApiEnvelope<Subscription>>(
      `/api/subscriptions/${id}/restore`,
    )
    return unwrap(res)
  },
  archive: async (id: number): Promise<Subscription> => {
    const res = await api.post<ApiEnvelope<Subscription>>(
      `/api/subscriptions/${id}/archive`,
    )
    return unwrap(res)
  },
  unarchive: async (id: number): Promise<Subscription> => {
    const res = await api.post<ApiEnvelope<Subscription>>(
      `/api/subscriptions/${id}/unarchive`,
    )
    return unwrap(res)
  },
}
