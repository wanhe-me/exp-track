# AGENTS.md

主指引文件为 `CLAUDE.md`（已自动加载），含完整架构、命令、领域约束、NodeNext、rem 缩放、迁移流程。本文件仅记**易被忽略的高价值事实**与**对现有文档的勘误**，不重复 CLAUDE.md 已说明的内容。

## 权威文档
- `CLAUDE.md`：最详尽，遇事先读。
- `docs/PRD/expTrack_PRD.md`：产品需求与验收标准。
- `sql/schema.sql`：数据库表结构唯一可信源（MySQL 8.0 标准，供人工查阅，不参与执行）。

## 常用命令（根目录）
- `pnpm dev`：**同时拉起前后端**（concurrently）。README 里的 `pnpm dev:all` 不存在。
- `pnpm build`：`build:shared → type-check → build:front → build:back → build:release`。先构建 `packages/_shared`（前后端共享的领域类型/契约/常量，两端以 `@exp-track/shared` 引用，后端仅 `import type` 故无运行时依赖）；`build:back` 在 `tsc` 后跑 `backend/scripts/copy-migrations.ts`，把 `.sql` 迁移脚本搬进 `dist/`，故 `release/` 产物自带迁移脚本。
- `pnpm lint`：先 oxlint 后 eslint，顺序固定（eslint 经 `eslint-plugin-oxlint` 关闭 oxlint 已覆盖规则）。
- 无测试框架：勿运行 `pnpm test`。前后端 type-check 均依赖 `packages/_shared/dist`，裸跑前先 `pnpm --dir packages/_shared build`（`pnpm dev` 经 `predev` 已自动构建）；后端类型检查在 `backend/` 下 `pnpm type-check`（`tsc --noEmit`）。

## 后端要点
- 入口 `backend/src/bootstrap/server.ts`（dev 经 tsx，prod `node dist/bootstrap/server.js`）。
- **NodeNext：相对 import 必须写 `.js`**（源文件是 `.ts` 也要），漏写运行时报模块找不到。
- 数据访问统一经 `getDb()`（`backend/src/dal/index.ts`），按 `DB_TYPE` 派发 `sqlite`/`mysql`，勿直接 import 数据库驱动。
- `helper/` 放带依赖的辅助（response/async-handler/logger），`utils/` 仅放纯函数（date）；跨端共享契约走 `@exp-track/shared`，DAL 行类型（*Row）留 `backend/src/types/domain.ts`。

## 数据库迁移（易踩坑）
- 迁移脚本真实路径：`backend/src/dal/migrations/{sqlite,mysql}/`，在 `backend/src/dal/migrations/manifest.ts` 的 `manifestSqlite` / `manifestMysql` 注册。CLAUDE.md 简写为 `migrations/...`，实际带 `backend/src/dal/` 前缀。
- 执行器：`backend/src/dal/migrator/{sqlite,mysql}.ts`（含 baseline 检测 + sha256 checksum 校验 + 事务）。
- `pnpm migrate make <snake_name>`：脚手架命令，**生成 sqlite + mysql 两份文件**并提示在两个 manifest 各注册一行。
- **禁止改已应用迁移**（如 `001_init.sql`）：启动时校验 checksum，改动会拒绝启动。已有库会被识别为 baseline，不破坏现有数据。
- 字段变更流程：先改 `sql/schema.sql`，再写迁移脚本，再改对应 DAL 适配器（`dal/sqlite.ts` / `dal/mysql.ts`）。
- 当前 MySQL 为开发主线，新增迁移默认只写 MySQL 一份；SQLite 侧按 CLAUDE.md「同步 SQLite」流程处理。

## 文档勘误（README.md 已过时，以代码为准）
- `pnpm dev:all` 不存在 -> 用 `pnpm dev`。
- README 称 MySQL DAL「尚未实现」-> 实际 `dal/mysql.ts` + `migrator/mysql.ts` 已完整可用，`DB_TYPE=mysql` 即走 MySQL。
- README 称迁移「仅 SQLite」-> sqlite / mysql 双方言迁移均已存在。
- README 引用的 `CODEBUDDY.md` 文件已不存在（仅余 `.codebuddy/memory/` 目录）。
