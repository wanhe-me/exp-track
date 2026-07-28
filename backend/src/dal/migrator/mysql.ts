// 自建迁移执行器（MySQL 8.0 方言）。
//
// 设计要点（与 SQLite 版对齐）：
//   1) 单一权威：_migrations 表 + 文件名版本号 + sha256 checksum
//   2) 基线（baseline）检测：旧库无 _migrations 但已有 category+subscription 两表时，
//      自动把 001_init 标记为已应用，**绝不触碰已存在的表与数据**
//   3) checksum 校验：启动时核对已应用迁移的 checksum 与当前文件是否一致，
//      不一致则抛错拒绝启动，防止误改已应用的迁移文件
//   4) 每个迁移（含 baseline 标记）在 mysql2 事务内执行，失败回滚
//   5) 不引入第三方迁移库，0 额外依赖（mysql2 已在 backend/package.json）

import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise'
import { logger } from '../../utils/logger.js'
import { config } from '../../config/index.js'
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

const ensureMigrationsTable = async (conn: PoolConnection): Promise<void> => {
  // 与 SQLite 版字段一致；DEFAULT CURRENT_TIMESTAMP 让 001_init 标记的 applied_at 也有合理值
  await conn.query(
    `CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
       version    VARCHAR(64)  NOT NULL,
       applied_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
       checksum   VARCHAR(64)  NOT NULL,
       PRIMARY KEY (version)
     ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci`,
  )
}

const listApplied = async (conn: PoolConnection): Promise<AppliedRow[]> => {
  const [rows] = await conn.query<RowDataPacket[]>(
    `SELECT version, applied_at, checksum FROM ${MIGRATIONS_TABLE} ORDER BY version ASC`,
  )
  return rows as AppliedRow[]
}

const tableExists = async (
  conn: PoolConnection,
  database: string,
  name: string,
): Promise<boolean> => {
  const [rows] = await conn.query<RowDataPacket[]>(
    `SELECT TABLE_NAME AS table_name
       FROM information_schema.tables
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
      LIMIT 1`,
    [database, name],
  )
  return rows.length > 0
}

const detectBaseline = async (
  conn: PoolConnection,
  entries: MigrationEntry[],
  appliedVersions: Set<string>,
  database: string,
): Promise<MigrationEntry | null> => {
  const first = entries[0]
  if (!first) return null
  if (appliedVersions.has(first.version)) return null
  for (const t of BASELINE_TABLES) {
    if (!(await tableExists(conn, database, t))) return null
  }
  return first
}

const markApplied = async (
  conn: PoolConnection,
  version: string,
  checksum: string,
): Promise<void> => {
  await conn.query(
    `INSERT INTO ${MIGRATIONS_TABLE} (version, checksum) VALUES (?, ?)`,
    [version, checksum],
  )
}

// 校验已应用迁移的 checksum 与当前文件一致，防止误改已应用迁移文件。
// baseline 标记后也会调用，确保刚写入的记录与文件一致。
const verifyChecksums = (
  entries: MigrationEntry[],
  applied: AppliedRow[],
): void => {
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

export const runMySqlMigrations = async (
  pool: Pool,
  entries: MigrationEntry[],
): Promise<MigrationRunResult> => {
  const conn = await pool.getConnection()
  try {
    await ensureMigrationsTable(conn)

    const applied = await listApplied(conn)
    const appliedVersions = new Set(applied.map((r) => r.version))

    const baseline = await detectBaseline(
      conn,
      entries,
      appliedVersions,
      config.mysql.database,
    )
    if (baseline) {
      logger.warn(
        '[migrator] existing schema detected without _migrations table; marking 001_init as baseline (no destructive change to data)',
        { version: baseline.version, checksum: baseline.checksum },
      )
      // baseline 标记同样走事务，保证元表写入原子化
      await conn.beginTransaction()
      try {
        await markApplied(conn, baseline.version, baseline.checksum)
        await conn.commit()
      } catch (err) {
        await conn.rollback()
        throw err
      }
      appliedVersions.add(baseline.version)
    }

    // baseline 标记写入库后重新拉取已应用记录，确保 baseline 记录纳入 checksum 校验
    // （对齐 sqlite 版 verifyChecksums 内部重新查库的语义）
    const appliedAfterBaseline = await listApplied(conn)
    verifyChecksums(entries, appliedAfterBaseline)

    const pending = entries.filter((e) => !appliedVersions.has(e.version))
    const newlyApplied: string[] = []
    for (const entry of pending) {
      logger.info('[migrator] applying', { version: entry.version })
      await conn.beginTransaction()
      try {
        // 整段 .sql 一次 query（pool 必须 multipleStatements: true）
        await conn.query(entry.sql)
        await markApplied(conn, entry.version, entry.checksum)
        await conn.commit()
      } catch (err) {
        await conn.rollback()
        throw err
      }
      newlyApplied.push(entry.version)
    }

    return { applied: newlyApplied, baselineApplied: baseline !== null }
  } finally {
    conn.release()
  }
}

export interface MigrationStatus {
  applied: AppliedRow[]
  pending: MigrationEntry[]
  baselineCandidate: MigrationEntry | null
}

export const getMySqlStatus = async (
  pool: Pool,
  entries: MigrationEntry[],
): Promise<MigrationStatus> => {
  const conn = await pool.getConnection()
  try {
    await ensureMigrationsTable(conn)
    const applied = await listApplied(conn)
    verifyChecksums(entries, applied)
    const appliedVersions = new Set(applied.map((r) => r.version))
    const baseline = await detectBaseline(
      conn,
      entries,
      appliedVersions,
      config.mysql.database,
    )
    const effective = new Set(appliedVersions)
    if (baseline) effective.add(baseline.version)
    return {
      applied,
      pending: entries.filter((e) => !effective.has(e.version)),
      baselineCandidate: baseline,
    }
  } finally {
    conn.release()
  }
}