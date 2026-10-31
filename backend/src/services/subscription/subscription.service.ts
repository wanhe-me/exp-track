import { z } from 'zod'
import { getDb } from '../../dal/index.js'
import { DomainError } from '../../types/errors.js'
import type {
  PaginatedResult,
  QuotaCycle,
  Subscription,
  SubscriptionFilter,
  SubscriptionStatus,
  SubscriptionType,
  SubscriptionView,
} from '@exp-track/shared'
import type { SubscriptionWithCategoryRow } from '../../types/domain.js'
import {
  calcRemainingDays,
  calcStatus,
  isExpireOnAfterStart,
  isValidDateStr,
  statusExpireRange,
} from '../../utils/date.js'

const priceField = z
  .number({ message: '价格必填' })
  .nonnegative({ message: '价格不能为负' })
  .refine((v) => Math.round(v * 100) === v * 100, { message: '价格精度不能超过 2 位小数' })

const quotaNumberField = z
  .number({ message: '额度必须为数字' })
  .nonnegative({ message: '额度不能为负' })
  .refine((v) => Math.round(v * 100) === v * 100, { message: '额度精度不能超过 2 位小数' })
  .nullable()
  .optional()

export const subscriptionSchema = z.object({
  name: z
    .string({ message: '名称必填' })
    .trim()
    .min(1, { message: '名称不能为空' })
    .max(100, { message: '名称长度不能超过 100' }),
  categoryId: z
    .number({ message: '分类必填' })
    .int({ message: '分类 id 必须为整数' })
    .positive({ message: '分类 id 必须为正数' }),
  price: priceField,
  billingCycle: z.enum(['month', 'quarter', 'year'], {
    message: '计费周期必须为 month / quarter / year',
  }),
  startDate: z
    .string({ message: '开始日期必填' })
    .refine(isValidDateStr, { message: '开始日期格式必须为 YYYY-MM-DD' }),
  expireDate: z
    .string({ message: '到期日期必填' })
    .refine(isValidDateStr, { message: '到期日期格式必须为 YYYY-MM-DD' }),
  autoRenew: z.boolean().default(false),
  note: z.string().max(1000, { message: '备注长度不能超过 1000' }).nullable().optional(),
  subscriptionType: z.enum(['standard', 'quota']).default('standard'),
  quotaCycle: z.enum(['week', 'month']).nullable().optional(),
  quotaTotal: quotaNumberField,
  quotaUsed: quotaNumberField,
  quotaRemaining: quotaNumberField,
  quotaUnit: z.string().max(20, { message: '单位长度不能超过 20' }).nullable().optional(),
})

export type SubscriptionDto = Subscription

const buildDto = (row: SubscriptionWithCategoryRow): SubscriptionDto => {
  const remainingDays = calcRemainingDays(row.expireDate)
  return {
    id: row.id,
    name: row.name,
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    price: row.price,
    billingCycle: row.billingCycle,
    startDate: row.startDate,
    expireDate: row.expireDate,
    autoRenew: row.autoRenew,
    note: row.note,
    subscriptionType: row.subscriptionType,
    quotaCycle: row.quotaCycle,
    quotaTotal: row.quotaTotal,
    quotaUsed: row.quotaUsed,
    quotaRemaining: row.quotaRemaining,
    quotaUnit: row.quotaUnit,
    archived: row.archived,
    deletedAt: row.deletedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    remainingDays,
    status: calcStatus(remainingDays),
  }
}

const validateCrossFields = (startDate: string, expireDate: string): void => {
  if (!isExpireOnAfterStart(startDate, expireDate)) {
    throw new DomainError(
      'INVALID_DATE_RANGE',
      '到期日期不得早于开始日期',
      400,
      { startDate, expireDate },
    )
  }
}

const normalizeQuota = (
  parsed: Pick<
    z.infer<typeof subscriptionSchema>,
    'subscriptionType' | 'quotaCycle' | 'quotaTotal' | 'quotaUsed' | 'quotaRemaining' | 'quotaUnit'
  >,
): {
  subscriptionType: SubscriptionType
  quotaCycle: QuotaCycle | null
  quotaTotal: number | null
  quotaUsed: number | null
  quotaRemaining: number | null
  quotaUnit: string | null
} => {
  if (parsed.subscriptionType === 'standard') {
    return {
      subscriptionType: 'standard',
      quotaCycle: null,
      quotaTotal: null,
      quotaUsed: null,
      quotaRemaining: null,
      quotaUnit: null,
    }
  }

  if (!parsed.quotaCycle) {
    throw new DomainError('INVALID_QUOTA', '额度型订阅必须选择额度周期', 400)
  }
  if (parsed.quotaTotal == null || parsed.quotaTotal <= 0) {
    throw new DomainError('INVALID_QUOTA', '额度型订阅必须填写总额度且大于 0', 400)
  }

  const total = parsed.quotaTotal
  const used = parsed.quotaUsed ?? null
  const remaining = parsed.quotaRemaining ?? null

  let finalUsed: number
  let finalRemaining: number
  if (used != null && remaining != null) {
    if (Math.abs(used + remaining - total) > 0.01) {
      throw new DomainError(
        'INVALID_QUOTA',
        '已使用 + 剩余 不等于总额度',
        400,
        { used, remaining, total },
      )
    }
    finalUsed = used
    finalRemaining = remaining
  } else if (used != null) {
    finalUsed = used
    finalRemaining = Math.round((total - used) * 100) / 100
  } else if (remaining != null) {
    finalRemaining = remaining
    finalUsed = Math.round((total - remaining) * 100) / 100
  } else {
    throw new DomainError('INVALID_QUOTA', '额度型订阅必须填写已使用或剩余额度', 400)
  }

  if (finalUsed < 0 || finalRemaining < 0) {
    throw new DomainError('INVALID_QUOTA', '已使用或剩余额度不能为负', 400)
  }

  return {
    subscriptionType: 'quota',
    quotaCycle: parsed.quotaCycle,
    quotaTotal: total,
    quotaUsed: finalUsed,
    quotaRemaining: finalRemaining,
    quotaUnit: parsed.quotaUnit?.trim() || null,
  }
}

const validateCategoryExists = async (categoryId: number): Promise<void> => {
  const cat = await getDb().getCategoryById(categoryId)
  if (!cat) {
    throw new DomainError('CATEGORY_NOT_FOUND', `分类不存在: id=${categoryId}`, 400)
  }
}

export const listSubscriptions = async (
  view: SubscriptionView,
  page: number,
  pageSize: number,
  categoryId?: number,
  search?: string,
  status?: SubscriptionStatus,
  sortBy: 'expireDate' | 'createdAt' = 'expireDate',
  sortOrder: 'asc' | 'desc' = 'asc',
): Promise<PaginatedResult<SubscriptionDto>> => {
  // 排序字段与方向一并下推 SQL：若在 LIMIT 之后对当前页内存排序，跨页顺序会错乱
  const filter: SubscriptionFilter = { view, page, pageSize, sortBy, sortOrder }
  if (categoryId !== undefined) filter.categoryId = categoryId
  if (search) filter.search = search
  // 状态在 SQL 层过滤：若在分页后内存过滤，total 与每页条数都会失真
  if (status) {
    const { expireFrom, expireTo } = statusExpireRange(status)
    if (expireFrom) filter.expireFrom = expireFrom
    if (expireTo) filter.expireTo = expireTo
  }

  const [rows, total] = await Promise.all([
    getDb().listSubscriptions(filter),
    getDb().countSubscriptions(filter),
  ])

  return { items: rows.map(buildDto), total, page, pageSize }
}

export const getSubscriptionById = async (id: number): Promise<SubscriptionDto> => {
  const row = await getDb().getSubscriptionById(id)
  if (!row) {
    throw new DomainError('SUBSCRIPTION_NOT_FOUND', `订阅不存在: id=${id}`, 404)
  }
  return buildDto(row)
}

export const createSubscription = async (input: unknown): Promise<SubscriptionDto> => {
  const parsed = subscriptionSchema.parse(input)
  validateCrossFields(parsed.startDate, parsed.expireDate)
  await validateCategoryExists(parsed.categoryId)
  const quota = normalizeQuota(parsed)

  const row = await getDb().createSubscription({
    name: parsed.name,
    categoryId: parsed.categoryId,
    price: parsed.price,
    billingCycle: parsed.billingCycle,
    startDate: parsed.startDate,
    expireDate: parsed.expireDate,
    autoRenew: parsed.autoRenew,
    note: parsed.note ?? null,
    subscriptionType: quota.subscriptionType,
    quotaCycle: quota.quotaCycle,
    quotaTotal: quota.quotaTotal,
    quotaUsed: quota.quotaUsed,
    quotaRemaining: quota.quotaRemaining,
    quotaUnit: quota.quotaUnit,
  })
  return buildDto(row)
}

export const updateSubscription = async (
  id: number,
  input: unknown,
): Promise<SubscriptionDto> => {
  const existing = await getDb().getSubscriptionById(id)
  if (!existing) {
    throw new DomainError('SUBSCRIPTION_NOT_FOUND', `订阅不存在: id=${id}`, 404)
  }

  const parsed = subscriptionSchema.parse(input)
  validateCrossFields(parsed.startDate, parsed.expireDate)
  await validateCategoryExists(parsed.categoryId)
  const quota = normalizeQuota(parsed)

  const row = await getDb().updateSubscription(id, {
    name: parsed.name,
    categoryId: parsed.categoryId,
    price: parsed.price,
    billingCycle: parsed.billingCycle,
    startDate: parsed.startDate,
    expireDate: parsed.expireDate,
    autoRenew: parsed.autoRenew,
    note: parsed.note ?? null,
    subscriptionType: quota.subscriptionType,
    quotaCycle: quota.quotaCycle,
    quotaTotal: quota.quotaTotal,
    quotaUsed: quota.quotaUsed,
    quotaRemaining: quota.quotaRemaining,
    quotaUnit: quota.quotaUnit,
  })
  if (!row) {
    throw new DomainError('SUBSCRIPTION_NOT_FOUND', `订阅不存在: id=${id}`, 404)
  }
  return buildDto(row)
}

export const deleteSubscription = async (id: number): Promise<void> => {
  const existing = await getDb().getSubscriptionById(id)
  if (!existing) {
    throw new DomainError('SUBSCRIPTION_NOT_FOUND', `订阅不存在: id=${id}`, 404)
  }
  await getDb().softDeleteSubscription(id)
}

export const restoreSubscription = async (id: number): Promise<SubscriptionDto> => {
  const existing = await getDb().getSubscriptionById(id)
  if (!existing) {
    throw new DomainError('SUBSCRIPTION_NOT_FOUND', `订阅不存在: id=${id}`, 404)
  }
  if (existing.deletedAt === null) {
    throw new DomainError('NOT_DELETED', '该订阅未被删除，无需恢复', 400)
  }
  const row = await getDb().restoreSubscription(id)
  return buildDto(row!)
}

export const archiveSubscription = async (id: number): Promise<SubscriptionDto> => {
  const existing = await getDb().getSubscriptionById(id)
  if (!existing) {
    throw new DomainError('SUBSCRIPTION_NOT_FOUND', `订阅不存在: id=${id}`, 404)
  }
  if (existing.deletedAt !== null) {
    throw new DomainError('SUBSCRIPTION_DELETED', '已删除的订阅不能归档', 400)
  }
  const row = await getDb().setArchived(id, true)
  return buildDto(row!)
}

export const unarchiveSubscription = async (id: number): Promise<SubscriptionDto> => {
  const existing = await getDb().getSubscriptionById(id)
  if (!existing) {
    throw new DomainError('SUBSCRIPTION_NOT_FOUND', `订阅不存在: id=${id}`, 404)
  }
  if (existing.deletedAt !== null) {
    throw new DomainError('SUBSCRIPTION_DELETED', '已删除的订阅不能取消归档', 400)
  }
  const row = await getDb().setArchived(id, false)
  return buildDto(row!)
}
