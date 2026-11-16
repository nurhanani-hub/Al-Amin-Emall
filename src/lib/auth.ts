/**
 * Auth helper - simulasi sesi berasaskan cookie (Fasa 1)
 * SERVER-ONLY - jangan import dari Client Component
 */
import { cookies } from 'next/headers'
import { createHash } from 'crypto'
import { db } from './db'
import type { SessionUser } from './rbac'

export type { SessionUser }

export const SESSION_COOKIE = 'hrms_session'
export const SESSION_TTL = 60 * 60 * 24 * 7 // 7 hari

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies()
  const raw = store.get(SESSION_COOKIE)?.value
  if (!raw) return null
  try {
    const parsed = JSON.parse(atob(raw)) as SessionUser
    const s = await db.staff.findUnique({ where: { id: parsed.id } })
    if (!s) return null
    return {
      ...parsed,
      name: s.name,
      roleCode: s.roleCode as SessionUser['roleCode'],
      departmentId: s.departmentId,
      position: s.position,
      avatarUrl: s.avatarUrl,
    }
  } catch {
    return null
  }
}

export async function setSession(user: SessionUser) {
  const store = await cookies()
  store.set(SESSION_COOKIE, btoa(JSON.stringify(user)), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL,
  })
}

export async function clearSession() {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}

export function verifyPassword(plain: string, stored: string) {
  const expected = 'sim$' + createHash('sha256').update(plain).digest('hex').slice(0, 24)
  return expected === stored
}
