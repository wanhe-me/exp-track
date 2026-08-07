# exp-track

本地优先的订阅到期追踪与可视化网站。将所有包年/包月订阅集中录入，基于到期时间统一管理与可视化，帮助掌握「哪些服务即将到期」。

> 阶段定位：MVP 第一阶段（个人本地优先、单实例、本地数据，无第三方云服务依赖）。

## 功能特性

- **订阅管理**：手动录入订阅（名称、分类、价格、计费周期、开始/到期日期、自动续费标记、备注），支持编辑、软删除（二次确认）、归档与恢复。
- **到期看板**：卡片式展示所有有效订阅，按剩余天数升序排列，临期与已过期项突出展示。
- **状态四档**：已过期（红）/ 7 天内到期（橙）/ 30 天内到期（黄）/ 充足（灰绿），阈值可配置。
- **未来到期时间轴**：以图表展示未来 90 天内到期的订阅分布。
- **分类管理**：自定义分类增删改，删除为软删除（停用），历史订阅保留原分类名显示。
- **额度包**：附属于订阅的独立失效额度（首充赠送 / 活动补偿 / 购买叠加），支持失效自动归档（FR-11~FR-13）。
- **界面缩放**：rem 等比缩放体系，4 档预设，全站尺寸随根字号等比变化。
- **MySQL 部署**：基于 MySQL 8.0，docker compose 一键拉起 MySQL + phpMyAdmin。

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | Vue 3 + Vite + TypeScript + Pinia + Vue Router + ECharts + Day.js + Axios + FontAwesome |
| 后端 | Express 5 + TypeScript + Zod（校验）|
| 数据库 | MySQL 8.0（InnoDB，utf8mb4，Docker 部署）|
| 数据访问 | DAL 抽象层（`DbAdapter` 接口），业务代码不感知底层数据库 |
| 共享包 | `@exp-track/shared`（前后端共享领域类型 / 契约 / 常量）|

## 仓库结构

单仓库 pnpm workspace，三个工作区包：

| 包 | 路径 | 说明 |
|----|------|------|
| `exp-track` | 根目录 | 前端应用 |
| `exp-track-backend` | `backend/` | 后端服务 |
| `@exp-track/shared` | `packages/_shared` | 前后端共享类型与契约（后端仅 `import type`，无运行时依赖）|

## 快速开始

### 环境要求

- Node.js `^22.18.0 || >=24.12.0`
- pnpm（包管理器）
- Docker（用于拉起 MySQL，或自备既有 MySQL 8.0 实例）

### 1. 安装依赖

workspace 会一并安装前端、后端与共享包依赖，并链接 `@exp-track/shared`：

```sh
pnpm install
```

### 2. 启动 MySQL

```sh
cp .env.example .env          # 配置 MySQL 端口与账号（占位值 change_me，需与 backend/.env 一致）
docker compose up -d
```

- MySQL：`127.0.0.1:13306`，库名 `exp_track`
- phpMyAdmin：`127.0.0.1:18080`

### 3. 配置后端环境

```sh
cd backend
cp .env.example .env          # MYSQL_* 需与上一步一致
cd ..
```

### 4. 启动开发服务

根目录下执行（`predev` 会先构建 `@exp-track/shared`，再同时拉起前后端）：

```sh
pnpm dev
```

- 前端：http://127.0.0.1:15173
- 后端 API：http://127.0.0.1:15180

后端首次启动会自动执行迁移建表（含 baseline 检测 + checksum 校验）。

## 开发命令

### 前端（根目录）

| 命令 | 说明 |
|------|------|
| `pnpm dev` | `concurrently` 同时拉起前后端（先 `predev` 构建 `_shared`） |
| `pnpm dev:front` | 仅启动前端 Vite dev server（127.0.0.1:15173） |
| `pnpm dev:back` | 仅启动后端（转发到 `backend/`，nodemon + tsx 热重载） |
| `pnpm build` | 完整打包：`build:shared` → `type-check` → `build:front` → `build:back` → `build:release` |
| `pnpm build:front` | `vite build`（自动加载 `.env.production`：`VITE_API_BASE_URL=/`） |
| `pnpm build:back` | `backend/` 下 `tsc` + 复制迁移脚本到 `dist/` |
| `pnpm build:release` | 组装部署产物到 `release/`（前端静态文件 + 后端最小运行集 + nginx 示例） |
| `pnpm type-check` | 仅 `vue-tsc --build` 类型检查 |
| `pnpm lint` | oxlint（`--fix`）后 eslint（`--fix`），顺序固定 |
| `pnpm preview` | 预览生产构建产物 |
| `pnpm migrate` / `migrate:status` / `migrate:up` | 迁移 CLI 转发到 `backend/` |

### 后端（`backend/`）

| 命令 | 说明 |
|------|------|
| `pnpm dev` | nodemon + tsx 热重载（127.0.0.1:15180），入口 `src/bootstrap/server.ts` |
| `pnpm build` | `tsc` 编译到 `dist/`，并复制 `src/dal/migrations/` 下 `.sql` 到 `dist/` |
| `pnpm start` | 运行编译产物 `node dist/bootstrap/server.js` |
| `pnpm type-check` | `tsc --noEmit` |
| `pnpm lint` | 委托根目录 `pnpm lint` |
| `pnpm migrate` | 迁移 CLI：`status` / `up` / `make <name>` |
| `pnpm migrate:status` | 查看已应用 / 待执行迁移（含 baseline 候选提示） |
| `pnpm migrate:up` | 应用所有待执行迁移（首次启动会自动执行） |

> **数据库迁移说明**：使用自建轻量迁移系统。迁移脚本位于 `backend/src/dal/migrations/mysql/`，在 `manifest.ts` 的 `manifestMysql` 注册。数据表字段设计文档见 `sql/schema.sql`（项目根目录，MySQL 8.0 标准，唯一可信源，供人工随时查阅表结构，不参与执行）。migrator 启动时校验已应用迁移的 sha256 checksum，改动已应用迁移文件会拒绝启动。已有库会在首次启动时自动识别为 `001_init` 基线，不破坏现有数据。新增字段按版本号顺序追加 `00X_xxx.sql` 并在 `manifestMysql` 注册，并同步更新 `schema.sql`。

## 配置项

后端配置通过环境变量加载（`backend/src/config/index.ts`），`backend/.env` 中可配置：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `NODE_ENV` | 运行环境 | `development` |
| `PORT` | 后端端口 | `15180` |
| `HOST` | 后端监听地址 | `127.0.0.1` |
| `CORS_ORIGIN` | CORS 允许来源（逗号分隔多源） | `http://127.0.0.1:15173` |
| `MYSQL_HOST` | MySQL 主机 | `127.0.0.1` |
| `MYSQL_PORT` | MySQL 端口 | `13306` |
| `MYSQL_USER` | MySQL 用户名 | `exp_track` |
| `MYSQL_PASSWORD` | MySQL 密码 | 空（`.env.example` 占位 `change_me`） |
| `MYSQL_DATABASE` | MySQL 库名 | `exp_track` |
| `MYSQL_CONNECTION_LIMIT` | MySQL 连接池大小 | `10` |
| `SOON7_THRESHOLD` | 7 天内到期阈值（天） | `7` |
| `SOON30_THRESHOLD` | 30 天内到期阈值（天） | `30` |
| `TIMELINE_RANGE_DAYS` | 时间轴展示范围（天） | `90` |
| `QUOTA_PACK_ARCHIVE_GRACE_DAYS` | 额度包失效后自动归档宽限期（天） | `7` |

前端构建变量（根目录 `.env.production` / `.env.development`）：

| 变量 | 说明 |
|------|------|
| `VITE_API_BASE_URL` | 前端请求后端的基址（开发 `http://127.0.0.1:15180`，同源部署 `/`） |

## 项目结构

```
exp-track/
├── backend/                        # 后端（exp-track-backend）
│   ├── scripts/                    # copy-migrations.ts / migrate.ts（迁移 CLI）
│   └── src/
│       ├── bootstrap/              # 应用入口与优雅关闭
│       ├── config/                 # 配置加载（领域配置 + 时区）
│       ├── dal/                    # 数据访问层（DbAdapter 接口 + MySQL 实现）
│       │   ├── migrations/         # mysql/ 迁移脚本 + manifest.ts（迁移清单）
│       │   └── migrator/           # 自建迁移执行器（baseline 检测 + checksum 校验 + 事务）
│       ├── helper/                 # 带依赖辅助：response / async-handler / logger
│       ├── http/                   # 路由挂载 + 参数解析
│       ├── middlewares/            # 错误处理
│       ├── services/               # 业务域（health / category / subscription / quota-pack）
│       ├── types/                 # 领域行类型 + 错误码
│       └── utils/                  # 纯函数（日期）
├── packages/_shared/              # @exp-track/shared：前后端共享领域类型 / 契约 / 常量
├── src/                            # 前端（exp-track）
│   ├── api/                        # 接口封装
│   ├── assets/styles/              # 设计令牌 + 基础样式
│   ├── components/                 # 业务组件 + base/ 原子组件
│   │   ├── base/                   # controls / dialog / display / form
│   │   ├── layout/                 # AppSidebar
│   │   ├── management/             # CategoryTree / SubscriptionTable
│   │   ├── quota-pack/             # 额度包面板 / 表单 / 槽位
│   │   └── subscription/           # SubscriptionCard / FormDialog / DetailDialog
│   ├── composables/                # 组合式函数
│   ├── helper/                     # Axios 实例 + 图标注册
│   ├── layouts/                    # AppLayout
│   ├── router/                     # 路由
│   ├── stores/                     # Pinia（subscription / category / quotaPack / settings / ui）
│   ├── utils/                      # 日期、状态工具
│   └── views/                      # 页面（dashboard / timeline / management / subscription / error）
├── deploy/                         # nginx.conf.example（同源部署示例）
├── docs/PRD/                       # 产品需求文档（单用户版 / 团队版）
├── scripts/                        # build-release.mjs（打包发布产物）
├── sql/                            # schema.sql 数据库表结构设计文档（唯一可信源，不参与执行）
└── docker-compose.yml              # MySQL + phpMyAdmin 编排
```

## API 响应格式

所有接口遵循统一响应信封：

```jsonc
// 成功
{ "ok": true, "data": T }

// 失败
{ "ok": false, "error": { "code": "ERROR_CODE", "message": "错误描述", "details": {} } }
```

主要接口：

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| GET / POST | `/api/categories` | 分类列表 / 创建分类 |
| GET / PUT / DELETE | `/api/categories/:id` | 分类详情 / 更新 / 删除 |
| GET / POST | `/api/subscriptions` | 订阅列表（支持 `view`/`categoryId`/`search` 参数）/ 创建 |
| GET / PUT / DELETE | `/api/subscriptions/:id` | 订阅详情 / 更新 / 软删除 |
| POST | `/api/subscriptions/:id/restore` | 恢复软删除 |
| POST | `/api/subscriptions/:id/archive` | 归档 |
| POST | `/api/subscriptions/:id/unarchive` | 取消归档 |
| GET | `/api/subscriptions/:id/quota-packs/slot` | 额度包聚合槽位（FR-11） |
| GET / POST | `/api/subscriptions/:id/quota-packs` | 额度包列表（`view`）/ 创建 |
| GET / PUT / DELETE | `/api/quota-packs/:id` | 额度包详情 / 更新 / 删除 |
| POST | `/api/quota-packs/:id/restore` | 恢复额度包 |
| POST | `/api/quota-packs/:id/archive` | 归档额度包 |
| POST | `/api/quota-packs/:id/unarchive` | 取消归档额度包 |

## 部署

`pnpm build` 产出 `release/` 目录：

- `release/frontend/`：前端静态文件（同源部署，`/api/**` 由 nginx 反代到后端）
- `release/backend/`：后端最小运行集（`dist/` + 裁剪版 `package.json` + `.env.example`，自带迁移脚本）
- `release/nginx.conf.example`：同源部署 nginx 示例（源文件 `deploy/nginx.conf.example`）

服务器部署：上传 `release/` → `cd backend && pnpm install --prod && pnpm start`，首次启动自动迁移建表。

## 相关文档

- [产品需求文档 - 单用户单实例版](docs/PRD/expTrack_SingleUser_PRD.md)
- [产品需求文档 - 团队多人协作版](docs/PRD/expTrack_Team_PRD.md)
- [CLAUDE.md](CLAUDE.md)（架构与工程规范详尽文档）
- [AGENTS.md](AGENTS.md)（Agent 协作高价值指引）
