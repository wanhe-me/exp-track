import type { RequestHandler } from 'express'
import { logger } from '../utils/logger.js'

export const requestLogger: RequestHandler = (req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    const duration = Date.now() - start
    logger.info('request', {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: duration,
    })
  })
  next()
}