-- =============================================================================
-- exp-track 数据库表结构设计文档（唯一可信源 / Single Source of Truth）
-- =============================================================================
-- 方言：MySQL 8.0（InnoDB 引擎，utf8mb4 字符集）
--
-- 用途：
--   本文件是数据表结构的「人工查阅最佳入口」，反映当前完整 schema（最新结构）。
--   任何人想了解「有哪些表、字段怎么设计、字段含义是什么」，直接读本文件即可。
--
-- 与迁移脚本的关系：
--   - 本文件【不参与执行】，仅作设计文档与可信源。
--   - 实际建表 / 改表由迁移脚本完成：
--       * MySQL 迁移脚本：backend/src/dal/migrations/mysql/00X_xxx.sql
--     迁移脚本由 migrator 按 manifest 顺序执行，启动时校验已应用迁移的 sha256
--     checksum，改动已应用迁移会拒绝启动。
--
-- 维护流程（加字段 / 改表结构时）：
--   1) 分析需要新增 / 修改的字段
--   2) 先修改本文件，使其反映最新结构（唯一可信源）
--   3) 再创建对应的新版本迁移脚本（00X_xxx.sql），并在 manifest.ts 注册
--      —— 迁移脚本随版本累加，逐步演进为 v1 / v2 / v3 ... 的标准迁移历史
--   4) 禁止修改已应用的迁移脚本（如 001_init.sql）
--
-- 注意：
--   - 本文件用 MySQL 8.0 语法书写，便于直观表达字段类型、约束、注释与索引。
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 表：category（订阅分类）
--   - 分类名称在系统内唯一，用于给订阅打标签（FR-10）
--   - 禁止删除被订阅引用的分类
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS category (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键，自增',
  name       VARCHAR(50)    NOT NULL                COMMENT '分类名称，最长 50 字符，系统内唯一',
  created_at DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_category_name (name)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '订阅分类表：管理订阅的分类标签，名称唯一';


-- -----------------------------------------------------------------------------
-- 表：subscription（订阅记录）
--   - 记录每项订阅的基本信息与到期时间（FR-01 ~ FR-04）
--   - expire_date 是计算「剩余天数 / 状态」的唯一权威字段（FR-06）
--   - 软删除：删除置 deleted_at；归档：archived = 1（FR-03 / FR-04）
--   - 字段校验（FR-01）：名称 ≤100 非空；价格非负 2 位小数；到期日期 ≥ 开始日期
--     开始 / 到期 / 计费周期三者独立填写，不互相推算
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscription (
  id            BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT COMMENT '主键，自增',
  name          VARCHAR(100)      NOT NULL                COMMENT '订阅名称，最长 100 字符，非空',
  category_id   BIGINT UNSIGNED   NOT NULL                COMMENT '所属分类 ID，关联 category(id)',
  price         DECIMAL(10, 2)    UNSIGNED NOT NULL       COMMENT '价格，非负 2 位小数，单位元（货币符号 ¥）',
  billing_cycle ENUM('month', 'quarter', 'year') NOT NULL COMMENT '计费周期：month 月 / quarter 季 / year 年',
  start_date    DATE              NOT NULL                COMMENT '订阅开始日期，格式 YYYY-MM-DD',
  expire_date   DATE              NOT NULL                COMMENT '到期日期，格式 YYYY-MM-DD；需 ≥ start_date；是剩余天数唯一权威字段',
  auto_renew    TINYINT(1)        NOT NULL DEFAULT 0       COMMENT '是否自动续费：0 否 / 1 是',
  note          VARCHAR(500)                  DEFAULT NULL COMMENT '备注，可空',
  subscription_type ENUM('standard','quota') NOT NULL DEFAULT 'standard' COMMENT '订阅类型：standard 标准/功能解锁型 / quota 额度型（大模型 API 周月限额等）',
  quota_cycle   ENUM('week','month')          DEFAULT NULL COMMENT '额度周期标签：week 周 / month 月（仅 quota 型，纯展示不自动重置，手动更新剩余额度）',
  quota_total   DECIMAL(14, 2)                DEFAULT NULL COMMENT '总额度（quota 型必填，>0）',
  quota_used    DECIMAL(14, 2)                DEFAULT NULL COMMENT '已使用额度（quota 型必填，与 quota_remaining 二选一填写，另一者自动计算）',
  quota_remaining DECIMAL(14, 2)              DEFAULT NULL COMMENT '剩余额度（quota 型必填，与 quota_used 二选一填写，另一者自动计算）',
  quota_unit    VARCHAR(20)                   DEFAULT NULL COMMENT '额度单位文本，如 $、次、万token（可选，展示时拼数值后）',
  archived      TINYINT(1)        NOT NULL DEFAULT 0       COMMENT '是否已归档：0 否 / 1 是（FR-04）',
  deleted_at    DATETIME                      DEFAULT NULL COMMENT '软删除时间，NULL 表示未删除；置值即删除（FR-03）',
  created_at    DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at    DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  KEY idx_subscription_expire_date (expire_date),
  KEY idx_subscription_category_id (category_id),
  KEY idx_subscription_archived (archived),
  KEY idx_subscription_deleted_at (deleted_at),
  CONSTRAINT fk_subscription_category FOREIGN KEY (category_id) REFERENCES category (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '订阅记录表：记录每项订阅的基本信息与到期时间，支持软删除与归档';


-- -----------------------------------------------------------------------------
-- 表：quota_pack（额度包/补给包）
--   - 附属于 subscription 的独立失效额度（首充赠送 / 活动补偿 / 购买叠加等）
--   - 有独立于主订阅续费周期的失效时间，解决「主订阅到期日 ≠ 额度包失效日」
--     导致倒计时遗漏的痛点（FR-11 ~ FR-13）
--   - expire_date 是剩余天数 / 状态计算的权威字段（复用主订阅四档阈值 FR-06）
--   - 字段校验（FR-11）：名称 ≤100 非空；数量非负 2 位小数；单位 ≤32 非空；
--     失效日期 ≥ 获得日期；软删除置 deleted_at；归档 archived
--   - 卡片槽位展示（FR-12）：取该订阅下未删除未归档额度包中 expire_date 升序首条
--   - 失效自动归档（FR-13）：失效超宽限期后惰性置 archived = 1（无定时任务）
--
-- 与 subscription 的级联关系（PRD §4.3）：
--   - 主订阅软删除：额度包不级联软删除，随主订阅在默认视图隐藏；恢复主订阅则恢复可见
--   - 主订阅归档：额度包随主订阅在已归档视图展示，不影响额度包自身 archived 字段
--   - 主订阅物理删除：本版本无物理删除，故外键不加 ON DELETE（默认 RESTRICT）
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quota_pack (
  id              BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT COMMENT '主键，自增',
  subscription_id BIGINT UNSIGNED   NOT NULL                COMMENT '所属订阅 ID，关联 subscription(id)',
  name            VARCHAR(100)      NOT NULL                COMMENT '额度包名称，最长 100 字符，非空',
  quantity        DECIMAL(12, 2) UNSIGNED NOT NULL          COMMENT '数量，非负 2 位小数（token 数 / 次数 / 流量等通用数值）',
  unit            VARCHAR(32)       NOT NULL                COMMENT '单位，如 万 tokens / 次 / GB',
  obtained_date   DATE              NOT NULL                COMMENT '获得日期，格式 YYYY-MM-DD',
  expire_date     DATE              NOT NULL                COMMENT '失效日期，格式 YYYY-MM-DD；需 ≥ obtained_date；倒计时依据',
  source          VARCHAR(50)                 DEFAULT NULL  COMMENT '来源，如 首充赠送 / 活动补偿（可空）',
  note            VARCHAR(500)                 DEFAULT NULL  COMMENT '备注，可空',
  archived        TINYINT(1)        NOT NULL DEFAULT 0       COMMENT '是否已归档：0 否 / 1 是（失效超宽限期后惰性置 1，见 FR-13）',
  deleted_at      DATETIME                      DEFAULT NULL  COMMENT '软删除时间，NULL 表示未删除',
  created_at      DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at      DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  KEY idx_quotapack_subscription_id (subscription_id),
  KEY idx_quotapack_expire_date (expire_date),
  KEY idx_quotapack_archived (archived),
  KEY idx_quotapack_deleted_at (deleted_at),
  CONSTRAINT fk_quotapack_subscription FOREIGN KEY (subscription_id) REFERENCES subscription (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '额度包/补给包表：附属于订阅的独立失效额度，支持软删除与归档（FR-11 ~ FR-13）';
