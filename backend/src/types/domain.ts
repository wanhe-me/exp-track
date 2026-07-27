// 领域类型：与数据库驱动、配置加载无关的纯业务类型（PRD 第 4 章）。
// 从 config/index.ts 与 dal/types.ts 抽离，统一归口到类型层，
// 业务代码统一从本文件引入领域类型，避免类型散落与职责耦合。

export type BillingCycle = 'month' | 'quarter' | 'year'

export type SubscriptionView = 'active' | 'archived' | 'deleted'

export type SubscriptionStatus = 'expired' | 'soon7' | 'soon30' | 'sufficient'

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

export interface CreateSubscriptionInput {
  name: string
  categoryId: number
  price: number
  billingCycle: BillingCycle
  startDate: string
  expireDate: string
  autoRenew: boolean
  note: string | null
}

export interface UpdateSubscriptionInput {
  name: string
  categoryId: number
  price: number
  billingCycle: BillingCycle
  startDate: string
  expireDate: string
  autoRenew: boolean
  note: string | null
}

export interface SubscriptionFilter {
  view: SubscriptionView
  categoryId?: number
  search?: string
}
