import Database from 'better-sqlite3'
import { config } from '../config/index.js'
import { logger } from '../utils/logger.js'
import type { DbAdapter } from './types.js'
import { manifestSqlite as manifest } from './migrations/manifest.js'
import { runSqliteMigrations } from './migrator/sqlite.js'
import type {
  CategoryRow,
  CreateCategoryInput,
  CreateSubscriptionInput,
  SubscriptionFilter,
  SubscriptionRow,
  UpdateCategoryInput,
  UpdateSubscriptionInput,
} from '../types/domain.js'

type SqliteRow = Record<string, unknown>

const mapCategory = (row: SqliteRow): CategoryRow => ({
  id: Number(row.id),
  name: String(row.name),
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at),
})

const mapSubscription = (row: SqliteRow): SubscriptionRow => ({
  id: Number(row.id),
  name: String(row.name),
  categoryId: Number(row.category_id),
  price: Number(row.price),
  billingCycle: String(row.billing_cycle) as SubscriptionRow['billingCycle'],
  startDate: String(row.start_date),
  expireDate: String(row.expire_date),
  autoRenew: Number(row.auto_renew) === 1,
  note: row.note === null ? null : String(row.note),
  subscriptionType: String(row.subscription_type) as SubscriptionRow['subscriptionType'],
  quotaCycle: row.quota_cycle === null ? null : (String(row.quota_cycle) as SubscriptionRow['quotaCycle']),
  quotaTotal: row.quota_total === null ? null : Number(row.quota_total),
  quotaUsed: row.quota_used === null ? null : Number(row.quota_used),
  quotaRemaining: row.quota_remaining === null ? null : Number(row.quota_remaining),
  quotaUnit: row.quota_unit === null ? null : String(row.quota_unit),
  archived: Number(row.archived) === 1,
  deletedAt: row.deleted_at === null ? null : String(row.deleted_at),
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at),
})

export class SqliteAdapter implements DbAdapter {
  private db: Database.Database | null = null

  private conn(): Database.Database {
    if (!this.db) {
      throw new Error('[sqlite] database not initialized, call init() first')
    }
    return this.db
  }

  async init(): Promise<void> {
    const path = config.sqlite.path
    const fs = await import('node:fs')
    const dir = path.substring(0, path.lastIndexOf('/'))
    if (dir && !fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    this.db = new Database(path)
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('foreign_keys = ON')
    const result = runSqliteMigrations(this.db, manifest)
    logger.info('sqlite initialized', {
      path,
      migrationsApplied: result.applied,
      baselineApplied: result.baselineApplied,
    })
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close()
      this.db = null
      logger.info('sqlite closed')
    }
  }

  async ping(): Promise<void> {
    this.conn().prepare('SELECT 1').get()
  }

  // ---------------- category ----------------

  async listCategories(): Promise<CategoryRow[]> {
    const rows = this.conn().prepare('SELECT * FROM category ORDER BY id ASC').all() as SqliteRow[]
    return rows.map(mapCategory)
  }

  async getCategoryById(id: number): Promise<CategoryRow | null> {
    const row = this.conn().prepare('SELECT * FROM category WHERE id = ?').get(id) as SqliteRow | undefined
    return row ? mapCategory(row) : null
  }

  async getCategoryByName(name: string): Promise<CategoryRow | null> {
    const row = this.conn().prepare('SELECT * FROM category WHERE name = ?').get(name) as SqliteRow | undefined
    return row ? mapCategory(row) : null
  }

  async countSubscriptionsByCategory(categoryId: number): Promise<number> {
    const row = this.conn()
      .prepare('SELECT COUNT(*) AS cnt FROM subscription WHERE category_id = ? AND deleted_at IS NULL')
      .get(categoryId) as SqliteRow
    return Number(row.cnt)
  }

  async createCategory(input: CreateCategoryInput): Promise<CategoryRow> {
    const stmt = this.conn().prepare('INSERT INTO category (name) VALUES (?)')
    const info = stmt.run(input.name)
    const row = this.conn().prepare('SELECT * FROM category WHERE id = ?').get(info.lastInsertRowid) as SqliteRow
    return mapCategory(row)
  }

  async updateCategory(id: number, input: UpdateCategoryInput): Promise<CategoryRow | null> {
    this.conn()
      .prepare("UPDATE category SET name = ?, updated_at = datetime('now') WHERE id = ?")
      .run(input.name, id)
    return this.getCategoryById(id)
  }

  async deleteCategory(id: number): Promise<void> {
    this.conn().prepare('DELETE FROM category WHERE id = ?').run(id)
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
    const rows = this.conn().prepare(sql).all(...params) as SqliteRow[]
    return rows.map(mapSubscription)
  }

  async getSubscriptionById(id: number): Promise<SubscriptionRow | null> {
    const row = this.conn().prepare('SELECT * FROM subscription WHERE id = ?').get(id) as SqliteRow | undefined
    return row ? mapSubscription(row) : null
  }

  async createSubscription(input: CreateSubscriptionInput): Promise<SubscriptionRow> {
    const stmt = this.conn().prepare(`
      INSERT INTO subscription
        (name, category_id, price, billing_cycle, start_date, expire_date, auto_renew, note,
         subscription_type, quota_cycle, quota_total, quota_used, quota_remaining, quota_unit)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    const info = stmt.run(
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
    )
    const row = this.conn().prepare('SELECT * FROM subscription WHERE id = ?').get(info.lastInsertRowid) as SqliteRow
    return mapSubscription(row)
  }

  async updateSubscription(id: number, input: UpdateSubscriptionInput): Promise<SubscriptionRow | null> {
    this.conn()
      .prepare(`
        UPDATE subscription SET
          name = ?, category_id = ?, price = ?, billing_cycle = ?,
          start_date = ?, expire_date = ?, auto_renew = ?, note = ?,
          subscription_type = ?, quota_cycle = ?, quota_total = ?, quota_used = ?, quota_remaining = ?, quota_unit = ?,
          updated_at = datetime('now')
        WHERE id = ?
      `)
      .run(
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
      )
    return this.getSubscriptionById(id)
  }

  async softDeleteSubscription(id: number): Promise<void> {
    this.conn()
      .prepare("UPDATE subscription SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?")
      .run(id)
  }

  async restoreSubscription(id: number): Promise<void> {
    this.conn()
      .prepare('UPDATE subscription SET deleted_at = NULL, updated_at = datetime(\'now\') WHERE id = ?')
      .run(id)
  }

  async setArchived(id: number, archived: boolean): Promise<void> {
    this.conn()
      .prepare("UPDATE subscription SET archived = ?, updated_at = datetime('now') WHERE id = ?")
      .run(archived ? 1 : 0, id)
  }
}
