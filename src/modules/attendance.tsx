'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Clock, LogIn, LogOut, CalendarDays, FileSpreadsheet, Coffee, Plane, HeartPulse,
  Baby, AlertTriangle, CheckCircle2, XCircle, Filter, Download, Users, Timer,
  Briefcase, MapPin, ClipboardEdit, History, ListChecks, BarChart3,
} from 'lucide-react'
import { api, useApp } from '@/lib/store'
import { toast } from 'sonner'
import {
  fmtDate, fmtTime12, fmtMins, initials, statusLabel, statusColor, relTime,
} from '@/lib/format'
import { ROLE_LABELS } from '@/lib/rbac'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

// ---- Types ----
type AttendanceStatus =
  | 'HADIR' | 'TERLAMBAT' | 'CUTI' | 'TIDAK_HADIR' | 'KERJA_LUAR' | 'CUTI_UMUM'

interface AttendanceRecord {
  id: string
  staffId: string
  date: string
  clockIn: string | null
  clockOut: string | null
  breakMins: number | null
  workMins: number | null
  overtimeMins: number | null
  lateMins: number | null
  earlyMins: number | null
  status: AttendanceStatus
  location: string | null
  note: string | null
  staff?: { id: string; name: string; staffNo: string; position: string; department?: { name: string } | null }
}

interface AttendanceStats {
  total: number
  hadir: number
  terlambat: number
  cuti: number
  tidakHadir: number
  totalWorkMins: number
  totalOvertimeMins: number
  totalLateMins: number
}

interface LeaveBalance {
  id: string
  staffId: string
  type: 'TAHUNAN' | 'SAKIT' | 'KECEMASAN' | 'BERSALIN_PATERNITI'
  balance: number
  year: number
}

interface LeaveRecord {
  id: string
  staffId: string
  staff?: { id: string; name: string; position: string; department?: { name: string } | null }
  type: 'TAHUNAN' | 'SAKIT' | 'KECEMASAN' | 'BERSALIN_PATERNITI'
  startDate: string
  endDate: string
  days: number
  reason: string
  status: 'DIMOHON' | 'LULUS' | 'DITOLAK'
  approver?: { name: string } | null
  approvedAt: string | null
  createdAt: string
}

const LEAVE_TYPE_META: Record<LeaveBalance['type'], { label: string; icon: any; color: string; max: number }> = {
  TAHUNAN: { label: 'Cuti Tahunan', icon: Plane, color: 'emerald', max: 14 },
  SAKIT: { label: 'Cuti Sakit', icon: HeartPulse, color: 'rose', max: 14 },
  KECMASAN: { label: 'Cuti Kecemasan', icon: AlertTriangle, color: 'amber', max: 10 },
  BERSALIN_PATERNITI: { label: 'Bersalin / Paterniti', icon: Baby, color: 'fuchsia', max: 60 },
}

const STATUS_OPTIONS: AttendanceStatus[] = ['HADIR', 'TERLAMBAT', 'CUTI', 'TIDAK_HADIR', 'KERJA_LUAR', 'CUTI_UMUM']

// Tunjuk kelas warna status secara dinamik (selamat untuk Tailwind JIT kerana string penuh dijana di sini)
function statusBadgeClass(s: string) {
  const c = statusColor(s)
  return `border-${c}-500/30 text-${c}-700 bg-${c}-500/10 dark:text-${c}-400`
}

function fmtRange(): { from: string; to: string } {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), 1)
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return { from: fmt(from), to: fmt(to) }
}

function weekStart(): Date {
  const d = new Date()
  const day = d.getDay() // 0=Sun
  const diff = day === 0 ? -6 : 1 - day // Isnin sebagai mula
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export function AttendanceModule() {
  const { user } = useApp()
  const [tab, setTab] = useState('mine')

  if (!user) {
    return (
      <div className="glass-card p-6 space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  const isManager = ['SUPERVISOR', 'HR', 'ADMIN'].includes(user.roleCode)
  const isExecutive = ['HR', 'ADMIN', 'EXEC'].includes(user.roleCode)

  return (
    <div className="space-y-5">
      <header className="glass-card p-5 lg:p-6 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-48 h-48 rounded-full bg-gradient-to-br from-emerald-500/15 to-teal-500/10 blur-3xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <Clock className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-gradient">Kehadiran & Cuti</h1>
              <p className="text-xs text-muted-foreground">HRMS Al-Amin Emall - Pengurusan masa & kehadiran staf</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="w-3.5 h-3.5" />
            Pejabat Al-Amin Emall, Shah Alam
          </div>
        </div>
      </header>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="glass rounded-lg flex-wrap h-auto p-1">
          <TabsTrigger value="mine"><Clock className="w-3.5 h-3.5" /> Kehadiran Saya</TabsTrigger>
          <TabsTrigger value="report"><BarChart3 className="w-3.5 h-3.5" /> Rekod & Laporan</TabsTrigger>
          <TabsTrigger value="leave"><Coffee className="w-3.5 h-3.5" /> Cuti</TabsTrigger>
          {isManager && (
            <TabsTrigger value="adjust"><ClipboardEdit className="w-3.5 h-3.5" /> Pelarasan</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="mine" className="mt-4">
          <MyAttendanceTab />
        </TabsContent>

        <TabsContent value="report" className="mt-4">
          <ReportTab isManager={isManager} isExecutive={isExecutive} />
        </TabsContent>

        <TabsContent value="leave" className="mt-4">
          <LeaveTab isManager={isManager} />
        </TabsContent>

        {isManager && (
          <TabsContent value="adjust" className="mt-4">
            <AdjustTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

/* =========================================================
   Tab 1 - Kehadiran Saya (Clock In/Out + Ringkasan Mingguan)
   ========================================================= */
function MyAttendanceTab() {
  const { user } = useApp()
  const [data, setData] = useState<{ records: AttendanceRecord[]; stats: AttendanceStats; todayRec: AttendanceRecord | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [clocking, setClocking] = useState(false)
  const [now, setNow] = useState(new Date())

  const range = useMemo(() => {
    const s = weekStart()
    const e = new Date()
    e.setHours(23, 59, 59, 999)
    return { from: s.toISOString().slice(0, 10), to: e.toISOString().slice(0, 10) }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api<{ records: AttendanceRecord[]; stats: AttendanceStats; todayRec: AttendanceRecord | null }>(
        `/api/attendance?scope=self&from=${range.from}&to=${range.to}`,
      )
      setData(d)
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal memuatkan kehadiran')
    } finally {
      setLoading(false)
    }
  }, [range.from, range.to])

  useEffect(() => { load() }, [load])

  // Jam semasa
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  async function clock(action: 'CLOCK_IN' | 'CLOCK_OUT') {
    setClocking(true)
    try {
      const d = await api<{ attendance: AttendanceRecord }>('/api/attendance', {
        method: 'POST',
        body: JSON.stringify({ action }),
      })
      setData(prev => prev ? { ...prev, todayRec: d.attendance } : prev)
      toast.success(action === 'CLOCK_IN' ? 'Berjaya Masuk (Clock In)' : 'Berjaya Keluar (Clock Out)')
      await load()
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal mengemas kini kehadiran')
    } finally {
      setClocking(false)
    }
  }

  if (loading || !data) {
    return (
      <div className="grid lg:grid-cols-3 gap-4">
        <Skeleton className="h-64 lg:col-span-2 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  const today = data.todayRec
  const workedThisWeekMins = data.records.reduce((s, r) => s + (r.workMins || 0), 0)
  const overtimeThisWeek = data.records.reduce((s, r) => s + (r.overtimeMins || 0), 0)
  const lateCount = data.records.filter(r => r.status === 'TERLAMBAT').length
  const weekHours = workedThisWeekMins / 60
  const over48 = weekHours > 48

  return (
    <div className="space-y-4">
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Clock widget */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-5 lg:col-span-2 relative overflow-hidden"
        >
          <div className="absolute -right-20 -bottom-20 w-56 h-56 rounded-full bg-gradient-to-br from-emerald-500/15 to-teal-500/5 blur-3xl pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{fmtDate(now, { long: true })}</p>
              <p className="text-4xl lg:text-5xl font-bold tabular-nums tracking-tight mt-1">
                {fmtTime12(now)}
              </p>
              <div className="mt-2 flex items-center gap-2">
                {today ? (
                  <Badge className={statusBadgeClass(today.status)}>
                    {statusLabel(today.status)}
                  </Badge>
                ) : (
                  <Badge variant="outline">Belum Masuk</Badge>
                )}
                {today?.location && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {today.location}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 min-w-[160px]">
              {!today?.clockOut ? (
                <Button
                  size="lg"
                  disabled={clocking}
                  onClick={() => clock(today?.clockIn ? 'CLOCK_OUT' : 'CLOCK_IN')}
                  className={
                    today?.clockIn
                      ? 'bg-rose-500 hover:bg-rose-600 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }
                >
                  {today?.clockIn ? (
                    <><LogOut className="w-4 h-4" /> Keluar</>
                  ) : (
                    <><LogIn className="w-4 h-4" /> Masuk</>
                  )}
                </Button>
              ) : (
                <Button disabled variant="outline" size="lg">
                  <CheckCircle2 className="w-4 h-4" /> Hari Ini Selesai
                </Button>
              )}
              <p className="text-[11px] text-muted-foreground text-center">
                {today?.clockIn ? `Masuk: ${fmtTime12(today.clockIn)}` : 'Sila Masuk untuk mula'}
              </p>
            </div>
          </div>

          {/* Today's stats row */}
          {today?.clockIn && (
            <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-2 mt-5 pt-4 border-t border-border/40">
              <TodayStat label="Masuk" value={fmtTime12(today.clockIn)} icon={LogIn} color="emerald" />
              <TodayStat label="Keluar" value={today.clockOut ? fmtTime12(today.clockOut) : '-'} icon={LogOut} color="rose" />
              <TodayStat label="Jam Kerja" value={fmtMins(today.workMins || 0)} icon={Timer} color="teal" />
              <TodayStat label="Lebih Masa" value={fmtMins(today.overtimeMins || 0)} icon={Clock} color="amber" />
              {!!today.lateMins && today.lateMins > 0 && (
                <TodayStat label="Terlambat" value={fmtMins(today.lateMins)} icon={AlertTriangle} color="rose" />
              )}
              {!!today.earlyMins && today.earlyMins > 0 && (
                <TodayStat label="Awal Keluar" value={fmtMins(today.earlyMins)} icon={LogOut} color="amber" />
              )}
            </div>
          )}
        </motion.div>

        {/* Weekly summary */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass-card p-5 space-y-4"
        >
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-emerald-600" />
            <h3 className="font-semibold text-sm">Ringkasan Mingguan</h3>
          </div>

          <div className="space-y-3">
            <WeeklyBar label="Jam Kerja" mins={workedThisWeekMins} threshold={48 * 60} color="emerald" suffix="j" />
            <WeeklyBar label="Lebih Masa" mins={overtimeThisWeek} threshold={10 * 60} color="amber" suffix="j" />
          </div>

          {over48 && (
            <div className="glass bg-rose-500/10 border-rose-500/20 p-3 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
              <div className="text-xs">
                <p className="font-medium text-rose-700 dark:text-rose-400">Melebihi Had 48 Jam/Minggu</p>
                <p className="text-muted-foreground">Polisi syarikat - sila rehat atau rujuk penyelia untuk pelarasan.</p>
              </div>
            </div>
          )}

          <Separator />

          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="glass p-2 rounded-lg">
              <p className="text-lg font-bold tabular-nums">{data.records.length}</p>
              <p className="text-[10px] text-muted-foreground">Rekod Minggu Ini</p>
            </div>
            <div className="glass p-2 rounded-lg">
              <p className="text-lg font-bold tabular-nums text-amber-600">{lateCount}</p>
              <p className="text-[10px] text-muted-foreground">Hari Terlambat</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Rekod mingguan terkini */}
      <Card className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-teal-600" />
            <h3 className="font-semibold text-sm">Rekod Minggu Ini</h3>
          </div>
        </div>
        <div className="max-h-72 overflow-y-auto scrollbar-thin -mx-1">
          {data.records.length === 0 ? (
            <EmptyState text="Tiada rekod kehadiran minggu ini." />
          ) : (
            <ul className="space-y-1.5 px-1">
              {data.records.map(r => (
                <li key={r.id} className="glass p-2.5 rounded-lg flex items-center gap-3">
                  <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/10 flex flex-col items-center justify-center shrink-0">
                    <span className="text-[9px] text-muted-foreground uppercase">{new Date(r.date).toLocaleDateString('ms-MY', { weekday: 'short' })}</span>
                    <span className="text-sm font-bold">{new Date(r.date).getDate()}</span>
                  </div>
                  <div className="flex-1 min-w-0 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Masuk</p>
                      <p className="font-medium">{r.clockIn ? fmtTime12(r.clockIn) : '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Keluar</p>
                      <p className="font-medium">{r.clockOut ? fmtTime12(r.clockOut) : '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Jam Kerja</p>
                      <p className="font-medium">{fmtMins(r.workMins || 0)}</p>
                    </div>
                  </div>
                  <Badge className={statusBadgeClass(r.status)}>{statusLabel(r.status)}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  )
}

function TodayStat({ label, value, icon: Icon, color }: { label: string; value: string; icon: any; color: string }) {
  return (
    <div className="glass p-2 rounded-lg">
      <div className={`w-6 h-6 rounded-md bg-${color}-500/15 flex items-center justify-center mb-1`}>
        <Icon className={`w-3.5 h-3.5 text-${color}-600`} />
      </div>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold tabular-nums">{value}</p>
    </div>
  )
}

function WeeklyBar({ label, mins, threshold, color, suffix }: { label: string; mins: number; threshold: number; color: string; suffix: string }) {
  const pct = Math.min(100, Math.round((mins / threshold) * 100))
  const over = mins > threshold
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className={`font-semibold ${over ? 'text-rose-600' : ''}`}>
          {Math.floor(mins / 60)}{suffix} {mins % 60}m
          <span className="text-muted-foreground font-normal"> / {Math.floor(threshold / 60)}{suffix}</span>
        </span>
      </div>
      <Progress value={pct} className={`h-1.5 ${over ? '[&>div]:bg-rose-500' : `[&>div]:bg-${color}-500`}`} />
    </div>
  )
}

/* =========================================================
   Tab 2 - Rekod & Laporan
   ========================================================= */
function ReportTab({ isManager, isExecutive }: { isManager: boolean; isExecutive: boolean }) {
  const initRange = useMemo(() => fmtRange(), [])
  const [scope, setScope] = useState<'self' | 'team' | 'dept' | 'all'>(isExecutive ? 'all' : isManager ? 'team' : 'self')
  const [from, setFrom] = useState(initRange.from)
  const [to, setTo] = useState(initRange.to)
  const [data, setData] = useState<{ records: AttendanceRecord[]; stats: AttendanceStats } | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ scope, from, to })
      const d = await api<{ records: AttendanceRecord[]; stats: AttendanceStats }>(`/api/attendance?${params.toString()}`)
      setData(d)
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal memuatkan laporan')
    } finally {
      setLoading(false)
    }
  }, [scope, from, to])

  useEffect(() => { load() }, [load])

  function exportCsv() {
    if (!data?.records.length) {
      toast.error('Tiada rekod untuk dieksport')
      return
    }
    const headers = ['Tarikh', 'Staf', 'No. Pekerja', 'Jabatan', 'Masuk', 'Keluar', 'Jam Kerja', 'Lebih Masa', 'Terlambat', 'Status', 'Lokasi', 'Nota']
    const rows = data.records.map(r => [
      fmtDate(r.date),
      r.staff?.name ?? '',
      r.staff?.staffNo ?? '',
      r.staff?.department?.name ?? '',
      r.clockIn ? fmtTime12(r.clockIn) : '',
      r.clockOut ? fmtTime12(r.clockOut) : '',
      fmtMins(r.workMins || 0),
      fmtMins(r.overtimeMins || 0),
      fmtMins(r.lateMins || 0),
      statusLabel(r.status),
      r.location ?? '',
      (r.note ?? '').replace(/[\n\r,]/g, ' '),
    ])
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kehadiran_${scope}_${from}_${to}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('CSV dieksport')
  }

  const stats = data?.stats
  const hadirPct = stats && stats.total > 0 ? Math.round((stats.hadir / stats.total) * 100) : 0

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="glass-card p-4">
        <div className="flex flex-col lg:flex-row lg:items-end gap-3">
          <div className="flex items-center gap-2 text-sm font-medium shrink-0">
            <Filter className="w-4 h-4 text-emerald-600" /> Tapisan
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 flex-1">
            <div>
              <Label className="text-xs">Skop</Label>
              <Select value={scope} onValueChange={(v) => setScope(v as any)}>
                <SelectTrigger className="glass-input mt-1"><SelectValue /></SelectTrigger>
                <SelectContent className="glass-strong">
                  <SelectItem value="self">Diri Sendiri</SelectItem>
                  {isManager && <SelectItem value="team">Pasukan</SelectItem>}
                  {isManager && <SelectItem value="dept">Jabatan</SelectItem>}
                  {isExecutive && <SelectItem value="all">Seluruh Syarikat</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Dari</Label>
              <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="glass-input mt-1" />
            </div>
            <div>
              <Label className="text-xs">Hingga</Label>
              <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="glass-input mt-1" />
            </div>
            <div className="flex items-end gap-2">
              <Button variant="outline" size="sm" onClick={load} className="glass">
                <Filter className="w-3.5 h-3.5" /> Muat Semula
              </Button>
              <Button variant="outline" size="sm" onClick={exportCsv} className="glass">
                <Download className="w-3.5 h-3.5" /> Eksport CSV
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Jumlah Rekod" value={stats?.total ?? 0} icon={ListChecks} color="emerald" />
        <StatCard label="Kehadiran" value={`${hadirPct}%`} icon={CheckCircle2} color="teal" />
        <StatCard label="Hari Terlambat" value={stats?.terlambat ?? 0} icon={AlertTriangle} color="amber" />
        <StatCard label="Jumlah Lebih Masa" value={fmtMins(stats?.totalOvertimeMins ?? 0)} icon={Clock} color="fuchsia" />
      </div>

      {/* Table */}
      <Card className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Rekod Kehadiran
          </h3>
          <span className="text-xs text-muted-foreground">{data?.records.length ?? 0} rekod</span>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : !data?.records.length ? (
          <EmptyState text="Tiada rekod dijumpai untuk tapisan ini." icon={FileSpreadsheet} />
        ) : (
          <ScrollArea className="max-h-[28rem]">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs">Tarikh</TableHead>
                  {scope !== 'self' && <TableHead className="text-xs">Staf</TableHead>}
                  <TableHead className="text-xs">Masuk</TableHead>
                  <TableHead className="text-xs">Keluar</TableHead>
                  <TableHead className="text-xs">Jam Kerja</TableHead>
                  <TableHead className="text-xs">Lebih Masa</TableHead>
                  <TableHead className="text-xs">Terlambat</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.records.map(r => (
                  <TableRow key={r.id} className="text-xs">
                    <TableCell className="font-medium whitespace-nowrap">{fmtDate(r.date)}</TableCell>
                    {scope !== 'self' && (
                      <TableCell>
                        {r.staff && (
                          <div className="flex items-center gap-2">
                            <Avatar className="w-6 h-6">
                              <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-[9px]">
                                {initials(r.staff.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="truncate font-medium max-w-[140px]">{r.staff.name}</p>
                              <p className="text-[10px] text-muted-foreground truncate max-w-[140px]">{r.staff.position}</p>
                            </div>
                          </div>
                        )}
                      </TableCell>
                    )}
                    <TableCell className="tabular-nums">{r.clockIn ? fmtTime12(r.clockIn) : '-'}</TableCell>
                    <TableCell className="tabular-nums">{r.clockOut ? fmtTime12(r.clockOut) : '-'}</TableCell>
                    <TableCell className="tabular-nums">{fmtMins(r.workMins || 0)}</TableCell>
                    <TableCell className="tabular-nums">{fmtMins(r.overtimeMins || 0)}</TableCell>
                    <TableCell className="tabular-nums">
                      {r.lateMins ? <span className="text-amber-600 font-medium">{fmtMins(r.lateMins)}</span> : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${statusBadgeClass(r.status)} text-[10px]`}>{statusLabel(r.status)}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </Card>
    </div>
  )
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card p-3 lg:p-4 flex items-start gap-3"
    >
      <div className={`w-9 h-9 rounded-lg bg-${color}-500/15 flex items-center justify-center shrink-0`}>
        <Icon className={`w-4 h-4 text-${color}-600`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-xl lg:text-2xl font-bold tabular-nums">{value}</p>
      </div>
    </motion.div>
  )
}

/* =========================================================
   Tab 3 - Cuti
   ========================================================= */
function LeaveTab({ isManager }: { isManager: boolean }) {
  const [data, setData] = useState<{ leaves: LeaveRecord[]; balances: LeaveBalance[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [scope, setScope] = useState<'self' | 'team' | 'all'>(isManager ? 'team' : 'self')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // form state
  const [type, setType] = useState<LeaveBalance['type']>('TAHUNAN')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [days, setDays] = useState<number>(1)
  const [reason, setReason] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api<{ leaves: LeaveRecord[]; balances: LeaveBalance[] }>(`/api/leave?scope=${scope}`)
      setData(d)
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal memuatkan cuti')
    } finally {
      setLoading(false)
    }
  }, [scope])

  useEffect(() => { load() }, [load])

  // Auto-calc days
  useEffect(() => {
    if (startDate && endDate) {
      const s = new Date(startDate)
      const e = new Date(endDate)
      if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && e >= s) {
        const diff = Math.round((e.getTime() - s.getTime()) / 86400000) + 1
        setDays(diff)
      }
    }
  }, [startDate, endDate])

  async function apply() {
    if (!type || !startDate || !endDate || !days) {
      toast.error('Sila lengkapkan semua medan')
      return
    }
    setSubmitting(true)
    try {
      await api('/api/leave', {
        method: 'POST',
        body: JSON.stringify({ action: 'APPLY', type, startDate, endDate, days, reason }),
      })
      toast.success('Permohonan cuti dihantar')
      setDialogOpen(false)
      setStartDate(''); setEndDate(''); setReason(''); setDays(1)
      await load()
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal memohon cuti')
    } finally {
      setSubmitting(false)
    }
  }

  async function approve(leaveId: string, action: 'APPROVE' | 'REJECT') {
    setActionLoading(leaveId)
    try {
      await api('/api/leave', { method: 'POST', body: JSON.stringify({ action, leaveId }) })
      toast.success(action === 'APPROVE' ? 'Cuti diluluskan' : 'Cuti ditolak')
      await load()
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal memproses cuti')
    } finally {
      setActionLoading(null)
    }
  }

  const myLeaves = data?.leaves.filter(l => l.staffId === useApp.getState().user?.id) ?? []
  const pendingForApproval = data?.leaves.filter(l => l.status === 'DIMOHON' && l.staffId !== useApp.getState().user?.id) ?? []

  return (
    <div className="space-y-4">
      {/* Leave balances */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {(data?.balances ?? []).map(b => {
          const meta = LEAVE_TYPE_META[b.type]
          const Icon = meta.icon
          const pct = Math.min(100, Math.round((b.balance / meta.max) * 100))
          return (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`w-8 h-8 rounded-lg bg-${meta.color}-500/15 flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 text-${meta.color}-600`} />
                </div>
                <span className="text-2xl font-bold tabular-nums">{b.balance}</span>
              </div>
              <p className="text-xs font-medium">{meta.label}</p>
              <Progress value={pct} className={`h-1.5 mt-2 [&>div]:bg-${meta.color}-500`} />
              <p className="text-[10px] text-muted-foreground mt-1">Baki tahun {b.year} / {meta.max} hari</p>
            </motion.div>
          )
        })}
        {(data?.balances ?? []).length === 0 && !loading && (
          <div className="sm:col-span-2 lg:col-span-4">
            <EmptyState text="Tiada baki cuti dijumpai untuk tahun ini." icon={Coffee} />
          </div>
        )}
      </div>

      {/* Apply leave + scope selector */}
      <Card className="glass-card p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Coffee className="w-4 h-4 text-cyan-600" /> Permohonan Cuti
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">Mohon cuti baharu dan pantau status permohonan anda.</p>
          </div>
          <div className="flex items-center gap-2">
            {isManager && (
              <Select value={scope} onValueChange={(v) => setScope(v as any)}>
                <SelectTrigger className="glass-input w-32"><SelectValue /></SelectTrigger>
                <SelectContent className="glass-strong">
                  <SelectItem value="self">Diri</SelectItem>
                  <SelectItem value="team">Pasukan</SelectItem>
                  {useApp.getState().user?.roleCode === 'HR' || useApp.getState().user?.roleCode === 'ADMIN' ? (
                    <SelectItem value="all">Semua</SelectItem>
                  ) : null}
                </SelectContent>
              </Select>
            )}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Coffee className="w-4 h-4" /> Mohon Cuti
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-strong max-w-md">
                <DialogHeader>
                  <DialogTitle>Mohon Cuti Baharu</DialogTitle>
                  <DialogDescription>Sila isi borang di bawah. Pengurus akan dimaklumkan untuk kelulusan.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Jenis Cuti</Label>
                    <Select value={type} onValueChange={(v) => setType(v as any)}>
                      <SelectTrigger className="glass-input mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent className="glass-strong">
                        {Object.entries(LEAVE_TYPE_META).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Tarikh Mula</Label>
                      <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="glass-input mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">Tarikh Tamat</Label>
                      <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="glass-input mt-1" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Bilangan Hari</Label>
                    <Input type="number" min={0.5} step={0.5} value={days} onChange={e => setDays(parseFloat(e.target.value) || 0)} className="glass-input mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Sebab / Keterangan</Label>
                    <Textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} className="glass-input mt-1" placeholder="Nyatakan sebab permohonan cuti..." />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
                  <Button disabled={submitting} onClick={apply} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    {submitting ? 'Menghantar...' : 'Hantar Permohonan'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </Card>

      {/* Pending approvals (managers) */}
      {isManager && pendingForApproval.length > 0 && (
        <Card className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-amber-600" />
            <h3 className="font-semibold text-sm">Permohonan Menunggu Kelulusan ({pendingForApproval.length})</h3>
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-thin">
            {pendingForApproval.map(l => {
              const meta = LEAVE_TYPE_META[l.type]
              const Icon = meta.icon
              return (
                <div key={l.id} className="glass p-3 rounded-lg flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-center gap-3 flex-1">
                    <Avatar className="w-9 h-9">
                      <AvatarFallback className="bg-gradient-to-br from-amber-500 to-rose-500 text-white text-[10px]">
                        {initials(l.staff?.name ?? '?')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{l.staff?.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{l.staff?.position} - {meta.label}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {fmtDate(l.startDate)} - {fmtDate(l.endDate)} - {l.days} hari
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" onClick={() => approve(l.id, 'APPROVE')} disabled={actionLoading === l.id} className="bg-emerald-600 hover:bg-emerald-700 text-white h-7">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Lulus
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => approve(l.id, 'REJECT')} disabled={actionLoading === l.id} className="border-rose-500/30 text-rose-600 h-7">
                      <XCircle className="w-3.5 h-3.5" /> Tolak
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* My applications */}
      <Card className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <History className="w-4 h-4 text-emerald-600" />
          <h3 className="font-semibold text-sm">Permohonan Cuti Saya</h3>
        </div>
        {loading ? (
          <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : myLeaves.length === 0 ? (
          <EmptyState text="Anda belum memohon sebarang cuti." icon={Coffee} />
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin">
            {myLeaves.map(l => {
              const meta = LEAVE_TYPE_META[l.type]
              const Icon = meta.icon
              return (
                <div key={l.id} className="glass p-3 rounded-lg flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg bg-${meta.color}-500/15 flex items-center justify-center shrink-0`}>
                    <Icon className={`w-4 h-4 text-${meta.color}-600`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium">{meta.label}</p>
                      <Badge className={`${statusBadgeClass(l.status)} text-[10px]`}>{statusLabel(l.status)}</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {fmtDate(l.startDate)} - {fmtDate(l.endDate)} - {l.days} hari
                    </p>
                    {l.reason && <p className="text-[11px] text-muted-foreground truncate mt-0.5">"{l.reason}"</p>}
                    {l.approver && l.approvedAt && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {statusLabel(l.status)} oleh {l.approver.name} - {relTime(l.approvedAt)}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}

/* =========================================================
   Tab 4 - Pelarasan (HR / Supervisor / Admin)
   ========================================================= */
function AdjustTab() {
  const [staffList, setStaffList] = useState<Array<{ id: string; name: string; position: string; department?: { name: string } | null }>>([])
  const [staffId, setStaffId] = useState('')
  const [date, setDate] = useState('')
  const [status, setStatus] = useState<AttendanceStatus>('HADIR')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [recent, setRecent] = useState<Array<{ staffId: string; date: string; status: string; note: string | null }>>([])

  useEffect(() => {
    api<{ staff: Array<{ id: string; name: string; position: string; department?: { name: string } | null }> }>('/api/staff')
      .then(d => setStaffList(d.staff))
      .catch(() => {})
  }, [])

  async function submit() {
    if (!staffId || !date || !status) {
      toast.error('Sila pilih staf, tarikh dan status')
      return
    }
    setSubmitting(true)
    try {
      const d = await api<{ attendance: AttendanceRecord }>('/api/attendance', {
        method: 'POST',
        body: JSON.stringify({ action: 'ADJUST', staffId, date, status, note }),
      })
      toast.success('Pelarasan kehadiran disimpan')
      setRecent(prev => [{
        staffId,
        date,
        status,
        note,
      }, ...prev].slice(0, 8))
      setNote('')
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal membuat pelarasan')
    } finally {
      setSubmitting(false)
    }
  }

  const staffName = (id: string) => staffList.find(s => s.id === id)?.name ?? id

  return (
    <div className="grid lg:grid-cols-5 gap-4">
      <Card className="glass-card p-5 lg:col-span-3">
        <div className="flex items-center gap-2 mb-4">
          <ClipboardEdit className="w-4 h-4 text-emerald-600" />
          <h3 className="font-semibold text-sm">Pelarasan Manual Kehadiran</h3>
        </div>
        <div className="space-y-4">
          <div>
            <Label className="text-xs">Staf</Label>
            <Select value={staffId} onValueChange={setStaffId}>
              <SelectTrigger className="glass-input mt-1"><SelectValue placeholder="Pilih staf" /></SelectTrigger>
              <SelectContent className="glass-strong max-h-72">
                {staffList.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} - {s.position}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Tarikh</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="glass-input mt-1" />
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as AttendanceStatus)}>
                <SelectTrigger className="glass-input mt-1"><SelectValue /></SelectTrigger>
                <SelectContent className="glass-strong">
                  {STATUS_OPTIONS.map(s => (
                    <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Nota / Sebab Pelarasan</Label>
            <Textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={3}
              className="glass-input mt-1"
              placeholder="Nyatakan sebab pelarasan (wajib untuk audit)..."
            />
          </div>
          <Button disabled={submitting} onClick={submit} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <ClipboardEdit className="w-4 h-4" /> {submitting ? 'Menyimpan...' : 'Simpan Pelarasan'}
          </Button>
        </div>
      </Card>

      <Card className="glass-card p-5 lg:col-span-2">
        <div className="flex items-center gap-2 mb-3">
          <History className="w-4 h-4 text-amber-600" />
          <h3 className="font-semibold text-sm">Pelarasan Terkini</h3>
        </div>
        {recent.length === 0 ? (
          <EmptyState text="Tiada pelarasan terkini dalam sesi ini." icon={History} />
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin">
            {recent.map((r, i) => (
              <div key={i} className="glass p-2.5 rounded-lg">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-xs font-medium truncate">{staffName(r.staffId)}</p>
                  <Badge className={`${statusBadgeClass(r.status)} text-[10px]`}>{statusLabel(r.status)}</Badge>
                </div>
                <p className="text-[10px] text-muted-foreground">{fmtDate(r.date)}</p>
                {r.note && <p className="text-[10px] text-muted-foreground mt-1 truncate">"{r.note}"</p>}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

/* =========================================================
   Shared Empty State
   ========================================================= */
function EmptyState({ text, icon: Icon }: { text: string; icon?: any }) {
  return (
    <div className="py-10 text-center">
      {Icon && <Icon className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />}
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  )
}
