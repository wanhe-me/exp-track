// 领域类型：与数据库驱动、配置加载无关的纯业务类型（PRD 第 4 章）。
// 从 config/index.ts 与 dal/types.ts 抽离，统一归口到类型层，
// 业务代码统一从本文件引入领域类型，避免类型散落与职责耦合。

export type BillingCycle = 'month' | 'quarter' | 'year'

export type SubscriptionView = 'active' | 'archived' | 'deleted'

export type SubscriptionStatus = 'expired' | 'soon7' | 'soon30' | 'sufficient'

// 订阅类型：standard 标准/功能解锁型（只看到期时间）/ quota 额度型（大模型 API 周月限额等）
export type SubscriptionType = 'standard' | 'quota'

// 额度周期标签：week 周 / month 月（纯展示，不自动重置）
export type QuotaCycle = 'week' | 'month'

// 行类型（DAL 返回，已转为 camelCase 与原生 TS 类型）
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

export interface CreateCategoryInput {
  name: string
}

export interface UpdateCategoryInput {
  name: string
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

export type CreateSubscriptionInput = SubscriptionInput

export type UpdateSubscriptionInput = SubscriptionInput

export interface SubscriptionFilter {
  view: SubscriptionView
  categoryId?: number
  search?: string
  page?: number
  pageSize?: number
}

export interface SubscriptionWithCategoryRow extends SubscriptionRow {
  categoryName: string
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}
