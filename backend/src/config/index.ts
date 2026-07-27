import './timezone.js'

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

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  host: process.env.HOST ?? '127.0.0.1',
  port: intEnv('PORT', 15180),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://127.0.0.1:15173',
  mysql: {
    host: process.env.MYSQL_HOST ?? '127.0.0.1',
    port: intEnv('MYSQL_PORT', 13306),
    user: required('MYSQL_USER', 'exp_track'),
    password: process.env.MYSQL_PASSWORD ?? '',
    database: required('MYSQL_DATABASE', 'exp_track'),
    connectionLimit: intEnv('MYSQL_CONNECTION_LIMIT', 10),
  },
} as const

export type AppConfig = typeof config