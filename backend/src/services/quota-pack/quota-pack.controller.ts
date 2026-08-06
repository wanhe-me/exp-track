import { Router } from 'express'
import { z } from 'zod'
import { ok } from '../../utils/response.js'
import { asyncHandler } from '../../utils/async-handler.js'
import { parseId } from '../../http/params.js'
import type { QuotaPackView } from '../../types/domain.js'
import {
  archiveQuotaPack,
  createQuotaPack,
  deleteQuotaPack,
  getQuotaPackById,
  getQuotaPackSlot,
  listQuotaPacks,
  restoreQuotaPack,
  unarchiveQuotaPack,
  updateQuotaPack,
} from './quota-pack.service.js'

const parseView = (raw: unknown): QuotaPackView =>
  z.enum(['active', 'archived', 'deleted']).default('active').parse(raw)

// 嵌套路由：挂在 /subscriptions，路径含 /:subscriptionId/quota-packs
// （route 层参数，Express 稳定支持；不依赖 router.use 的参数化挂载路径）
export const quotaPackNestedRouter: Router = Router()

// /slot 必须在 list 之前注册，避免被更宽泛路径吞掉
quotaPackNestedRouter.get(
  '/:subscriptionId/quota-packs/slot',
  asyncHandler(async (req, res) => {
    const subscriptionId = parseId(req.params.subscriptionId)
    const data = await getQuotaPackSlot(subscriptionId)
    return ok(res, data)
  }),
)

quotaPackNestedRouter.get(
  '/:subscriptionId/quota-packs',
  asyncHandler(async (req, res) => {
    const subscriptionId = parseId(req.params.subscriptionId)
    const view = parseView(req.query.view)
    const data = await listQuotaPacks(subscriptionId, view)
    return ok(res, data)
  }),
)

quotaPackNestedRouter.post(
  '/:subscriptionId/quota-packs',
  asyncHandler(async (req, res) => {
    const subscriptionId = parseId(req.params.subscriptionId)
    const data = await createQuotaPack(subscriptionId, req.body)
    return ok(res, data, 201)
  }),
)

// 扁平路由：挂在 /quota-packs
export const quotaPackItemRouter: Router = Router()

quotaPackItemRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id)
    const data = await getQuotaPackById(id)
    return ok(res, data)
  }),
)

quotaPackItemRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id)
    const data = await updateQuotaPack(id, req.body)
    return ok(res, data)
  }),
)

quotaPackItemRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id)
    await deleteQuotaPack(id)
    return ok(res, { id })
  }),
)

quotaPackItemRouter.post(
  '/:id/restore',
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id)
    const data = await restoreQuotaPack(id)
    return ok(res, data)
  }),
)

quotaPackItemRouter.post(
  '/:id/archive',
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id)
    const data = await archiveQuotaPack(id)
    return ok(res, data)
  }),
)

quotaPackItemRouter.post(
  '/:id/unarchive',
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id)
    const data = await unarchiveQuotaPack(id)
    return ok(res, data)
  }),
)
