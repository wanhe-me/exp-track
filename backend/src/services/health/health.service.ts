import { pingDatabase } from '../../db/mysql.js'

export interface HealthReport {
  status: 'ok' | 'degraded'
  uptimeSeconds: number
  timestamp: string
  timezone: string
  database: {
    reachable: boolean
    error?: string
  }
}

export const getHealthReport = async (): Promise<HealthReport> => {
  const timestamp = new Date().toISOString()
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

  let reachable = false
  let dbError: string | undefined
  try {
    await pingDatabase()
    reachable = true
  } catch (err) {
    dbError = err instanceof Error ? err.message : String(err)
  }

  return {
    status: reachable ? 'ok' : 'degraded',
    uptimeSeconds: Math.round(process.uptime()),
    timestamp,
    timezone,
    database: {
      reachable,
      ...(dbError ? { error: dbError } : {}),
    },
  }
}