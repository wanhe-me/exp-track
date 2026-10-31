import express, { type Express } from 'express'
import cors, { type CorsOptions } from 'cors'
import { config } from '../config/index.js'
import { errorHandler } from '../middlewares/error-handler.js'
import { apiRouter } from '../http/router.js'
import { ok, fail } from '../helper/response.js'

// 开发环境放行的私网来源：前端 dev server 绑定 0.0.0.0，便于真机/局域网联调。
// 仅匹配私网地址 + 前端端口，公网来源一律不在开发期放行。
const DEV_LAN_ORIGIN =
  /^http:\/\/(?:localhost|127\.0\.0\.1|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}):15173$/

const isAllowedOrigin = (origin: string): boolean => {
  if (config.corsOrigin.includes(origin)) return true
  return config.env !== 'production' && DEV_LAN_ORIGIN.test(origin)
}

// CORS 白名单来自 CORS_ORIGIN（逗号分隔），不再反射任意来源。
// 生产同源部署下前端走 nginx 反代，浏览器不发跨域请求，此白名单不参与。
const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // 无 Origin：同源页面导航、curl、服务端调用，不属浏览器跨域场景，放行
    if (!origin) {
      callback(null, true)
      return
    }
    // 拒绝时回 false（不写 CORS 头）而非抛错，避免把跨域拒绝变成 500
    callback(null, isAllowedOrigin(origin))
  },
  credentials: true,
}

export const createApp = (): Express => {
  const app = express()

  app.disable('x-powered-by')
  app.use(cors(corsOptions))
  app.use(express.json({ limit: '1mb' }))
  app.use(express.urlencoded({ extended: true }))

  app.get('/', (_req, res) => {
    return ok(res, {
      name: 'exp-track-backend',
      version: '0.0.0',
      api: '/api',
    })
  })

  app.use('/api', apiRouter)

  app.use((req, res) => {
    return fail(res, 404, 'NOT_FOUND', `路由不存在: ${req.method} ${req.originalUrl}`)
  })

  app.use(errorHandler)

  return app
}