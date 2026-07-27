import { Router } from 'express'
import { healthRouter } from '../services/health/health.controller.js'

export const apiRouter: Router = Router()

apiRouter.use(healthRouter)