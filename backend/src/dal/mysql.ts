// MySQL 8.0 DAL 适配器：实现 DbAdapter 全 16 方法。
//
// 与 SQLite 版对齐契约：
//   - 类型映射：主键 BIGINT UNSIGNED → Number；布尔 TINYINT(1) 0/1 → boolean；
//     日期由 dateStrings: true 拿字符串再 String(...); DECIMAL → Number(...)
//   - 占位符 ?（mysql2 promise 数组形式同）
//   - listSubscriptions 三 view 与 SQLite 版 SQL 完全一致（业务语义布尔字段 0/1）
//   - UPDATE updated_at 使用 NOW() 而非 SQLite 的 datetime('now')
//   - 写入布尔：archived / autoRenew → boolean ? 1 : 0
//
// 关键开关：
//   - createPool 必须 multipleStatements: true（整段 .sql 一次 query）
//   - createPool 必须 dateStrings: true（DATETIME/DATE 列回字符串，对齐业务代码）

import mysql, { type Pool, type RowDataPacket, type ResultSetHeader } from 'mysql2/promise'
import { config } from '../config/index.js'
import { logger } from '../utils/logger.js'
import type { DbAdapter } from './types.js'
import { manifestMysql } from './migrations/manifest.js'
import { runMySqlMigrations } from './migrator/mysql.js'
import type {
  CategoryRow,
  CreateCategoryInput,
  CreateSubscriptionInput,
  SubscriptionFilter,
  SubscriptionRow,
  UpdateCategoryInput,
  UpdateSubscriptionInput,
} from '../types/domain.js'

type MysqlRow = RowDataPacket

export interface MysqlPoolOptions {
  multipleStatements?: boolean
}

// 统一 pool 创建：业务 pool 不开 multipleStatements（最小化多语句注入攻击面），
// 仅迁移专用 pool 开启（migrate.ts 需一次执行整段 .sql）。
export const createMysqlPool = (options: MysqlPoolOptions = {}): Pool =>
  mysql.createPool({
    host: config.mysql.host,
    port: config.mysql.port,
    user: config.mysql.user,
    password: config.mysql.password,
    database: config.mysql.database,
    connectionLimit: config.mysql.connectionLimit,
    multipleStatements: options.multipleStatements ?? false,
    dateStrings: true,
    // DECIMAL 回字符串，统一由 mapSubscription 用 Number(...) 转换
    // （不设 decimalNumbers: true，保持默认 string 行为以兼容两种路径）
    // timezone 仅影响 mysql2 对 Date 对象的写入/读取转换；本项目业务全用字符串
    // 直进出（dateStrings:true），timezone 实际不参与业务字段转换。
    timezone: 'Z',
  })

const mapCategory = (row: MysqlRow): CategoryRow => ({
  id: Number(row.id),
  name: String(row.name),
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at),
})

const mapSubscription = (row: MysqlRow): SubscriptionRow => ({
  id: Number(row.id),
  name: String(row.name),
  categoryId: Number(row.category_id),
  price: Number(row.price),
  billingCycle: String(row.billing_cycle) as SubscriptionRow['billingCycle'],
  startDate: String(row.start_date),
  expireDate: String(row.expire_date),
  autoRenew: Number(row.auto_renew) === 1,
  note: row.note === null ? null : String(row.note),
  archived: Number(row.archived) === 1,
  deletedAt: row.deleted_at === null ? null : String(row.deleted_at),
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at),
})

export class MySqlAdapter implements DbAdapter {
  private pool: Pool | null = null

  private conn(): Pool {
    if (!this.pool) {
      throw new Error('[mysql] database not initialized, call init() first')
    }
    return this.pool
  }

  async init(): Promise<void> {
    this.pool = createMysqlPool({ multipleStatements: false })
    // 先 ping 确保连接可用，再跑迁移（迁移也内含 _migrations 建表）
    await this.ping()
    const result = await runMySqlMigrations(this.pool, manifestMysql)
    logger.info('mysql initialized', {
      host: config.mysql.host,
      port: config.mysql.port,
      database: config.mysql.database,
      migrationsApplied: result.applied,
      baselineApplied: result.baselineApplied,
    })
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end()
      this.pool = null
      logger.info('mysql closed')
    }
  }

  async ping(): Promise<void> {
    const [rows] = await this.conn().query<RowDataPacket[]>('SELECT 1 AS ok')
    if (!rows || rows.length === 0) throw new Error('[mysql] ping failed: no rows')
  }

  // ---------------- category ----------------

  async listCategories(): Promise<CategoryRow[]> {
    const [rows] = await this.conn().query<MysqlRow[]>(
      'SELECT * FROM category ORDER BY id ASC',
    )
    return rows.map(mapCategory)
  }

  async getCategoryById(id: number): Promise<CategoryRow | null> {
    const [rows] = await this.conn().query<MysqlRow[]>(
      'SELECT * FROM category WHERE id = ?',
      [id],
    )
    return rows[0] ? mapCategory(rows[0]) : null
  }

  async getCategoryByName(name: string): Promise<CategoryRow | null> {
    const [rows] = await this.conn().query<MysqlRow[]>(
      'SELECT * FROM category WHERE name = ?',
      [name],
    )
    return rows[0] ? mapCategory(rows[0]) : null
  }

  async countSubscriptionsByCategory(categoryId: number): Promise<number> {
    const [rows] = await this.conn().query<MysqlRow[]>(
      'SELECT COUNT(*) AS cnt FROM subscription WHERE category_id = ? AND deleted_at IS NULL',
      [categoryId],
    )
    return Number(rows[0]?.cnt ?? 0)
  }

  async createCategory(input: CreateCategoryInput): Promise<CategoryRow> {
    const [result] = await this.conn().query<ResultSetHeader>(
      'INSERT INTO category (name) VALUES (?)',
      [input.name],
    )
    const row = await this.getCategoryById(result.insertId)
    if (!row) throw new Error('[mysql] category row missing immediately after insert')
    return row
  }

  async updateCategory(id: number, input: UpdateCategoryInput): Promise<CategoryRow | null> {
    await this.conn().query(
      'UPDATE category SET name = ?, updated_at = NOW() WHERE id = ?',
      [input.name, id],
    )
    return this.getCategoryById(id)
  }

  async deleteCategory(id: number): Promise<void> {
    await this.conn().query('DELETE FROM category WHERE id = ?', [id])
  }

  // ---------------- subscription ----------------

  async listSubscriptions(filter: SubscriptionFilter): Promise<SubscriptionRow[]> {
    const conditions: string[] = []
    const params: unknown[] = []

    if (filter.view === 'active') {
      conditions.push('deleted_at IS NULL AND archived = 0')
    } else if (filter.view === 'archived') {
      conditions.push('deleted_at IS NULL AND archived = 1')
    } else {
      conditions.push('deleted_at IS NOT NULL')
    }

    if (filter.categoryId !== undefined) {
      conditions.push('category_id = ?')
      params.push(filter.categoryId)
    }

    if (filter.search) {
      conditions.push('name LIKE ?')
      params.push(`%${filter.search}%`)
    }

    const where = conditions.join(' AND ')
    const sql = `SELECT * FROM subscription WHERE ${where} ORDER BY expire_date ASC`
    const [rows] = await this.conn().query<MysqlRow[]>(sql, params)
    return rows.map(mapSubscription)
  }

  async getSubscriptionById(id: number): Promise<SubscriptionRow | null> {
    const [rows] = await this.conn().query<MysqlRow[]>(
      'SELECT * FROM subscription WHERE id = ?',
      [id],
    )
    return rows[0] ? mapSubscription(rows[0]) : null
  }

  async createSubscription(input: CreateSubscriptionInput): Promise<SubscriptionRow> {
    const [result] = await this.conn().query<ResultSetHeader>(
      `INSERT INTO subscription
         (name, category_id, price, billing_cycle, start_date, expire_date, auto_renew, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.name,
        input.categoryId,
        input.price,
        input.billingCycle,
        input.startDate,
        input.expireDate,
        input.autoRenew ? 1 : 0,
        input.note,
      ],
    )
    const row = await this.getSubscriptionById(result.insertId)
    if (!row) throw new Error('[mysql] subscription row missing immediately after insert')
    return row
  }

  async updateSubscription(
    id: number,
    input: UpdateSubscriptionInput,
  ): Promise<SubscriptionRow | null> {
    await this.conn().query(
      `UPDATE subscription SET
         name = ?, category_id = ?, price = ?, billing_cycle = ?,
         start_date = ?, expire_date = ?, auto_renew = ?, note = ?,
         updated_at = NOW()
       WHERE id = ?`,
      [
        input.name,
        input.categoryId,
        input.price,
        input.billingCycle,
        input.startDate,
        input.expireDate,
        input.autoRenew ? 1 : 0,
        input.note,
        id,
      ],
    )
    return this.getSubscriptionById(id)
  }

  async softDeleteSubscription(id: number): Promise<void> {
    await this.conn().query(
      'UPDATE subscription SET deleted_at = NOW(), updated_at = NOW() WHERE id = ?',
      [id],
    )
  }

  async restoreSubscription(id: number): Promise<void> {
    await this.conn().query(
      'UPDATE subscription SET deleted_at = NULL, updated_at = NOW() WHERE id = ?',
      [id],
    )
  }

  async setArchived(id: number, archived: boolean): Promise<void> {
    await this.conn().query(
      'UPDATE subscription SET archived = ?, updated_at = NOW() WHERE id = ?',
      [archived ? 1 : 0, id],
    )
  }
}