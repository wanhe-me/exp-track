# CLAUDE.md

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

### 目录导航（按需阅读，勿把目录树当说明书）

> **总原则**：写任何代码前，先读目标目录里一个**已有同类文件**作为样板，照其目录位置、命名、返回方式、类型归口来写；不要凭空新建或臆测约定。下面的表只告诉你「做 X 类改动时去哪几个目录跑一遍」，不列举全部文件。

| 你要做的事 | 先读这几个目录 / 文件（跑一遍现有模式） |
|------|------|
| 新增 / 修改后端接口或业务域 | `backend/src/services/<domain>/`、`http/router.ts`、`utils/response.ts`；参考 `health/` `category/` `subscription/` 中任一已有域 |
| 操作数据库 / 加表 | `backend/src/dal/`、`types/domain.ts`（业务代码统一经 `getDb()`，勿直接 import 具体数据库驱动） |
| 改后端领域类型 | `backend/src/types/domain.ts`（勿从 `config` 或 `dal` 取领域类型） |
| 改后端配置项 | `backend/src/config/index.ts`（所有配置经 `config` 对象，勿直接读 `process.env`） |
| 新增 / 修改前端页面 | `src/views/`、`src/router/index.ts`、`src/stores/`、`src/api/` |
| 改前端公共组件 / 原子组件 | `src/components/base/`（props 驱动、无副作用）；业务组件见 `src/components/` |
| 改设计令牌 / 视觉样式 | `src/assets/styles/tokens.css`；状态色映射见 `src/utils/status/` |
| 改前后端共享类型 / 领域常量 | 后端 `types/domain.ts`、前端 `src/types/index.ts`（`domainConfig` 前后端须一致） |
| 调用后端 API | 前端 `src/lib/api.ts`（Axios 实例 + 拦截器 + `unwrap`，基址 `VITE_API_BASE_URL`） |
| 复用订阅增删改 / 归档恢复逻辑 | `src/composables/useSubscriptionActions.ts` |

**NodeNext 与 `.js` 扩展名（易踩坑）**：后端 `tsconfig.json` 用 `"module": "NodeNext"`，所有相对 import 必须显式写 `.js`（源文件是 `.ts` 也如此），如 `import { ok } from '../utils/response.js'`，否则运行时报模块找不到。

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

### 界面缩放体系（rem 等比缩放，勿退回 px）
缩放引擎为 `base.css` 中 `html { font-size: calc(16px * var(--ui-scale)) }`：全站尺寸以 rem 声明、随根字号等比缩放（等价浏览器缩放）。档位由 `stores/settings.ts` 管理并持久化（`exp-track-ui-scale`）。
- **新写样式一律用 rem 或 `tokens.css` 令牌，禁止新增 px 尺寸**（1rem = 16px × 档位系数，心算除以 16 即可）。
- **例外保持 px**：1px 边框、阴影（发丝线不随档位变粗）、媒体查询断点（缩放不改变响应式行为，刻意如此）。
- **调档位须同步 2 处**：`stores/settings.ts` 的 `UI_SCALE_PRESETS` 与 `index.html` 内联脚本的合法档位白名单（两处注释已互相标注）；漏改后者会导致刷新首屏闪烁。
- **Canvas 不随 rem 缩放**：ECharts 等 canvas 场景的 option 内字号/符号/间距须乘以 `useSettingsStore().uiScale`，并 watch 档位变化重建 option + `chart.resize()`，参照 `views/timeline/TimelineView.vue`。
- **引入第三方组件库前注意**：其内部 px 不参与本缩放体系，需评估包装或 CSS 覆盖成本。

### 领域开发约束（PRD）
- **配置项（第 5 章）**：状态阈值 `soon7=7`/`soon30=30`、时间轴 `rangeDays=90`、日期格式 `YYYY-MM-DD`、货币符号 `¥`、时区 `local` 集中配置、前后端各一份且一致；业务代码不得硬编码。
- **字段校验（FR-01）**：名称 ≤100 非空；价格非负 2 位小数；到期日期 ≥ 开始日期；开始/到期/计费周期三者独立填写、不推算，**到期日期为剩余天数唯一权威字段**。
- **状态四档（FR-06）**：剩余天数按整天取整；<0 过期、0~soon7 七天内（恰为 0 归入）、soon7+1~soon30 三十天内、>soon30 充足。
- **软删除/归档（FR-03/04、Ch.4.3）**：删除置 `deleted_at` 且二次确认；默认视图 `deleted_at IS NULL AND archived=false`，已归档 `archived=true`，已删除 `deleted_at IS NOT NULL`。
- **分类（FR-10）**：名称 ≤50 唯一；**禁止删除被引用分类**。
- **货币**：本阶段统一人民币 `¥`，多币种列入第二阶段。

## 待办（PRD 目标尚未完成）
- **MySQL DAL 适配器**：PRD 验收要求快速部署（SQLite）与稳定部署（MySQL）均可运行。当前仅 SQLite 适配器实现完毕；需按 `dal/sqlite.ts` 模式实现 `dal/mysql.ts` 并在 `dal/index.ts` 的 `getDb()` 中注册 `mysql` 分支。
