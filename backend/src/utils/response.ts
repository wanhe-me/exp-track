import type { Response } from 'express'

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