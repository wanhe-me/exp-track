// 跨前后端共享的领域契约：枚举、DTO、Input、Filter、分页。
// 后端 DAL 的 Row 类型（CategoryRow / SubscriptionRow 等）留 backend/src/types/domain.ts，
// 本文件只放前后端一致的契约层（后端 service 构造 DTO、前端消费）。

export type BillingCycle = 'month' | 'quarter' | 'year'

export type SubscriptionView = 'active' | 'archived' | 'deleted'

export type SubscriptionStatus = 'expired' | 'soon7' | 'soon30' | 'sufficient'

// 订阅类型：standard 标准/功能解锁型（只看到期时间）/ quota 额度型（大模型 API 周月限额等）
export type SubscriptionType = 'standard' | 'quota'

// 额度周期标签：week 周 / month 月（纯展示，不自动重置）
export type QuotaCycle = 'week' | 'month'

// 额度包视图：与 SubscriptionView 同构（默认/已归档/已删除）
export type QuotaPackView = 'active' | 'archived' | 'deleted'

// ---- DTO（前后端一致，后端 service 构造、前端消费）----

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

export interface QuotaPack {
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
  // 基于失效日期的剩余天数与四档状态（复用主订阅阈值，FR-12）
  remainingDays: number
  status: SubscriptionStatus
}

// ---- Input ----

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

export interface QuotaPackInput {
  name: string
  quantity: number
  unit: string
  obtainedDate: string
  expireDate: string
  source: string | null
  note: string | null
}
export type CreateQuotaPackInput = QuotaPackInput
export type UpdateQuotaPackInput = QuotaPackInput

// ---- Filter / 分页 ----

export interface SubscriptionFilter {
  view: SubscriptionView
  categoryId?: number
  search?: string
  /** 到期日期下界（含，YYYY-MM-DD）：按状态四档筛选时由 service 换算后下推到 SQL */
  expireFrom?: string
  /** 到期日期上界（含，YYYY-MM-DD）：按状态四档筛选时由 service 换算后下推到 SQL */
  expireTo?: string
  /** 排序字段。必须在 SQL 层排序，否则先分页再排序会导致跨页顺序错乱 */
  sortBy?: 'expireDate' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

export interface QuotaPackFilter {
  view: QuotaPackView
  subscriptionId: number
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

// ---- 额度包卡片槽位 DTO（FR-12）----
// 后端 quota-pack.service 构造、前端消费：最近一个快到期的额度包 + 未删除未归档总数
export interface QuotaPackSlotDto {
  subscriptionId: number
  /** 最近一个快到期的未归档额度包（含已过期项），无则为 null */
  pack: QuotaPack | null
  /** 该订阅下未删除未归档额度包总数（>1 时卡片末尾附「等共 N 个」） */
  totalActive: number
}
