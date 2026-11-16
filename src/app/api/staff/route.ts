import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { db } from '@/lib/db'
import { getSession, verifyPassword } from '@/lib/auth'

function hashPwd(plain: string) {
  return 'sim$' + createHash('sha256').update(plain).digest('hex').slice(0, 24)
}

// GET /api/staff - senarai staf dengan filter
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Tidak log masuk' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const departmentId = searchParams.get('departmentId')
  const roleCode = searchParams.get('roleCode')
  const search = searchParams.get('search')

  const staff = await db.staff.findMany({
    where: {
      ...(departmentId ? { departmentId } : {}),
      ...(roleCode ? { roleCode } : {}),
      ...(search ? {
        OR: [
          { name: { contains: search } },
          { email: { contains: search } },
          { position: { contains: search } },
          { staffNo: { contains: search } },
        ]
      } : {}),
    },
    include: {
      department: true,
      role: true,
      supervisor: { select: { id: true, name: true, position: true } },
      subordinates: { select: { id: true, name: true, position: true } },
    },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json({
    staff: staff.map(s => ({
      id: s.id,
      staffNo: s.staffNo,
      name: s.name,
      email: s.email,
      roleCode: s.roleCode,
      roleId: s.roleId,
      department: s.department,
      departmentId: s.departmentId,
      position: s.position,
      phone: s.phone,
      avatarUrl: s.avatarUrl,
      emergencyName: s.emergencyName,
      emergencyPhone: s.emergencyPhone,
      joinDate: s.joinDate,
      status: s.status,
      supervisor: s.supervisor,
      supervisorId: s.supervisorId,
      subordinates: s.subordinates,
      careerGoal: s.careerGoal,
      skillsJson: s.skillsJson,
    })),
  })
}

// POST /api/staff - Cipta staf baharu (ADMIN/HR sahaja)
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Tidak log masuk' }, { status: 401 })
  if (!['ADMIN', 'HR'].includes(session.roleCode)) {
    return NextResponse.json({ error: 'Tiada kebenaran. Hanya Pentadbir/HR boleh tambah staf.' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  if (!body?.name || !body?.email) {
    return NextResponse.json({ error: 'Nama dan e-mel diperlukan' }, { status: 400 })
  }

  // Check email uniqueness
  const existing = await db.staff.findUnique({ where: { email: body.email.toLowerCase() } })
  if (existing) {
    return NextResponse.json({ error: 'E-mel sudah didaftarkan' }, { status: 400 })
  }

  // Generate staff number if not provided
  let staffNo = body.staffNo
  if (!staffNo) {
    const last = await db.staff.findFirst({ orderBy: { staffNo: 'desc' } })
    let next = 1
    if (last) {
      const m = last.staffNo.match(/(\d+)$/)
      if (m) next = parseInt(m[1]) + 1
    }
    staffNo = 'AAE-' + String(next).padStart(4, '0')
  }

  const roleCode = body.roleCode || 'STAFF'
  const role = await db.role.findFirst({ where: { code: roleCode } })

  const password = body.password || 'password123'
  const staff = await db.staff.create({
    data: {
      staffNo,
      name: body.name,
      email: body.email.toLowerCase(),
      password: hashPwd(password),
      roleCode,
      roleId: role?.id,
      departmentId: body.departmentId || null,
      position: body.position || 'Staf',
      phone: body.phone || null,
      avatarUrl: body.avatarUrl || null,
      emergencyName: body.emergencyName || null,
      emergencyPhone: body.emergencyPhone || null,
      joinDate: body.joinDate ? new Date(body.joinDate) : new Date(),
      status: body.status || 'AKTIF',
      supervisorId: body.supervisorId || null,
      careerGoal: body.careerGoal || null,
      skillsJson: body.skillsJson || '[]',
    },
  })

  // Create leave balances
  const year = new Date().getFullYear()
  await db.leaveBalance.createMany({
    data: [
      { staffId: staff.id, type: 'TAHUNAN', balance: 14, year },
      { staffId: staff.id, type: 'SAKIT', balance: 14, year },
      { staffId: staff.id, type: 'KECEMASAN', balance: 3, year },
      { staffId: staff.id, type: 'BERSALIN_PATERNITI', balance: 0, year },
    ],
  })

  // Add to company announcement conversation
  const annConv = await db.conversation.findFirst({ where: { type: 'PENGUMUMAN' } })
  if (annConv) {
    await db.conversationParticipant.create({
      data: { conversationId: annConv.id, staffId: staff.id, isAdmin: false }
    })
  }

  await db.auditLog.create({
    data: { actorId: session.id, action: 'TAMBAH_STAF', detail: `Tambah staf: ${staff.name} (${staff.email})` }
  })

  return NextResponse.json({ staff, defaultPassword: password })
}

// PATCH /api/staff - Kemas kini staf (ADMIN/HR boleh edit sesiapa; staf edit sendiri terhad)
export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Tidak log masuk' }, { status: 401 })
  const body = await req.json()

  // If staffId provided and user is admin/HR → update that staff
  // Otherwise → update own profile (limited)
  const targetId = body.staffId || session.id
  const isAdmin = ['ADMIN', 'HR'].includes(session.roleCode)
  const isOwnProfile = targetId === session.id

  if (!isOwnProfile && !isAdmin) {
    return NextResponse.json({ error: 'Tiada kebenaran untuk ubah staf lain' }, { status: 403 })
  }

  let allowed: string[]
  if (isAdmin) {
    allowed = ['name', 'email', 'roleCode', 'roleId', 'departmentId', 'position', 'phone',
      'avatarUrl', 'emergencyName', 'emergencyPhone', 'joinDate', 'status', 'supervisorId',
      'careerGoal', 'skillsJson']
  } else {
    allowed = ['phone', 'avatarUrl', 'emergencyName', 'emergencyPhone', 'careerGoal', 'skillsJson']
  }

  const data: Record<string, unknown> = {}
  for (const k of allowed) {
    if (k in body) {
      if (k === 'email') data[k] = String(body[k]).toLowerCase()
      else if (k === 'joinDate') data[k] = new Date(body[k])
      else data[k] = body[k]
    }
  }

  // If roleCode changed, update roleId too
  if (data.roleCode && !data.roleId) {
    const role = await db.role.findFirst({ where: { code: data.roleCode as string } })
    if (role) data.roleId = role.id
  }

  // Check email uniqueness if changing email
  if (data.email) {
    const existing = await db.staff.findFirst({ where: { email: data.email as string, NOT: { id: targetId } } })
    if (existing) {
      return NextResponse.json({ error: 'E-mel sudah digunakan oleh staf lain' }, { status: 400 })
    }
  }

  const updated = await db.staff.update({ where: { id: targetId }, data })

  if (!isOwnProfile) {
    await db.auditLog.create({
      data: { actorId: session.id, action: 'UBAH_STAF', detail: `Ubah staf: ${updated.name} (${updated.email})` }
    })
  }

  return NextResponse.json({ staff: updated })
}

// PUT /api/staff - tukar kata laluan (sendiri atau admin reset staf lain)
export async function PUT(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Tidak log masuk' }, { status: 401 })
  const body = await req.json()

  const isAdmin = ['ADMIN', 'HR'].includes(session.roleCode)
  const targetId = body.staffId || session.id

  // Admin can reset anyone's password without current password
  if (body.staffId && body.staffId !== session.id) {
    if (!isAdmin) {
      return NextResponse.json({ error: 'Tiada kebenaran untuk reset kata laluan staf lain' }, { status: 403 })
    }
    if (!body.newPassword || body.newPassword.length < 6) {
      return NextResponse.json({ error: 'Kata laluan baru sekurang-kurangnya 6 aksara' }, { status: 400 })
    }
    const target = await db.staff.findUnique({ where: { id: body.staffId } })
    if (!target) return NextResponse.json({ error: 'Staf tidak dijumpai' }, { status: 404 })
    await db.staff.update({ where: { id: body.staffId }, data: { password: hashPwd(body.newPassword) } })
    await db.auditLog.create({
      data: { actorId: session.id, action: 'RESET_KATA_LALUAN', detail: `Reset kata laluan: ${target.name}` }
    })
    return NextResponse.json({ ok: true })
  }

  // Self password change — requires current password
  if (!body.newPassword || body.newPassword.length < 6) {
    return NextResponse.json({ error: 'Kata laluan baru sekurang-kurangnya 6 aksara' }, { status: 400 })
  }
  const me = await db.staff.findUnique({ where: { id: session.id } })
  if (!me) return NextResponse.json({ error: 'Pengguna tidak dijumpai' }, { status: 404 })
  if (body.currentPassword && !verifyPassword(body.currentPassword, me.password)) {
    return NextResponse.json({ error: 'Kata laluan semasa salah' }, { status: 400 })
  }
  await db.staff.update({ where: { id: session.id }, data: { password: hashPwd(body.newPassword) } })
  await db.auditLog.create({
    data: { actorId: session.id, action: 'TUKAR_KATA_LALUAN', detail: 'Penukaran kata laluan sendiri' }
  })
  return NextResponse.json({ ok: true })
}

// DELETE /api/staff - Padam staf (ADMIN sahaja)
export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Tidak log masuk' }, { status: 401 })
  if (session.roleCode !== 'ADMIN') {
    return NextResponse.json({ error: 'Hanya Pentadbir Sistem boleh memadam staf' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID staf diperlukan' }, { status: 400 })

  if (id === session.id) {
    return NextResponse.json({ error: 'Tidak boleh padam akaun sendiri' }, { status: 400 })
  }

  const staff = await db.staff.findUnique({ where: { id } })
  if (!staff) return NextResponse.json({ error: 'Staf tidak dijumpai' }, { status: 404 })

  // Delete related records first
  await db.notification.deleteMany({ where: { staffId: id } })
  await db.conversationParticipant.deleteMany({ where: { staffId: id } })
  await db.leaveBalance.deleteMany({ where: { staffId: id } })
  await db.leave.deleteMany({ where: { OR: [{ staffId: id }, { approverId: id }] } })
  await db.task.deleteMany({ where: { OR: [{ assigneeId: id }, { assignerId: id }] } })
  await db.calendarEventParticipants.deleteMany({ where: { staffId: id } })
  await db.courseRegistration.deleteMany({ where: { staffId: id } })
  await db.achievement.deleteMany({ where: { OR: [{ staffId: id }, { giverId: id }] } })
  await db.kpi.deleteMany({ where: { OR: [{ staffId: id }, { assessorId: id }] } })
  await db.message.deleteMany({ where: { senderId: id } })
  await db.auditLog.deleteMany({ where: { actorId: id } })
  await db.attendance.deleteMany({ where: { staffId: id } })

  // Clear supervisor references
  await db.staff.updateMany({ where: { supervisorId: id }, data: { supervisorId: null } })
  await db.department.updateMany({ where: { headId: id }, data: { headId: null } })

  await db.staff.delete({ where: { id } })

  await db.auditLog.create({
    data: { actorId: session.id, action: 'PADAM_STAF', detail: `Padam staf: ${staff.name} (${staff.email})` }
  })

  return NextResponse.json({ ok: true })
}
