import type { Response } from 'express'
import type { ApiFailure, ApiSuccess } from '@exp-track/shared'

// 响应信封契约（ApiSuccess / ApiFailure / ApiResponse）由 @exp-track/shared 单一来源；
// 此处仅保留与 express 耦合的 ok/fail 封装。
export type { ApiResponse } from '@exp-track/shared'

export const ok = <T>(res: Response, data: T, status = 200): Response => {
  const payload: ApiSuccess<T> = { ok: true, data }
  return res.status(status).json(payload)
}

export const fail = (
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: unknown,
): Response => {
  const payload: ApiFailure = {
    ok: false,
    error: { code, message, details },
  }
  return res.status(status).json(payload)
}
