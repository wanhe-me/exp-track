import { MySqlAdapter } from './mysql.js'
import type { DbAdapter } from './types.js'

let adapter: DbAdapter | null = null

export const getDb = (): DbAdapter => {
  if (!adapter) {
    adapter = new MySqlAdapter()
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
