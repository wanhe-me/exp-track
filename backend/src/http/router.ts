import { Router } from 'express'
import { healthRouter } from '../services/health/health.controller.js'
import { categoryRouter } from '../services/category/category.controller.js'
import { subscriptionRouter } from '../services/subscription/subscription.controller.js'

export const apiRouter: Router = Router()

apiRouter.use(healthRouter)
apiRouter.use('/categories', categoryRouter)
apiRouter.use('/subscriptions', subscriptionRouter)
