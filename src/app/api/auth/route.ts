import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { setSession, clearSession, verifyPassword, type SessionUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    if (!body?.email || !body?.password) {
      return NextResponse.json({ error: 'E-mel dan kata laluan diperlukan' }, { status: 400 })
    }

    let staff
    try {
      staff = await db.staff.findUnique({
        where: { email: body.email.toLowerCase() },
        include: { department: true },
      })
    } catch (dbErr: any) {
      console.error('DB error in login:', dbErr)
      return NextResponse.json({
        error: 'Pangkalan data tidak dapat diakses',
        detail: dbErr?.message?.slice(0, 150),
        hint: 'Sila semak /api/health untuk status pangkalan data',
      }, { status: 500 })
    }

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

    try {
      await setSession(session)
    } catch (cookieErr: any) {
      console.error('Cookie error in login:', cookieErr)
      // Continue anyway — return user, frontend will handle
    }

    try {
      await db.auditLog.create({ data: { actorId: staff.id, action: 'LOG_MASUK', detail: 'Log masuk' } })
    } catch {
      // Audit log failure shouldn't block login
    }

    return NextResponse.json({ user: session })
  } catch (err: any) {
    console.error('Login unexpected error:', err)
    return NextResponse.json({
      error: 'Ralat tidak dijangka semasa log masuk',
      detail: err?.message?.slice(0, 150),
    }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    await clearSession()
  } catch {}
  return NextResponse.json({ ok: true })
}

export async function GET() {
  try {
    const { getSession } = await import('@/lib/auth')
    const session = await getSession()
    if (!session) return NextResponse.json({ user: null }, { status: 401 })
    return NextResponse.json({ user: session })
  } catch (err: any) {
    return NextResponse.json({ user: null, error: err?.message?.slice(0, 100) }, { status: 401 })
  }
}
