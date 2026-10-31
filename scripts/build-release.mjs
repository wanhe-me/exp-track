// 部署产物组装脚本：把前端静态文件与后端编译产物收集到 release/。
// 不打压缩包、保留目录结构，整个 release/ 拷到服务器即可部署。
//
// 产物布局：
//   release/frontend/            前端静态文件（nginx 托管）
//   release/backend/
//     dist/                      编译产物（含 .sql 迁移脚本）
//     package.json               裁剪版（仅生产依赖 + start 脚本）
//     .env.example               环境变量参考
//   release/nginx.conf.example   同源部署 nginx 配置示例（静态托管 + /api 反代）
//
// 服务器上：cd backend && pnpm install --prod && pnpm start
// （@exp-track/shared 仅后端类型期使用，已擦除；release 无需 workspace 与 shared 产物。）

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'release')

const requireDir = (p, hint) => {
  if (!existsSync(p)) {
    console.error(`[build-release] 缺少 ${p}，请先执行 ${hint}`)
    process.exit(1)
  }
}

requireDir(join(root, 'dist'), 'pnpm build:front')
requireDir(join(root, 'backend', 'dist'), 'pnpm build:back')

rmSync(out, { recursive: true, force: true })
mkdirSync(out, { recursive: true })

// 前端静态文件
cpSync(join(root, 'dist'), join(out, 'frontend'), { recursive: true })

// 后端编译产物（tsc 输出 + copy-migrations 搬运的 .sql）
cpSync(join(root, 'backend', 'dist'), join(out, 'backend', 'dist'), { recursive: true })

// 裁剪 package.json：仅保留生产运行所需字段，去掉 devDependencies 与开发期 scripts
const pkg = JSON.parse(readFileSync(join(root, 'backend', 'package.json'), 'utf8'))
const prodPkg = {
  name: pkg.name,
  version: pkg.version,
  private: pkg.private,
  type: pkg.type,
  description: pkg.description,
  license: pkg.license,
  scripts: { start: 'node dist/bootstrap/server.js' },
  dependencies: pkg.dependencies,
  engines: pkg.engines,
}
writeFileSync(join(out, 'backend', 'package.json'), JSON.stringify(prodPkg, null, 2) + '\n')

// 生产安装与配置所需文件（@exp-track/shared 仅类型期使用，已擦除，无需打入 release）
cpSync(join(root, 'backend', '.env.example'), join(out, 'backend', '.env.example'))

// nginx 配置示例（同源部署：静态托管 + /api 反代）
cpSync(join(root, 'deploy', 'nginx.conf.example'), join(out, 'nginx.conf.example'))

console.log(`[build-release] 产物已输出到 ${out}`)
console.log('[build-release] 服务器部署：cd backend && pnpm install --prod && pnpm start')
