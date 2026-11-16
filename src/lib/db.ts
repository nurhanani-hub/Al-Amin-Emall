import { PrismaClient } from '@prisma/client'

// Prisma Client singleton — CRITICAL for Vercel serverless
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Fallback DATABASE_URL — triggers if env var is missing OR invalid (e.g. stale SQLite URL)
// This fixes 500 on Vercel when DATABASE_URL is not configured in Project Settings
const SUPABASE_FALLBACK = 'postgresql://postgres.yeibsfaluesmjpctbekx:Em%40llberjaya2024@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres?connection_limit=10&pool_timeout=30'
if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.startsWith('postgresql://') && !process.env.DATABASE_URL.startsWith('postgres://')) {
  process.env.DATABASE_URL = SUPABASE_FALLBACK
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['warn', 'error'],
  })

// Always cache globally (both dev and production/serverless)
globalForPrisma.prisma = db
