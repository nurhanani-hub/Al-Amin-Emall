import { PrismaClient } from '@prisma/client'

// Prisma Client singleton — CRITICAL for Vercel serverless
// Without global caching, each serverless invocation creates a new PrismaClient,
// which exhausts the Supabase connection pool rapidly.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['warn', 'error'],
  })

// Always cache globally (both dev and production/serverless)
globalForPrisma.prisma = db
