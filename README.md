# exp-track

本地优先的订阅到期追踪与可视化网站。将所有包年/包月订阅集中录入，基于到期时间统一管理与可视化，帮助掌握「哪些服务即将到期」。

> 阶段定位：MVP 第一阶段（个人本地优先、单实例、本地数据，无第三方云服务依赖）。

## 功能特性

- **订阅管理**：手动录入订阅（名称、分类、价格、计费周期、开始/到期日期、自动续费标记、备注），支持编辑、软删除（二次确认）、归档与恢复。
- **到期看板**：卡片式展示所有有效订阅，按剩余天数升序排列，临期与已过期项突出展示。
- **状态四档**：已过期（红）/ 7 天内到期（橙）/ 30 天内到期（黄）/ 充足（灰绿），阈值可配置。
- **未来到期时间轴**：以图表展示未来 90 天内到期的订阅分布。
- **分类管理**：自定义分类增删改，禁止删除被订阅引用的分类。
- **额度包**：附属于订阅的独立失效额度（首充赠送 / 活动补偿 / 购买叠加），支持失效自动归档（FR-11~FR-13）。
- **MySQL 部署**：基于 MySQL 8.0，docker compose 一键拉起 MySQL + phpMyAdmin。

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | Vue 3 + Vite + TypeScript + Pinia + Vue Router + ECharts + Day.js + Axios |
| 后端 | Express 5 + TypeScript + Zod（校验）|
| 数据库 | MySQL 8.0（InnoDB，utf8mb4，Docker 部署）|
| 数据访问 | DAL 抽象层（`DbAdapter` 接口），业务代码不感知底层数据库 |

## 快速开始

### 环境要求

- Node.js `^22.18.0 || >=24.12.0`
- pnpm（包管理器）
- Docker（用于拉起 MySQL，或自备既有 MySQL 8.0 实例）

### 1. 安装依赖

根目录（前端）与 `backend/`（后端）各有独立依赖，需分别安装：

```sh
pnpm install
cd backend && pnpm install && cd ..
```

### 2. 启动 MySQL

```sh
cp .env.example .env          # 配置 MySQL 端口与账号（默认值已对齐 docker-compose）
docker compose up -d
```

- MySQL：`127.0.0.1:13306`，库名 `exp_track`
- phpMyAdmin：`127.0.0.1:18080`

### 3. 启动后端

```sh
cd backend
cp .env.example .env          # 默认值已对齐 docker-compose，可直接使用
pnpm dev
```

后端首次启动会自动执行迁移建表（含 baseline 检测 + checksum 校验）。

### 4. 启动前端

另开终端：

```sh
pnpm dev
```

- 前端：http://127.0.0.1:15173
- 后端 API：http://127.0.0.1:15180

### 同时启动前后端

根目录下执行：

```sh
pnpm dev
```

## 开发命令

### 前端（根目录）

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 启动 Vite dev server（127.0.0.1:15173） |
| `pnpm build` | 类型检查 + 生产构建 |
| `pnpm type-check` | 仅类型检查（vue-tsc --build） |
| `pnpm lint` | oxlint + eslint（均带 --fix） |
| `pnpm preview` | 预览生产构建产物 |

### 后端（`backend/`）

| 命令 | 说明 |
|------|------|
| `pnpm dev` | nodemon + tsx 热重载（127.0.0.1:15180） |
| `pnpm build` | tsc 编译到 dist/，并把 `src/dal/migrations/` 下的 .sql 复制到 dist |
| `pnpm start` | 运行编译产物 |
| `pnpm type-check` | tsc --noEmit |
| `pnpm lint` | 委托根目录 `pnpm lint` |
| `pnpm migrate` | 迁移 CLI：`status` / `up` / `make <name>` |
| `pnpm migrate:status` | 查看已应用 / 待执行迁移（含 baseline 候选提示） |
| `pnpm migrate:up` | 应用所有待执行迁移（首次启动会自动执行） |

> **数据库迁移说明**：使用自建轻量迁移系统。迁移脚本位于 `backend/src/dal/migrations/mysql/`；数据表字段设计文档见 `sql/schema.sql`（项目根目录，MySQL 8.0 标准，唯一可信源，供人工随时查阅表结构，不参与执行）。migrator 启动时校验已应用迁移的 sha256 checksum，改动已应用迁移文件会拒绝启动。已有库会在首次启动时自动识别为 `001_init` 基线，不破坏现有数据。新增字段按版本号顺序追加 `00X_xxx.sql` 并在 `manifest.ts` 的 `manifestMysql` 注册，并同步更新 `schema.sql`。

## 配置项

后端配置通过环境变量加载，`backend/.env` 中可配置：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | 后端端口 | `15180` |
| `HOST` | 后端监听地址 | `127.0.0.1` |
| `CORS_ORIGIN` | CORS 允许来源（前端地址） | `http://127.0.0.1:15173` |
| `MYSQL_HOST` | MySQL 主机 | `127.0.0.1` |
| `MYSQL_PORT` | MySQL 端口 | `13306` |
| `MYSQL_USER` | MySQL 用户名 | `exp_track` |
| `MYSQL_PASSWORD` | MySQL 密码 | `exp_track123` |
| `MYSQL_DATABASE` | MySQL 库名 | `exp_track` |
| `MYSQL_CONNECTION_LIMIT` | MySQL 连接池大小 | `10` |
| `SOON7_THRESHOLD` | 7 天内到期阈值（天） | `7` |
| `SOON30_THRESHOLD` | 30 天内到期阈值（天） | `30` |
| `TIMELINE_RANGE_DAYS` | 时间轴展示范围（天） | `90` |

## 项目结构

```
exp-track/
├── backend/                        # 后端
│   └── src/
│       ├── bootstrap/              # 应用入口与优雅关闭
│       ├── config/                 # 配置加载（领域配置）
│       ├── dal/                    # 数据访问层（DbAdapter 接口 + MySQL 实现）
│       │   ├── migrations/         # mysql/ 迁移脚本 + manifest.ts（迁移清单）
│       │   └── migrator/           # 自建迁移执行器（baseline 检测 + checksum 校验 + 事务）
│       ├── http/                   # 路由挂载
│       ├── middlewares/            # 请求日志、错误处理
│       ├── services/               # 业务域（health / category / subscription / quota-pack）
│       └── utils/                  # 响应封装、日志、日期工具
├── src/                            # 前端
│   ├── api/                        # 接口封装
│   ├── assets/styles/              # 设计令牌 + 基础样式
│   ├── components/                 # 业务组件 + base/ 原子组件
│   ├── composables/                # 组合式函数
│   ├── layouts/                    # 布局组件
│   ├── lib/                        # Axios 实例与拦截器
│   ├── router/                     # 路由
│   ├── stores/                     # Pinia 状态管理
│   ├── types/                      # 类型定义 + 领域配置常量
│   ├── utils/                      # 日期、状态工具
│   └── views/                      # 页面视图
├── docs/PRD/                       # 产品需求文档
├── sql/                            # schema.sql 数据库表结构设计文档（唯一可信源，MySQL 8.0 标准，不参与执行）
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

> 额度包（quota-pack）相关接口详见 PRD §FR-11~FR-13 与 `backend/src/services/quota-pack/`。

## 相关文档

- [产品需求文档（PRD）](docs/PRD/expTrack_PRD.md)
