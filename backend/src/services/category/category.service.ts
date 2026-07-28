import { z } from 'zod'
import { getDb } from '../../dal/index.js'
import { DomainError } from '../../types/errors.js'
import type { CategoryRow } from '../../types/domain.js'

export const categorySchema = z.object({
  name: z
    .string({ message: '分类名称必填' })
    .trim()
    .min(1, { message: '分类名称不能为空' })
    .max(50, { message: '分类名称长度不能超过 50' }),
})

export interface CategoryDto {
  id: number
  name: string
  createdAt: string
  updatedAt: string
}

const toDto = (row: CategoryRow): CategoryDto => ({
  id: row.id,
  name: row.name,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
})

export const listCategories = async (): Promise<CategoryDto[]> => {
  const rows = await getDb().listCategories()
  return rows.map(toDto)
}

export const getCategoryById = async (id: number): Promise<CategoryDto> => {
  const row = await getDb().getCategoryById(id)
  if (!row) {
    throw new DomainError('CATEGORY_NOT_FOUND', `分类不存在: id=${id}`, 404)
  }
  return toDto(row)
}

export const createCategory = async (input: { name: string }): Promise<CategoryDto> => {
  const parsed = categorySchema.parse(input)

  const existing = await getDb().getCategoryByName(parsed.name)
  if (existing) {
    throw new DomainError('CATEGORY_NAME_DUPLICATE', '分类名称已存在', 409)
  }

  const row = await getDb().createCategory({ name: parsed.name })
  return toDto(row)
}

export const updateCategory = async (
  id: number,
  input: { name: string },
): Promise<CategoryDto> => {
  const parsed = categorySchema.parse(input)

  const target = await getDb().getCategoryById(id)
  if (!target) {
    throw new DomainError('CATEGORY_NOT_FOUND', `分类不存在: id=${id}`, 404)
  }

  if (target.name !== parsed.name) {
    const dup = await getDb().getCategoryByName(parsed.name)
    if (dup) {
      throw new DomainError('CATEGORY_NAME_DUPLICATE', '分类名称已存在', 409)
    }
  }

  const row = await getDb().updateCategory(id, { name: parsed.name })
  if (!row) {
    throw new DomainError('CATEGORY_NOT_FOUND', `分类不存在: id=${id}`, 404)
  }
  return toDto(row)
}

export const deleteCategory = async (id: number): Promise<void> => {
  const target = await getDb().getCategoryById(id)
  if (!target) {
    throw new DomainError('CATEGORY_NOT_FOUND', `分类不存在: id=${id}`, 404)
  }

  // 禁止删除被引用分类（FR-10）
  const count = await getDb().countSubscriptionsByCategory(id)
  if (count > 0) {
    throw new DomainError(
      'CATEGORY_IN_USE',
      `分类「${target.name}」仍有 ${count} 个订阅引用，请先迁移或重分类后删除`,
      409,
      { referencedCount: count },
    )
  }

  await getDb().deleteCategory(id)
}
