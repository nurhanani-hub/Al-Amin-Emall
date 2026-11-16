import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// GET - rekod kehadiran + statistik untuk pengguna / pasukan
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Tidak log masuk' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const staffId = searchParams.get('staffId') ?? session.id
  const fromStr = searchParams.get('from')
  const toStr = searchParams.get('to')
  const scope = searchParams.get('scope') ?? 'self' // self | team | dept | all

  // Hak akses: staf hanya diri sendiri; penyelia lihat pasukan; HR/admin semua
  const canSeeOthers = ['HR', 'ADMIN', 'SUPERVISOR', 'EXEC'].includes(session.roleCode)
  let targetStaffIds: string[] = [session.id]
  if (scope !== 'self' && canSeeOthers) {
    if (scope === 'team') {
      const subs = await db.staff.findMany({ where: { supervisorId: session.id }, select: { id: true } })
      targetStaffIds = subs.map(s => s.id)
    } else if (scope === 'dept') {
      const deptStaff = await db.staff.findMany({ where: { departmentId: session.departmentId }, select: { id: true } })
      targetStaffIds = deptStaff.map(s => s.id)
    } else {
      const all = await db.staff.findMany({ where: { roleCode: { in: ['STAFF', 'SUPERVISOR', 'HR', 'EXEC'] } }, select: { id: true } })
      targetStaffIds = all.map(s => s.id)
    }
  }

  const where: any = { staffId: { in: targetStaffIds } }
  if (fromStr || toStr) {
    where.date = {}
    if (fromStr) where.date.gte = new Date(fromStr)
    if (toStr) where.date.lte = new Date(toStr)
  }

  const records = await db.attendance.findMany({
    where,
    include: { staff: { select: { id: true, name: true, staffNo: true, position: true, department: { select: { name: true } } } } },
    orderBy: { date: 'desc' },
    take: 500,
  })

  // Statistik ringkas
  const stats = {
    total: records.length,
    hadir: records.filter(r => r.status === 'HADIR').length,
    terlambat: records.filter(r => r.status === 'TERLAMBAT').length,
    cuti: records.filter(r => ['CUTI', 'CUTI_UMUM'].includes(r.status)).length,
    tidakHadir: records.filter(r => r.status === 'TIDAK_HADIR').length,
    totalWorkMins: records.reduce((sum, r) => sum + (r.workMins || 0), 0),
    totalOvertimeMins: records.reduce((sum, r) => sum + (r.overtimeMins || 0), 0),
    totalLateMins: records.reduce((sum, r) => sum + (r.lateMins || 0), 0),
  }

  // Status hari ini untuk pengguna semasa
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const todayRec = await db.attendance.findFirst({ where: { staffId: session.id, date: today } })

  return NextResponse.json({ records, stats, todayRec })
}

// POST - Clock In / Clock Out / Manual adjust
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Tidak log masuk' }, { status: 401 })
  const body = await req.json()
  const action: 'CLOCK_IN' | 'CLOCK_OUT' | 'ADJUST' = body.action
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const now = new Date()

  if (action === 'CLOCK_IN') {
    let rec = await db.attendance.findFirst({ where: { staffId: session.id, date: today } })
    if (rec?.clockIn) return NextResponse.json({ error: 'Anda sudah masuk hari ini' }, { status: 400 })
    const lateMins = now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 5)
      ? Math.max(0, (now.getHours() - 9) * 60 + (now.getMinutes() - 0))
      : 0
    rec = await db.attendance.upsert({
      where: { id: rec?.id ?? '__new__' },
      update: { clockIn: now, status: lateMins > 0 ? 'TERLAMBAT' : 'HADIR', lateMins, location: body.location ?? 'Pejabat Al-Amin Emall, Shah Alam' },
      create: { staffId: session.id, date: today, clockIn: now, status: lateMins > 0 ? 'TERLAMBAT' : 'HADIR', lateMins, location: body.location ?? 'Pejabat Al-Amin Emall, Shah Alam' },
    })
    return NextResponse.json({ attendance: rec })
  }

  if (action === 'CLOCK_OUT') {
    let rec = await db.attendance.findFirst({ where: { staffId: session.id, date: today } })
    if (!rec?.clockIn) return NextResponse.json({ error: 'Sila Masuk (Clock In) dahulu' }, { status: 400 })
    if (rec.clockOut) return NextResponse.json({ error: 'Anda sudah Keluar hari ini' }, { status: 400 })
    const workMins = Math.max(0, Math.round((now.getTime() - rec.clockIn.getTime()) / 60000) - (rec.breakMins || 60))
    const overtimeMins = now.getHours() >= 18 ? Math.max(0, (now.getHours() - 18) * 60 + now.getMinutes()) : 0
    const earlyMins = now.getHours() < 17 ? Math.max(0, (17 - now.getHours()) * 60 - now.getMinutes()) : 0
    rec = await db.attendance.update({ where: { id: rec.id }, data: { clockOut: now, workMins, overtimeMins, earlyMins } })
    return NextResponse.json({ attendance: rec })
  }

  if (action === 'ADJUST') {
    // HR/Penyelia pelarasan manual
    if (!['HR', 'ADMIN', 'SUPERVISOR'].includes(session.roleCode)) {
      return NextResponse.json({ error: 'Tiada kebenaran' }, { status: 403 })
    }
    const { staffId, date, status, note } = body
    const d = new Date(date); d.setHours(0, 0, 0, 0)
    let rec = await db.attendance.findFirst({ where: { staffId, date: d } })
    if (rec) {
      rec = await db.attendance.update({ where: { id: rec.id }, data: { status, note } })
    } else {
      rec = await db.attendance.create({ data: { staffId, date: d, status, note } })
    }
    return NextResponse.json({ attendance: rec })
  }

  return NextResponse.json({ error: 'Tindakan tidak diketahui' }, { status: 400 })
}
