import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// GET - senarai perbualan pengguna
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Tidak log masuk' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const conversationId = searchParams.get('conversationId')

  if (conversationId) {
    // Ambil mesej perbualan
    const conv = await db.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: { include: { staff: { select: { id: true, name: true, position: true, avatarUrl: true, roleCode: true } } } },
        messages: {
          include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
          orderBy: { createdAt: 'asc' },
          take: 500,
        },
      },
    })
    if (!conv) return NextResponse.json({ error: 'Perbualan tidak dijumpai' }, { status: 404 })
    const isMember = conv.participants.some(p => p.staffId === session.id)
    if (!isMember && !['HR', 'ADMIN'].includes(session.roleCode)) {
      return NextResponse.json({ error: 'Tiada akses' }, { status: 403 })
    }
    // Tandakan dibaca
    const myPart = conv.participants.find(p => p.staffId === session.id)
    if (myPart) {
      await db.conversationParticipant.update({ where: { id: myPart.id }, data: { lastReadAt: new Date() } })
    }
    return NextResponse.json({ conversation: conv })
  }

  // Senarai perbualan pengguna
  const parts = await db.conversationParticipant.findMany({
    where: { staffId: session.id },
    include: {
      conversation: {
        include: {
          participants: { include: { staff: { select: { id: true, name: true, avatarUrl: true, position: true } } } },
          messages: { orderBy: { createdAt: 'desc' }, take: 1, include: { sender: { select: { id: true, name: true } } } },
        },
      },
    },
    orderBy: { conversation: { updatedAt: 'desc' } },
  })

  // Untuk setiap perbualan, kira mesej belum dibaca
  const result = []
  for (const p of parts) {
    const unread = await db.message.count({
      where: {
        conversationId: p.conversationId,
        senderId: { not: session.id },
        createdAt: { gt: p.lastReadAt ?? new Date(0) },
      },
    })
    result.push({
      id: p.conversation.id,
      type: p.conversation.type,
      name: p.conversation.name,
      avatarUrl: p.conversation.avatarUrl,
      isAdmin: p.isAdmin,
      muted: p.conversation.muted,
      participants: p.conversation.participants,
      lastMessage: p.conversation.messages[0] ?? null,
      unread,
    })
  }

  return NextResponse.json({ conversations: result })
}

// POST - hantar mesej / cipta perbualan / kumpulan
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Tidak log masuk' }, { status: 401 })
  const body = await req.json()
  const { action } = body

  if (action === 'SEND') {
    const { conversationId, content, attachments, replyToId } = body
    if (!conversationId || !content) return NextResponse.json({ error: 'Medan diperlukan tiada' }, { status: 400 })
    const part = await db.conversationParticipant.findFirst({ where: { conversationId, staffId: session.id } })
    if (!part && !['HR', 'ADMIN'].includes(session.roleCode)) {
      return NextResponse.json({ error: 'Tiada akses' }, { status: 403 })
    }
    const msg = await db.message.create({
      data: {
        conversationId,
        senderId: session.id,
        content,
        attachments: JSON.stringify(attachments ?? []),
        replyToId,
      },
    })
    await db.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } })
    return NextResponse.json({ message: msg })
  }

  if (action === 'CREATE_GROUP') {
    const { name, memberIds, type } = body
    if (!name || !memberIds?.length) return NextResponse.json({ error: 'Medan diperlukan tiada' }, { status: 400 })
    const all = [...new Set([session.id, ...memberIds])]
    const conv = await db.conversation.create({
      data: {
        type: type ?? 'KUMPULAN',
        name,
        participants: {
          create: all.map(id => ({ staffId: id, isAdmin: id === session.id })),
        },
      },
    })
    return NextResponse.json({ conversation: conv })
  }

  if (action === 'CREATE_DIRECT') {
    const { targetStaffId } = body
    // Cari perbualan sedia ada
    const existing = await db.conversation.findFirst({
      where: {
        type: 'TERUS',
        AND: [
          { participants: { some: { staffId: session.id } } },
          { participants: { some: { staffId: targetStaffId } } },
        ],
      },
    })
    if (existing) return NextResponse.json({ conversation: existing })
    const conv = await db.conversation.create({
      data: {
        type: 'TERUS',
        participants: {
          create: [{ staffId: session.id }, { staffId: targetStaffId }],
        },
      },
    })
    return NextResponse.json({ conversation: conv })
  }

  if (action === 'ANNOUNCEMENT') {
    if (!['HR', 'ADMIN', 'EXEC'].includes(session.roleCode)) {
      return NextResponse.json({ error: 'Tiada kebenaran' }, { status: 403 })
    }
    const { content } = body
    // Hantar ke kumpulan PENGUMUMAN pertama
    const annConv = await db.conversation.findFirst({ where: { type: 'PENGUMUMAN' } })
    if (!annConv) return NextResponse.json({ error: 'Tiada saluran pengumuman' }, { status: 404 })
    const msg = await db.message.create({
      data: { conversationId: annConv.id, senderId: session.id, content, attachments: '[]', pinned: true },
    })
    await db.conversation.update({ where: { id: annConv.id }, data: { updatedAt: new Date() } })
    return NextResponse.json({ message: msg })
  }

  return NextResponse.json({ error: 'Tindakan tidak diketahui' }, { status: 400 })
}
