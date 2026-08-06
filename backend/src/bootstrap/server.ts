import { createApp } from './app.js'
import { config } from '../config/index.js'
import { logger } from '../helper/logger.js'
import { closeDb, initDb } from '../dal/index.js'

const app = createApp()

const start = async (): Promise<void> => {
  // 初始化数据库（建表）
  await initDb()
  logger.info('database initialized', { driver: config.dbDriver })

  const server = app.listen(config.port, config.host, () => {
    logger.info('server started', {
      url: `http://${config.host}:${config.port}`,
      env: config.env,
    })
  })

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`received ${signal}, shutting down`)
    server.close(async () => {
      try {
        await closeDb()
      } catch (err) {
        logger.error('error closing database', {
          err: err instanceof Error ? err.message : String(err),
        })
      }
      process.exit(0)
    })
    setTimeout(() => process.exit(1), 10_000).unref()
  }

  process.on('SIGINT', () => {
    void shutdown('SIGINT')
  })
  process.on('SIGTERM', () => {
    void shutdown('SIGTERM')
  })
  process.on('unhandledRejection', (reason) => {
    logger.error('unhandledRejection', {
      reason: reason instanceof Error ? reason.message : String(reason),
    })
  })
}

start().catch((err) => {
  logger.error('failed to start server', {
    err: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  })
  process.exit(1)
})
