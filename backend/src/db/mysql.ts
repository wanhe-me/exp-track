import mysql, { type Pool } from 'mysql2/promise'
import { config } from '../config/index.js'

let pool: Pool | null = null

export const getPool = (): Pool => {
  if (!pool) {
    pool = mysql.createPool({
      host: config.mysql.host,
      port: config.mysql.port,
      user: config.mysql.user,
      password: config.mysql.password,
      database: config.mysql.database,
      connectionLimit: config.mysql.connectionLimit,
      waitForConnections: true,
      multipleStatements: false,
      charset: 'utf8mb4_unicode_ci',
      timezone: '+08:00',
      dateStrings: false,
    })
  }
  return pool
}

export const closePool = async (): Promise<void> => {
  if (pool) {
    await pool.end()
    pool = null
  }
}

export const pingDatabase = async (): Promise<void> => {
  const conn = await getPool().getConnection()
  try {
    await conn.ping()
  } finally {
    conn.release()
  }
}