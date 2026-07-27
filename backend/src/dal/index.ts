import { config } from '../config/index.js'
import { SqliteAdapter } from './sqlite.js'
import type { DbAdapter } from './types.js'

let adapter: DbAdapter | null = null

export const getDb = (): DbAdapter => {
  if (!adapter) {
    if (config.dbDriver === 'sqlite') {
      adapter = new SqliteAdapter()
    } else {
      throw new Error(
        `[dal] MySQL DAL adapter not yet implemented. Set DB_TYPE=sqlite for quick deployment.`,
      )
    }
  }
  return adapter
}

export const closeDb = async (): Promise<void> => {
  if (adapter) {
    await adapter.close()
    adapter = null
  }
}

export const initDb = async (): Promise<void> => {
  await getDb().init()
}
