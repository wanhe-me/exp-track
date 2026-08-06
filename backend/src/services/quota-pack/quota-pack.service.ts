import { z } from 'zod'
import { config } from '../../config/index.js'
import { getDb } from '../../dal/index.js'
import { DomainError } from '../../types/errors.js'
import type { QuotaPack, QuotaPackSlotDto, QuotaPackView } from '@exp-track/shared'
import type { QuotaPackRow } from '../../types/domain.js'
import {
  calcRemainingDays,
  calcStatus,
  isExpireOnAfterStart,
  isValidDateStr,
} from '../../utils/date.js'

// 数量：非负、2 位小数（DECIMAL(12,2)）
const quantityField = z
  .number({ message: '数量必填' })
  .nonnegative({ message: '数量不能为负' })
  .refine((v) => Math.round(v * 100) === v * 100, { message: '数量精度不能超过 2 位小数' })

export const quotaPackSchema = z.object({
  name: z
    .string({ message: '名称必填' })
    .trim()
    .min(1, { message: '名称不能为空' })
    .max(100, { message: '名称长度不能超过 100' }),
  quantity: quantityField,
  unit: z
    .string({ message: '单位必填' })
    .trim()
    .min(1, { message: '单位不能为空' })
    .max(32, { message: '单位长度不能超过 32' }),
  obtainedDate: z
    .string({ message: '获得日期必填' })
    .refine(isValidDateStr, { message: '获得日期格式必须为 YYYY-MM-DD' }),
  expireDate: z
    .string({ message: '失效日期必填' })
    .refine(isValidDateStr, { message: '失效日期格式必须为 YYYY-MM-DD' }),
  source: z.string().max(50, { message: '来源长度不能超过 50' }).nullable().optional(),
  // 对齐 schema.sql quota_pack.note VARCHAR(500)
  note: z.string().max(500, { message: '备注长度不能超过 500' }).nullable().optional(),
})

export type QuotaPackDto = QuotaPack

const buildDto = (row: QuotaPackRow): QuotaPackDto => {
  const remainingDays = calcRemainingDays(row.expireDate)
  return {
    id: row.id,
    subscriptionId: row.subscriptionId,
    name: row.name,
    quantity: row.quantity,
    unit: row.unit,
    obtainedDate: row.obtainedDate,
    expireDate: row.expireDate,
    source: row.source,
    note: row.note,
    archived: row.archived,
    deletedAt: row.deletedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    remainingDays,
    status: calcStatus(remainingDays),
  }
}

// 失效日期不得早于获得日期（FR-11）
const validateCrossFields = (obtainedDate: string, expireDate: string): void => {
  if (!isExpireOnAfterStart(obtainedDate, expireDate)) {
    throw new DomainError(
      'INVALID_DATE_RANGE',
      '失效日期不得早于获得日期',
      400,
      { obtainedDate, expireDate },
    )
  }
}

const validateSubscriptionExists = async (subscriptionId: number) => {
  const sub = await getDb().getSubscriptionById(subscriptionId)
  if (!sub) {
    throw new DomainError('SUBSCRIPTION_NOT_FOUND', `订阅不存在: id=${subscriptionId}`, 404)
  }
  return sub
}

const validateSubscriptionActive = async (subscriptionId: number) => {
  const sub = await validateSubscriptionExists(subscriptionId)
  if (sub.deletedAt !== null) {
    throw new DomainError('SUBSCRIPTION_DELETED', '已删除的订阅不能添加额度包', 400)
  }
  return sub
}

// 惰性归档：将失效超过宽限期的额度包置 archived=true（FR-13）
const lazyArchiveExpired = async (subscriptionId: number): Promise<void> => {
  await getDb().archiveExpiredQuotaPacks(
    subscriptionId,
    config.domain.quotaPack.archiveGraceDays,
  )
}

export const listQuotaPacks = async (
  subscriptionId: number,
  view: QuotaPackView,
): Promise<QuotaPackDto[]> => {
  await validateSubscriptionExists(subscriptionId)
  await lazyArchiveExpired(subscriptionId)
  const rows = await getDb().listQuotaPacks({ view, subscriptionId })
  return rows.map(buildDto)
}

export const getQuotaPackById = async (id: number): Promise<QuotaPackDto> => {
  const row = await getDb().getQuotaPackById(id)
  if (!row) {
    throw new DomainError('QUOTA_PACK_NOT_FOUND', `额度包不存在: id=${id}`, 404)
  }
  return buildDto(row)
}

export const createQuotaPack = async (
  subscriptionId: number,
  input: unknown,
): Promise<QuotaPackDto> => {
  await validateSubscriptionActive(subscriptionId)
  const parsed = quotaPackSchema.parse(input)
  validateCrossFields(parsed.obtainedDate, parsed.expireDate)
  const row = await getDb().createQuotaPack(subscriptionId, {
    name: parsed.name,
    quantity: parsed.quantity,
    unit: parsed.unit,
    obtainedDate: parsed.obtainedDate,
    expireDate: parsed.expireDate,
    source: parsed.source?.trim() || null,
    note: parsed.note ?? null,
  })
  return buildDto(row)
}

export const updateQuotaPack = async (
  id: number,
  input: unknown,
): Promise<QuotaPackDto> => {
  const existing = await getDb().getQuotaPackById(id)
  if (!existing) {
    throw new DomainError('QUOTA_PACK_NOT_FOUND', `额度包不存在: id=${id}`, 404)
  }
  const parsed = quotaPackSchema.parse(input)
  validateCrossFields(parsed.obtainedDate, parsed.expireDate)
  const row = await getDb().updateQuotaPack(id, {
    name: parsed.name,
    quantity: parsed.quantity,
    unit: parsed.unit,
    obtainedDate: parsed.obtainedDate,
    expireDate: parsed.expireDate,
    source: parsed.source?.trim() || null,
    note: parsed.note ?? null,
  })
  if (!row) {
    throw new DomainError('QUOTA_PACK_NOT_FOUND', `额度包不存在: id=${id}`, 404)
  }
  return buildDto(row)
}

export const deleteQuotaPack = async (id: number): Promise<void> => {
  const existing = await getDb().getQuotaPackById(id)
  if (!existing) {
    throw new DomainError('QUOTA_PACK_NOT_FOUND', `额度包不存在: id=${id}`, 404)
  }
  await getDb().softDeleteQuotaPack(id)
}

export const restoreQuotaPack = async (id: number): Promise<QuotaPackDto> => {
  const existing = await getDb().getQuotaPackById(id)
  if (!existing) {
    throw new DomainError('QUOTA_PACK_NOT_FOUND', `额度包不存在: id=${id}`, 404)
  }
  if (existing.deletedAt === null) {
    throw new DomainError('NOT_DELETED', '该额度包未被删除，无需恢复', 400)
  }
  const row = await getDb().restoreQuotaPack(id)
  return buildDto(row!)
}

export const archiveQuotaPack = async (id: number): Promise<QuotaPackDto> => {
  const existing = await getDb().getQuotaPackById(id)
  if (!existing) {
    throw new DomainError('QUOTA_PACK_NOT_FOUND', `额度包不存在: id=${id}`, 404)
  }
  if (existing.deletedAt !== null) {
    throw new DomainError('QUOTA_PACK_DELETED', '已删除的额度包不能归档', 400)
  }
  const row = await getDb().setQuotaPackArchived(id, true)
  return buildDto(row!)
}

export const unarchiveQuotaPack = async (id: number): Promise<QuotaPackDto> => {
  const existing = await getDb().getQuotaPackById(id)
  if (!existing) {
    throw new DomainError('QUOTA_PACK_NOT_FOUND', `额度包不存在: id=${id}`, 404)
  }
  if (existing.deletedAt !== null) {
    throw new DomainError('QUOTA_PACK_DELETED', '已删除的额度包不能取消归档', 400)
  }
  const row = await getDb().setQuotaPackArchived(id, false)
  return buildDto(row!)
}

// 卡片槽位：最近一个快到期的 + 总数（FR-12）
export const getQuotaPackSlot = async (
  subscriptionId: number,
): Promise<QuotaPackSlotDto> => {
  await validateSubscriptionExists(subscriptionId)
  await lazyArchiveExpired(subscriptionId)
  const [pack, totalActive] = await Promise.all([
    getDb().getNearestExpiringQuotaPack(subscriptionId),
    getDb().countQuotaPacks({ view: 'active', subscriptionId }),
  ])
  return {
    subscriptionId,
    pack: pack ? buildDto(pack) : null,
    totalActive,
  }
}
