# exp-track Backend

会员订阅追踪网站 — Node.js 后端服务。

## 技术栈

- Node.js >= 22.18（推荐 LTS）
- Express 5
- TypeScript 5
- mysql2 (Promise Pool)

## 目录结构

```
src/
├── bootstrap/   # 应用与服务启动入口
├── config/      # 配置加载与时区
├── db/          # 数据库连接池
├── http/        # 路由聚合
├── middlewares/ # Express 中间件
├── services/    # 业务模块（按域拆分）
├── sql/         # 初始化 SQL
└── utils/       # 工具函数
```

## 本地启动

```bash
cp .env.example .env
pnpm install
pnpm dev
```

服务默认监听 `http://127.0.0.1:15180`。

健康检查：

```bash
curl http://127.0.0.1:15180/api/health
```

## 生产构建

```bash
pnpm build
pnpm start
```