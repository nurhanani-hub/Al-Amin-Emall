import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// GET - senarai permohonan cuti + baki cuti
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Tidak log masuk' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const scope = searchParams.get('scope') ?? 'self'
  const staffId = searchParams.get('staffId') ?? session.id

  let whereStaffId: string[] = [session.id]
  if (scope === 'team' && ['SUPERVISOR', 'HR', 'ADMIN', 'EXEC'].includes(session.roleCode)) {
    const subs = await db.staff.findMany({ where: { supervisorId: session.id }, select: { id: true } })
    whereStaffId = subs.map(s => s.id)
  } else if (scope === 'all' && ['HR', 'ADMIN'].includes(session.roleCode)) {
    const all = await db.staff.findMany({ select: { id: true } })
    whereStaffId = all.map(s => s.id)
  } else if (scope === 'self') {
    whereStaffId = [staffId]
  }

  const leaves = await db.leave.findMany({
    where: { staffId: { in: whereStaffId } },
    include: { staff: { select: { id: true, name: true, position: true, department: { select: { name: true } } } }, approver: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  // Baki cuti pengguna semasa
  const year = new Date().getFullYear()
  const balances = await db.leaveBalance.findMany({ where: { staffId: session.id, year } })

  return NextResponse.json({ leaves, balances })
}

// POST - mohon cuti baru atau lulus/tolak
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Tidak log masuk' }, { status: 401 })
  const body = await req.json()

  if (body.action === 'APPLY') {
    const { type, startDate, endDate, days, reason } = body
    if (!type || !startDate || !endDate || !days) {
      return NextResponse.json({ error: 'Medan diperlukan tiada' }, { status: 400 })
    }
    const leave = await db.leave.create({
      data: {
        staffId: session.id,
        type,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        days: parseFloat(days),
        reason: reason ?? '',
        status: 'DIMOHON',
      },
    })
    await db.notification.create({
      data: {
        staffId: session.id,
        type: 'CUTI',
        title: 'Permohonan cuti dihantar',
        body: `Permohonan cuti ${type} (${parseFloat(days)} hari) telah dihantar`,
      },
    })
    return NextResponse.json({ leave })
  }

  if (body.action === 'APPROVE' || body.action === 'REJECT') {
    if (!['SUPERVISOR', 'HR', 'ADMIN'].includes(session.roleCode)) {
      return NextResponse.json({ error: 'Tiada kebenaran' }, { status: 403 })
    }
    const { leaveId } = body
    const status = body.action === 'APPROVE' ? 'LULUS' : 'DITOLAK'
    const leave = await db.leave.update({
      where: { id: leaveId },
      data: { status, approverId: session.id, approvedAt: new Date() },
    })
    // Kurangkan baki jika lulus
    if (status === 'LULUS') {
      const year = new Date(leave.startDate).getFullYear()
      const bal = await db.leaveBalance.findFirst({ where: { staffId: leave.staffId, type: leave.type, year } })
      if (bal) {
        await db.leaveBalance.update({ where: { id: bal.id }, data: { balance: Math.max(0, bal.balance - leave.days) } })
      }
    }
    await db.notification.create({
      data: {
        staffId: leave.staffId,
        type: 'CUTI',
        title: status === 'LULUS' ? 'Permohonan cuti diluluskan' : 'Permohonan cuti ditolak',
        body: `Permohonan cuti ${leave.type} telah ${status === 'LULUS' ? 'diluluskan' : 'ditolak'} oleh ${session.name}`,
      },
    })
    await db.auditLog.create({ data: { actorId: session.id, action: status === 'LULUS' ? 'LULUS_CUTI' : 'TOLAK_CUTI', detail: `Cuti ID ${leave.id}` } })
    return NextResponse.json({ leave })
  }

  return NextResponse.json({ error: 'Tindakan tidak diketahui' }, { status: 400 })
}
