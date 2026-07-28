import { Router } from 'express'
import { ok } from '../../utils/response.js'
import { asyncHandler } from '../../utils/async-handler.js'
import { getHealthReport } from './health.service.js'

export const healthRouter: Router = Router()

healthRouter.get('/health', asyncHandler(async (_req, res) => {
  const report = await getHealthReport()
  const status = report.status === 'ok' ? 200 : 503
  return ok(res, report, status)
}))
