-- Migration 004: category soft delete (MySQL 8.0)
-- ============================================================
-- 将 category 表从「硬删除 + 被引用即禁止」改为「软删除（停用）」，
-- 与 subscription / quota_pack 的软删除策略对齐（FR-10 变更）。
--
-- 背景：
--   原 PRD §4.2「分类不做软删除：删除前需确保无订阅引用」。但 subscription
--   软删后行仍持有 category_id，外键 fk_subscription_category（默认 RESTRICT）
--   不因 deleted_at 放行，导致被引用分类无法删除，需先迁移订阅才能删。
--   元数据（分类）被业务数据（订阅）引用卡死，体验差。
--
-- 变更方案：
--   1) 新增 deleted_at 字段，删除改 UPDATE deleted_at = NOW()（停用）。
--   2) 历史订阅仍可联表显示分类名（LEFT JOIN category 不过滤 deleted_at，
--      软删行存在，category_name 非 NULL）。
--   3) list / 下拉只展示 deleted_at IS NULL。
--   4) name 唯一性改用生成列 name_active：未删行 = name（同名冲突），软删行
--      = NULL（多个 NULL 不冲突，允许历史多次软删同名并复用 name 新建）。
--      MySQL 不支持部分索引（WHERE deleted_at IS NULL），故用生成列方案。
--   5) 不再需要 countSubscriptionsByCategory 拦截（应用层移除）。
--
-- 迁移脚本：migrator 按 manifest 顺序读取并执行本文件。
--   **禁止改本文件**（migrator 启动时校验 checksum，改动已应用迁移会拒绝启动）
-- ============================================================

-- 1) 新增 deleted_at 列与索引
ALTER TABLE category
  ADD COLUMN deleted_at DATETIME DEFAULT NULL
    COMMENT '软删除时间，NULL 表示未删除；置值即停用（FR-10）' AFTER name,
  ADD KEY idx_category_deleted_at (deleted_at);

-- 2) 用生成列 + 新唯一索引替换原 name 唯一约束
ALTER TABLE category
  DROP INDEX uk_category_name,
  ADD COLUMN name_active VARCHAR(50)
    GENERATED ALWAYS AS (IF(deleted_at IS NULL, name, NULL)) VIRTUAL
    COMMENT '未删状态名称快照，用于唯一约束；软删行为 NULL 以放行同名复用' AFTER name,
  ADD UNIQUE KEY uk_category_name_active (name_active);
