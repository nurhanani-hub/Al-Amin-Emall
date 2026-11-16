import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { setSession, clearSession, verifyPassword, type SessionUser } from '@/lib/auth'
import { createHash } from 'crypto'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body?.email || !body?.password) {
    return NextResponse.json({ error: 'E-mel dan kata laluan diperlukan' }, { status: 400 })
  }
  const staff = await db.staff.findUnique({
    where: { email: body.email.toLowerCase() },
    include: { department: true },
  })
  if (!staff || !verifyPassword(body.password, staff.password)) {
    return NextResponse.json({ error: 'E-mel atau kata laluan tidak sah' }, { status: 401 })
  }
  if (staff.status !== 'AKTIF') {
    return NextResponse.json({ error: 'Akaun tidak aktif. Sila hubungi HR.' }, { status: 403 })
  }
  const session: SessionUser = {
    id: staff.id,
    staffNo: staff.staffNo,
    name: staff.name,
    email: staff.email,
    roleCode: staff.roleCode as SessionUser['roleCode'],
    departmentId: staff.departmentId,
    position: staff.position,
    avatarUrl: staff.avatarUrl,
  }
  await setSession(session)
  await db.auditLog.create({ data: { actorId: staff.id, action: 'LOG_MASUK', detail: `Log masuk` } })
  return NextResponse.json({ user: session })
}

export async function DELETE() {
  await clearSession()
  return NextResponse.json({ ok: true })
}

export async function GET() {
  const { getSession } = await import('@/lib/auth')
  const session = await getSession()
  if (!session) return NextResponse.json({ user: null }, { status: 401 })
  return NextResponse.json({ user: session })
}

export function hashPwd(plain: string) {
  return 'sim$' + createHash('sha256').update(plain).digest('hex').slice(0, 24)
}
