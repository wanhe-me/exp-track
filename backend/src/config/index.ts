import 'dotenv/config'
import './timezone.js'
import type { DomainConfig } from '@exp-track/shared'

const required = (name: string, fallback?: string): string => {
  const value = process.env[name] ?? fallback
  if (value === undefined || value === '') {
    throw new Error(`[config] missing required env: ${name}`)
  }
  return value
}

const intEnv = (name: string, fallback: number): number => {
  const raw = process.env[name]
  if (raw === undefined || raw === '') return fallback
  const parsed = Number.parseInt(raw, 10)
  if (Number.isNaN(parsed)) {
    throw new Error(`[config] invalid integer env: ${name}=${raw}`)
  }
  return parsed
}

export type DbDriver = 'sqlite' | 'mysql'

const dbDriver: DbDriver =
  process.env.DB_TYPE === 'mysql' ? 'mysql' : 'sqlite'

// 领域配置（PRD 第 5 章）：结构类型与默认值由 @exp-track/shared 提供，env 在此覆盖。
export const domainConfig: DomainConfig = {
  statusThresholds: {
    soon7: intEnv('SOON7_THRESHOLD', 7),
    soon30: intEnv('SOON30_THRESHOLD', 30),
  },
  timeline: {
    rangeDays: intEnv('TIMELINE_RANGE_DAYS', 90),
  },
  dateFormat: 'YYYY-MM-DD',
  currencySymbol: '¥',
  // 额度包失效后自动归档的宽限期（天）：宽限内仍展示并标红，超过后惰性置 archived=true（FR-13）
  quotaPack: {
    archiveGraceDays: intEnv('QUOTA_PACK_ARCHIVE_GRACE_DAYS', 7),
  },
}

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  host: process.env.HOST ?? '127.0.0.1',
  port: intEnv('PORT', 15180),
  corsOrigin: process.env.CORS_ORIGIN?.split(',').map(s => s.trim()) ?? ['http://127.0.0.1:15173'],
  dbDriver,
  sqlite: {
    path: process.env.SQLITE_PATH ?? './data/exp-track.db',
  },
  mysql: {
    host: process.env.MYSQL_HOST ?? '127.0.0.1',
    port: intEnv('MYSQL_PORT', 13306),
    user: required('MYSQL_USER', 'exp_track'),
    password: process.env.MYSQL_PASSWORD ?? '',
    database: required('MYSQL_DATABASE', 'exp_track'),
    connectionLimit: intEnv('MYSQL_CONNECTION_LIMIT', 10),
  },
  domain: domainConfig,
} as const

export type AppConfig = typeof config
