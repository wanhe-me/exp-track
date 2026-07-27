import { Router } from 'express'
import { ok } from '../../utils/response.js'
import { DomainError } from '../../dal/types.js'
import {
  categorySchema,
  createCategory,
  deleteCategory,
  getCategoryById,
  listCategories,
  updateCategory,
} from './category.service.js'

export const categoryRouter: Router = Router()

// 获取分类列表
categoryRouter.get('/', async (_req, res, next) => {
  try {
    const data = await listCategories()
    return ok(res, data)
  } catch (err) {
    next(err)
  }
})

// 获取单个分类
categoryRouter.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) {
      throw new DomainError('INVALID_ID', '无效的分类 id', 400)
    }
    const data = await getCategoryById(id)
    return ok(res, data)
  } catch (err) {
    next(err)
  }
})

// 创建分类
categoryRouter.post('/', async (req, res, next) => {
  try {
    const data = await createCategory(categorySchema.parse(req.body))
    return ok(res, data, 201)
  } catch (err) {
    next(err)
  }
})

// 更新分类
categoryRouter.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) {
      throw new DomainError('INVALID_ID', '无效的分类 id', 400)
    }
    const data = await updateCategory(id, categorySchema.parse(req.body))
    return ok(res, data)
  } catch (err) {
    next(err)
  }
})

// 删除分类
categoryRouter.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) {
      throw new DomainError('INVALID_ID', '无效的分类 id', 400)
    }
    await deleteCategory(id)
    return ok(res, { id })
  } catch (err) {
    next(err)
  }
})
