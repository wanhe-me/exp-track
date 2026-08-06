import type {
  BillingCycle,
  QuotaCycle,
  SubscriptionStatus,
  SubscriptionType,
} from './domain.js'

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
