// 后端 DAL 行类型（snake -> camel 转换后的 TS 形态）+ 分类 Input。
// 跨端共享的契约类型（枚举 / DTO / SubscriptionInput / QuotaPackInput /
// SubscriptionFilter / QuotaPackFilter / PaginatedResult）已迁至 @exp-track/shared，
// 本文件只保留后端 DAL 内部使用的行类型与分类输入。

import type {
  BillingCycle,
  QuotaCycle,
  SubscriptionType,
} from '@exp-track/shared'

export interface CategoryRow {
  id: number
  name: string
  createdAt: string
  updatedAt: string
}

export interface SubscriptionRow {
  id: number
  name: string
  categoryId: number
  price: number
  billingCycle: BillingCycle
  startDate: string
  expireDate: string
  autoRenew: boolean
  note: string | null
  subscriptionType: SubscriptionType
  quotaCycle: QuotaCycle | null
  quotaTotal: number | null
  quotaUsed: number | null
  quotaRemaining: number | null
  quotaUnit: string | null
  archived: boolean
  deletedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface SubscriptionWithCategoryRow extends SubscriptionRow {
  categoryName: string
}

export interface CreateCategoryInput {
  name: string
}

export interface UpdateCategoryInput {
  name: string
}

// ---------------- quota_pack（额度包/补给包，FR-11 ~ FR-13）----------------

export interface QuotaPackRow {
  id: number
  subscriptionId: number
  name: string
  quantity: number
  unit: string
  obtainedDate: string
  expireDate: string
  source: string | null
  note: string | null
  archived: boolean
  deletedAt: string | null
  createdAt: string
  updatedAt: string
}
