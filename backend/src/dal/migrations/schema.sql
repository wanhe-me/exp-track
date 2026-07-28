-- exp-track 数据表字段设计文档（SQLite 方言）
-- ============================================================
-- 本文件供人工随时查阅数据表的字段设计，**不是迁移脚本，不参与执行**。
-- 实际迁移脚本在 sqlite/ 子目录，由 migrator 按 manifest 顺序执行。
--
-- 维护规则：
--   - 字段变更时，同步更新本文件与对应的迁移脚本（sqlite/00X_xxx.sql）
--   - 本文件反映「当前完整 schema」，后续新增迁移后须累加体现最新结构
--   - 禁止改已应用的迁移脚本（001_init.sql 等）；新增字段走新版本号迁移
-- ============================================================

CREATE TABLE IF NOT EXISTS category (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL UNIQUE,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS subscription (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  category_id   INTEGER NOT NULL,
  price         REAL    NOT NULL,
  billing_cycle TEXT    NOT NULL,
  start_date    TEXT    NOT NULL,
  expire_date   TEXT    NOT NULL,
  auto_renew    INTEGER NOT NULL DEFAULT 0,
  note          TEXT,
  archived      INTEGER NOT NULL DEFAULT 0,
  deleted_at    TEXT,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (category_id) REFERENCES category(id)
);

CREATE INDEX IF NOT EXISTS idx_subscription_expire_date  ON subscription(expire_date);
CREATE INDEX IF NOT EXISTS idx_subscription_category_id  ON subscription(category_id);
CREATE INDEX IF NOT EXISTS idx_subscription_archived     ON subscription(archived);
CREATE INDEX IF NOT EXISTS idx_subscription_deleted_at   ON subscription(deleted_at);
