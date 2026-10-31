import { config } from '../config/index.js'
import type { SubscriptionStatus } from '@exp-track/shared'

// 本地时区"今天"的日期字符串（YYYY-MM-DD）
export const todayDateStr = (): string => {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
}

// 日期字符串加减天数（YYYY-MM-DD 进、YYYY-MM-DD 出）
export const shiftDateStr = (dateStr: string, days: number): string => {
  const d = new Date(`${dateStr}T00:00:00`)
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// 计算剩余天数：到期日期 − 今天（按整天取整，不含时分）
// 输入日期格式 YYYY-MM-DD
export const calcRemainingDays = (expireDate: string): number => {
  const todayMs = new Date(`${todayDateStr()}T00:00:00`).getTime()
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

// 把状态四档换算成到期日期区间，供 SQL 下推筛选。
// 边界与 calcStatus 严格对应（remainingDays = expireDate − today，按整天），
// 否则筛选结果会与实际状态徽章不一致。
export const statusExpireRange = (
  status: SubscriptionStatus,
): { expireFrom?: string; expireTo?: string } => {
  const today = todayDateStr()
  const { soon7, soon30 } = config.domain.statusThresholds
  switch (status) {
    case 'expired':
      return { expireTo: shiftDateStr(today, -1) }
    case 'soon7':
      return { expireFrom: today, expireTo: shiftDateStr(today, soon7) }
    case 'soon30':
      return { expireFrom: shiftDateStr(today, soon7 + 1), expireTo: shiftDateStr(today, soon30) }
    case 'sufficient':
      return { expireFrom: shiftDateStr(today, soon30 + 1) }
  }
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
