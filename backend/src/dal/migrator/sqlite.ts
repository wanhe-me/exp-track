// 自建迁移执行器（SQLite 方言）。
//
// 设计要点：
//   1) 单一权威：_migrations 表 + 文件名版本号 + sha256 checksum
//   2) 基线（baseline）检测：旧库无 _migrations 但已有 category+subscription 两表时，
//      自动把 001_init 标记为已应用，**绝不触碰已存在的表与数据**
//   3) checksum 校验：启动时核对已应用迁移的 checksum 与当前文件是否一致，
//      不一致则抛错拒绝启动，防止误改已应用的迁移文件
//   4) 每个迁移（含 baseline 标记）在 better-sqlite3 事务内执行，失败回滚
//   5) 不引入第三方迁移库，0 额外依赖

import type Database from 'better-sqlite3'
import { logger } from '../../helper/logger.js'
import type { MigrationEntry } from '../migrations/manifest.js'

const MIGRATIONS_TABLE = '_migrations'
const BASELINE_TABLES = ['category', 'subscription']

interface AppliedRow {
  version: string
  applied_at: string
  checksum: string
}

export interface MigrationRunResult {
  applied: string[]
  baselineApplied: boolean
}

const ensureMigrationsTable = (db: Database.Database): void => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      version    TEXT PRIMARY KEY,
      applied_at TEXT    NOT NULL DEFAULT (datetime('now')),
      checksum   TEXT    NOT NULL
    )
  `)
}

const listApplied = (db: Database.Database): AppliedRow[] =>
  db
    .prepare(
      `SELECT version, applied_at, checksum FROM ${MIGRATIONS_TABLE} ORDER BY version ASC`,
    )
    .all() as AppliedRow[]

const tableExists = (db: Database.Database, name: string): boolean => {
  const row = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?")
    .get(name) as { name: string } | undefined
  return row !== undefined
}

const detectBaseline = (
  db: Database.Database,
  entries: MigrationEntry[],
  appliedVersions: Set<string>,
): MigrationEntry | null => {
  const first = entries[0]
  if (!first) return null
  if (appliedVersions.has(first.version)) return null
  return BASELINE_TABLES.every((t) => tableExists(db, t)) ? first : null
}

const markApplied = (
  db: Database.Database,
  version: string,
  checksum: string,
): void => {
  db.prepare(
    `INSERT INTO ${MIGRATIONS_TABLE} (version, applied_at, checksum) VALUES (?, datetime('now'), ?)`,
  ).run(version, checksum)
}

const applyOne = (db: Database.Database, entry: MigrationEntry): void => {
  const run = db.transaction(() => {
    db.exec(entry.sql)
    markApplied(db, entry.version, entry.checksum)
  })
  run()
}

// 校验已应用迁移的 checksum 与当前文件一致，防止误改已应用迁移文件。
// baseline 标记后也会调用，确保刚写入的记录与文件一致。
const verifyChecksums = (
  db: Database.Database,
  entries: MigrationEntry[],
): void => {
  const applied = listApplied(db)
  const entryMap = new Map(entries.map((e) => [e.version, e]))
  for (const row of applied) {
    const entry = entryMap.get(row.version)
    if (!entry) {
      throw new Error(
        `[migrator] orphan applied migration '${row.version}': recorded in DB but missing from manifest (was the migration file removed?)`,
      )
    }
    if (entry.checksum !== row.checksum) {
      throw new Error(
        `[migrator] checksum mismatch for '${row.version}': manifest=${entry.checksum.slice(0, 12)} db=${row.checksum.slice(0, 12)} (migration file was modified after being applied; revert the file or write a new migration instead)`,
      )
    }
  }
}

export const runSqliteMigrations = (
  db: Database.Database,
  entries: MigrationEntry[],
): MigrationRunResult => {
  ensureMigrationsTable(db)

  const applied = listApplied(db)
  const appliedVersions = new Set(applied.map((r) => r.version))

  const baseline = detectBaseline(db, entries, appliedVersions)
  if (baseline) {
    logger.warn(
      '[migrator] existing schema detected without _migrations table; marking 001_init as baseline (no destructive change to data)',
      { version: baseline.version, checksum: baseline.checksum },
    )
    // baseline 标记同样走事务，保证元表写入原子化
    const markBaseline = db.transaction(() => {
      markApplied(db, baseline.version, baseline.checksum)
    })
    markBaseline()
    appliedVersions.add(baseline.version)
  }

  // 校验所有已应用迁移（含刚标记的 baseline）与当前文件 checksum 一致
  verifyChecksums(db, entries)

  const pending = entries.filter((e) => !appliedVersions.has(e.version))
  const newlyApplied: string[] = []
  for (const entry of pending) {
    logger.info('[migrator] applying', { version: entry.version })
    applyOne(db, entry)
    newlyApplied.push(entry.version)
  }

  return { applied: newlyApplied, baselineApplied: baseline !== null }
}

export interface MigrationStatus {
  applied: AppliedRow[]
  pending: MigrationEntry[]
  baselineCandidate: MigrationEntry | null
}

export const getSqliteStatus = (
  db: Database.Database,
  entries: MigrationEntry[],
): MigrationStatus => {
  ensureMigrationsTable(db)
  verifyChecksums(db, entries)
  const applied = listApplied(db)
  const appliedVersions = new Set(applied.map((r) => r.version))
  const baseline = detectBaseline(db, entries, appliedVersions)
  const effective = new Set(appliedVersions)
  if (baseline) effective.add(baseline.version)
  return {
    applied,
    pending: entries.filter((e) => !effective.has(e.version)),
    baselineCandidate: baseline,
  }
}
