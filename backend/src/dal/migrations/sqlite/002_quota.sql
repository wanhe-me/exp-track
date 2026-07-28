-- Migration 002: subscription quota fields (SQLite)
-- ============================================================
-- 新增「订阅类型 + 额度」6 字段，支持额度型订阅（大模型 API 周月限额）展示剩余额度。
-- 与 MySQL 版字段集合与语义保持一致，详见 ../schema.sql。
--
-- 设计要点：
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
--
-- SQLite 方言说明：SQLite 无 ENUM 类型，用 TEXT 存储（与 billing_cycle 一致）；
--   数值用 REAL（与 price 一致）。SQLite 的 ALTER TABLE 一次只能 ADD 一列。
-- ============================================================

ALTER TABLE subscription ADD COLUMN subscription_type TEXT NOT NULL DEFAULT 'standard';
ALTER TABLE subscription ADD COLUMN quota_cycle TEXT;
ALTER TABLE subscription ADD COLUMN quota_total REAL;
ALTER TABLE subscription ADD COLUMN quota_used REAL;
ALTER TABLE subscription ADD COLUMN quota_remaining REAL;
ALTER TABLE subscription ADD COLUMN quota_unit TEXT;
