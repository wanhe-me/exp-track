const ts = (): string => new Date().toISOString()

// 日志级别：'debug' < 'info' < 'warn' < 'error' < 'silent'
// 通过 LOG_LEVEL 环境变量控制输出阈值：
//   - silent：全部不输出
//   - error/warn：仅错误与告警
//   - info：默认阈值之上，再加启动横幅 / 进度日志
//   - debug：再叠加开发期调试日志
// 默认 'warn'，让启动横幅（mysql initialized / database initialized / server started 等）默认静默；
// 需要排查迁移或启动过程时，临时 LOG_LEVEL=info pnpm dev:back 即可。
type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent'

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: Infinity,
}

const resolveLevel = (): LogLevel => {
  const raw = (process.env.LOG_LEVEL ?? 'warn').toLowerCase() as LogLevel
  return raw in LEVEL_ORDER ? raw : 'warn'
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
