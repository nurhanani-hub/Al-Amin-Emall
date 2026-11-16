import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// GET - senarai tugas (sendiri / pasukan / semua)
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Tidak log masuk' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const scope = searchParams.get('scope') ?? 'self'
  const status = searchParams.get('status')

  let where: any = {}
  if (scope === 'self') {
    where = { OR: [{ assigneeId: session.id }, { assignerId: session.id }] }
  } else if (scope === 'team' && ['SUPERVISOR', 'HR', 'ADMIN'].includes(session.roleCode)) {
    const subs = await db.staff.findMany({ where: { supervisorId: session.id }, select: { id: true } })
    where = { assigneeId: { in: [session.id, ...subs.map(s => s.id)] } }
  } else if (scope === 'all' && ['HR', 'ADMIN'].includes(session.roleCode)) {
    where = {}
  } else {
    where = { OR: [{ assigneeId: session.id }, { assignerId: session.id }] }
  }
  if (status) where.status = status

  const tasks = await db.task.findMany({
    where,
    include: {
      assignee: { select: { id: true, name: true, position: true } },
      assigner: { select: { id: true, name: true, position: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  // Kira tugasan tertunggak (lewat atau hampir tarikh akhir)
  const now = Date.now()
  const overdue = tasks.filter(t => t.status !== 'SELESAI' && new Date(t.dueDate).getTime() < now)
  const dueSoon = tasks.filter(t => {
    if (t.status === 'SELESAI') return false
    const d = new Date(t.dueDate).getTime() - now
    return d >= 0 && d <= 3 * 24 * 3600 * 1000
  })

  return NextResponse.json({ tasks, overdue, dueSoon })
}

// POST - cipta tugasan / kemas kini status / kemajuan / komen / lampiran
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Tidak log masuk' }, { status: 401 })
  const body = await req.json()

  if (body.action === 'CREATE') {
    if (!['SUPERVISOR', 'HR', 'ADMIN', 'EXEC'].includes(session.roleCode)) {
      return NextResponse.json({ error: 'Hanya penyelia/HR boleh cipta tugasan' }, { status: 403 })
    }
    const { title, description, assigneeId, priority, dueDate } = body
    if (!title || !assigneeId || !dueDate) return NextResponse.json({ error: 'Medan diperlukan tiada' }, { status: 400 })
    const task = await db.task.create({
      data: {
        title,
        description: description ?? '',
        assigneeId,
        assignerId: session.id,
        priority: priority ?? 'SEDERHANA',
        status: 'BELUM_MULA',
        progress: 0,
        dueDate: new Date(dueDate),
      },
    })
    await db.notification.create({
      data: { staffId: assigneeId, type: 'TUGASAN', title: 'Tugasan baharu', body: `Anda diperuntukkan: ${title}`, link: 'tasks' },
    })
    return NextResponse.json({ task })
  }

  if (body.action === 'UPDATE') {
    const { taskId, status, progress, comments, attachments } = body
    const task = await db.task.findUnique({ where: { id: taskId } })
    if (!task) return NextResponse.json({ error: 'Tugasan tidak dijumpai' }, { status: 404 })
    if (task.assigneeId !== session.id && !['HR', 'ADMIN', 'SUPERVISOR'].includes(session.roleCode)) {
      return NextResponse.json({ error: 'Tiada kebenaran' }, { status: 403 })
    }
    const data: any = {}
    if (status) {
      data.status = status
      if (status === 'SELESAI') { data.progress = 100; data.completedAt = new Date() }
    }
    if (typeof progress === 'number') {
      data.progress = Math.max(0, Math.min(100, progress))
      if (data.progress === 100) { data.status = 'SELESAI'; data.completedAt = new Date() }
    }
    if (comments) data.comments = JSON.stringify(comments)
    if (attachments) data.attachments = JSON.stringify(attachments)
    const updated = await db.task.update({ where: { id: taskId }, data })
    return NextResponse.json({ task: updated })
  }

  if (body.action === 'COMMENT') {
    const { taskId, text } = body
    const task = await db.task.findUnique({ where: { id: taskId } })
    if (!task) return NextResponse.json({ error: 'Tugasan tidak dijumpai' }, { status: 404 })
    const list = JSON.parse(task.comments || '[]')
    list.push({ author: session.name, authorId: session.id, text, at: new Date().toISOString() })
    const updated = await db.task.update({ where: { id: taskId }, data: { comments: JSON.stringify(list) } })
    return NextResponse.json({ task: updated })
  }

  return NextResponse.json({ error: 'Tindakan tidak diketahui' }, { status: 400 })
}

// PATCH - tukar status (untuk drag-drop kanban)
export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Tidak log masuk' }, { status: 401 })
  const body = await req.json()
  const { taskId, status } = body
  const task = await db.task.findUnique({ where: { id: taskId } })
  if (!task) return NextResponse.json({ error: 'Tugasan tidak dijumpai' }, { status: 404 })
  if (task.assigneeId !== session.id && !['HR', 'ADMIN', 'SUPERVISOR'].includes(session.roleCode)) {
    return NextResponse.json({ error: 'Tiada kebenaran' }, { status: 403 })
  }
  const data: any = { status }
  if (status === 'SELESAI') { data.progress = 100; data.completedAt = new Date() }
  else if (status === 'DALAM_PROSES' && task.progress === 0) data.progress = 10
  const updated = await db.task.update({ where: { id: taskId }, data })
  return NextResponse.json({ task: updated })
}
