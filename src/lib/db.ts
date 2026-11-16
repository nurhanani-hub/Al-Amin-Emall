import { PrismaClient } from '@prisma/client'

// Prisma Client singleton — CRITICAL for Vercel serverless
// Without global caching, each serverless invocation creates a new PrismaClient,
// which exhausts the Supabase connection pool rapidly.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Fallback DATABASE_URL for Vercel deployment (prototype only)
// If Vercel env var is not set, use the Supabase pooler connection directly
// NOTE: For production, ALWAYS set DATABASE_URL in Vercel Project Settings
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://postgres.yeibsfaluesmjpctbekx:Em%40llberjaya2024@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres?connection_limit=10&pool_timeout=30'
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['warn', 'error'],
  })

// Always cache globally (both dev and production/serverless)
globalForPrisma.prisma = db
