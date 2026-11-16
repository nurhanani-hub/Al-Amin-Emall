import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// GET - acara kalendar + cuti umum
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Tidak log masuk' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const fromStr = searchParams.get('from')
  const toStr = searchParams.get('to')

  const where: any = {}
  if (fromStr || toStr) {
    where.OR = []
    if (fromStr && toStr) {
      where.OR.push({ start: { lte: new Date(toStr) }, end: { gte: new Date(fromStr) } })
    }
  }

  const events = await db.calendarEvent.findMany({
    where,
    include: {
      organizer: { select: { id: true, name: true } },
      participants: { include: { staff: { select: { id: true, name: true } } } },
    },
    orderBy: { start: 'asc' },
    take: 300,
  })

  // Tugas dengan dueDate -> sebagai acara TUGAS
  const tasks = await db.task.findMany({
    where: { OR: [{ assigneeId: session.id }, { assignerId: session.id }] },
    select: { id: true, title: true, dueDate: true, status: true },
  })

  const holidays = await db.publicHoliday.findMany()

  // Cuti sendiri
  const myLeaves = await db.leave.findMany({
    where: { staffId: session.id, status: 'LULUS' },
    select: { id: true, type: true, startDate: true, endDate: true },
  })

  return NextResponse.json({
    events: events.map(e => ({
      id: e.id,
      title: e.title,
      type: e.type,
      start: e.start,
      end: e.end,
      location: e.location,
      link: e.link,
      agenda: e.agenda,
      organizer: e.organizer,
      participants: e.participants.map(p => p.staff),
    })),
    taskEvents: tasks.map(t => ({ id: `task-${t.id}`, title: `📦 ${t.title}`, start: t.dueDate, end: t.dueDate, type: 'TUGAS', status: t.status })),
    holidays: holidays.map(h => ({ id: `hol-${h.id}`, title: h.name, start: h.date, end: h.date, type: 'CUTI_UMUM', holidayType: h.type })),
    leaves: myLeaves.map(l => ({ id: `leave-${l.id}`, title: `Cuti ${l.type}`, start: l.startDate, end: l.endDate, type: 'CUTI' })),
  })
}

// POST - cipta mesyuarat / acara
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Tidak log masuk' }, { status: 401 })
  const body = await req.json()
  const { title, type, start, end, location, link, agenda, participantIds } = body
  if (!title || !start || !end) return NextResponse.json({ error: 'Medan diperlukan tiada' }, { status: 400 })
  const ev = await db.calendarEvent.create({
    data: {
      title,
      type: type ?? 'MESYUARAT',
      start: new Date(start),
      end: new Date(end),
      location,
      link,
      agenda,
      organizerId: session.id,
      participants: {
        create: (participantIds ?? []).map((id: string) => ({ staffId: id })),
      },
    },
  })
  // Notify participants
  for (const pid of (participantIds ?? [])) {
    await db.notification.create({
      data: { staffId: pid, type: 'KALENDAR', title: 'Jemputan mesyuarat', body: `Anda dijemput: ${title}`, link: 'calendar' },
    })
  }
  return NextResponse.json({ event: ev })
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Tidak log masuk' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 })
  await db.calendarEvent.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
