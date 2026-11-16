import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

const QUOTA_BYTES = 10 * 1024 * 1024 * 1024 // 10 GB (simulated)

// GET - senarai dokumen + penggunaan kuota
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Tidak log masuk' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const scope = searchParams.get('scope') ?? 'mine'
  const type = searchParams.get('type')
  const tag = searchParams.get('tag')
  const search = searchParams.get('search')

  const where: any = {}
  if (scope === 'mine') {
    where.AND = [
      { uploaderId: session.id },
    ]
  } else if (scope === 'dept') {
    const me = await db.staff.findUnique({ where: { id: session.id }, select: { departmentId: true } })
    const deptStaff = await db.staff.findMany({ where: { departmentId: me?.departmentId }, select: { id: true } })
    where.uploaderId = { in: deptStaff.map(s => s.id) }
    where.accessLevel = { in: ['JABATAN', 'SYARIKAT'] }
  } else if (scope === 'company') {
    where.accessLevel = 'SYARIKAT'
  } else if (scope === 'all' && ['HR', 'ADMIN'].includes(session.roleCode)) {
    // all
  } else {
    where.OR = [
      { uploaderId: session.id },
      { accessLevel: 'SYARIKAT' },
    ]
  }
  if (type) where.type = type
  if (tag) where.tags = { contains: tag }
  if (search) where.title = { contains: search }

  const docs = await db.document.findMany({
    where,
    include: {
      uploader: { select: { id: true, name: true, position: true, department: { select: { name: true } } } },
      event: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  // Penggunaan kuota sendiri
  const myDocs = await db.document.aggregate({ where: { uploaderId: session.id }, _sum: { fileSize: true } })
  const usedBytes = myDocs._sum.fileSize ?? 0
  const quota = { usedBytes, totalBytes: QUOTA_BYTES, percent: Math.round((usedBytes / QUOTA_BYTES) * 100) }

  return NextResponse.json({
    documents: docs.map(d => ({ ...d, tags: d.tags, sizeLabel: formatBytes(d.fileSize) })),
    quota,
  })
}

// POST - muat naik dokumen
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Tidak log masuk' }, { status: 401 })
  const body = await req.json()
  const { title, type, fileName, fileSize, mimeType, dataUrl, tags, accessLevel, eventId } = body
  if (!title || !type || !fileName) return NextResponse.json({ error: 'Medan diperlukan tiada' }, { status: 400 })
  // Semak kuota (simulated, allow large file size claim)
  const myDocs = await db.document.aggregate({ where: { uploaderId: session.id }, _sum: { fileSize: true } })
  const usedBytes = myDocs._sum.fileSize ?? 0
  if (usedBytes + (fileSize ?? 0) > QUOTA_BYTES) {
    return NextResponse.json({ error: 'Kuota storan 10 GB telah penuh' }, { status: 400 })
  }
  const doc = await db.document.create({
    data: {
      title,
      type,
      fileName,
      fileSize: fileSize ?? 0,
      mimeType,
      dataUrl: dataUrl ?? null,
      tags: JSON.stringify(tags ?? []),
      accessLevel: accessLevel ?? 'PERIBADI',
      uploaderId: session.id,
      eventId: eventId ?? null,
    },
  })
  await db.auditLog.create({ data: { actorId: session.id, action: 'MUAT_NAIK_DOKUMEN', detail: `Dokumen ${title} (${fileName})` } })
  return NextResponse.json({ document: doc })
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Tidak log masuk' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 })
  const doc = await db.document.findUnique({ where: { id } })
  if (!doc) return NextResponse.json({ error: 'Dokumen tidak dijumpai' }, { status: 404 })
  if (doc.uploaderId !== session.id && !['HR', 'ADMIN'].includes(session.roleCode)) {
    return NextResponse.json({ error: 'Tiada kebenaran' }, { status: 403 })
  }
  await db.document.delete({ where: { id } })
  await db.auditLog.create({ data: { actorId: session.id, action: 'PADAM_DOKUMEN', detail: `Dokumen ${doc.title}` } })
  return NextResponse.json({ ok: true })
}

function formatBytes(bytes: number) {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}
