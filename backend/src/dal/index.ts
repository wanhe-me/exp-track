import { config } from '../config/index.js'
import { SqliteAdapter } from './sqlite.js'
import { MySqlAdapter } from './mysql.js'
import type { DbAdapter } from './types.js'

let adapter: DbAdapter | null = null

export const getDb = (): DbAdapter => {
  if (!adapter) {
    if (config.dbDriver === 'sqlite') {
      adapter = new SqliteAdapter()
    } else if (config.dbDriver === 'mysql') {
      adapter = new MySqlAdapter()
    } else {
      throw new Error(
        `[dal] unsupported dbDriver: ${String(config.dbDriver)}. Set DB_TYPE=sqlite (quick) or DB_TYPE=mysql (stable).`,
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
