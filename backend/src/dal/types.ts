import type {
  CategoryRow,
  CreateCategoryInput,
  CreateSubscriptionInput,
  SubscriptionFilter,
  SubscriptionWithCategoryRow,
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
  listSubscriptions(filter: SubscriptionFilter): Promise<SubscriptionWithCategoryRow[]>
  countSubscriptions(filter: SubscriptionFilter): Promise<number>
  getSubscriptionById(id: number): Promise<SubscriptionWithCategoryRow | null>
  createSubscription(input: CreateSubscriptionInput): Promise<SubscriptionWithCategoryRow>
  updateSubscription(id: number, input: UpdateSubscriptionInput): Promise<SubscriptionWithCategoryRow | null>
  softDeleteSubscription(id: number): Promise<void>
  restoreSubscription(id: number): Promise<SubscriptionWithCategoryRow | null>
  setArchived(id: number, archived: boolean): Promise<SubscriptionWithCategoryRow | null>
}
