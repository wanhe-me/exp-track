import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  return {
    // 部署路径：默认站点根。若部署到子路径（如 /exp-track/），
    // 构建时覆盖： `vite build --base=/exp-track/`
    // router 使用 createWebHistory(import.meta.env.BASE_URL)，此处必须为绝对路径。
    base: '/',

    plugins: [
      vue(),
      vueDevTools(),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },

    // 开发服务器（pnpm dev）
    server: {
      host: '127.0.0.1',
      port: 15173,
      strictPort: true,
    },

    // 生产构建（pnpm build）
    build: {
      // 输出目录，已纳入 .gitignore
      outDir: 'dist',
      emptyOutDir: true,
      // 生产构建默认不生成 sourcemap（需要线上排错时改为 true / 'hidden'）
      sourcemap: mode === 'development',
      // echarts 等依赖体积较大，上调阈值避免无谓的构建警告
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          // 按依赖来源拆分 chunk，提升静态部署下的浏览器缓存命中率
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('echarts') || id.includes('zrender')) return 'echarts'
              if (id.includes('vue') || id.includes('@vue') || id.includes('pinia')) return 'vue-vendor'
              return 'vendor'
            }
          },
        },
      },
    },

    // 预览构建产物（pnpm preview）——用于部署前的本地验证
    preview: {
      host: '127.0.0.1',
      port: 15183,
      strictPort: true,
    },
  }
})
