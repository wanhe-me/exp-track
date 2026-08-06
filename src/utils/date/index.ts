import dayjs from 'dayjs'
import { domainConfig } from '@exp-track/shared'

// 格式化日期为展示格式
export const formatDate = (date: string | null): string => {
  if (!date) return '-'
  return dayjs(date).format(domainConfig.dateFormat)
}

// 格式化日期时间
export const formatDateTime = (date: string | null): string => {
  if (!date) return '-'
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

// 今天的日期字符串 YYYY-MM-DD
export const todayStr = (): string => dayjs().format(domainConfig.dateFormat)

// 计算 N 天后的日期字符串
export const dateAfterDays = (days: number): string =>
  dayjs().add(days, 'day').format(domainConfig.dateFormat)

// 剩余天数展示文案
export const remainingDaysLabel = (remainingDays: number): string => {
  if (remainingDays < 0) return `已过期 ${Math.abs(remainingDays)} 天`
  if (remainingDays === 0) return '今天到期'
  return `剩余 ${remainingDays} 天`
}
