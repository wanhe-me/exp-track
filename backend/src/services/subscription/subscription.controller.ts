import { Router } from 'express'
import { z } from 'zod'
import { ok } from '../../utils/response.js'
import { DomainError } from '../../dal/types.js'
import type { SubscriptionView } from '../../config/index.js'
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

const parseId = (raw: string): number => {
  const id = Number(raw)
  if (!Number.isInteger(id) || id <= 0) {
    throw new DomainError('INVALID_ID', '无效的 id', 400)
  }
  return id
}

const parseView = (raw: unknown): SubscriptionView => {
  const view = z
    .enum(['active', 'archived', 'deleted'])
    .default('active')
    .parse(raw)
  return view
}

// 列表（支持 view / categoryId / search 查询参数）
subscriptionRouter.get('/', async (req, res, next) => {
  try {
    const view = parseView(req.query.view)
    const categoryIdRaw = req.query.categoryId
    const categoryId =
      categoryIdRaw !== undefined && categoryIdRaw !== ''
        ? z.coerce.number().int().positive().parse(categoryIdRaw)
        : undefined
    const search =
      typeof req.query.search === 'string' && req.query.search.trim()
        ? req.query.search.trim()
        : undefined

    const data = await listSubscriptions(view, categoryId, search)
    return ok(res, data)
  } catch (err) {
    next(err)
  }
})

// 单个详情
subscriptionRouter.get('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id)
    const data = await getSubscriptionById(id)
    return ok(res, data)
  } catch (err) {
    next(err)
  }
})

// 创建
subscriptionRouter.post('/', async (req, res, next) => {
  try {
    const data = await createSubscription(req.body)
    return ok(res, data, 201)
  } catch (err) {
    next(err)
  }
})

// 更新
subscriptionRouter.put('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id)
    const data = await updateSubscription(id, req.body)
    return ok(res, data)
  } catch (err) {
    next(err)
  }
})

// 软删除
subscriptionRouter.delete('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id)
    await deleteSubscription(id)
    return ok(res, { id })
  } catch (err) {
    next(err)
  }
})

// 恢复软删除
subscriptionRouter.post('/:id/restore', async (req, res, next) => {
  try {
    const id = parseId(req.params.id)
    const data = await restoreSubscription(id)
    return ok(res, data)
  } catch (err) {
    next(err)
  }
})

// 归档
subscriptionRouter.post('/:id/archive', async (req, res, next) => {
  try {
    const id = parseId(req.params.id)
    const data = await archiveSubscription(id)
    return ok(res, data)
  } catch (err) {
    next(err)
  }
})

// 取消归档
subscriptionRouter.post('/:id/unarchive', async (req, res, next) => {
  try {
    const id = parseId(req.params.id)
    const data = await unarchiveSubscription(id)
    return ok(res, data)
  } catch (err) {
    next(err)
  }
})
