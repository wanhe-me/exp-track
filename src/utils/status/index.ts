import { STATUS_LABELS, type SubscriptionStatus } from '@exp-track/shared'

// 状态 → 文案
export const statusLabel = (status: SubscriptionStatus): string => STATUS_LABELS[status]

// 状态 → 前景色 CSS 变量
export const statusColor = (status: SubscriptionStatus): string => {
  switch (status) {
    case 'expired':
      return 'var(--color-status-expired)'
    case 'soon7':
      return 'var(--color-status-soon7)'
    case 'soon30':
      return 'var(--color-status-soon30)'
    case 'sufficient':
      return 'var(--color-status-sufficient)'
  }
}

// 状态 → 背景色 CSS 变量
export const statusBgColor = (status: SubscriptionStatus): string => {
  switch (status) {
    case 'expired':
      return 'var(--color-status-expired-bg)'
    case 'soon7':
      return 'var(--color-status-soon7-bg)'
    case 'soon30':
      return 'var(--color-status-soon30-bg)'
    case 'sufficient':
      return 'var(--color-status-sufficient-bg)'
  }
}
