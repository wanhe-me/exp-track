-- exp_track 数据库初始化
-- 该脚本会在 MySQL 容器首次启动时自动执行（docker-entrypoint-initdb.d）

CREATE DATABASE IF NOT EXISTS exp_track
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE exp_track;

-- 订阅记录表
CREATE TABLE IF NOT EXISTS subscriptions (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  name            VARCHAR(120)    NOT NULL                COMMENT '订阅名称',
  provider        VARCHAR(120)    NOT NULL                COMMENT '服务提供方',
  category        VARCHAR(60)     NOT NULL DEFAULT 'other' COMMENT '订阅分类',
  amount          DECIMAL(12, 2)  NOT NULL DEFAULT 0.00   COMMENT '订阅金额',
  currency        CHAR(3)         NOT NULL DEFAULT 'CNY'   COMMENT '币种',
  billing_cycle   ENUM('daily', 'weekly', 'monthly', 'quarterly', 'yearly')
                                  NOT NULL DEFAULT 'monthly' COMMENT '计费周期',
  start_date      DATE            NOT NULL                COMMENT '订阅开始日期',
  next_bill_date  DATE            NULL                    COMMENT '下次扣费日期',
  expire_date     DATE            NULL                    COMMENT '到期日期',
  auto_renew      TINYINT(1)      NOT NULL DEFAULT 1      COMMENT '是否自动续费',
  status          ENUM('active', 'paused', 'cancelled', 'expired')
                                  NOT NULL DEFAULT 'active' COMMENT '订阅状态',
  payment_method  VARCHAR(60)     NULL                    COMMENT '支付方式',
  notes           VARCHAR(500)    NULL                    COMMENT '备注',
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_status (status),
  KEY idx_next_bill_date (next_bill_date),
  KEY idx_category (category)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='订阅记录表';