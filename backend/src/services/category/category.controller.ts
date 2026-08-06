import { Router } from 'express'
import { ok } from '../../helper/response.js'
import { asyncHandler } from '../../helper/async-handler.js'
import { parseId } from '../../http/params.js'
import {
  categorySchema,
  createCategory,
  deleteCategory,
  getCategoryById,
  listCategories,
  updateCategory,
} from './category.service.js'

export const categoryRouter: Router = Router()

categoryRouter.get('/', asyncHandler(async (_req, res) => {
  const data = await listCategories()
  return ok(res, data)
}))

categoryRouter.get('/:id', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id)
  const data = await getCategoryById(id)
  return ok(res, data)
}))

categoryRouter.post('/', asyncHandler(async (req, res) => {
  const data = await createCategory(categorySchema.parse(req.body))
  return ok(res, data, 201)
}))

categoryRouter.put('/:id', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id)
  const data = await updateCategory(id, categorySchema.parse(req.body))
  return ok(res, data)
}))

categoryRouter.delete('/:id', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id)
  await deleteCategory(id)
  return ok(res, { id })
}))
