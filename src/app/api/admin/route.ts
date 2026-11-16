import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// GET - data induk (jabatan, jawatan, jenis cuti, kategori kursus, cuti umum, direktori, audit log, tetapan)
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Tidak log masuk' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const scope = searchParams.get('scope') ?? 'master'

  if (scope === 'audit') {
    if (!['HR', 'ADMIN'].includes(session.roleCode)) {
      return NextResponse.json({ error: 'Tiada kebenaran' }, { status: 403 })
    }
    const logs = await db.auditLog.findMany({
      include: { actor: { select: { name: true, staffNo: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return NextResponse.json({ logs })
  }

  if (scope === 'settings') {
    const settings = await db.setting.findMany()
    return NextResponse.json({ settings: settings.reduce((a: any, s) => { a[s.key] = s.value; return a }, {}) })
  }

  // master + directory
  const departments = await db.department.findMany({ include: { head: { select: { id: true, name: true, position: true } }, _count: { select: { staff: true } } } })
  const holidays = await db.publicHoliday.findMany({ orderBy: { date: 'asc' } })
  const staffDirectory = await db.staff.findMany({
    include: { department: true, supervisor: { select: { name: true } } },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json({
    departments,
    holidays,
    staffDirectory: staffDirectory.map(s => ({
      id: s.id,
      staffNo: s.staffNo,
      name: s.name,
      email: s.email,
      roleCode: s.roleCode,
      position: s.position,
      department: s.department,
      supervisor: s.supervisor,
      joinDate: s.joinDate,
      status: s.status,
      phone: s.phone,
    })),
    leaveTypes: [
      { code: 'TAHUNAN', label: 'Cuti Tahunan' },
      { code: 'SAKIT', label: 'Cuti Sakit' },
      { code: 'KECEMASAN', label: 'Cuti Kecemasan' },
      { code: 'BERSALIN_PATERNITI', label: 'Cuti Bersalin/Paterniti' },
    ],
    courseCategories: [
      'Kemahiran Digital',
      'Perkhidmatan Pelanggan',
      'E-Dagang dan Jualan',
      'Kepimpinan',
      'Pematuhan dan Keselamatan',
      'Kemahiran Insaniah',
      'Kewangan Asas',
    ],
  })
}

// POST - tambah cuti umum / tetapan (HR/Admin)
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Tidak log masuk' }, { status: 401 })
  if (!['HR', 'ADMIN'].includes(session.roleCode)) {
    return NextResponse.json({ error: 'Tiada kebenaran' }, { status: 403 })
  }
  const body = await req.json()
  const { action } = body

  if (action === 'ADD_HOLIDAY') {
    const { name, date, type, state } = body
    if (!name || !date) return NextResponse.json({ error: 'Medan diperlukan' }, { status: 400 })
    const h = await db.publicHoliday.create({ data: { name, date: new Date(date), type: type ?? 'PERSEKUTUAN', state: state ?? null } })
    return NextResponse.json({ holiday: h })
  }

  if (action === 'UPDATE_SETTING') {
    const { key, value } = body
    if (!key || value === undefined) return NextResponse.json({ error: 'Medan diperlukan' }, { status: 400 })
    const s = await db.setting.upsert({ where: { key }, update: { value: String(value) }, create: { key, value: String(value) } })
    return NextResponse.json({ setting: s })
  }

  return NextResponse.json({ error: 'Tindakan tidak diketahui' }, { status: 400 })
}
