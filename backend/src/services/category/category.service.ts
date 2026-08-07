import { z } from 'zod'
import { getDb } from '../../dal/index.js'
import { DomainError } from '../../types/errors.js'
import type { CategoryRow } from '../../types/domain.js'
import type { Category } from '@exp-track/shared'

export const categorySchema = z.object({
  name: z
    .string({ message: '分类名称必填' })
    .trim()
    .min(1, { message: '分类名称不能为空' })
    .max(50, { message: '分类名称长度不能超过 50' }),
})

export type CategoryDto = Category

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

  // 软删除（停用）：不检查是否被订阅引用。
  // 软删后行保留，外键不触发；历史订阅 LEFT JOIN category 仍可显示分类名。
  // list / 下拉只展示未删分类，故被删分类不再可选用于新订阅。
  await getDb().deleteCategory(id)
}
