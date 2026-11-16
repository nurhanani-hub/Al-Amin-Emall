import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// GET - dashboard berbeza mengikut peranan
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Tidak log masuk' }, { status: 401 })

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const me = await db.staff.findUnique({ where: { id: session.id }, include: { department: true } })

  const todayAtt = await db.attendance.findFirst({ where: { staffId: session.id, date: today } })
  const myTasks = await db.task.findMany({
    where: { assigneeId: session.id, status: { not: 'SELESAI' } },
    orderBy: { dueDate: 'asc' },
    take: 10,
    include: { assigner: { select: { name: true } } },
  })
  const overdueTasks = myTasks.filter(t => new Date(t.dueDate).getTime() < Date.now())
  const dueSoonTasks = myTasks.filter(t => {
    const d = new Date(t.dueDate).getTime() - Date.now()
    return d >= 0 && d <= 3 * 86400000
  })
  const upcomingEvents = await db.calendarEvent.findMany({
    where: { start: { gte: new Date() }, OR: [{ organizerId: session.id }, { participants: { some: { staffId: session.id } } }] },
    orderBy: { start: 'asc' },
    take: 5,
  })
  const myCourses = await db.courseRegistration.findMany({
    where: { staffId: session.id, status: 'LULUS', course: { startDate: { gte: new Date() } } },
    include: { course: true },
    take: 5,
  })
  const myLeavesPending = await db.leave.count({ where: { staffId: session.id, status: 'DIMOHON' } })
  const myLeaveBalances = await db.leaveBalance.findMany({ where: { staffId: session.id, year: today.getFullYear() } })

  const unreadNotifs = await db.notification.count({ where: { staffId: session.id, read: false } })

  const myConvs = await db.conversationParticipant.findMany({ where: { staffId: session.id }, select: { conversationId: true, lastReadAt: true } })
  let unreadMsgs = 0
  for (const c of myConvs) {
    unreadMsgs += await db.message.count({
      where: { conversationId: c.conversationId, senderId: { not: session.id }, createdAt: { gt: c.lastReadAt ?? new Date(0) } },
    })
  }

  let roleData: any = {}
  if (['SUPERVISOR', 'HR', 'EXEC', 'ADMIN'].includes(session.roleCode)) {
    const subs = session.roleCode === 'SUPERVISOR'
      ? await db.staff.findMany({ where: { supervisorId: session.id }, select: { id: true, name: true, position: true, departmentId: true } })
      : await db.staff.findMany({ where: { roleCode: { in: ['STAFF', 'SUPERVISOR'] } }, select: { id: true, name: true, position: true, departmentId: true }, take: 50 })
    const subIds = subs.map(s => s.id)
    const teamAttToday = await db.attendance.findMany({ where: { date: today, staffId: { in: subIds } }, include: { staff: { select: { id: true, name: true, position: true } } } })
    const teamPendingLeaves = await db.leave.findMany({
      where: { status: 'DIMOHON', staffId: { in: subIds } },
      include: { staff: { select: { id: true, name: true, position: true, department: { select: { name: true } } } } },
      take: 20,
    })
    const teamPendingCourseRegs = await db.courseRegistration.findMany({
      where: { status: 'DIMOHON', staffId: { in: subIds } },
      include: { course: true, staff: { select: { id: true, name: true, position: true } } },
      take: 20,
    })
    const teamTasks = await db.task.findMany({
      where: { assigneeId: { in: subIds }, status: { not: 'SELESAI' } },
      include: { assignee: { select: { id: true, name: true, position: true } }, assigner: { select: { name: true } } },
      take: 30,
    })
    roleData = {
      teamSize: subs.length,
      teamMembers: subs,
      teamAttToday,
      teamPendingLeaves,
      teamPendingCourseRegs,
      teamTasks,
    }
  }

  if (['HR', 'ADMIN', 'EXEC'].includes(session.roleCode)) {
    const allStaffCount = await db.staff.count({ where: { status: 'AKTIF' } })
    const todayAttAll = await db.attendance.findMany({ where: { date: today } })
    const trend: { date: string; hadir: number; terlambat: number; cuti: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0)
      const recs = await db.attendance.findMany({ where: { date: d } })
      trend.push({
        date: d.toISOString().slice(0, 10),
        hadir: recs.filter(r => r.status === 'HADIR').length,
        terlambat: recs.filter(r => r.status === 'TERLAMBAT').length,
        cuti: recs.filter(r => ['CUTI', 'CUTI_UMUM'].includes(r.status)).length,
      })
    }
    const courseCount = await db.course.count()
    const totalRegs = await db.courseRegistration.count()
    const attendanceRate = allStaffCount > 0
      ? Math.round((todayAttAll.filter(r => r.status === 'HADIR' || r.status === 'TERLAMBAT').length / allStaffCount) * 100)
      : 0
    roleData = {
      ...roleData,
      allStaffCount,
      todayAttAll: {
        hadir: todayAttAll.filter(r => r.status === 'HADIR').length,
        terlambat: todayAttAll.filter(r => r.status === 'TERLAMBAT').length,
        cuti: todayAttAll.filter(r => ['CUTI', 'CUTI_UMUM'].includes(r.status)).length,
        tidakHadir: todayAttAll.filter(r => r.status === 'TIDAK_HADIR').length,
      },
      attendanceRate,
      trend,
      courseCount,
      totalRegs,
    }
  }

  return NextResponse.json({
    session,
    me,
    todayAtt,
    myTasks,
    overdueTasks,
    dueSoonTasks,
    upcomingEvents,
    myCourses,
    myLeavesPending,
    myLeaveBalances,
    unreadNotifs,
    unreadMsgs,
    roleData,
  })
}
