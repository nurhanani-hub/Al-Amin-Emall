'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Clock, CheckSquare, Calendar as CalIcon, GraduationCap, MessageCircle,
  AlertTriangle, Users, TrendingUp, Trophy, Bell, Play, Square, Coffee,
  LogIn, LogOut, ChevronRight, Activity, Target, Award,
} from 'lucide-react'
import { api, useApp } from '@/lib/store'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { fmtTime12, fmtDate, fmtMins, initials, statusLabel, statusColor } from '@/lib/format'
import { ROLE_LABELS } from '@/lib/rbac'
import { toast } from 'sonner'

const COLOR_PALETTE = ['#10b981', '#f59e0b', '#f43f5e', '#06b6d4', '#a855f7']

export function DashboardModule() {
  const { user } = useApp()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [clocking, setClocking] = useState(false)

  useEffect(() => {
    api('/api/dashboard').then(d => setData(d)).finally(() => setLoading(false))
  }, [])

  async function clock(action: 'CLOCK_IN' | 'CLOCK_OUT') {
    setClocking(true)
    try {
      const d = await api('/api/attendance', { method: 'POST', body: JSON.stringify({ action }) })
      setData(prev => ({ ...prev, todayAtt: d.attendance }))
      toast.success(action === 'CLOCK_IN' ? 'Berjaya Masuk (Clock In)' : 'Berjaya Keluar (Clock Out)')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setClocking(false)
    }
  }

  if (loading || !data) {
    return <div className="grid lg:grid-cols-3 gap-4">{[1, 2, 3].map(i => <div key={i} className="glass-card h-40 animate-pulse" />)}</div>
  }

  const u = user!
  const isManager = ['SUPERVISOR', 'HR', 'EXEC', 'ADMIN'].includes(u.roleCode)
  const isExecutive = ['HR', 'EXEC', 'ADMIN'].includes(u.roleCode)
  const hasTeam = data.roleData?.teamSize > 0

  return (
    <div className="space-y-6">
      {/* Hero header */}
      <div className="glass-card p-5 lg:p-6 relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-gradient-to-br from-emerald-500/15 to-teal-500/10 blur-3xl" />
        <div className="absolute -right-20 -bottom-20 w-40 h-40 rounded-full bg-gradient-to-br from-amber-500/10 to-rose-500/5 blur-3xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="w-14 h-14 lg:w-16 lg:h-16 ring-2 ring-emerald-500/20 ring-offset-2 ring-offset-background">
              <AvatarImage src={u.avatarUrl ?? undefined} />
              <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-lg">
                {initials(u.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-xs text-muted-foreground">Selamat datang kembali,</p>
              <h1 className="text-2xl lg:text-3xl font-bold">{u.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-[10px]">{ROLE_LABELS[u.roleCode]}</Badge>
                <span className="text-xs text-muted-foreground">{u.position}</span>
              </div>
            </div>
          </div>

          {/* Clock in/out widget */}
          <div className="glass p-4 rounded-xl flex items-center gap-4">
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Kehadiran Hari Ini</p>
              <p className="text-2xl font-bold tabular-nums">{fmtTime12(new Date())}</p>
              {data.todayAtt ? (
                <Badge className={`mt-1 bg-${statusColor(data.todayAtt.status)}-500/20 text-${statusColor(data.todayAtt.status)}-700 border-${statusColor(data.todayAtt.status)}-500/30`}>
                  {statusLabel(data.todayAtt.status)}
                </Badge>
              ) : (
                <Badge variant="outline" className="mt-1">Belum Masuk</Badge>
              )}
            </div>
            <div className="flex flex-col gap-2">
              {data.todayAtt?.clockIn && (
                <div className="text-xs text-muted-foreground">
                  <span className="block">Masuk: <span className="font-semibold text-foreground">{fmtTime12(data.todayAtt.clockIn)}</span></span>
                  {data.todayAtt.clockOut && <span className="block">Keluar: <span className="font-semibold text-foreground">{fmtTime12(data.todayAtt.clockOut)}</span></span>}
                </div>
              )}
              <div className="flex gap-2">
                {!data.todayAtt?.clockOut ? (
                  <Button
                    size="sm"
                    onClick={() => clock(data.todayAtt?.clockIn ? 'CLOCK_OUT' : 'CLOCK_IN')}
                    disabled={clocking}
                    className={data.todayAtt?.clockIn ? 'bg-rose-500 hover:bg-rose-600' : ''}
                  >
                    {data.todayAtt?.clockIn ? <><LogOut className="w-3.5 h-3.5 mr-1" /> Keluar</> : <><LogIn className="w-3.5 h-3.5 mr-1" /> Masuk</>}
                  </Button>
                ) : (
                  <Badge variant="outline" className="text-xs">Hari ini selesai</Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Tugasan Aktif" value={data.myTasks.length} icon={CheckSquare} color="emerald" hint={`${data.overdueTasks.length} lewat`} />
        <StatCard label="Mesyuarat Akan Datang" value={data.upcomingEvents.length} icon={CalIcon} color="amber" hint="7 hari akan datang" />
        <StatCard label="Kursus Berdaftar" value={data.myCourses.length} icon={GraduationCap} color="cyan" hint="akan hadir" />
        <StatCard label="Mesej Belum Dibaca" value={data.unreadMsgs} icon={MessageCircle} color="fuchsia" hint={`${data.unreadNotifs} notifikasi`} />
      </div>

      {/* Two-column layout */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Left col: My tasks + pending */}
        <div className="lg:col-span-2 space-y-4">
          {/* Pending tasks */}
          <Card className="glass-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-600" />
                <h3 className="font-semibold text-sm">Tugasan Aktif Saya</h3>
              </div>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => useApp.getState().setActiveModule('tasks')}>
                Lihat semua <ChevronRight className="w-3 h-3" />
              </Button>
            </div>

            {data.overdueTasks.length > 0 && (
              <div className="glass bg-rose-500/10 border-rose-500/20 p-2.5 rounded-lg mb-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                <div className="text-xs">
                  <p className="font-medium text-rose-700 dark:text-rose-400">{data.overdueTasks.length} tugasan tertunggak</p>
                  <p className="text-muted-foreground">Sila selesaikan dengan segera atau hubungi penyelia.</p>
                </div>
              </div>
            )}

            <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-thin">
              {data.myTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Tiada tugasan aktif. Tahniah!</p>
              ) : data.myTasks.slice(0, 6).map((t: any) => {
                const overdue = new Date(t.dueDate).getTime() < Date.now()
                return (
                  <div key={t.id} className="glass p-3 rounded-lg">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-sm font-medium flex-1">{t.title}</p>
                      <Badge variant="outline" className={`text-[10px] border-${statusColor(t.priority)}-500/30 text-${statusColor(t.priority)}-700`}>
                        {statusLabel(t.priority)}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5">
                      <span>Diberi oleh: {t.assigner.name}</span>
                      <span className={overdue ? 'text-rose-500 font-medium' : ''}>Tamat: {fmtDate(t.dueDate, { withTime: true })}</span>
                    </div>
                    <Progress value={t.progress} className="h-1.5" />
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Upcoming events */}
          <Card className="glass-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CalIcon className="w-4 h-4 text-amber-600" />
                <h3 className="font-semibold text-sm">Acara Akan Datang</h3>
              </div>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => useApp.getState().setActiveModule('calendar')}>
                Kalendar <ChevronRight className="w-3 h-3" />
              </Button>
            </div>
            <div className="space-y-2">
              {data.upcomingEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Tiada acara akan datang</p>
              ) : data.upcomingEvents.slice(0, 4).map((e: any) => (
                <div key={e.id} className="glass p-3 rounded-lg flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500/20 to-rose-500/10 flex flex-col items-center justify-center shrink-0">
                    <span className="text-[9px] text-muted-foreground uppercase">{new Date(e.start).toLocaleDateString('ms-MY', { month: 'short' })}</span>
                    <span className="text-sm font-bold">{new Date(e.start).getDate()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{e.title}</p>
                    <p className="text-[11px] text-muted-foreground">{fmtTime12(e.start)} · {e.location ?? 'Dalam talian'}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{statusLabel(e.type)}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right col: leaves + courses */}
        <div className="space-y-4">
          {/* Leave balance */}
          <Card className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Coffee className="w-4 h-4 text-cyan-600" />
              <h3 className="font-semibold text-sm">Baki Cuti {new Date().getFullYear()}</h3>
            </div>
            <div className="space-y-3">
              {data.myLeaveBalances.map((b: any) => (
                <div key={b.id}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{b.type === 'TAHUNAN' ? 'Tahunan' : b.type === 'SAKIT' ? 'Sakit' : b.type === 'KECEMASAN' ? 'Kecemasan' : 'Bersalin/Paterniti'}</span>
                    <span className="font-semibold">{b.balance} hari</span>
                  </div>
                  <Progress value={b.balance} max={14} className="h-1.5" />
                </div>
              ))}
              {data.myLeavesPending > 0 && (
                <p className="text-[11px] text-amber-600 mt-2">{data.myLeavesPending} permohonan menunggu kelulusan</p>
              )}
            </div>
          </Card>

          {/* My courses */}
          <Card className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <GraduationCap className="w-4 h-4 text-fuchsia-600" />
              <h3 className="font-semibold text-sm">Kursus Akan Dihadiri</h3>
            </div>
            <div className="space-y-2">
              {data.myCourses.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Tiada kursus akan datang</p>
              ) : data.myCourses.slice(0, 3).map((r: any) => (
                <div key={r.id} className="glass p-2.5 rounded-lg">
                  <p className="text-xs font-medium truncate">{r.course.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {fmtDate(r.course.startDate)} · {r.course.durationHrs}j · {r.course.method === 'FIZIKAL' ? 'Fizikal' : 'Dalam Talian'}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          {/* My achievements summary */}
          <Card className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-4 h-4 text-amber-600" />
              <h3 className="font-semibold text-sm">Pencapaian Saya</h3>
            </div>
            <AchievementsMini />
          </Card>
        </div>
      </div>

      {/* Manager / Executive view */}
      {isExecutive && data.roleData?.trend && (
        <Card className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <h3 className="font-semibold text-sm">Trend Kehadiran 7 Hari (Seluruh Syarikat)</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data.roleData.trend}>
              <defs>
                <linearGradient id="gHadir" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gTer" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,120,0.15)" />
              <XAxis dataKey="date" tickFormatter={d => new Date(d).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short' })} fontSize={11} stroke="rgba(120,120,120,0.5)" />
              <YAxis fontSize={11} stroke="rgba(120,120,120,0.5)" />
              <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8 }} />
              <Area type="monotone" dataKey="hadir" stroke="#10b981" fill="url(#gHadir)" name="Hadir" />
              <Area type="monotone" dataKey="terlambat" stroke="#f59e0b" fill="url(#gTer)" name="Terlambat" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}

      {hasTeam && (
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Team attendance today */}
          <Card className="glass-card p-4 lg:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-cyan-600" />
              <h3 className="font-semibold text-sm">Status Pasukan Hari Ini ({data.roleData.teamSize})</h3>
            </div>
            <div className="grid sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto scrollbar-thin">
              {data.roleData.teamAttToday.length === 0 ? (
                <p className="text-sm text-muted-foreground col-span-2 text-center py-4">Tiada rekod hari ini</p>
              ) : data.roleData.teamAttToday.map((a: any) => (
                <div key={a.id} className="glass p-2.5 rounded-lg flex items-center gap-2">
                  <Avatar className="w-7 h-7">
                    <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-emerald-600 text-white text-[10px]">{initials(a.staff.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{a.staff.name}</p>
                    <p className="text-[10px] text-muted-foreground">{a.staff.position}</p>
                  </div>
                  <Badge variant="outline" className={`text-[9px] border-${statusColor(a.status)}-500/30 text-${statusColor(a.status)}-700`}>
                    {statusLabel(a.status)}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>

          {/* Pending approvals */}
          <Card className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Bell className="w-4 h-4 text-amber-600" />
              <h3 className="font-semibold text-sm">Menunggu Kelulusan</h3>
            </div>
            <div className="space-y-2">
              {data.roleData.teamPendingLeaves.length + data.roleData.teamPendingCourseRegs.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Tiada permohonan menunggu</p>
              ) : (
                <>
                  {data.roleData.teamPendingLeaves.slice(0, 3).map((l: any) => (
                    <div key={l.id} className="glass p-2 rounded-lg">
                      <p className="text-[11px] font-medium truncate">{l.staff.name}</p>
                      <p className="text-[10px] text-muted-foreground">Cuti {l.type} · {l.days} hari</p>
                    </div>
                  ))}
                  {data.roleData.teamPendingCourseRegs.slice(0, 3).map((r: any) => (
                    <div key={r.id} className="glass p-2 rounded-lg">
                      <p className="text-[11px] font-medium truncate">{r.staff.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{r.course.title}</p>
                    </div>
                  ))}
                </>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, icon: Icon, color, hint }: { label: string; value: number; icon: any; color: string; hint: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card p-3 lg:p-4 flex items-start gap-3"
    >
      <div className={`w-9 h-9 rounded-lg bg-${color}-500/15 flex items-center justify-center shrink-0`}>
        <Icon className={`w-4 h-4 text-${color}-600`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-xl lg:text-2xl font-bold tabular-nums">{value}</p>
        <p className="text-[10px] text-muted-foreground">{hint}</p>
      </div>
    </motion.div>
  )
}

function AchievementsMini() {
  const [stats, setStats] = useState<any>(null)
  useEffect(() => {
    api('/api/achievements').then(d => setStats(d.myStats)).catch(() => {})
  }, [])
  if (!stats) return <p className="text-xs text-muted-foreground">Memuat...</p>
  return (
    <div className="grid grid-cols-3 gap-2 text-center">
      <div className="glass p-2 rounded-lg">
        <Award className="w-4 h-4 text-amber-500 mx-auto mb-1" />
        <p className="text-lg font-bold">{stats.totalPoints}</p>
        <p className="text-[10px] text-muted-foreground">Mata</p>
      </div>
      <div className="glass p-2 rounded-lg">
        <Trophy className="w-4 h-4 text-fuchsia-500 mx-auto mb-1" />
        <p className="text-lg font-bold">{stats.badgeCount}</p>
        <p className="text-[10px] text-muted-foreground">Lencana</p>
      </div>
      <div className="glass p-2 rounded-lg">
        <Target className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
        <p className="text-lg font-bold">{stats.achievementCount}</p>
        <p className="text-[10px] text-muted-foreground">Pencapaian</p>
      </div>
    </div>
  )
}
