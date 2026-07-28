// 迁移清单：显式列出 SQLite 下的迁移文件，方便审计与回溯。
// 新增迁移时按版本号递增追加，并在 sqlite/ 下新增同名 .sql 文件。
//
// 仅 SQLite 方言有迁移脚本。MySQL DAL 适配器尚未实现，待落地时再新建
// migrations/mysql/ 目录与对应的执行器，当前不预留空壳。

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
// manifest.ts 与 sqlite/ 子目录同级，sql 文件位于 here/sqlite/{file}.sql
const migrationsRoot = here

const sha256 = (sql: string): string =>
  createHash('sha256').update(sql, 'utf8').digest('hex')

const load = (file: string): MigrationEntry => {
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

export const manifest: MigrationEntry[] = [load('001_init')]
