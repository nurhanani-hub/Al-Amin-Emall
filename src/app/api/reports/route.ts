import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// GET - data untuk laporan standard (FR-1101)
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Tidak log masuk' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const reportType = searchParams.get('type') ?? 'summary'
  const fromStr = searchParams.get('from')
  const toStr = searchParams.get('to')

  if (!['HR', 'ADMIN', 'SUPERVISOR', 'EXEC'].includes(session.roleCode) && reportType !== 'summary') {
    return NextResponse.json({ error: 'Tiada kebenaran laporan' }, { status: 403 })
  }

  const where: any = {}
  if (fromStr || toStr) {
    where.date = {}
    if (fromStr) where.date.gte = new Date(fromStr)
    if (toStr) where.date.lte = new Date(toStr)
  } else {
    // default 30 hari
    const d = new Date(); d.setDate(d.getDate() - 30)
    where.date = { gte: d }
  }

  // Skop staf: penyelia = pasukan, HR/admin = semua
  let staffScope: string[] = []
  if (session.roleCode === 'SUPERVISOR') {
    const subs = await db.staff.findMany({ where: { supervisorId: session.id }, select: { id: true } })
    staffScope = [session.id, ...subs.map(s => s.id)]
  } else if (['HR', 'ADMIN', 'EXEC'].includes(session.roleCode)) {
    const all = await db.staff.findMany({ where: { roleCode: { in: ['STAFF', 'SUPERVISOR', 'HR', 'EXEC'] } }, select: { id: true } })
    staffScope = all.map(s => s.id)
  } else {
    staffScope = [session.id]
  }

  if (reportType === 'attendance') {
    const records = await db.attendance.findMany({
      where: { ...where, staffId: { in: staffScope } },
      include: { staff: { select: { name: true, staffNo: true, position: true, department: { select: { name: true } } } } },
      orderBy: { date: 'desc' },
    })
    return NextResponse.json({ report: records, type: 'attendance' })
  }

  if (reportType === 'leave') {
    const leaves = await db.leave.findMany({
      where: { staffId: { in: staffScope } },
      include: { staff: { select: { name: true, staffNo: true, position: true, department: { select: { name: true } } } }, approver: { select: { name: true } } },
      orderBy: { startDate: 'desc' },
    })
    return NextResponse.json({ report: leaves, type: 'leave' })
  }

  if (reportType === 'tasks') {
    const tasks = await db.task.findMany({
      where: { OR: [{ assigneeId: { in: staffScope } }, { assignerId: { in: staffScope } }] },
      include: { assignee: { select: { name: true, position: true } }, assigner: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ report: tasks, type: 'tasks' })
  }

  if (reportType === 'training') {
    const regs = await db.courseRegistration.findMany({
      where: { staffId: { in: staffScope } },
      include: { course: true, staff: { select: { name: true, position: true, department: { select: { name: true } } } } },
      orderBy: { registeredAt: 'desc' },
    })
    return NextResponse.json({ report: regs, type: 'training' })
  }

  if (reportType === 'achievements') {
    const ach = await db.achievement.findMany({
      where: { staffId: { in: staffScope } },
      include: { staff: { select: { name: true, position: true } }, giver: { select: { name: true } } },
      orderBy: { date: 'desc' },
    })
    return NextResponse.json({ report: ach, type: 'achievements' })
  }

  // summary (default)
  const allStaff = await db.staff.count()
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const todaysAtt = await db.attendance.findMany({ where: { date: today, staffId: { in: staffScope } } })
  const pendingLeaves = await db.leave.count({ where: { status: 'DIMOHON', staffId: { in: staffScope } } })
  const pendingCourseRegs = await db.courseRegistration.count({ where: { status: 'DIMOHON', staffId: { in: staffScope } } })
  const tasksOpen = await db.task.count({ where: { status: { not: 'SELESAI' }, assigneeId: { in: staffScope } } })
  const tasksOverdue = await db.task.count({ where: { status: { not: 'SELESAI' }, dueDate: { lt: new Date() }, assigneeId: { in: staffScope } } })
  // Trend 7 hari
  const trend: { date: string; hadir: number; terlambat: number; cuti: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0)
    const recs = await db.attendance.findMany({ where: { date: d, staffId: { in: staffScope } } })
    trend.push({
      date: d.toISOString().slice(0, 10),
      hadir: recs.filter(r => r.status === 'HADIR').length,
      terlambat: recs.filter(r => r.status === 'TERLAMBAT').length,
      cuti: recs.filter(r => ['CUTI', 'CUTI_UMUM'].includes(r.status)).length,
    })
  }

  return NextResponse.json({
    summary: {
      allStaff,
      todayHadir: todaysAtt.filter(r => r.status === 'HADIR' || r.status === 'TERLAMBAT').length,
      todayTerlambat: todaysAtt.filter(r => r.status === 'TERLAMBAT').length,
      todayCuti: todaysAtt.filter(r => r.status === 'CUTI' || r.status === 'CUTI_UMUM').length,
      todayTidakHadir: todaysAtt.filter(r => r.status === 'TIDAK_HADIR').length,
      pendingLeaves,
      pendingCourseRegs,
      tasksOpen,
      tasksOverdue,
    },
    trend,
  })
}
