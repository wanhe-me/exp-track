import type { ErrorRequestHandler } from 'express'
import { fail } from '../utils/response.js'
import { logger } from '../utils/logger.js'

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const message = err instanceof Error ? err.message : 'Unknown error'
  logger.error('unhandled error', {
    message,
    stack: err instanceof Error ? err.stack : undefined,
  })
  fail(res, 500, 'INTERNAL_ERROR', '服务器内部错误')
}