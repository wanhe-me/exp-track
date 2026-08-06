// 构建期把 migrations/ 整个目录从 src 复制到 dist，
// 因为 tsc 不会搬运 .sql 等非 TS 资源，但运行期需要这些文件。

import { cpSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const src = join(here, '..', 'src', 'dal', 'migrations')
const dst = join(here, '..', 'dist', 'dal', 'migrations')

if (!existsSync(src)) {
  console.error(`[copy-migrations] source not found: ${src}`)
  process.exit(1)
}

mkdirSync(dirname(dst), { recursive: true })
cpSync(src, dst, { recursive: true })
console.log(`[copy-migrations] copied ${src} -> ${dst}`)
