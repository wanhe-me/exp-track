import { Router } from 'express'
import { ok } from '../../utils/response.js'
import { getHealthReport } from './health.service.js'

export const healthRouter: Router = Router()

healthRouter.get('/health', async (_req, res, next) => {
  try {
    const report = await getHealthReport()
    const status = report.status === 'ok' ? 200 : 503
    return ok(res, report, status)
  } catch (err) {
    next(err)
  }
})