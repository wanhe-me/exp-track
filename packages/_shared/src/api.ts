// 跨前后端共享的 API 响应信封契约。
// 后端 helper/response.ts 与前端 helper/api.ts 共用本契约，避免两端各写一份。

export interface ApiSuccess<T> {
  ok: true
  data: T
}

export interface ApiFailure {
  ok: false
  error: {
    code: string
    message: string
    details?: unknown
  }
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure

// 前端沿用历史别名
export type ApiEnvelope<T> = ApiResponse<T>
