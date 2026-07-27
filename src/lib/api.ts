import axios, { type AxiosInstance, type AxiosResponse } from 'axios'

const baseURL = (import.meta.env.VITE_API_BASE_URL as string | undefined)
  || 'http://127.0.0.1:15180'

export interface ApiEnvelope<T> {
  ok: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown
  }
}

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
      const err = new Error(payload.error?.message ?? '业务错误') as Error & {
        code?: string
        details?: unknown
      }
      err.code = payload.error?.code
      err.details = payload.error?.details
      return Promise.reject(err)
    }
    return response
  },
  (error) => {
    if (error.response) {
      const payload = error.response.data as ApiEnvelope<unknown> | undefined
      const message = payload?.error?.message ?? `请求失败: ${error.response.status}`
      const wrapped = new Error(message) as Error & {
        code?: string
        status?: number
        details?: unknown
      }
      wrapped.code = payload?.error?.code
      wrapped.status = error.response.status
      wrapped.details = payload?.error?.details
      return Promise.reject(wrapped)
    }
    return Promise.reject(error)
  },
)

export const unwrap = <T>(response: AxiosResponse<ApiEnvelope<T>>): T => {
  if (!response.data.data) {
    throw new Error('响应数据为空')
  }
  return response.data.data
}