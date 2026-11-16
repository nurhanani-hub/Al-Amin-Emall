import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { db } from '@/lib/db'
import { getSession, verifyPassword } from '@/lib/auth'

// GET /api/staff - senarai staf dengan filter (untuk direktori, penerima tugas, dll)
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Tidak log masuk' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const departmentId = searchParams.get('departmentId')
  const roleCode = searchParams.get('roleCode')
  const search = searchParams.get('search')

  const staff = await db.staff.findMany({
    where: {
      ...(departmentId ? { departmentId } : {}),
      ...(roleCode ? { roleCode } : {}),
      ...(search ? {
        OR: [
          { name: { contains: search } },
          { email: { contains: search } },
          { position: { contains: search } },
          { staffNo: { contains: search } },
        ]
      } : {}),
    },
    include: {
      department: true,
      supervisor: { select: { id: true, name: true, position: true } },
      subordinates: { select: { id: true, name: true, position: true } },
    },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json({
    staff: staff.map(s => ({
      id: s.id,
      staffNo: s.staffNo,
      name: s.name,
      email: s.email,
      roleCode: s.roleCode,
      department: s.department,
      position: s.position,
      phone: s.phone,
      avatarUrl: s.avatarUrl,
      joinDate: s.joinDate,
      status: s.status,
      supervisor: s.supervisor,
      subordinates: s.subordinates,
      skillsJson: s.skillsJson,
    })),
  })
}

// PATCH /api/staff - kemas kini profil sendiri
export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Tidak log masuk' }, { status: 401 })
  const body = await req.json()
  const allowed = ['phone', 'avatarUrl', 'emergencyName', 'emergencyPhone', 'careerGoal', 'skillsJson']
  const data: Record<string, unknown> = {}
  for (const k of allowed) if (k in body) data[k] = body[k]
  const updated = await db.staff.update({ where: { id: session.id }, data })
  return NextResponse.json({ staff: updated })
}

// PUT /api/staff - tukar kata laluan
export async function PUT(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Tidak log masuk' }, { status: 401 })
  const body = await req.json()
  if (!body.newPassword || body.newPassword.length < 6) {
    return NextResponse.json({ error: 'Kata laluan baru sekurang-kurangnya 6 aksara' }, { status: 400 })
  }
  const me = await db.staff.findUnique({ where: { id: session.id } })
  if (!me) return NextResponse.json({ error: 'Pengguna tidak dijumpai' }, { status: 404 })
  if (body.currentPassword && !verifyPassword(body.currentPassword, me.password)) {
    return NextResponse.json({ error: 'Kata laluan semasa salah' }, { status: 400 })
  }
  const hash = 'sim$' + createHash('sha256').update(body.newPassword).digest('hex').slice(0, 24)
  await db.staff.update({ where: { id: session.id }, data: { password: hash } })
  await db.auditLog.create({ data: { actorId: session.id, action: 'TUKAR_KATA_LALUAN', detail: 'Penukaran kata laluan sendiri' } })
  return NextResponse.json({ ok: true })
}
