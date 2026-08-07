const ts = (): string => new Date().toISOString()

// 日志级别：'debug' < 'info' < 'warn' < 'error' < 'silent'
// 通过 LOG_LEVEL 环境变量控制输出阈值（覆盖默认值）：
//   - silent：全部不输出
//   - error/warn：仅错误与告警
//   - info：再加启动横幅 / 进度日志
//   - debug：再叠加开发期调试日志
// 默认值：开发环境（NODE_ENV !== 'production'）为 'info'，生产环境为 'warn'。
//   - dev 默认 info：启动横幅（database initialized / server started）与运行日志默认可见，
//     便于在 pnpm dev 的 concurrently 合并输出里定位后端状态与报错。
//   - prod 默认 warn：仅输出告警与错误。
//   - 可随时用 LOG_LEVEL=xxx 覆盖。
type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent'

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: Infinity,
}

const resolveLevel = (): LogLevel => {
  const fallback: LogLevel = process.env.NODE_ENV === 'production' ? 'warn' : 'info'
  const raw = (process.env.LOG_LEVEL ?? fallback).toLowerCase() as LogLevel
  return raw in LEVEL_ORDER ? raw : fallback
}

const threshold = LEVEL_ORDER[resolveLevel()]

const enabled = (level: LogLevel): boolean => LEVEL_ORDER[level] >= threshold

export const logger = {
  info: (msg: string, meta?: Record<string, unknown>) => {
    if (!enabled('info')) return
    console.log(`[${ts()}] [INFO] ${msg}`, meta ?? '')
  },
  warn: (msg: string, meta?: Record<string, unknown>) => {
    if (!enabled('warn')) return
    console.warn(`[${ts()}] [WARN] ${msg}`, meta ?? '')
  },
  error: (msg: string, meta?: Record<string, unknown>) => {
    if (!enabled('error')) return
    console.error(`[${ts()}] [ERROR] ${msg}`, meta ?? '')
  },
  debug: (msg: string, meta?: Record<string, unknown>) => {
    if (!enabled('debug')) return
    console.debug(`[${ts()}] [DEBUG] ${msg}`, meta ?? '')
  },
}
