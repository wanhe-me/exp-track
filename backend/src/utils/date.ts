import { config } from '../config/index.js'
import type { SubscriptionStatus } from '@exp-track/shared'

// 计算剩余天数：到期日期 − 今天（按整天取整，不含时分）
// 输入日期格式 YYYY-MM-DD
export const calcRemainingDays = (expireDate: string): number => {
  const today = new Date()
  // 以本地时区的日期零点为"今天"
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const todayMs = new Date(`${todayStr}T00:00:00`).getTime()
  const expireMs = new Date(`${expireDate}T00:00:00`).getTime()
  const diff = expireMs - todayMs
  return Math.round(diff / (1000 * 60 * 60 * 24))
}

// 根据剩余天数判定状态四档（FR-06）
export const calcStatus = (remainingDays: number): SubscriptionStatus => {
  const { soon7, soon30 } = config.domain.statusThresholds
  if (remainingDays < 0) return 'expired'
  if (remainingDays <= soon7) return 'soon7'
  if (remainingDays <= soon30) return 'soon30'
  return 'sufficient'
}

// 校验日期字符串格式 YYYY-MM-DD 且为合法日期
export const isValidDateStr = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const d = new Date(`${value}T00:00:00`)
  return !Number.isNaN(d.getTime())
}

// 校验到期日期不早于开始日期
export const isExpireOnAfterStart = (startDate: string, expireDate: string): boolean => {
  return new Date(`${expireDate}T00:00:00`).getTime() >= new Date(`${startDate}T00:00:00`).getTime()
}
