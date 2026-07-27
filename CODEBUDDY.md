# CODEBUDDY.md This file provides guidance to CodeBuddy when working with code in this repository.

## 项目概述

exp-track 是一个**本地优先的订阅到期追踪与可视化网站**（MVP 第一阶段，个人用户本地优先、单实例、本地数据）。单仓库前后端分离：
- **根目录**：前端（Vue 3 + Vite + TypeScript），端口 15173。
- **`backend/`**：后端（Express 5 + TypeScript + mysql2），端口 15180。

前端经 Axios 调后端 REST API，双方遵守统一响应信封。产品核心痛点是「不知道有哪些订阅、何时过期」，可视化只做「未来到期时间轴」一张图（P1）。详见 `docs/PRD/expTrack_PRD.md`。

> **重要：PRD 为权威目标，以下为与当前代码的偏差**（新建/扩展功能以 PRD 数据模型为准对齐实现，不要被现有表结构误导）
> - PRD 规划 SQLite + MySQL 双库、经 DAL 抽象屏蔽方言；**当前代码仅实现 MySQL**（`backend/src/db/mysql.ts`，依赖 `mysql2`），不存在 DAL 抽象层与 SQLite 实现。
> - PRD 数据模型 `subscription`（`category_id` 外键、`price`、`billing_cycle` 仅 month/quarter/year、`expire_date` 必填、`archived`、`deleted_at` 软删除）；**当前数据库尚未建立订阅/分类表**（原 `init.sql` 已删除），实现时须按 PRD 4.1/4.2 新建表并以其为准对齐。

## 常用命令

包管理器使用 **pnpm**，根目录与 `backend/` 各有独立 `pnpm-lock.yaml`，需分别 `pnpm install`。

### 前端（根目录）
- `pnpm dev`：启动 Vite dev server（127.0.0.1:15173），含 HMR。
- `pnpm build`：先 `vue-tsc` 类型检查再 `vite build` 生产构建。
- `pnpm type-check`：仅运行 `vue-tsc --build` 类型检查。
- `pnpm lint`：依次运行 oxlint（`--fix`）与 eslint（`--fix`）。
- `pnpm preview`：预览生产构建产物。
- `pnpm dev:all`：用 concurrently 同时拉起前后端。

### 后端（`backend/`）
- `pnpm dev`：nodemon + tsx 热重载监听 `src`，启动入口 `src/bootstrap/server.ts`（127.0.0.1:15180）。
- `pnpm build`：`tsc` 编译到 `dist/`。
- `pnpm start`：运行编译产物 `node dist/bootstrap/server.js`。
- `pnpm type-check`：`tsc --noEmit`。
- `pnpm lint`：eslint `--fix`（后端仅 eslint）。

### 数据库（Docker）
- `cp .env.example .env`：根目录配置 MySQL/phpMyAdmin 端口与账号；`backend/` 下也需 `cp .env.example .env` 配置数据库连接与 CORS。
- `docker compose up -d`：启动 MySQL 8.0 + phpMyAdmin。
- MySQL 127.0.0.1:13306（库 `exp_track`），phpMyAdmin 127.0.0.1:18080。数据库初始化脚本待按 PRD 重建（原 `init.sql` 已删除），重建后删卷 `exp-track-mysql-data` 重启容器即可重新执行。

> 本项目**未配置测试框架**（无 vitest/jest），暂无测试/单测命令。

## 架构要点

### 响应信封契约（前后端必须同步）
统一 JSON 格式：成功 `{ ok: true, data: T }`；失败 `{ ok: false, error: { code, message, details? } }`。
- 后端封装于 `backend/src/utils/response.ts`：`ok(res, data, status)` / `fail(res, status, code, message, details?)`。控制器须始终用二者返回，勿直接 `res.json`。
- 前端封装于 `src/lib/api.ts`：Axios 响应拦截器识别 `ok===false` 业务错误并 reject，调用方以 `unwrap<T>(res)` 取 `data`。类型为 `ApiEnvelope<T>`。

### 后端结构（`backend/src/`）
按**业务域**组织在 `services/<domain>/`，每域通常含 `<domain>.controller.ts`（定义 `Router`、处理 HTTP、调 service、用 ok/fail 返回）与 `<domain>.service.ts`（纯业务逻辑、操作数据库）。新增域：建目录→写 controller+service→在 `http/router.ts` 用 `apiRouter.use(xxxRouter)` 挂载（路径前缀 `/api`）。参考 `services/health/`。

其余目录：
- `bootstrap/`：`app.ts` 组装 Express 与中间件链；`server.ts` 启动入口，监听 SIGINT/SIGTERM 优雅关闭连接池。
- `config/`：`index.ts` 从环境变量加载并导出 `config` 对象；`timezone.ts` 被其副作用导入以设 `TZ=Asia/Shanghai`。`required` 环境变量缺失时启动即抛错。
- `db/mysql.ts`：mysql2 连接池懒加载单例，暴露 `getPool()`/`closePool()`/`pingDatabase()`。
- `middlewares/`：`request-logger`（请求耗时）、`error-handler`（兜底返回 500）。
- `utils/`：`response.ts`、日志等。

**配置读取约定**：后端所有配置经 `config` 对象获取，勿直接读 `process.env`。

**NodeNext 与 `.js` 扩展名（易踩坑）**：后端 `tsconfig.json` 用 `"module": "NodeNext"`，所有相对 import 必须显式写 `.js`（源文件是 `.ts` 也如此），如 `import { ok } from '../utils/response.js'`，否则运行时报模块找不到。

### 前端结构（`src/`）
- `lib/api.ts`：Axios 实例 + 拦截器 + `unwrap`，基址由 `VITE_API_BASE_URL` 控制（默认 `http://127.0.0.1:15180`）。
- `router/index.ts`：Vue Router 路由（当前 `routes` 为空，待按业务填充）。
- `stores/`：Pinia（setup 风格 store，当前仅示例 `counter.ts`）。
- 组件用 `<script setup lang="ts">`；路径别名 `@` 指向 `src`（见 `tsconfig.app.json` 与 `vite.config.ts`）。
- 图表用 ECharts，时间处理用 Day.js。
- PRD 规划目录（`components/base/`、`composables/`、`views/`、`assets/styles/` 设计令牌等）尚未落地，新页面按 PRD 第 7 章归口避免散落。

### 端口速查
| 服务 | 端口 |
|------|------|
| 前端 dev server | 15173 |
| 后端 API | 15180 |
| MySQL | 13306 |
| phpMyAdmin | 18080 |

## 工程规范与领域约束（来自 PRD）

### 接口与工程规范（PRD 第 7 章）
- **接口扩展原则**：能改造兼容现有接口的不要新增端点；新增字段只增不删，保留向后兼容；统一响应信封；功能相近查询优先合并。
- **目录结构（7.1）**：公共能力按 `src/` 下 `api/ components/base/ composables/ layouts/ router/ stores/ views/ types/ utils/` 归口；禁止业务页面内重复定义同类能力。
- **设计令牌与状态色（7.2）**：色彩/间距/圆角/字号用 CSS 变量；四档状态色（已过期红/7天内橙/30天内黄/充足灰绿）禁止组件硬编码。
- **公共组件（7.3）**：重复 UI 抽为公共组件（StatusBadge、SubscriptionCard、CategoryTag、ConfirmDialog、EmptyState）；props 驱动、无副作用。
- **视觉一致性（7.4）**：颜色/间距/圆角/字号只能用设计令牌。
- **Lint**：根目录先 oxlint 后 eslint；`.editorconfig` 2 空格、LF、行宽 100；前后端 TS 均开 `noUncheckedIndexedAccess`。

### 领域开发约束（PRD）
- **配置项（第 5 章）**：状态阈值 `soon7=7`/`soon30=30`、时间轴 `rangeDays=90`、日期格式 `YYYY-MM-DD`、货币符号 `¥`、时区 `local` 集中配置、前后端各一份且一致；业务代码不得硬编码。
- **字段校验（FR-01）**：名称 ≤100 非空；价格非负 2 位小数；到期日期 ≥ 开始日期；开始/到期/计费周期三者独立填写、不推算，**到期日期为剩余天数唯一权威字段**。
- **状态四档（FR-06）**：剩余天数按整天取整；<0 过期、0~soon7 七天内（恰为 0 归入）、soon7+1~soon30 三十天内、>soon30 充足。
- **软删除/归档（FR-03/04、Ch.4.3）**：删除置 `deleted_at` 且二次确认；默认视图 `deleted_at IS NULL AND archived=false`，已归档 `archived=true`，已删除 `deleted_at IS NOT NULL`。
- **分类（FR-10）**：名称 ≤50 唯一；**禁止删除被引用分类**。
- **货币**：本阶段统一人民币 `¥`，多币种列入第二阶段。
