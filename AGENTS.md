# AGENTS.md

本文件是 exp-track 仓库**深度开发约束**：分层、迁移、分支与发版流程。面向新贡献者的入门引导在 `CONTRIBUTING.md`，两者不重复——入门看 CONTRIBUTING，动手改代码前读本文件。

原先的 `CLAUDE.md` 已合并至此并删除，不要再新建同类文件（`CLAUDE.md`、`CODEBUDDY.md`、`.cursorrules` 等）。产品定义在本地 `docs/PRD/`（需求未定稿，该目录已在 `.gitignore` 中，不随仓库提交），部署操作看 `README.md`，表结构看 `sql/schema.sql`。

> 文中出现的 `FR-xx` 是内部需求编号，对应的需求文档不公开。编号仅用于本仓库内部追溯，读到不必去找原文——约束本身已在本文件里写全。

## 项目概述

exp-track 是**本地优先的订阅到期追踪与可视化网站**，单仓库前后端分离：

- **根目录**：前端（Vue 3 + Vite + TypeScript），dev server 端口 15173。
- **`backend/`**：后端（Express 5 + TypeScript），端口 15180。
- **`packages/_shared/`**：前后端共享的领域类型 / 契约 / 常量，两端以 `@exp-track/shared` 引用。

前端经 Axios 调后端 REST API，双方遵守统一响应信封。接口清单与信封格式见 `README.md` 的「API 响应格式」（接口契约尚未定稿，没有独立的 API 文档，以代码为准）。

> **当前实现状态**：FR-01 ~ FR-13 已实现（含额度包/补给包追踪 FR-11~FR-13）。
> - **MySQL 为唯一数据存储**：SQLite 部署模式已移除。`docker compose up -d` 拉起 MySQL 8.0 + phpMyAdmin，`backend/.env` 配 `MYSQL_*` 即可。
> - 数据模型三表（`subscription` / `category` / `quota_pack`），由自建迁移系统按版本号顺序建表升级，已有库经 baseline 检测纳管。
> - 前端已重构为侧边栏工作台：看板（展示）与订阅管理（数据维护）分离。

## 常用命令

包管理器 **pnpm**（workspace：根目录 + `backend/` + `packages/_shared/`，根目录一次 `pnpm install` 覆盖全部）。

### 根目录

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 同时拉起前后端（concurrently），`predev` 会先构建 shared 包 |
| `pnpm dev:front` / `dev:back` | 单独起前端（0.0.0.0:15173）/ 后端（127.0.0.1:15180） |
| `pnpm build` | `build:shared` → `type-check` → `build:front` → `build:back` → `build:release` |
| `pnpm build:shared` / `build:front` / `build:back` / `build:release` | 单独执行对应步骤 |
| `pnpm type-check` | 前端 `vue-tsc --build` |
| `pnpm lint` | 先 oxlint 后 eslint，顺序固定（eslint 经 `eslint-plugin-oxlint` 关掉 oxlint 已覆盖的规则） |
| `pnpm preview` | 预览生产构建产物（127.0.0.1:15183） |
| `pnpm migrate` / `migrate:status` / `migrate:up` | 迁移 CLI 转发到 `backend/`，底层固定 MySQL |

`pnpm build` 细节：

- `build:shared` 先构建 `packages/_shared`——前后端 type-check 都依赖其 `dist`，裸跑 `type-check` 前必须先构建（`pnpm dev` 经 `predev` 自动完成）。
- `build:front`：`vite build`，加载 `.env.production`（同源部署 `VITE_API_BASE_URL=/`）。
- `build:back`：`tsc` 编译后跑 `backend/scripts/copy-migrations.ts` 把 `.sql` 搬进 `dist/`。
- `build:release`：`scripts/build-release.mjs` 组装 `release/`（`frontend/` 静态文件 + `backend/` 最小运行集 + `nginx.conf.example`）。服务器上 `cd backend && pnpm install --prod && pnpm start`。

### 后端（`backend/`）

| 命令 | 说明 |
|------|------|
| `pnpm dev` | nodemon + tsx 热重载，入口 `src/bootstrap/server.ts` |
| `pnpm build` | `tsc` 到 `dist/`，并搬运迁移脚本 |
| `pnpm start` | `node dist/bootstrap/server.js` |
| `pnpm type-check` | `tsc --noEmit` |

> **无测试框架**（无 vitest/jest），没有 `pnpm test`。改动核心逻辑（DAL、日期与状态计算、迁移）靠手工验证：起后端 + curl 关键接口。新增测试框架属尚未决策事项。

## 架构要点

### 响应信封契约（前后端必须同步）

成功 `{ ok: true, data: T }`；失败 `{ ok: false, error: { code, message, details? } }`。

- 后端 `backend/src/helper/response.ts`：`ok(res, data, status)` / `fail(...)`。控制器一律用二者返回，禁止 `res.json`；业务异常抛 `DomainError`（`backend/src/types/errors.ts`），由 `middlewares/error-handler.ts` 统一转信封。路由处理器用 `helper/async-handler.ts` 的 `asyncHandler` 包裹。
- 前端 `src/helper/api.ts`：Axios 实例 + 拦截器，`ok===false` 转 reject，调用方用 `unwrap<T>(res)` 取 `data`，类型 `ApiEnvelope<T>`（在 `@exp-track/shared`）。

### 分层约定

- `backend/src/helper/`：带外部依赖的辅助（response / async-handler / logger）。
- `backend/src/utils/`：**纯函数**（如 `date.ts`），不依赖 I/O。
- `@exp-track/shared`：跨端共享的领域类型、契约、`domainConfig` 默认值、`*_LABELS` 文案。
- `backend/src/types/domain.ts`：仅放 DAL 行类型（`*Row`）。

### 目录导航（按需阅读，勿把目录树当说明书）

> **总原则**：写任何代码前，先读目标目录里一个**已有同类文件**作为样板，照其位置、命名、返回方式、类型归口来写；不要凭空新建或臆测约定。

| 你要做的事 | 先读这几个目录 / 文件 |
|------|------|
| 新增 / 修改后端接口或业务域 | `backend/src/services/<domain>/`、`http/router.ts`、`helper/response.ts`；参考 `health/` `category/` `subscription/` `quota-pack/` |
| 操作数据库 | `backend/src/dal/`（业务代码统一经 `getDb()`，勿直接 import 驱动）、`dal/mysql.ts` |
| 加字段 / 改表结构 | 见下方「数据库迁移」 |
| 加 / 改查询参数 | `http/params.ts`（复用的解析器）+ 对应 controller 的 `parseXxx`，再落到 service |
| 改后端配置项 | `backend/src/config/index.ts`（所有配置经 `config` 对象，勿直接读 `process.env`） |
| 改前后端共享类型 / 领域常量 / 文案 | `packages/_shared/src/`（`domain.ts` / `config.ts` / `labels.ts`），改完必须 `pnpm build:shared` |
| 新增 / 修改前端页面 | `src/views/`、`src/router/index.ts`、`src/stores/`、`src/api/` |
| 改前端公共组件 | `src/components/base/`（`AppButton` `AppInput` `AppSelect` `AppTextarea` `AppTag` `DatePicker` `ConfirmDialog` `StatusBadge` `CategoryTag` `EmptyState`，props 驱动、无副作用）；业务组件在 `src/components/<业务>/` |
| 改设计令牌 / 状态色 | `src/assets/styles/tokens.css`；状态色映射见 `src/utils/status/` |
| 调用后端 API | `src/helper/api.ts`（Axios + 拦截器 + `unwrap`，基址 `VITE_API_BASE_URL`） |
| 复用订阅增删改 / 归档恢复逻辑 | `src/composables/useSubscriptionActions.ts` |

**NodeNext 与 `.js` 扩展名（易踩坑）**：后端 `tsconfig.json` 用 `"module": "NodeNext"`，所有相对 import 必须显式写 `.js`（源文件是 `.ts` 也如此），如 `import { ok } from '../helper/response.js'`，否则运行时报模块找不到。

**订阅列表查询**：`GET /api/subscriptions` 支持 `view` / `page` / `pageSize` / `categoryId` / `search` / `status` / `sortBy` / `sortOrder`，全部在现有端点上扩展，不新增端点。`status` 由 service 用 `statusExpireRange()` 换算成到期日期区间后**下推到 SQL**——若改为内存过滤，分页与 `total` 都会失真。

### 端口速查

| 服务 | 端口 |
|------|------|
| 前端 dev server | 15173 |
| 前端 preview | 15183 |
| 后端 API | 15180 |
| MySQL（Docker） | 13306 |
| phpMyAdmin（Docker） | 18080 |

## 工程规范与领域约束（来自 PRD）

### 接口与工程规范（PRD 第 7 章）

- **接口扩展原则**：能改造兼容现有接口的不要新增端点；新增字段只增不删；统一响应信封；功能相近查询优先合并（用参数区分）。
- **目录结构（7.1）**：公共能力按 `api/ components/base/ composables/ layouts/ router/ stores/ views/ helper/ utils/` 归口；禁止业务页面内重复定义同类能力。
- **设计令牌与状态色（7.2）**：色彩 / 间距 / 圆角 / 字号用 CSS 变量；四档状态色（已过期红 / 7 天内橙 / 30 天内黄 / 充足灰绿）禁止组件硬编码。
- **公共组件（7.3）**：重复 UI 抽为 `components/base/` 原子组件，props 驱动、无副作用。
- **视觉一致性（7.4）**：颜色 / 间距 / 圆角 / 字号只能用设计令牌。
- **Lint**：根目录先 oxlint 后 eslint；`.editorconfig` 2 空格、LF、行宽 100；前后端 TS 均开 `noUncheckedIndexedAccess`。

### 数据库迁移

1. **先改 `sql/schema.sql`**（MySQL 8.0 标准，表结构唯一可信源，供人工查阅，不参与执行）。
2. 写迁移 `backend/src/dal/migrations/mysql/00X_xxx.sql`，在 `backend/src/dal/migrations/manifest.ts` 的 `manifestMysql` 注册；`pnpm migrate make <snake_name>` 有脚手架提示。
3. 改 `backend/src/dal/mysql.ts` 适配器代码。
4. **禁止改已应用的迁移**（如 `001_init.sql`）：启动校验 sha256 checksum，改动会拒绝启动。已有库走 baseline 检测，不会重复建表。

### 界面缩放体系（rem 等比缩放，勿退回 px）

缩放引擎为 `base.css` 中 `html { font-size: calc(16px * var(--ui-scale)) }`，档位由 `stores/settings.ts` 管理并持久化（`exp-track-ui-scale`）。

- **新写样式一律 rem 或 `tokens.css` 令牌，禁止新增 px 尺寸**。
- **例外保持 px**：1px 边框、阴影、媒体查询断点（刻意不随缩放变化）。
- **调档位须同步 2 处**：`stores/settings.ts` 的 `UI_SCALE_PRESETS` 与 `index.html` 内联脚本的合法档位白名单；漏改后者会首屏闪烁。
- **Canvas 不随 rem 缩放**：ECharts option 内字号 / 间距须乘 `useSettingsStore().uiScale`，并 watch 档位重建 option + `chart.resize()`，参照 `views/timeline/TimelineView.vue`。
- **引入第三方组件库前**：其内部 px 不参与本体系，需评估包装或覆盖成本。

### 领域约束（PRD）

- **配置项（第 5 章）**：状态阈值 `soon7=7` / `soon30=30`、时间轴 `rangeDays=90`、日期格式 `YYYY-MM-DD`、货币符号 `¥`、额度包宽限 `quotaPack.archiveGraceDays=7`。结构在 `@exp-track/shared`，后端可由 `SOON7_THRESHOLD` / `SOON30_THRESHOLD` / `TIMELINE_RANGE_DAYS` / `QUOTA_PACK_ARCHIVE_GRACE_DAYS` 覆盖；业务代码不得硬编码。
- **字段校验（FR-01）**：名称 ≤100 非空；价格非负 2 位小数；到期日期 ≥ 开始日期；开始 / 到期 / 计费周期独立填写、不推算，**到期日期是剩余天数的唯一权威字段**。
- **状态四档（FR-06）**：剩余天数按整天取整；`<0` 过期、`0~soon7` 七天内（恰为 0 归入）、`soon7+1~soon30` 三十天内、`>soon30` 充足。
- **软删除 / 归档（FR-03/04）**：删除置 `deleted_at` 且二次确认；默认视图 `deleted_at IS NULL AND archived = 0`，已归档 `archived = 1`，已删除 `deleted_at IS NOT NULL`。
- **分类（FR-10）**：名称 ≤50，**未删状态下**唯一（软删后同名可复用）；删除是**软删除（停用）**，不检查引用；历史订阅 `LEFT JOIN` 仍显示原分类名，列表与下拉只展示未删分类。
- **额度包（FR-11~13）**：仅额度型订阅有；失效后宽限 `archiveGraceDays` 天内仍展示并标红，超过后惰性置 `archived = true`。
- **货币**：统一人民币 `¥`，多币种属第二阶段。

## 分支与发版流程

分支模型：`main` = **发版线**（只在发版时更新），`develop` = 集成分支，其余为**集成工作分支**（一次长任务一条）。

### 硬性规则

- **长任务必须开集成工作分支**，在分支上提交，完成后**停下来等审查**，收到明确的合并指令再合入 `develop`。
- **小修改允许直接提交到 `develop`**（文档、注释、配置、文案、样式微调、明确的单点修复）。
- **所有合并一律 `--no-ff`**，禁止 fast-forward、禁止 squash。fast-forward 会压平拓扑，看不出「这批改动是一个整体」。
- `main` 平时不动，只在发版时从 `develop` 合入。

### 长任务 vs 小修改

满足任一条即按**长任务**走：

- 改动跨前后端，或跨多个模块 / 目录
- 涉及数据模型、迁移脚本、接口契约的变更
- 新增功能，或重构既有实现
- 正确性需要多轮验证才能确认（分页、排序、状态计算、缓存这类容易错且错了不明显的逻辑）

**小修改**指：单文件或少文件的文档、注释、配置、文案、样式微调，以及边界清晰的单点修复。

**拿不准就按长任务走**——多开一个分支的成本，远低于一次不可追溯的直提。

### 长任务流程

```sh
git switch -c fix/xxx develop        # 1. 从 develop 切集成分支
# ... 开发、提交 ...
# 2. 在分支上跑完 type-check / lint / 构建，工作区保持干净
# 3. 汇报改动与验证结果，等审查——不要自行合并
git switch develop
git merge --no-ff fix/xxx            # 4. 收到明确合并指令后才执行
git branch -d fix/xxx                # 5. 用 -d 只删已完全合并的分支
```

集成分支命名与提交前缀保持一致：`feat/<主题>` / `fix/<主题>` / `refactor/<主题>` / `docs/<主题>` / `chore/<主题>`。

**不要用 `git branch -D`** 强删分支。若 `-d` 报 not fully merged，说明有提交没进 develop，回到第 3 步报告，别硬删。

### 发版流程

```sh
git switch main
git merge --no-ff develop           # 必须是 --no-ff
git tag -a v0.6.0 -m "v0.6.0"       # 版本号打在 main 上
git push origin main
git push origin v0.6.0              # 标签需单独推送，不会随分支走
```

- 版本号遵循 `vMAJOR.MINOR.PATCH`；tag 用**附注标签**（`-a`），不用轻量标签。
- tag **只打在 `main`** 上，不在 `develop` 或集成分支上打。
- **发版版本只由 tag 承载**。`package.json` 的 `version` 是**源码版本**，与发版版本各自独立演进：发版时**不要**去改它，也不要建立两者的同步或校验。看到 tag 是 `v0.6.0` 而 `package.json` 写着 `0.0.0`，是正常状态，不是遗漏。
- 发版前确认 `develop` 的 type-check / lint / 构建全部通过。

## 配置与环境变量

集中在 `backend/src/config/index.ts`，全部经 `config` 对象读取：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `NODE_ENV` | `development` / `production` | `development` |
| `HOST` / `PORT` | 监听地址 / 端口 | `127.0.0.1` / `15180` |
| `CORS_ORIGIN` | 允许的前端来源，**逗号分隔多个** | `http://127.0.0.1:15173,http://localhost:15173` |
| `MYSQL_HOST` / `MYSQL_PORT` / `MYSQL_USER` / `MYSQL_PASSWORD` / `MYSQL_DATABASE` / `MYSQL_CONNECTION_LIMIT` | 数据库连接 | 见 `.env.example` |
| `LOG_LEVEL` | `debug` / `info` / `warn` / `error` / `silent` | `warn` |
| `SOON7_THRESHOLD` / `SOON30_THRESHOLD` / `TIMELINE_RANGE_DAYS` / `QUOTA_PACK_ARCHIVE_GRACE_DAYS` | 领域配置覆盖 | `7` / `30` / `90` / `7` |

CORS：只有 `CORS_ORIGIN` 内的来源拿到 CORS 响应头；无 `Origin` 的请求（curl、服务端调用）放行；**非生产环境额外放行私网地址 + 15173**（前端 dev server 绑 `0.0.0.0`，便于真机联调）。生产经 nginx 同源反代，浏览器不发跨域请求，白名单不参与；若生产需局域网访问，必须把来源显式写进 `CORS_ORIGIN`。

## 已知坑

- **生产必须设 `NODE_ENV=production`**：`.env.example` 默认 `development`，而该文件会被 `build:release` 原样带进部署包。漏改会让开发期行为（私网 CORS 放行、宽松日志）在生产继续生效。
- **改 `packages/_shared` 后必须 `pnpm build:shared`**，否则前后端 type-check 与运行都读到旧 `dist`。
- 裸跑 `pnpm type-check` 前若 `packages/_shared/dist` 不存在，会报模块找不到——先构建 shared。
- `build:release` 会读 `backend/.env.example` 并复制；受限沙箱里可能被文件策略拦截，换普通终端复跑即可。
- `pnpm install` 在受限沙箱内可能让 pnpm worker 直接退出（无报错信息），换普通终端执行。
- 前端 `preview` 端口 15183，`.env.production` 的 `VITE_API_BASE_URL=/` 需要 nginx 反代或临时改绝对地址。
- 单文件超千行的 `src/components/base/form/DatePicker.vue` 与 `AppSelect.vue` 是主要维护负担，改动前先确认是否真需要动。
