import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Health check — uses shared db instance (with fallback DATABASE_URL)
export async function GET() {
  const hasDbUrl = !!process.env.DATABASE_URL
  const dbUrlValid = process.env.DATABASE_URL?.startsWith('postgresql://') || process.env.DATABASE_URL?.startsWith('postgres://')
  const dbUrlPrefix = process.env.DATABASE_URL?.slice(0, 40) ?? 'NOT SET'

  let dbStatus = 'unknown'
  let dbError = ''
  try {
    const result = await db.$queryRaw`SELECT 1 AS ok`
    dbStatus = 'connected'
  } catch (e: any) {
    dbStatus = 'failed'
    dbError = e?.message?.slice(0, 200) ?? String(e)
  }

  return NextResponse.json({
    status: dbStatus === 'connected' ? 'ok' : 'error',
    timestamp: new Date().toISOString(),
    runtime: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
    },
    database: {
      urlSet: hasDbUrl,
      urlValid: dbUrlValid,
      urlPrefix: dbUrlPrefix + '...',
      status: dbStatus,
      error: dbError || undefined,
    },
  }, { status: dbStatus === 'connected' ? 200 : 500 })
}
