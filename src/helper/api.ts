import axios, { type AxiosInstance, type AxiosResponse } from 'axios'
import type { ApiEnvelope } from '@exp-track/shared'

// 对外暴露信封类型，供 api/ 层直接从 @/helper/api 引入
export type { ApiEnvelope } from '@exp-track/shared'

const baseURL = (import.meta.env.VITE_API_BASE_URL as string | undefined)
  || 'http://127.0.0.1:15180'

export const api: AxiosInstance = axios.create({
  baseURL,
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.response.use(
  (response: AxiosResponse<ApiEnvelope<unknown>>) => {
    const payload = response.data
    if (payload && payload.ok === false) {
      const err = new Error(payload.error.message ?? '业务错误') as Error & {
        code?: string
        details?: unknown
      }
      err.code = payload.error.code
      err.details = payload.error.details
      return Promise.reject(err)
    }
    return response
  },
  (error) => {
    if (error.response) {
      const payload = error.response.data as ApiEnvelope<unknown> | undefined
      const ok = payload?.ok === false
      const message = ok
        ? (payload.error.message ?? `请求失败: ${error.response.status}`)
        : `请求失败: ${error.response.status}`
      const wrapped = new Error(message) as Error & {
        code?: string
        status?: number
        details?: unknown
      }
      if (ok) {
        wrapped.code = payload!.error.code
        wrapped.details = payload!.error.details
      }
      wrapped.status = error.response.status
      return Promise.reject(wrapped)
    }
    return Promise.reject(error)
  },
)

export const unwrap = <T>(response: AxiosResponse<ApiEnvelope<T>>): T => {
  const payload = response.data
  if (payload.ok !== true) {
    throw new Error('响应数据为空')
  }
  return payload.data
}
