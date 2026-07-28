import express, { type Express } from 'express'
import cors from 'cors'
import { errorHandler } from '../middlewares/error-handler.js'
import { apiRouter } from '../http/router.js'
import { ok, fail } from '../utils/response.js'

export const createApp = (): Express => {
  const app = express()

  app.disable('x-powered-by')
  app.use(cors({ origin: true, credentials: true }))
  app.use(express.json({ limit: '1mb' }))
  app.use(express.urlencoded({ extended: true }))

  app.get('/', (_req, res) => {
    return ok(res, {
      name: 'exp-track-backend',
      version: '0.0.0',
      api: '/api',
    })
  })

  app.use('/api', apiRouter)

  app.use((req, res) => {
    return fail(res, 404, 'NOT_FOUND', `路由不存在: ${req.method} ${req.originalUrl}`)
  })

  app.use(errorHandler)

  return app
}