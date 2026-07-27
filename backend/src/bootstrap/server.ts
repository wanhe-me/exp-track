import { createApp } from './app.js'
import { config } from '../config/index.js'
import { logger } from '../utils/logger.js'
import { closePool } from '../db/mysql.js'

const app = createApp()

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
      await closePool()
    } catch (err) {
      logger.error('error closing pool', {
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