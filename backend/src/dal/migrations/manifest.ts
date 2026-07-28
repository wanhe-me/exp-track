// 迁移清单：双方言分文件维护。
//   - SQLite 方言：migrationsRoot/sqlite/{file}.sql，注册到 manifestSqlite
//   - MySQL  方言：migrationsRoot/mysql/{file}.sql， 注册到 manifestMysql
//
// 新增迁移时按版本号递增追加，并在对应方言目录下新增同名 .sql 文件，
// 同时把 load('xxx') 加到对应 manifest；禁止改已应用的迁移文件
// （启动时校验 checksum，改动会被拒绝）。
//
// 字段变更维护流程（参考 ../schema.sql 注释）：先改 sql/schema.sql 唯一可信源，
// 再分别写 SQLite / MySQL 两份迁移。

import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export interface MigrationEntry {
  version: string
  filename: string
  sql: string
  checksum: string
}

const here = dirname(fileURLToPath(import.meta.url))
// manifest.ts 与 sqlite/ 与 mysql/ 子目录同级
const migrationsRoot = here

const sha256 = (sql: string): string =>
  createHash('sha256').update(sql, 'utf8').digest('hex')

const loadSqlite = (file: string): MigrationEntry => {
  const filename = `${file}.sql`
  const path = join(migrationsRoot, 'sqlite', filename)
  const sql = readFileSync(path, 'utf8')
  return {
    version: file,
    filename,
    sql,
    checksum: sha256(sql),
  }
}

const loadMysql = (file: string): MigrationEntry => {
  const filename = `${file}.sql`
  const path = join(migrationsRoot, 'mysql', filename)
  const sql = readFileSync(path, 'utf8')
  return {
    version: file,
    filename,
    sql,
    checksum: sha256(sql),
  }
}

// 仅 SQLite 方言迁移文件
export const manifestSqlite: MigrationEntry[] = [loadSqlite('001_init')]

// 仅 MySQL 方言迁移文件
export const manifestMysql: MigrationEntry[] = [loadMysql('001_init')]
