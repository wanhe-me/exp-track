-- Migration 001: initial schema (SQLite)
-- ============================================================
-- 迁移脚本：migrator 按 manifest 顺序读取并执行本文件。
--
--   1) 已有数据的旧库（无 _migrations 表但有 category/subscription 两表）会被
--      migrator 自动识别为「已应用 001_init」基线，不会破坏数据
--   2) 后续加字段：新增 002_xxx.sql 之类的迁移文件，并在 manifest.ts 注册，
--      **禁止改本文件**（migrator 启动时校验 checksum，改动已应用迁移会拒绝启动）
--
-- 数据表字段设计文档（人工查阅表结构）见 ../schema.sql
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
