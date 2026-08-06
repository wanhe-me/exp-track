import type {
  CreateQuotaPackInput,
  CreateSubscriptionInput,
  QuotaPackFilter,
  SubscriptionFilter,
  UpdateQuotaPackInput,
  UpdateSubscriptionInput,
} from '@exp-track/shared'
import type {
  CategoryRow,
  CreateCategoryInput,
  QuotaPackRow,
  SubscriptionWithCategoryRow,
  UpdateCategoryInput,
} from '../types/domain.js'

// 数据库适配器抽象（屏蔽 MySQL 方言差异）
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

  // ---- quota_pack（额度包/补给包，FR-11 ~ FR-13）----
  // 列表（按 view 过滤：active=未删除未归档 / archived=已归档 / deleted=已软删除）
  listQuotaPacks(filter: QuotaPackFilter): Promise<QuotaPackRow[]>
  countQuotaPacks(filter: QuotaPackFilter): Promise<number>
  // 单条详情
  getQuotaPackById(id: number): Promise<QuotaPackRow | null>
  // 卡片槽位：取该订阅下未删除未归档额度包中 expire_date 升序首条（含已过期项，FR-12）
  getNearestExpiringQuotaPack(subscriptionId: number): Promise<QuotaPackRow | null>
  createQuotaPack(subscriptionId: number, input: CreateQuotaPackInput): Promise<QuotaPackRow>
  updateQuotaPack(id: number, input: UpdateQuotaPackInput): Promise<QuotaPackRow | null>
  softDeleteQuotaPack(id: number): Promise<void>
  restoreQuotaPack(id: number): Promise<QuotaPackRow | null>
  setQuotaPackArchived(id: number, archived: boolean): Promise<QuotaPackRow | null>
  // 惰性归档：将该订阅下「已失效且超过宽限期」的未归档额度包置 archived=true（FR-13）
  // 返回受影响行数；graceDays 由 service 层从 config 传入，DAL 不耦合业务配置
  archiveExpiredQuotaPacks(subscriptionId: number, graceDays: number): Promise<number>
}
