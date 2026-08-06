import { Router } from 'express'
import { z } from 'zod'
import { ok } from '../../helper/response.js'
import { asyncHandler } from '../../helper/async-handler.js'
import { parseId } from '../../http/params.js'
import type { SubscriptionView } from '@exp-track/shared'
import {
  archiveSubscription,
  createSubscription,
  deleteSubscription,
  getSubscriptionById,
  listSubscriptions,
  restoreSubscription,
  unarchiveSubscription,
  updateSubscription,
} from './subscription.service.js'

export const subscriptionRouter: Router = Router()

const parseView = (raw: unknown): SubscriptionView =>
  z.enum(['active', 'archived', 'deleted']).default('active').parse(raw)

const parsePage = (raw: unknown): number =>
  z.coerce.number().int().min(1).default(1).parse(raw)

const parsePageSize = (raw: unknown): number =>
  z.coerce.number().int().min(1).max(100).default(20).parse(raw)

const parseSortBy = (raw: unknown): 'expireDate' | 'createdAt' =>
  z.enum(['expireDate', 'createdAt']).default('expireDate').parse(raw)

const parseSortOrder = (raw: unknown): 'asc' | 'desc' =>
  z.enum(['asc', 'desc']).default('asc').parse(raw)

subscriptionRouter.get('/', asyncHandler(async (req, res) => {
  const view = parseView(req.query.view)
  const page = parsePage(req.query.page)
  const pageSize = parsePageSize(req.query.pageSize)
  const sortBy = parseSortBy(req.query.sortBy)
  const sortOrder = parseSortOrder(req.query.sortOrder)
  const categoryIdRaw = req.query.categoryId
  const categoryId =
    categoryIdRaw !== undefined && categoryIdRaw !== ''
      ? z.coerce.number().int().positive().parse(categoryIdRaw)
      : undefined
  const search =
    typeof req.query.search === 'string' && req.query.search.trim()
      ? req.query.search.trim()
      : undefined

  const data = await listSubscriptions(view, page, pageSize, categoryId, search, sortBy, sortOrder)
  return ok(res, data)
}))

subscriptionRouter.get('/:id', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id)
  const data = await getSubscriptionById(id)
  return ok(res, data)
}))

subscriptionRouter.post('/', asyncHandler(async (req, res) => {
  const data = await createSubscription(req.body)
  return ok(res, data, 201)
}))

subscriptionRouter.put('/:id', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id)
  const data = await updateSubscription(id, req.body)
  return ok(res, data)
}))

subscriptionRouter.delete('/:id', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id)
  await deleteSubscription(id)
  return ok(res, { id })
}))

subscriptionRouter.post('/:id/restore', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id)
  const data = await restoreSubscription(id)
  return ok(res, data)
}))

subscriptionRouter.post('/:id/archive', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id)
  const data = await archiveSubscription(id)
  return ok(res, data)
}))

subscriptionRouter.post('/:id/unarchive', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id)
  const data = await unarchiveSubscription(id)
  return ok(res, data)
}))
