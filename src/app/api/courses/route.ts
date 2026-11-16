import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// GET - katalog kursus + pendaftaran saya
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Tidak log masuk' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const scope = searchParams.get('scope') ?? 'catalog'
  const category = searchParams.get('category')

  if (scope === 'mine') {
    const regs = await db.courseRegistration.findMany({
      where: { staffId: session.id },
      include: { course: true },
      orderBy: { registeredAt: 'desc' },
    })
    return NextResponse.json({ registrations: regs })
  }

  if (scope === 'all_regs' && ['HR', 'ADMIN'].includes(session.roleCode)) {
    const regs = await db.courseRegistration.findMany({
      include: { course: true, staff: { select: { id: true, name: true, position: true, department: { select: { name: true } } } } },
      orderBy: { registeredAt: 'desc' },
    })
    return NextResponse.json({ registrations: regs })
  }

  const where: any = {}
  if (category) where.category = category
  const courses = await db.course.findMany({
    where,
    orderBy: { startDate: 'asc' },
    include: { _count: { select: { registrations: true } } },
  })

  // Untuk setiap kursus, tandakan jika pengguna sudah berdaftar
  const myRegs = await db.courseRegistration.findMany({ where: { staffId: session.id }, select: { courseId: true, status: true } })
  const myRegMap = new Map(myRegs.map(r => [r.courseId, r.status]))

  return NextResponse.json({
    courses: courses.map(c => ({
      ...c,
      skillsJson: c.skillsJson,
      targetRoles: c.targetRoles,
      registered: myRegMap.get(c.id) ?? null,
      regCount: c._count.registrations,
    })),
  })
}

// POST - daftar / lulus / rekod kehadiran & markah
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Tidak log masuk' }, { status: 401 })
  const body = await req.json()

  if (body.action === 'REGISTER') {
    const { courseId } = body
    const existing = await db.courseRegistration.findFirst({ where: { courseId, staffId: session.id } })
    if (existing) return NextResponse.json({ error: 'Anda sudah berdaftar untuk kursus ini' }, { status: 400 })
    const course = await db.course.findUnique({ where: { id: courseId } })
    if (!course) return NextResponse.json({ error: 'Kursus tidak dijumpai' }, { status: 404 })
    const count = await db.courseRegistration.count({ where: { courseId, status: { in: ['DIMOHON', 'LULUS'] } } })
    if (count >= course.quota) return NextResponse.json({ error: 'Kuota kursus penuh' }, { status: 400 })
    const reg = await db.courseRegistration.create({
      data: { courseId, staffId: session.id, status: 'DIMOHON' },
    })
    // notify supervisor
    const me = await db.staff.findUnique({ where: { id: session.id }, select: { supervisorId: true, name: true } })
    if (me?.supervisorId) {
      await db.notification.create({
        data: { staffId: me.supervisorId, type: 'KURSUS', title: 'Pendaftaran kursus menunggu kelulusan', body: `${me.name} mendaftar kursus ${course.title}`, link: 'training' },
      })
    }
    return NextResponse.json({ registration: reg })
  }

  if (body.action === 'APPROVE' || body.action === 'REJECT') {
    if (!['SUPERVISOR', 'HR', 'ADMIN'].includes(session.roleCode)) {
      return NextResponse.json({ error: 'Tiada kebenaran' }, { status: 403 })
    }
    const { registrationId } = body
    const status = body.action === 'APPROVE' ? 'LULUS' : 'DITOLAK'
    const reg = await db.courseRegistration.update({
      where: { id: registrationId },
      data: { status, approvedAt: new Date() },
    })
    await db.notification.create({
      data: { staffId: reg.staffId, type: 'KURSUS', title: `Pendaftaran kursus ${status === 'LULUS' ? 'diluluskan' : 'ditolak'}`, link: 'training' },
    })
    return NextResponse.json({ registration: reg })
  }

  if (body.action === 'RECORD_RESULT') {
    if (!['HR', 'ADMIN', 'SUPERVISOR'].includes(session.roleCode)) {
      return NextResponse.json({ error: 'Tiada kebenaran' }, { status: 403 })
    }
    const { registrationId, attended, score, pass, feedback } = body
    const reg = await db.courseRegistration.update({
      where: { id: registrationId },
      data: { attended, score: score ? parseFloat(score) : null, pass, feedback },
    })
    return NextResponse.json({ registration: reg })
  }

  return NextResponse.json({ error: 'Tindakan tidak diketahui' }, { status: 400 })
}
