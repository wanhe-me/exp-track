# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

exp-track 是一个**本地优先的订阅到期追踪与可视化网站**（MVP 第一阶段：个人用户、单实例、本地数据、无第三方云服务依赖）。采用单仓库前后端分离结构：

- **根目录**：前端（Vue 3 + Vite + TypeScript）
- **`backend/`**：后端（Express 5 + TypeScript + mysql2）

前端通过 Axios 调用后端 REST API，双方约定统一的响应信封格式。

产品定位、功能需求、数据模型、配置项与工程规范以 `docs/PRD/expTrack_PRD.md`（v0.3 草案）为权威来源；本文件聚焦**代码库技术事实与开发约束**，不重复 PRD 内容。

## 需求与规范来源

- **产品 / 功能 / 数据模型 / 工程规范**：见 `docs/PRD/expTrack_PRD.md`。新增或改动功能前先对照 PRD（FR-01~FR-10、第 4 章数据模型、第 5 章配置项、第 7 章工程规范）。
- **当前代码事实**：PRD 的部分规划（如 SQLite+MySQL 双库 DAL、软删除/归档、四档状态色设计令牌）尚未实现。当 PRD 与当前代码冲突时，以「与代码实现的偏差」一节为准，并在评审中同步 PRD。

## 常用命令

### 包管理器

使用 **pnpm**（根目录与 `backend/` 各有独立的 `pnpm-lock.yaml`）。首次安装依赖分别在前端根目录和 `backend/` 下执行 `pnpm install`。

### 前端（根目录）

```sh
pnpm dev          # 启动 Vite dev server（127.0.0.1:15173）
pnpm build        # 先 type-check 再构建（vue-tsc + vite build）
pnpm type-check   # 仅类型检查（vue-tsc --build）
pnpm lint         # 依次运行 oxlint 与 eslint，均带 --fix
pnpm preview      # 预览生产构建
```

### 后端（`backend/`）

```sh
pnpm dev          # nodemon + tsx 热重载，监听 src（127.0.0.1:15180）
pnpm build        # tsc 编译到 dist/
pnpm start        # 运行编译产物 node dist/bootstrap/server.js
pnpm type-check   # tsc --noEmit
pnpm lint         # eslint --fix
```

### 同时启动前后端

根目录下 `pnpm dev:all` 用 concurrently 同时拉起前端与后端。

### 数据库（Docker）

```sh
cp .env.example .env        # 根目录，配置 MySQL/phpMyAdmin 端口与账号
docker compose up -d        # 启动 MySQL 8.0 + phpMyAdmin
```

- MySQL：`127.0.0.1:13306`，库名 `exp_track`
- phpMyAdmin：`127.0.0.1:18080`
- 初始化 SQL `backend/src/sql/init.sql` 会在容器**首次启动**时自动执行；修改后需删除卷 `exp-track-mysql-data` 重建才会重新执行。

后端运行前还需在 `backend/` 下 `cp .env.example .env` 配置数据库连接与 CORS。

> 本项目未配置测试框架（无 vitest/jest 等），暂无测试命令。

## 架构要点

### 前后端响应信封契约（重要）

前后端共同遵守统一的 JSON 响应格式，修改任一端时必须同步另一端：

- 成功：`{ ok: true, data: T }`
- 失败：`{ ok: false, error: { code, message, details? } }`

- 后端封装在 `backend/src/utils/response.ts`：`ok(res, data, status)` / `fail(res, status, code, message, details?)`。控制器应始终使用这两个函数返回响应，不要直接 `res.json`。
- 前端封装在 `src/lib/api.ts`：Axios 响应拦截器会识别 `ok === false` 的业务错误并 reject，调用方用 `unwrap<T>(res)` 取出 `data`。对应的 TypeScript 类型是 `ApiEnvelope<T>`。

### 后端模块化约定

后端按**业务域**组织在 `backend/src/services/<domain>/` 下，每个域通常包含：

- `<domain>.controller.ts`：定义 `Router`，处理 HTTP，调用 service，用 `ok`/`fail` 返回。
- `<domain>.service.ts`：纯业务逻辑，操作数据库。

新增业务域的流程：在 `services/` 下建目录 → 写 controller 与 service → 在 `http/router.ts` 中 `apiRouter.use(xxxRouter)` 挂载（最终路径前缀为 `/api`）。参考 `services/health/` 的实现。

其他后端目录职责：

- `bootstrap/`：`app.ts` 组装 Express 应用与中间件链，`server.ts` 是启动入口并处理优雅关闭（SIGINT/SIGTERM 关闭连接池）。
- `config/`：`index.ts` 从环境变量加载配置并导出 `config` 对象；`timezone.ts` 在最前面被 `config/index.ts` 副作用导入以设定 `TZ=Asia/Shanghai`。
- `db/mysql.ts`：mysql2 连接池懒加载单例，对外暴露 `getPool()` / `closePool()` / `pingDatabase()`。**注**：PRD 规划 SQLite + MySQL 双库经 DAL 抽象屏蔽方言，当前仅实现 MySQL，DAL 层尚未建立。
- `middlewares/`：`request-logger`（记录请求耗时）、`error-handler`（兜底捕获，统一返回 500）。

### 配置读取约定

后端所有配置必须通过 `backend/src/config/index.ts` 导出的 `config` 对象获取，**不要直接读 `process.env`**。`config` 中标记为 `required` 的环境变量缺失时会在启动时直接抛错。

### NodeNext 与 `.js` 扩展名（后端易踩坑点）

后端 `tsconfig.json` 使用 `"module": "NodeNext"`，因此**所有相对路径 import 必须显式写出 `.js` 扩展名**（即便源文件是 `.ts`），例如 `import { ok } from '../utils/response.js'`。新增文件时务必遵守，否则运行时报模块找不到。

### 前端约定

- Vue 3 单文件组件使用 `<script setup lang="ts">`。
- 路径别名 `@` 指向 `src`（见 `tsconfig.app.json` 与 `vite.config.ts`）。
- API 基址由 `VITE_API_BASE_URL` 控制，默认 `http://127.0.0.1:15180`（见 `src/lib/api.ts`）。
- 路由定义在 `src/router/index.ts`（当前 `routes` 为空，待按业务填充）。
- 状态管理用 Pinia（setup 风格 store，见 `src/stores/`）。
- 图表用 ECharts，时间处理用 Day.js。

### 端口约定速查

| 服务 | 端口 |
|------|------|
| 前端 dev server | 15173 |
| 后端 API | 15180 |
| MySQL | 13306 |
| phpMyAdmin | 18080 |

## 工程规范（开发约束）

以下为当前生效的开发约束，部分来自 PRD 第 7 章（规划中项标注「待落地」）。

### 接口扩展原则（PRD 7.5）

- **优先扩展现有接口**：新需求优先在现有端点上新增可选字段/参数，而非新增端点。
- **向后兼容**：新增字段只增不删；废弃字段保留过渡期并标注。
- **统一响应信封**：所有接口遵循 `{ ok, data }` / `{ ok, error }`，不得为单个接口自定义格式。
- **接口合并**：功能相近的查询优先合并（用参数区分），避免端点爆炸。

### 目录结构（PRD 7.1，待落地补全）

- 公共能力按 `src/` 下 `api/` `components/base/` `composables/` `layouts/` `router/` `stores/` `views/` `types/` `utils/` 归口；新增文件须放入对应目录。
- **禁止在业务页面内重复定义**公共样式、组件、工具函数或类型；已有则复用。

### 设计令牌与状态色（PRD 7.2，待落地）

- 色彩/间距/圆角/字号/阴影统一用 CSS 变量，定义于 `src/assets/styles/`。
- 四档状态色（已过期=红 / 7天内=橙 / 30天内=黄 / 充足=灰绿）必须由设计令牌统一管理，**禁止在组件内硬编码颜色值**。

### 公共组件（PRD 7.3，待落地）

- 重复出现的 UI 单元须抽为公共组件（如 `StatusBadge`、`SubscriptionCard`、`CategoryTag`、`ConfirmDialog`、`EmptyState`、通用表单控件）。
- 公共组件应 **props 驱动、无副作用**，便于复用与测试。

### 视觉一致性（PRD 7.4，待落地）

- 同类元素（按钮、卡片、徽章、间距）全站视觉统一；颜色/间距/圆角/字号**只能使用设计令牌**。

### Lint 配置

根目录同时使用 oxlint 与 eslint（`pnpm lint` 先 oxlint 后 eslint）：
- oxlint 配置在 `.oxlintrc.json`，开启 `correctness` 类规则。
- eslint 配置在 `eslint.config.ts`，基于 `@vue/eslint-config-typescript`，并通过 `eslint-plugin-oxlint` 关闭与 oxlint 重复的规则。

后端在 `backend/` 下单独执行 `pnpm lint`（仅 eslint）。

### 代码风格

`.editorconfig`：2 空格缩进、LF 行尾、行尾去空格、文件末尾留空行、行宽 100。前后端 TypeScript 均开启 `noUncheckedIndexedAccess`。

## 领域开发约束（来自 PRD）

以下约束源自 PRD，新建或改动相关功能时必须遵守。

### 配置项（PRD 第 5 章）

状态阈值、时间轴范围、日期格式、货币符号等集中配置，前后端各持一份且保持一致；**业务代码不得硬编码这些值**，改配置即生效：

- `statusThresholds.soon7` = 7（7 天内到期阈值，天）
- `statusThresholds.soon30` = 30（30 天内到期阈值，天）
- `timeline.rangeDays` = 90（未来到期时间轴展示范围，天）
- `dateFormat` = `YYYY-MM-DD`
- `currencySymbol` = `¥`
- `timezone` = `local`

### 订阅字段校验（FR-01）

- 名称：非空，长度 ≤ 100。
- 价格：非负数字，精度 2 位小数（人民币元）。
- 到期日期 ≥ 开始日期。
- 开始日期、到期日期、计费周期**三者独立填写**，系统不推算；计费周期/开始日期仅记录展示，**到期日期为剩余天数计算的唯一权威字段**。
- 非人民币计价由用户自行换算后填入。

### 状态四档计算（FR-06）

- 剩余天数 = 到期日期 − 今天，**按整天取整**（不含时分秒）。
- 归类：< 0 已过期；0 ~ `soon7` 7 天内（**恰好 0 归入 7 天内**）；`soon7+1` ~ `soon30` 30 天内；> `soon30` 充足。
- 四档颜色由设计令牌统一管理（见工程规范）。

### 软删除与归档查询约定（FR-03/04、Ch.4.3）

- 删除执行**软删除**（置 `deleted_at`），需**二次确认**；软删除记录保留可恢复。
- 归档 `archived` 与软删除相互独立。
- 默认视图：`deleted_at IS NULL AND archived = false`
- 已归档视图：`deleted_at IS NULL AND archived = true`
- 已删除（恢复用）视图：`deleted_at IS NOT NULL`

### 分类约束（FR-10）

- 名称非空，长度 ≤ 50，同一用户下唯一。
- **禁止删除被引用（有订阅关联）的分类**，提示用户先迁移/重分类。

### 货币（Ch.1.6 / 第 5 章）

- 本阶段统一人民币，货币符号 `¥`；多币种与汇率转换列入第二阶段。

## 与代码实现的偏差（PRD 目标尚未落地）

PRD 为权威目标，以下项当前代码尚未实现；新建/扩展相关功能时**以 PRD 为准对齐实现**（必要时迁移 `init.sql` 与接口），不要被现有表结构误导：

- **DAL / SQLite**：PRD 规划 SQLite + MySQL 双库经 DAL 抽象屏蔽方言；当前仅 `db/mysql.ts`（mysql2），无 DAL 层、无 SQLite 实现。
- **数据模型**：实际 `backend/src/sql/init.sql` 的 `subscriptions` 表与 PRD 4.1 不一致——无 `category_id` 外键（`category` 为 VARCHAR）、无 `archived` / `deleted_at`（软删除/归档未实现）、新增 `provider` / `currency` / `next_bill_date` / `status` / `payment_method`，`billing_cycle` 含 `daily`/`weekly`，`expire_date` 可空；PRD 的 `category` 实体也尚未建表。实现订阅/分类功能时按 PRD 数据模型对齐。
- **前端脚手架**：目前 `router` / `views` / `stores` 多为空，PRD 规划的组件与视图待实现。
