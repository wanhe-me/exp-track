-- Migration 003: quota_pack table (MySQL 8.0)
-- ============================================================
-- 新增「额度包/补给包」表，支持 FR-11 ~ FR-13。
--
-- 设计要点（详见 ../schema.sql 与 PRD §4.3）：
--   - quota_pack 附属于 subscription，有独立于主订阅续费周期的失效时间
--     （解决「主订阅到期日 ≠ 额度包失效日」导致倒计时遗漏的痛点）
--   - expire_date 是剩余天数 / 状态计算的权威字段（复用主订阅四档阈值）
--   - quantity 非负 DECIMAL(12,2)，配合 unit 表达 token 数 / 次数 / 流量等通用数值
--   - 软删除置 deleted_at（与 subscription 一致），归档 archived（失效超宽限期后惰性置 1）
--   - 与 subscription 的级联关系（PRD §4.3）：
--       * 主订阅软删除：额度包不级联软删除，随主订阅在默认视图隐藏；恢复主订阅则恢复可见
--       * 主订阅归档：额度包随主订阅在已归档视图展示，不影响额度包自身 archived 字段
--       * 主订阅物理删除：本版本无物理删除，故外键不加 ON DELETE（默认 RESTRICT）
--
-- 卡片槽位查询（FR-12）：
--   取该订阅下 deleted_at IS NULL AND archived = 0 的额度包中 expire_date 升序首条
--   （含已过期项）；宽限期内已失效但未超宽限期的 archived 仍为 0，仍参与槽位展示并标红
--
-- 迁移脚本：migrator 按 manifest 顺序读取并执行本文件。
--   **禁止改本文件**（migrator 启动时校验 checksum，改动已应用迁移会拒绝启动）
-- ============================================================

CREATE TABLE IF NOT EXISTS quota_pack (
  id              BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT COMMENT '主键，自增',
  subscription_id BIGINT UNSIGNED   NOT NULL                COMMENT '所属订阅 ID，关联 subscription(id)',
  name            VARCHAR(100)      NOT NULL                COMMENT '额度包名称，最长 100 字符，非空',
  quantity        DECIMAL(12, 2) UNSIGNED NOT NULL           COMMENT '数量，非负 2 位小数（token 数 / 次数 / 流量等通用数值）',
  unit            VARCHAR(32)       NOT NULL                COMMENT '单位，如 万 tokens / 次 / GB',
  obtained_date   DATE              NOT NULL                COMMENT '获得日期，格式 YYYY-MM-DD',
  expire_date     DATE              NOT NULL                COMMENT '失效日期，格式 YYYY-MM-DD；需 ≥ obtained_date；倒计时依据',
  source          VARCHAR(50)                DEFAULT NULL   COMMENT '来源，如 首充赠送 / 活动补偿（可空）',
  note            VARCHAR(500)               DEFAULT NULL   COMMENT '备注，可空',
  archived        TINYINT(1)        NOT NULL DEFAULT 0      COMMENT '是否已归档：0 否 / 1 是（失效超宽限期后惰性置 1，见 FR-13）',
  deleted_at      DATETIME                   DEFAULT NULL   COMMENT '软删除时间，NULL 表示未删除',
  created_at      DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at      DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  KEY idx_quotapack_subscription_id (subscription_id),
  KEY idx_quotapack_expire_date (expire_date),
  KEY idx_quotapack_archived (archived),
  KEY idx_quotapack_deleted_at (deleted_at),
  CONSTRAINT fk_quotapack_subscription FOREIGN KEY (subscription_id) REFERENCES subscription (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '额度包/补给包表：附属于订阅的独立失效额度，支持软删除与归档（FR-11 ~ FR-13）';
