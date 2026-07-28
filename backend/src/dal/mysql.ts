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
  SubscriptionWithCategoryRow,
  UpdateCategoryInput,
  UpdateSubscriptionInput,
} from '../types/domain.js'

type MysqlRow = RowDataPacket

export interface MysqlPoolOptions {
  multipleStatements?: boolean
}

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
    timezone: 'Z',
  })

const mapCategory = (row: MysqlRow): CategoryRow => ({
  id: Number(row.id),
  name: String(row.name),
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at),
})

const mapSubscriptionWithCategory = (row: MysqlRow): SubscriptionWithCategoryRow => ({
  id: Number(row.id),
  name: String(row.name),
  categoryId: Number(row.category_id),
  price: Number(row.price),
  billingCycle: String(row.billing_cycle) as SubscriptionWithCategoryRow['billingCycle'],
  startDate: String(row.start_date),
  expireDate: String(row.expire_date),
  autoRenew: Number(row.auto_renew) === 1,
  note: row.note === null ? null : String(row.note),
  subscriptionType: String(row.subscription_type) as SubscriptionWithCategoryRow['subscriptionType'],
  quotaCycle: row.quota_cycle === null ? null : (String(row.quota_cycle) as SubscriptionWithCategoryRow['quotaCycle']),
  quotaTotal: row.quota_total === null ? null : Number(row.quota_total),
  quotaUsed: row.quota_used === null ? null : Number(row.quota_used),
  quotaRemaining: row.quota_remaining === null ? null : Number(row.quota_remaining),
  quotaUnit: row.quota_unit === null ? null : String(row.quota_unit),
  archived: Number(row.archived) === 1,
  deletedAt: row.deleted_at === null ? null : String(row.deleted_at),
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at),
  categoryName: row.category_name === null ? '' : String(row.category_name),
})

const SUBSCRIPTION_JOIN_SQL = `
  SELECT s.*, c.name AS category_name
  FROM subscription s
  LEFT JOIN category c ON s.category_id = c.id
`

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

  private buildFilterClause(filter: SubscriptionFilter): { where: string; params: unknown[] } {
    const conditions: string[] = []
    const params: unknown[] = []

    if (filter.view === 'active') {
      conditions.push('s.deleted_at IS NULL AND s.archived = 0')
    } else if (filter.view === 'archived') {
      conditions.push('s.deleted_at IS NULL AND s.archived = 1')
    } else {
      conditions.push('s.deleted_at IS NOT NULL')
    }

    if (filter.categoryId !== undefined) {
      conditions.push('s.category_id = ?')
      params.push(filter.categoryId)
    }

    if (filter.search) {
      conditions.push('s.name LIKE ?')
      params.push(`%${filter.search}%`)
    }

    return { where: conditions.join(' AND '), params }
  }

  async listSubscriptions(filter: SubscriptionFilter): Promise<SubscriptionWithCategoryRow[]> {
    const { where, params } = this.buildFilterClause(filter)
    let sql = `${SUBSCRIPTION_JOIN_SQL} WHERE ${where} ORDER BY s.expire_date ASC`

    if (filter.page !== undefined && filter.pageSize !== undefined) {
      sql += ' LIMIT ? OFFSET ?'
      params.push(filter.pageSize, (filter.page - 1) * filter.pageSize)
    }

    const [rows] = await this.conn().query<MysqlRow[]>(sql, params)
    return rows.map(mapSubscriptionWithCategory)
  }

  async countSubscriptions(filter: SubscriptionFilter): Promise<number> {
    const { where, params } = this.buildFilterClause(filter)
    const sql = `SELECT COUNT(*) AS cnt FROM subscription s WHERE ${where}`
    const [rows] = await this.conn().query<MysqlRow[]>(sql, params)
    return Number(rows[0]?.cnt ?? 0)
  }

  async getSubscriptionById(id: number): Promise<SubscriptionWithCategoryRow | null> {
    const sql = `${SUBSCRIPTION_JOIN_SQL} WHERE s.id = ?`
    const [rows] = await this.conn().query<MysqlRow[]>(sql, [id])
    return rows[0] ? mapSubscriptionWithCategory(rows[0]) : null
  }

  async createSubscription(input: CreateSubscriptionInput): Promise<SubscriptionWithCategoryRow> {
    const [result] = await this.conn().query<ResultSetHeader>(
      `INSERT INTO subscription
         (name, category_id, price, billing_cycle, start_date, expire_date, auto_renew, note,
          subscription_type, quota_cycle, quota_total, quota_used, quota_remaining, quota_unit)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.name,
        input.categoryId,
        input.price,
        input.billingCycle,
        input.startDate,
        input.expireDate,
        input.autoRenew ? 1 : 0,
        input.note,
        input.subscriptionType,
        input.quotaCycle,
        input.quotaTotal,
        input.quotaUsed,
        input.quotaRemaining,
        input.quotaUnit,
      ],
    )
    const row = await this.getSubscriptionById(result.insertId)
    if (!row) throw new Error('[mysql] subscription row missing immediately after insert')
    return row
  }

  async updateSubscription(
    id: number,
    input: UpdateSubscriptionInput,
  ): Promise<SubscriptionWithCategoryRow | null> {
    await this.conn().query(
      `UPDATE subscription SET
         name = ?, category_id = ?, price = ?, billing_cycle = ?,
         start_date = ?, expire_date = ?, auto_renew = ?, note = ?,
         subscription_type = ?, quota_cycle = ?, quota_total = ?, quota_used = ?, quota_remaining = ?, quota_unit = ?,
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
        input.subscriptionType,
        input.quotaCycle,
        input.quotaTotal,
        input.quotaUsed,
        input.quotaRemaining,
        input.quotaUnit,
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

  async restoreSubscription(id: number): Promise<SubscriptionWithCategoryRow | null> {
    await this.conn().query(
      'UPDATE subscription SET deleted_at = NULL, updated_at = NOW() WHERE id = ?',
      [id],
    )
    return this.getSubscriptionById(id)
  }

  async setArchived(id: number, archived: boolean): Promise<SubscriptionWithCategoryRow | null> {
    await this.conn().query(
      'UPDATE subscription SET archived = ?, updated_at = NOW() WHERE id = ?',
      [archived ? 1 : 0, id],
    )
    return this.getSubscriptionById(id)
  }
}
