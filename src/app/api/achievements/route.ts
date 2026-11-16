import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// GET - pencapaian (sendiri / pasukan / semua) + KPI (sulit, akses terhad)
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Tidak log masuk' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const staffId = searchParams.get('staffId') ?? session.id
  const scope = searchParams.get('scope') ?? 'self'

  // Hak akses pencapaian
  let targetStaffIds: string[] = [session.id]
  const canSeeOthers = ['HR', 'ADMIN', 'SUPERVISOR', 'EXEC'].includes(session.roleCode)
  if (scope === 'team' && canSeeOthers) {
    const subs = await db.staff.findMany({ where: { supervisorId: session.id }, select: { id: true } })
    targetStaffIds = [session.id, ...subs.map(s => s.id)]
  } else if (scope === 'all' && ['HR', 'ADMIN'].includes(session.roleCode)) {
    targetStaffIds = []
    // all staff
  } else if (scope === 'wall') {
    // Dinding pengiktirafan: kumpul pencapaian semua untuk paparan publik (tanpa skor peribadi)
    targetStaffIds = []
  }

  const achievements = await db.achievement.findMany({
    where: targetStaffIds.length ? { staffId: { in: targetStaffIds } } : {},
    include: {
      staff: { select: { id: true, name: true, position: true, avatarUrl: true, department: { select: { name: true } } } },
      giver: { select: { id: true, name: true } },
    },
    orderBy: { date: 'desc' },
    take: scope === 'wall' ? 50 : 100,
  })

  // KPI SULIT: hanya staf sendiri, penyelia langsung, atau HR
  let kpis: any[] = []
  let canViewKpi = false
  if (staffId === session.id) {
    canViewKpi = true
  } else if (['HR', 'ADMIN'].includes(session.roleCode)) {
    canViewKpi = true
  } else if (session.roleCode === 'SUPERVISOR') {
    const sub = await db.staff.findFirst({ where: { id: staffId, supervisorId: session.id } })
    canViewKpi = !!sub
  }
  if (canViewKpi) {
    kpis = await db.kpi.findMany({
      where: { staffId },
      include: { assessor: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    })
  }

  // Mata & lencana sendiri (FR-704)
  const myAch = await db.achievement.findMany({ where: { staffId: session.id } })
  const totalPoints = myAch.reduce((s, a) => s + a.points, 0)
  const badges = new Set(myAch.filter(a => a.badge).map(a => a.badge))

  // Baki cuti untuk konteks
  return NextResponse.json({
    achievements,
    kpis: canViewKpi ? kpis : [],
    canViewKpi,
    myStats: { totalPoints, badgeCount: badges.size, achievementCount: myAch.length },
  })
}

// POST - beri pencapaian / pujian
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Tidak log masuk' }, { status: 401 })
  const body = await req.json()
  const { action } = body

  if (action === 'GIVE') {
    if (!['HR', 'ADMIN', 'SUPERVISOR', 'EXEC'].includes(session.roleCode)) {
      return NextResponse.json({ error: 'Tiada kebenaran' }, { status: 403 })
    }
    const { staffId, title, category, points, badge, note } = body
    if (!staffId || !title || !category) return NextResponse.json({ error: 'Medan diperlukan tiada' }, { status: 400 })
    const ach = await db.achievement.create({
      data: {
        staffId,
        title,
        category,
        date: new Date(),
        giverId: session.id,
        points: points ?? 10,
        badge,
        note,
      },
    })
    await db.notification.create({
      data: { staffId, type: 'PENCAPAIAN', title: 'Pencapaian baharu diterima', body: `Anda menerima: ${title}`, link: 'achievements' },
    })
    return NextResponse.json({ achievement: ach })
  }

  if (action === 'PRAISE') {
    // Pujian sesama rakan (FR-702)
    const { staffId, message } = body
    if (!staffId || !message) return NextResponse.json({ error: 'Medan diperlukan tiada' }, { status: 400 })
    const ach = await db.achievement.create({
      data: {
        staffId,
        title: `Pujian dari ${session.name}`,
        category: 'ANUGERAH',
        date: new Date(),
        giverId: session.id,
        points: 5,
        badge: 'lencana-pujian',
        note: message,
      },
    })
    await db.notification.create({
      data: { staffId, type: 'PENCAPAIAN', title: 'Anda menerima pujian', body: message, link: 'achievements' },
    })
    return NextResponse.json({ achievement: ach })
  }

  return NextResponse.json({ error: 'Tindakan tidak diketahui' }, { status: 400 })
}
