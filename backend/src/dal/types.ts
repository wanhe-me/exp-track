import type {
  BillingCycle,
  CategoryRow,
  CreateCategoryInput,
  CreateSubscriptionInput,
  SubscriptionFilter,
  SubscriptionRow,
  SubscriptionView,
  UpdateCategoryInput,
  UpdateSubscriptionInput,
} from '../types/domain.js'

// 数据库适配器抽象（屏蔽 SQLite / MySQL 方言差异）
export interface DbAdapter {
  init(): Promise<void>
  close(): Promise<void>
  ping(): Promise<void>

  // ---- category ----
  listCategories(): Promise<CategoryRow[]>
  getCategoryById(id: number): Promise<CategoryRow | null>
  getCategoryByName(name: string): Promise<CategoryRow | null>
  countSubscriptionsByCategory(categoryId: number): Promise<number>
  createCategory(input: CreateCategoryInput): Promise<CategoryRow>
  updateCategory(id: number, input: UpdateCategoryInput): Promise<CategoryRow | null>
  deleteCategory(id: number): Promise<void>

  // ---- subscription ----
  listSubscriptions(filter: SubscriptionFilter): Promise<SubscriptionRow[]>
  getSubscriptionById(id: number): Promise<SubscriptionRow | null>
  createSubscription(input: CreateSubscriptionInput): Promise<SubscriptionRow>
  updateSubscription(id: number, input: UpdateSubscriptionInput): Promise<SubscriptionRow | null>
  softDeleteSubscription(id: number): Promise<void>
  restoreSubscription(id: number): Promise<void>
  setArchived(id: number, archived: boolean): Promise<void>
}

export class DomainError extends Error {
  code: string
  status: number
  details?: unknown

  constructor(code: string, message: string, status = 400, details?: unknown) {
    super(message)
    this.code = code
    this.status = status
    this.details = details
    this.name = 'DomainError'
  }
}
