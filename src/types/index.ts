// 前端类型定义（与后端 DTO 对齐）

export type BillingCycle = 'month' | 'quarter' | 'year'

export type SubscriptionView = 'active' | 'archived' | 'deleted'

export type SubscriptionStatus = 'expired' | 'soon7' | 'soon30' | 'sufficient'

// 订阅类型：standard 标准/功能解锁型（只看到期时间）/ quota 额度型（大模型 API 周月限额等）
export type SubscriptionType = 'standard' | 'quota'

// 额度周期标签：week 周 / month 月（纯展示，不自动重置）
export type QuotaCycle = 'week' | 'month'

export interface Category {
  id: number
  name: string
  createdAt: string
  updatedAt: string
}

export interface Subscription {
  id: number
  name: string
  categoryId: number
  categoryName: string
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
  remainingDays: number
  status: SubscriptionStatus
}

export interface SubscriptionInput {
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
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

// 领域配置（PRD 第 5 章，与后端保持一致）
export const domainConfig = {
  statusThresholds: {
    soon7: 7,
    soon30: 30,
  },
  timeline: {
    rangeDays: 90,
  },
  dateFormat: 'YYYY-MM-DD',
  currencySymbol: '¥',
} as const

export const BILLING_CYCLE_LABELS: Record<BillingCycle, string> = {
  month: '月',
  quarter: '季',
  year: '年',
}

export const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  expired: '已过期',
  soon7: '7天内到期',
  soon30: '30天内到期',
  sufficient: '充足',
}

export const SUBSCRIPTION_TYPE_LABELS: Record<SubscriptionType, string> = {
  standard: '标准',
  quota: '额度',
}

export const QUOTA_CYCLE_LABELS: Record<QuotaCycle, string> = {
  week: '周',
  month: '月',
}
