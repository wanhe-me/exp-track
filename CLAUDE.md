# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

exp-track 是一个**会员订阅追踪网站**，采用单仓库前后端分离结构：

- **根目录**：前端（Vue 3 + Vite + TypeScript）
- **`backend/`**：后端（Express 5 + TypeScript + mysql2）

前端通过 Axios 调用后端 REST API，双方约定统一的响应信封格式。

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
- `db/mysql.ts`：mysql2 连接池懒加载单例，对外暴露 `getPool()` / `closePool()` / `pingDatabase()`。
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

## Lint 配置

根目录同时使用 oxlint 与 eslint（`pnpm lint` 先 oxlint 后 eslint）：
- oxlint 配置在 `.oxlintrc.json`，开启 `correctness` 类规则。
- eslint 配置在 `eslint.config.ts`，基于 `@vue/eslint-config-typescript`，并通过 `eslint-plugin-oxlint` 关闭与 oxlint 重复的规则。

后端在 `backend/` 下单独执行 `pnpm lint`（仅 eslint）。

## 代码风格

`.editorconfig`：2 空格缩进、LF 行尾、行尾去空格、文件末尾留空行、行宽 100。前后端 TypeScript 均开启 `noUncheckedIndexedAccess`。
