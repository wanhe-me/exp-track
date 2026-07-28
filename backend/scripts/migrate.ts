// 迁移 CLI：status / up / make
//   pnpm migrate status   - 列出已应用 / 待执行 / 基线候选
//   pnpm migrate up       - 应用所有待执行迁移（已含 baseline 检测）
//   pnpm migrate make <name> - 生成下一版本号并提示创建 sqlite/mysql 两个文件
//
// 注意：本 CLI 当前仅支持 SQLite（与后端运行模式一致）。
// MySQL 迁移脚本尚未建立，待 DAL 适配器落地时一并新建。

import { existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import Database from 'better-sqlite3'
import { config } from '../src/config/index.js'
import { manifest, type MigrationEntry } from '../src/dal/migrations/manifest.js'
import { getSqliteStatus, runSqliteMigrations } from '../src/dal/migrator/sqlite.js'
import { logger } from '../src/utils/logger.js'

const ensureDir = (filePath: string): void => {
  const dir = dirname(filePath)
  if (dir && !existsSync(dir)) mkdirSync(dir, { recursive: true })
}

const openSqlite = (): Database.Database => {
  ensureDir(config.sqlite.path)
  const db = new Database(config.sqlite.path)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  return db
}

const renderStatus = (entries: MigrationEntry[]): void => {
  const db = openSqlite()
  try {
    const status = getSqliteStatus(db, entries)
    const appliedSet = new Set(status.applied.map((a) => a.version))
    if (status.applied.length > 0) {
      logger.info(`applied (${status.applied.length})`)
      for (const a of status.applied) {
        process.stdout.write(
          `  \u2713 ${a.version}  applied_at=${a.applied_at}  checksum=${a.checksum.slice(0, 12)}\n`,
        )
      }
    } else {
      process.stdout.write('  (none)\n')
    }
    if (status.baselineCandidate && !appliedSet.has(status.baselineCandidate.version)) {
      process.stdout.write(
        `  \u26a0 baseline candidate: ${status.baselineCandidate.version} (existing schema will be marked on next 'up')\n`,
      )
    }
    if (status.pending.length > 0) {
      logger.info(`pending (${status.pending.length})`)
      for (const p of status.pending) {
        process.stdout.write(
          `  \u23f3 ${p.version}  file=${p.filename}  checksum=${p.checksum.slice(0, 12)}\n`,
        )
      }
    } else {
      process.stdout.write('pending (0)\n  (up to date)\n')
    }
  } finally {
    db.close()
  }
}

const runUp = (entries: MigrationEntry[]): void => {
  const db = openSqlite()
  try {
    const result = runSqliteMigrations(db, entries)
    logger.info('[migrate] up complete', result)
  } finally {
    db.close()
  }
}

const makeScaffold = (entries: MigrationEntry[], name: string): void => {
  if (!/^[a-z][a-z0-9_]*$/.test(name)) {
    logger.error('migration name must be snake_case starting with a letter', { name })
    process.exit(1)
  }
  const versions = entries
    .map((e) => Number.parseInt(e.version.split('_')[0] ?? '0', 10))
    .filter((n) => !Number.isNaN(n))
  const next = (versions.length > 0 ? Math.max(...versions) : 0) + 1
  const version = String(next).padStart(3, '0')
  const file = `${version}_${name}`
  process.stdout.write(
    [
      `Create the file:`,
      `  backend/src/dal/migrations/sqlite/${file}.sql`,
      ``,
      `Then register in backend/src/dal/migrations/manifest.ts:`,
      `  export const manifest = [..., load('${file}')]`,
      ``,
    ].join('\n'),
  )
}

const printUsage = (): void => {
  process.stdout.write(
    [
      `Usage:`,
      `  pnpm migrate status            - list applied / pending migrations`,
      `  pnpm migrate up                - apply all pending migrations`,
      `  pnpm migrate make <snake_name>  - scaffold a new migration pair`,
      ``,
    ].join('\n'),
  )
}

const main = (): void => {
  if (config.dbDriver !== 'sqlite') {
    logger.error('[migrate] CLI only supports SQLite (DB_TYPE=sqlite)', {
      driver: config.dbDriver,
    })
    process.exit(1)
  }

  const cmd = process.argv[2]
  const arg = process.argv[3]
  const entries = manifest

  if (cmd === 'status') {
    renderStatus(entries)
    return
  }
  if (cmd === 'up') {
    runUp(entries)
    return
  }
  if (cmd === 'make') {
    if (!arg) {
      logger.error("'make' requires a migration name, e.g. pnpm migrate make add_currency")
      process.exit(1)
    }
    makeScaffold(entries, arg)
    return
  }
  printUsage()
}

try {
  main()
} catch (err) {
  logger.error('[migrate] failed', {
    err: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  })
  process.exit(1)
}
