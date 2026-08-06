-- Migration 002: subscription quota fields (MySQL 8.0)
-- ============================================================
-- 新增「订阅类型 + 额度」6 字段，支持额度型订阅（大模型 API 周月限额）展示剩余额度。
--
-- 设计要点（详见 ../schema.sql 与 PRD）：
--   - subscription_type 区分 standard（标准/功能解锁型，默认）与 quota（额度型）
--   - quota_cycle 仅作展示标签（周/月），不自动重置，用户手动更新剩余额度
--   - quota_total 必填；quota_used / quota_remaining 二选一填写，另一者由前端联动计算
--     后端校验 used + remaining = total（允许 0.01 误差），三字段入库自洽
--   - quota_unit 可选单位文本（如 $、次、万token）
--   - 剩余百分比 = remaining / total * 100，展示时计算，不存库
--   - standard 型所有 quota_* 字段强制为 NULL（service 层校验）
--
-- 迁移脚本：migrator 按 manifest 顺序读取并执行本文件。
--   **禁止改本文件**（migrator 启动时校验 checksum，改动已应用迁移会拒绝启动）
-- ============================================================

ALTER TABLE subscription
  ADD COLUMN subscription_type ENUM('standard','quota') NOT NULL DEFAULT 'standard'
    COMMENT '订阅类型：standard 标准/功能解锁型 / quota 额度型（大模型 API 周月限额等）' AFTER note,
  ADD COLUMN quota_cycle ENUM('week','month') DEFAULT NULL
    COMMENT '额度周期标签：week 周 / month 月（仅 quota 型，纯展示不自动重置，手动更新剩余额度）' AFTER subscription_type,
  ADD COLUMN quota_total DECIMAL(14, 2) DEFAULT NULL
    COMMENT '总额度（quota 型必填，>0）' AFTER quota_cycle,
  ADD COLUMN quota_used DECIMAL(14, 2) DEFAULT NULL
    COMMENT '已使用额度（quota 型必填，与 quota_remaining 二选一填写，另一者自动计算）' AFTER quota_total,
  ADD COLUMN quota_remaining DECIMAL(14, 2) DEFAULT NULL
    COMMENT '剩余额度（quota 型必填，与 quota_used 二选一填写，另一者自动计算）' AFTER quota_used,
  ADD COLUMN quota_unit VARCHAR(20) DEFAULT NULL
    COMMENT '额度单位文本，如 $、次、万token（可选，展示时拼数值后）' AFTER quota_remaining;
