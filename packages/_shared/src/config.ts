// 跨前后端共享的领域配置：结构类型 + 前端静态默认值。
// 后端 config/index.ts 引用 DomainConfig 类型并从 env 读取实际值
// （env 默认值与本文件 domainConfig 保持一致）。

export interface DomainConfig {
  statusThresholds: { soon7: number; soon30: number }
  timeline: { rangeDays: number }
  dateFormat: string
  currencySymbol: string
  quotaPack: { archiveGraceDays: number }
}

export const domainConfig: DomainConfig = {
  statusThresholds: { soon7: 7, soon30: 30 },
  timeline: { rangeDays: 90 },
  dateFormat: 'YYYY-MM-DD',
  currencySymbol: '¥',
  quotaPack: { archiveGraceDays: 7 },
}
