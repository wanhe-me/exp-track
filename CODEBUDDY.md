# CODEBUDDY.md This file provides guidance to CodeBuddy when working with code in this repository.

## 项目概述

exp-track 是一个**本地优先的订阅到期追踪与可视化网站**（MVP 第一阶段，个人用户本地优先、单实例、本地数据）。单仓库前后端分离：
- **根目录**：前端（Vue 3 + Vite + TypeScript），端口 15173。
- **`backend/`**：后端（Express 5 + TypeScript），端口 15180。

前端经 Axios 调后端 REST API，双方遵守统一响应信封。产品核心痛点是「不知道有哪些订阅、何时过期」，可视化只做「未来到期时间轴」一张图（P1）。详见 `docs/PRD/expTrack_PRD.md`。

> **当前实现状态**：MVP 第一阶段功能（FR-01~FR-10）已全部实现并跑通。
> - **快速部署（SQLite）**已完整可用，为默认部署模式，零外部依赖、开箱即用。
> - **稳定部署（MySQL）**：DAL 抽象接口已定义（`DbAdapter`），但 MySQL 适配器实现尚未完成。需要时按 `dal/sqlite.ts` 的模式实现 `dal/mysql.ts` 并在 `dal/index.ts` 注册。
> - 数据模型（`subscription` / `category` 两表）按 PRD 4.1/4.2 实现，由 DAL 自动建表。

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
- `pnpm lint`：委托根目录 `pnpm lint`（`pnpm --dir .. lint`，执行 oxlint + eslint），覆盖 backend `.ts` 文件检查（backend 未单独安装 eslint 依赖）。

### 数据库
- **快速部署（默认，SQLite）**：无需任何容器或外部数据库服务。`DB_TYPE=sqlite`（默认），数据库文件存于 `backend/data/exp-track.db`（首次启动自动创建目录与建表）。
- **稳定部署（MySQL，Docker）**：`cp .env.example .env` 配置 MySQL/phpMyAdmin 端口与账号 → `docker compose up -d` 启动 MySQL 8.0 + phpMyAdmin → `backend/.env` 设 `DB_TYPE=mysql`。**注**：MySQL DAL 适配器尚未实现，此模式暂不可用。

> 本项目**未配置测试框架**（无 vitest/jest），暂无测试/单测命令。

## 架构要点

### 响应信封契约（前后端必须同步）
统一 JSON 格式：成功 `{ ok: true, data: T }`；失败 `{ ok: false, error: { code, message, details? } }`。
- 后端封装于 `backend/src/utils/response.ts`：`ok(res, data, status)` / `fail(res, status, code, message, details?)`。控制器须始终用二者返回，勿直接 `res.json`。
- 前端封装于 `src/lib/api.ts`：Axios 响应拦截器识别 `ok===false` 业务错误并 reject，调用方以 `unwrap<T>(res)` 取 `data`。类型为 `ApiEnvelope<T>`。

### 后端结构（`backend/src/`）
按**业务域**组织在 `services/<domain>/`，每域通常含 `<domain>.controller.ts`（定义 `Router`、处理 HTTP、调 service、用 ok/fail 返回）与 `<domain>.service.ts`（纯业务逻辑、操作数据库、zod 校验）。新增域：建目录→写 controller+service→在 `http/router.ts` 用 `apiRouter.use(xxxRouter)` 挂载（路径前缀 `/api`）。参考已有域 `health/`、`category/`、`subscription/`。

其余目录：
- `bootstrap/`：`app.ts` 组装 Express 与中间件链；`server.ts` 启动入口，启动时调 `initDb()` 建表，监听 SIGINT/SIGTERM 优雅关闭 DAL。
- `config/`：`index.ts` 从环境变量加载并导出 `config` 对象（含 `dbDriver`、`sqlite`、`mysql`、`domain` 领域配置）；`timezone.ts` 被其副作用导入以设 `TZ=Asia/Shanghai`。
- `dal/`：**数据访问层**，屏蔽 SQLite/MySQL 方言差异。`types.ts` 定义 `DbAdapter` 接口与 `DomainError`（业务行/DTO 类型见 `types/domain.ts`）；`sqlite.ts` 为 SQLite 实现（`better-sqlite3`，自动建表）；`index.ts` 为工厂 `getDb()`/`initDb()`/`closeDb()`，按 `config.dbDriver` 选择适配器。**所有业务代码经 `getDb()` 操作数据库，勿直接 import 具体数据库驱动**。
- `types/`：**领域类型归口层**，集中存放与数据库驱动/配置加载无关纯业务类型（`types/domain.ts`：枚举、`*Row` 行类型、Create/Update DTO、`SubscriptionFilter`）。业务代码统一从此引入领域类型，勿再从 `config` 或 `dal` 取领域类型。
- `middlewares/`：`request-logger`（请求耗时）、`error-handler`（统一处理 `DomainError` 业务错误、`ZodError` 校验错误、兜底 500）。
- `utils/`：`response.ts`、`logger.ts`、`date.ts`（剩余天数计算、状态四档判定、日期校验）。

**配置读取约定**：后端所有配置经 `config` 对象获取，勿直接读 `process.env`。

**NodeNext 与 `.js` 扩展名（易踩坑）**：后端 `tsconfig.json` 用 `"module": "NodeNext"`，所有相对 import 必须显式写 `.js`（源文件是 `.ts` 也如此），如 `import { ok } from '../utils/response.js'`，否则运行时报模块找不到。

### 前端结构（`src/`）
- `lib/api.ts`：Axios 实例 + 拦截器 + `unwrap`，基址由 `VITE_API_BASE_URL` 控制（默认 `http://127.0.0.1:15180`）。
- `api/`：业务接口封装（`category.ts`、`subscription.ts`），统一调用入口。
- `router/index.ts`：Vue Router 路由，已配置看板/时间轴/已归档/回收站/分类五个页面。
- `stores/`：Pinia（setup 风格 store），`category.ts`、`subscription.ts`。
- `composables/`：`useSubscriptionActions.ts`（订阅增删改归档恢复的表单与确认弹窗逻辑复用）。
- `components/base/`：公共原子组件（`StatusBadge`、`CategoryTag`、`ConfirmDialog`、`EmptyState`）。
- `components/`：业务组件（`SubscriptionCard`、`SubscriptionFormDialog`）。
- `layouts/`：`DefaultLayout.vue`（顶部导航 + 内容区）。
- `views/`：按业务模块分子目录——`dashboard/`（`DashboardView` 看板）、`timeline/`（`TimelineView` 时间轴）、`subscription/`（`ArchivedView` 已归档、`DeletedView` 回收站）、`category/`（`CategoriesView` 分类管理）。
- `types/index.ts`：前后端共享类型 + 领域配置常量（`domainConfig`，与后端一致）。
- `utils/`：按类型分子目录，入口统一为 `index.ts`——`date/`（日期格式化、剩余天数文案）、`status/`（状态色映射）、`seo/`（SEO 标题与 meta 更新）。
- `assets/styles/`：`tokens.css`（设计令牌 CSS 变量）、`base.css`（reset + 通用按钮/输入/表单样式）。
- 组件用 `<script setup lang="ts">`；路径别名 `@` 指向 `src`（见 `tsconfig.app.json` 与 `vite.config.ts`）。
- 图表用 ECharts，时间处理用 Day.js。

### 端口速查
| 服务 | 端口 |
|------|------|
| 前端 dev server | 15173 |
| 后端 API | 15180 |
| MySQL（稳定部署，Docker） | 13306 |
| phpMyAdmin（稳定部署，Docker） | 18080 |

## 工程规范与领域约束（来自 PRD）

### 接口与工程规范（PRD 第 7 章）
- **接口扩展原则**：能改造兼容现有接口的不要新增端点；新增字段只增不删，保留向后兼容；统一响应信封；功能相近查询优先合并。
- **目录结构（7.1）**：公共能力按 `src/` 下 `api/ components/base/ composables/ layouts/ router/ stores/ views/ types/ utils/` 归口；禁止业务页面内重复定义同类能力。
- **设计令牌与状态色（7.2）**：色彩/间距/圆角/字号用 CSS 变量（`assets/styles/tokens.css`）；四档状态色（已过期红/7天内橙/30天内黄/充足灰绿）禁止组件硬编码。
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

## 待办（PRD 目标尚未完成）
- **MySQL DAL 适配器**：PRD 验收要求快速部署（SQLite）与稳定部署（MySQL）均可运行。当前仅 SQLite 适配器实现完毕；需按 `dal/sqlite.ts` 模式实现 `dal/mysql.ts` 并在 `dal/index.ts` 的 `getDb()` 中注册 `mysql` 分支。
