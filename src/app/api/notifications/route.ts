import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Tidak log masuk' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const unreadOnly = searchParams.get('unreadOnly') === 'true'
  const notifs = await db.notification.findMany({
    where: { staffId: session.id, ...(unreadOnly ? { read: false } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  const unreadCount = await db.notification.count({ where: { staffId: session.id, read: false } })
  return NextResponse.json({ notifications: notifs, unreadCount })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Tidak log masuk' }, { status: 401 })
  const body = await req.json()
  if (body.action === 'MARK_READ') {
    if (body.id) {
      await db.notification.update({ where: { id: body.id }, data: { read: true } })
    } else {
      await db.notification.updateMany({ where: { staffId: session.id, read: false }, data: { read: true } })
    }
    return NextResponse.json({ ok: true })
  }
  return NextResponse.json({ error: 'Tindakan tidak diketahui' }, { status: 400 })
}
