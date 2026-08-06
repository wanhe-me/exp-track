-- Migration 001: initial schema (MySQL 8.0)
-- ============================================================
-- 迁移脚本：migrator 按 manifest 顺序读取并执行本文件。
--
--   1) 已有数据的旧库（无 _migrations 表但有 category/subscription 两表）会被
--      migrator 自动识别为「已应用 001_init」基线，不会破坏数据
--   2) 后续加字段：新增 002_xxx.sql 之类的迁移文件，并在 manifest.ts 注册，
--      **禁止改本文件**（migrator 启动时校验 checksum，改动已应用迁移会拒绝启动）
--
-- 数据表字段设计文档（人工查阅表结构）见 ../schema.sql（与本文件结构一致）
-- 方言说明：MySQL 8.0 / InnoDB / utf8mb4_0900_ai_ci
-- ============================================================

CREATE TABLE IF NOT EXISTS category (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键，自增',
  name       VARCHAR(50)     NOT NULL                COMMENT '分类名称，最长 50 字符，系统内唯一',
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_category_name (name)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '订阅分类表：管理订阅的分类标签，名称唯一';


CREATE TABLE IF NOT EXISTS subscription (
  id            BIGINT UNSIGNED                              NOT NULL AUTO_INCREMENT            COMMENT '主键，自增',
  name          VARCHAR(100)                                 NOT NULL                            COMMENT '订阅名称，最长 100 字符，非空',
  category_id   BIGINT UNSIGNED                              NOT NULL                            COMMENT '所属分类 ID，关联 category(id)',
  price         DECIMAL(10, 2) UNSIGNED                      NOT NULL                            COMMENT '价格，非负 2 位小数，单位元',
  billing_cycle ENUM('month', 'quarter', 'year')            NOT NULL                            COMMENT '计费周期：month 月 / quarter 季 / year 年',
  start_date    DATE                                         NOT NULL                            COMMENT '订阅开始日期，格式 YYYY-MM-DD',
  expire_date   DATE                                         NOT NULL                            COMMENT '到期日期；剩余天数唯一权威字段',
  auto_renew    TINYINT(1)                                   NOT NULL DEFAULT 0                   COMMENT '是否自动续费：0 否 / 1 是',
  note          VARCHAR(500)                                 DEFAULT NULL                        COMMENT '备注，可空',
  archived      TINYINT(1)                                   NOT NULL DEFAULT 0                   COMMENT '是否已归档：0 否 / 1 是',
  deleted_at    DATETIME                                     DEFAULT NULL                        COMMENT '软删除时间，NULL 表示未删除',
  created_at    DATETIME                                     NOT NULL DEFAULT CURRENT_TIMESTAMP   COMMENT '创建时间',
  updated_at    DATETIME                                     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  KEY idx_subscription_expire_date (expire_date),
  KEY idx_subscription_category_id (category_id),
  KEY idx_subscription_archived (archived),
  KEY idx_subscription_deleted_at (deleted_at),
  CONSTRAINT fk_subscription_category FOREIGN KEY (category_id) REFERENCES category (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '订阅记录表：记录每项订阅的基本信息与到期时间，支持软删除与归档';