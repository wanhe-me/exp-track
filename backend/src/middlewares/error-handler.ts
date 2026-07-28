import type { ErrorRequestHandler } from 'express'
import { ZodError } from 'zod'
import { fail } from '../utils/response.js'
import { logger } from '../utils/logger.js'
import { DomainError } from '../types/errors.js'

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  // 业务领域错误
  if (err instanceof DomainError) {
    return fail(res, err.status, err.code, err.message, err.details)
  }

  // 校验错误（zod）
  if (err instanceof ZodError) {
    const messages = err.issues.map((i) => i.message).join('; ')
    return fail(res, 400, 'VALIDATION_ERROR', messages || '参数校验失败', err.issues)
  }

  const message = err instanceof Error ? err.message : 'Unknown error'
  logger.error('unhandled error', {
    message,
    stack: err instanceof Error ? err.stack : undefined,
  })
  return fail(res, 500, 'INTERNAL_ERROR', '服务器内部错误')
}
