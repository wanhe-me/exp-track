// 迁移 CLI：status / up / make
//   pnpm migrate status                 - 列出已应用 / 待执行 / 基线候选
//   pnpm migrate up                     - 应用所有待执行迁移（已含 baseline 检测）
//   pnpm migrate make <snake_name>      - 生成下一版本号并提示创建 sqlite/mysql 两个文件
//
// 驱动分发：DB_TYPE=sqlite 走 better-sqlite3 同步路径；DB_TYPE=mysql 走 mysql2/promise 异步路径。

import { existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import Database from 'better-sqlite3'
import { config } from '../src/config/index.js'
import {
  manifestSqlite,
  manifestMysql,
  type MigrationEntry,
} from '../src/dal/migrations/manifest.js'
import { getSqliteStatus, runSqliteMigrations } from '../src/dal/migrator/sqlite.js'
import { getMySqlStatus, runMySqlMigrations } from '../src/dal/migrator/mysql.js'
import { createMysqlPool } from '../src/dal/mysql.js'
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

const renderSqliteStatus = (entries: MigrationEntry[]): void => {
  const db = openSqlite()
  try {
    const status = getSqliteStatus(db, entries)
    const appliedSet = new Set(status.applied.map((a) => a.version))
    if (status.applied.length > 0) {
      logger.info(`applied (${status.applied.length})`)
      for (const a of status.applied) {
        process.stdout.write(
          `  ✓ ${a.version}  applied_at=${a.applied_at}  checksum=${a.checksum.slice(0, 12)}\n`,
        )
      }
    } else {
      process.stdout.write('  (none)\n')
    }
    if (status.baselineCandidate && !appliedSet.has(status.baselineCandidate.version)) {
      process.stdout.write(
        `  ⚠ baseline candidate: ${status.baselineCandidate.version} (existing schema will be marked on next 'up')\n`,
      )
    }
    if (status.pending.length > 0) {
      logger.info(`pending (${status.pending.length})`)
      for (const p of status.pending) {
        process.stdout.write(
          `  ⏳ ${p.version}  file=${p.filename}  checksum=${p.checksum.slice(0, 12)}\n`,
        )
      }
    } else {
      process.stdout.write('pending (0)\n  (up to date)\n')
    }
  } finally {
    db.close()
  }
}

const runSqliteUp = (entries: MigrationEntry[]): void => {
  const db = openSqlite()
  try {
    const result = runSqliteMigrations(db, entries)
    logger.info('[migrate] up complete', result)
  } finally {
    db.close()
  }
}

const openMysqlPool = () => createMysqlPool({ multipleStatements: true })

const renderMysqlStatus = async (entries: MigrationEntry[]): Promise<void> => {
  const pool = openMysqlPool()
  try {
    const status = await getMySqlStatus(pool, entries)
    const appliedSet = new Set(status.applied.map((a) => a.version))
    if (status.applied.length > 0) {
      logger.info(`applied (${status.applied.length})`)
      for (const a of status.applied) {
        process.stdout.write(
          `  ✓ ${a.version}  applied_at=${a.applied_at}  checksum=${a.checksum.slice(0, 12)}\n`,
        )
      }
    } else {
      process.stdout.write('  (none)\n')
    }
    if (status.baselineCandidate && !appliedSet.has(status.baselineCandidate.version)) {
      process.stdout.write(
        `  ⚠ baseline candidate: ${status.baselineCandidate.version} (existing schema will be marked on next 'up')\n`,
      )
    }
    if (status.pending.length > 0) {
      logger.info(`pending (${status.pending.length})`)
      for (const p of status.pending) {
        process.stdout.write(
          `  ⏳ ${p.version}  file=${p.filename}  checksum=${p.checksum.slice(0, 12)}\n`,
        )
      }
    } else {
      process.stdout.write('pending (0)\n  (up to date)\n')
    }
  } finally {
    await pool.end()
  }
}

const runMysqlUp = async (entries: MigrationEntry[]): Promise<void> => {
  const pool = openMysqlPool()
  try {
    const result = await runMySqlMigrations(pool, entries)
    logger.info('[migrate] up complete', result)
  } finally {
    await pool.end()
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
      `Create TWO files (one per dialect):`,
      `  backend/src/dal/migrations/sqlite/${file}.sql`,
      `  backend/src/dal/migrations/mysql/${file}.sql`,
      ``,
      `Then register BOTH in backend/src/dal/migrations/manifest.ts:`,
      `  manifestSqlite = [..., loadSqlite('${file}')]`,
      `  manifestMysql  = [..., loadMysql('${file}')]`,
      ``,
    ].join('\n'),
  )
}

const printUsage = (): void => {
  process.stdout.write(
    [
      `Usage:`,
      `  pnpm migrate status                  - list applied / pending migrations`,
      `  pnpm migrate up                      - apply all pending migrations`,
      `  pnpm migrate make <snake_name>       - scaffold a new migration pair`,
      ``,
      `Driver is selected from DB_TYPE env (sqlite | mysql).`,
      ``,
    ].join('\n'),
  )
}

const main = async (): Promise<void> => {
  if (config.dbDriver !== 'sqlite' && config.dbDriver !== 'mysql') {
    logger.error('[migrate] unsupported dbDriver', { driver: config.dbDriver })
    process.exit(1)
  }

  const cmd = process.argv[2]
  const arg = process.argv[3]
  const entries = config.dbDriver === 'sqlite' ? manifestSqlite : manifestMysql

  if (cmd === 'status') {
    if (config.dbDriver === 'sqlite') renderSqliteStatus(entries)
    else await renderMysqlStatus(entries)
    return
  }
  if (cmd === 'up') {
    if (config.dbDriver === 'sqlite') runSqliteUp(entries)
    else await runMysqlUp(entries)
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
  await main()
} catch (err) {
  logger.error('[migrate] failed', {
    err: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  })
  process.exit(1)
}
