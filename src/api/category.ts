import { api, unwrap, type ApiEnvelope } from '@/lib/api'
import type { Category } from '@/types'

export const categoryApi = {
  list: async (): Promise<Category[]> => {
    const res = await api.get<ApiEnvelope<Category[]>>('/api/categories')
    return unwrap(res)
  },
  create: async (name: string): Promise<Category> => {
    const res = await api.post<ApiEnvelope<Category>>('/api/categories', { name })
    return unwrap(res)
  },
  update: async (id: number, name: string): Promise<Category> => {
    const res = await api.put<ApiEnvelope<Category>>(`/api/categories/${id}`, { name })
    return unwrap(res)
  },
  remove: async (id: number): Promise<void> => {
    await api.delete(`/api/categories/${id}`)
  },
}
