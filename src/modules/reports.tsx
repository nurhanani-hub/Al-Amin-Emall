'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart3, Calendar, Users, Clock, Plane, CheckSquare, GraduationCap,
  Trophy, Download, Printer, FileText, AlertTriangle,
} from 'lucide-react'
import { api, useApp } from '@/lib/store'
import { toast } from 'sonner'
import { fmtDate, fmtTime12, fmtMins, statusLabel, statusColor } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'

type ReportType = 'summary' | 'attendance' | 'leave' | 'tasks' | 'training' | 'achievements'

const TYPE_META: Record<ReportType, { label: string; icon: any }> = {
  summary: { label: 'Ringkasan', icon: BarChart3 },
  attendance: { label: 'Kehadiran', icon: Clock },
  leave: { label: 'Cuti', icon: Plane },
  tasks: { label: 'Tugasan', icon: CheckSquare },
  training: { label: 'Latihan', icon: GraduationCap },
  achievements: { label: 'Pencapaian', icon: Trophy },
}

// Static color classes (no dynamic Tailwind)
const COLOR_BADGE: Record<string, string> = {
  emerald: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
  amber: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  rose: 'bg-rose-500/15 text-rose-700 border-rose-500/30',
  cyan: 'bg-cyan-500/15 text-cyan-700 border-cyan-500/30',
  fuchsia: 'bg-fuchsia-500/15 text-fuchsia-700 border-fuchsia-500/30',
  slate: 'bg-slate-500/15 text-slate-700 border-slate-500/30',
  sky: 'bg-cyan-500/15 text-cyan-700 border-cyan-500/30',
  violet: 'bg-fuchsia-500/15 text-fuchsia-700 border-fuchsia-500/30',
}

const COLOR_ICON: Record<string, string> = {
  emerald: 'text-emerald-600',
  amber: 'text-amber-600',
  rose: 'text-rose-600',
  cyan: 'text-cyan-600',
  fuchsia: 'text-fuchsia-600',
  slate: 'text-slate-600',
}

function statusBadge(s: string) {
  const c = COLOR_BADGE[statusColor(s)] ?? COLOR_BADGE.slate
  return <Badge className={`${c} text-[10px]`}>{statusLabel(s)}</Badge>
}

export function ReportsModule() {
  const { user } = useApp()
  const [type, setType] = useState<ReportType>('summary')
  const today = new Date()
  const thirtyAgo = new Date(); thirtyAgo.setDate(thirtyAgo.getDate() - 30)
  const [from, setFrom] = useState(fmtDateISO(thirtyAgo))
  const [to, setTo] = useState(fmtDateISO(today))
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => { load() }, [type, from, to])
  async function load() {
    setLoading(true); setData(null)
    try {
      const q = new URLSearchParams({ type, from, to })
      const d = await api(`/api/reports?${q.toString()}`)
      setData(d)
    } catch (e: any) {
      toast.error(e.message)
    } finally { setLoading(false) }
  }

  const isManager = user && ['HR', 'ADMIN', 'SUPERVISOR', 'EXEC'].includes(user.roleCode)

  return (
    <div className="space-y-4">
      <div className="glass-card p-5 lg:p-6 relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-44 h-44 rounded-full bg-gradient-to-br from-teal-500/15 to-emerald-500/10 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white shadow-md">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl lg:text-2xl font-bold text-gradient">Laporan</h1>
            <p className="text-xs text-muted-foreground">
              {isManager
                ? 'Laporan merangkumi pasukan anda (jika penyelia) atau semua staf (jika HR/Pengurusan).'
                : 'Laporan ringkasan peribadi anda.'}
            </p>
          </div>
        </div>
      </div>

      <Tabs value={type} onValueChange={(v) => setType(v as ReportType)} className="w-full">
        <ScrollArea className="w-full whitespace-nowrap">
          <TabsList className="inline-flex w-auto h-auto p-1">
            {(Object.keys(TYPE_META) as ReportType[]).map(k => {
              const M = TYPE_META[k]
              return (
                <TabsTrigger key={k} value={k} className="gap-1.5">
                  <M.icon className="w-3.5 h-3.5" /> {M.label}
                </TabsTrigger>
              )
            })}
          </TabsList>
        </ScrollArea>

        <div className="glass-card p-3 mt-3 flex flex-col sm:flex-row sm:items-end gap-3">
          <div>
            <Label className="text-xs">Tarikh Mula</Label>
            <Input type="date" className="glass-input mt-1" value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Tarikh Tamat</Label>
            <Input type="date" className="glass-input mt-1" value={to} onChange={e => setTo(e.target.value)} />
          </div>
          <Button variant="outline" size="sm" onClick={() => {
            const t = new Date(); t.setDate(t.getDate() - 30)
            setFrom(fmtDateISO(t)); setTo(fmtDateISO(new Date()))
          }} className="gap-1.5">
            <Calendar className="w-3.5 h-3.5" /> 30 hari terkini
          </Button>
          {type !== 'summary' && data && (
            <div className="sm:ml-auto flex gap-2">
              <Button variant="outline" size="sm" onClick={() => exportCSV(type, data)} className="gap-1.5">
                <Download className="w-3.5 h-3.5" /> Eksport CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
                <Printer className="w-3.5 h-3.5" /> Cetak PDF
              </Button>
            </div>
          )}
        </div>

        <TabsContent value="summary" className="mt-3">
          {loading ? <SummarySkeleton /> : <SummaryView data={data} />}
        </TabsContent>
        <TabsContent value="attendance" className="mt-3">
          {loading ? <TableSkeleton /> : <AttendanceReport rows={data?.report ?? []} />}
        </TabsContent>
        <TabsContent value="leave" className="mt-3">
          {loading ? <TableSkeleton /> : <LeaveReport rows={data?.report ?? []} />}
        </TabsContent>
        <TabsContent value="tasks" className="mt-3">
          {loading ? <TableSkeleton /> : <TasksReport rows={data?.report ?? []} />}
        </TabsContent>
        <TabsContent value="training" className="mt-3">
          {loading ? <TableSkeleton /> : <TrainingReport rows={data?.report ?? []} />}
        </TabsContent>
        <TabsContent value="achievements" className="mt-3">
          {loading ? <TableSkeleton /> : <AchievementsReport rows={data?.report ?? []} />}
        </TabsContent>
      </Tabs>
    </div>
  )
}

/* ============ Helpers ============ */
function fmtDateISO(d: Date) {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function fmtChartDate(iso: string) {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

function rowsToCSV(rows: any[], cols: { key: string; label: string }[]) {
  const esc = (v: any) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const header = cols.map(c => esc(c.label)).join(',')
  const body = rows.map(r => cols.map(c => esc(getCell(r, c.key))).join(',')).join('\n')
  return header + '\n' + body
}

function getCell(r: any, key: string) {
  if (key.includes('.')) {
    return key.split('.').reduce((o, k) => (o ?? {})[k], r) ?? ''
  }
  return r[key]
}

function downloadCSV(filename: string, csv: string) {
  const bom = '\uFEFF'
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function exportCSV(type: ReportType, data: any) {
  const rows = data?.report ?? []
  if (!rows.length) { toast.info('Tiada data untuk dieksport'); return }
  const map: Record<string, { key: string; label: string }[]> = {
    attendance: [
      { key: 'date', label: 'Tarikh' }, { key: 'staff.name', label: 'Staf' },
      { key: 'staff.department.name', label: 'Jabatan' }, { key: 'clockIn', label: 'Masuk' },
      { key: 'clockOut', label: 'Keluar' }, { key: 'workMinutes', label: 'Jam Kerja (m)' },
      { key: 'status', label: 'Status' },
    ],
    leave: [
      { key: 'staff.name', label: 'Staf' }, { key: 'type', label: 'Jenis' },
      { key: 'startDate', label: 'Mula' }, { key: 'endDate', label: 'Tamat' },
      { key: 'days', label: 'Hari' }, { key: 'status', label: 'Status' },
      { key: 'approver.name', label: 'Pelulus' },
    ],
    tasks: [
      { key: 'title', label: 'Tajuk' }, { key: 'assignee.name', label: 'Penerima' },
      { key: 'assigner.name', label: 'Pemberi' }, { key: 'priority', label: 'Keutamaan' },
      { key: 'status', label: 'Status' }, { key: 'progress', label: 'Kemajuan' },
      { key: 'dueDate', label: 'Tarikh Akhir' },
    ],
    training: [
      { key: 'staff.name', label: 'Staf' }, { key: 'course.title', label: 'Kursus' },
      { key: 'course.category', label: 'Kategori' }, { key: 'course.startDate', label: 'Tarikh' },
      { key: 'status', label: 'Status' }, { key: 'attendance', label: 'Kehadiran' },
      { key: 'score', label: 'Markah' },
    ],
    achievements: [
      { key: 'staff.name', label: 'Staf' }, { key: 'title', label: 'Tajuk' },
      { key: 'category', label: 'Kategori' }, { key: 'date', label: 'Tarikh' },
      { key: 'points', label: 'Mata' }, { key: 'giver.name', label: 'Pemberi' },
    ],
  }
  const cols = map[type]
  if (!cols) { toast.error('Jenis laporan tidak disokong untuk eksport'); return }
  downloadCSV(`laporan-${type}-${fmtDateISO(new Date())}.csv`, rowsToCSV(rows, cols))
  toast.success('CSV dieksport')
}

/* ============ Summary View ============ */
function SummaryView({ data }: { data: any }) {
  if (!data?.summary) {
    return <div className="glass-card p-6"><EmptyState icon={FileText} text="Tiada data ringkasan tersedia." /></div>
  }
  const s = data.summary
  const stats = [
    { label: 'Jumlah Staf', value: s.allStaff, color: 'emerald', icon: Users },
    { label: 'Hadir Hari Ini', value: s.todayHadir, color: 'emerald', icon: Clock },
    { label: 'Terlambat', value: s.todayTerlambat, color: 'amber', icon: AlertTriangle },
    { label: 'Cuti', value: s.todayCuti, color: 'fuchsia', icon: Plane },
    { label: 'Tidak Hadir', value: s.todayTidakHadir, color: 'rose', icon: AlertTriangle },
    { label: 'Cuti Belum Lulus', value: s.pendingLeaves, color: 'amber', icon: Plane },
    { label: 'Pendaftaran Kursus Belum Lulus', value: s.pendingCourseRegs, color: 'amber', icon: GraduationCap },
    { label: 'Tugasan Terbuka', value: s.tasksOpen, color: 'cyan', icon: CheckSquare },
    { label: 'Tugasan Tertunggak', value: s.tasksOverdue, color: 'rose', icon: AlertTriangle },
  ]
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {stats.map((st, i) => {
          const Icon = st.icon
          return (
            <motion.div key={st.label} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className="glass-card p-3 lg:p-4">
                <div className="flex items-center justify-between mb-1">
                  <Icon className={`w-4 h-4 ${COLOR_ICON[st.color] ?? 'text-slate-600'}`} />
                </div>
                <p className="text-2xl font-bold tabular-nums">{st.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{st.label}</p>
              </Card>
            </motion.div>
          )
        })}
      </div>

      <Card className="glass-card p-4 lg:p-5">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-emerald-600" />
          <h3 className="text-sm font-semibold">Trend Kehadiran 7 Hari Terkini</h3>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={(data.trend ?? []).map((t: any) => ({ ...t, label: fmtChartDate(t.date) }))}>
              <defs>
                <linearGradient id="hadirG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="telatG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.85 0.02 165 / 0.4)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Area type="monotone" dataKey="hadir" name="Hadir" stroke="#10b981" fill="url(#hadirG)" />
              <Area type="monotone" dataKey="terlambat" name="Terlambat" stroke="#f59e0b" fill="url(#telatG)" />
              <Area type="monotone" dataKey="cuti" name="Cuti" stroke="#a855f7" fillOpacity={0} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </motion.div>
  )
}

/* ============ Detail Reports ============ */
function AttendanceReport({ rows }: { rows: any[] }) {
  if (!rows.length) return <EmptyReport icon={Clock} />
  return (
    <Card className="glass-card p-0 overflow-hidden">
      <ScrollArea className="max-h-[60vh] scrollbar-thin">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tarikh</TableHead>
              <TableHead>Staf</TableHead>
              <TableHead>Jabatan</TableHead>
              <TableHead>Masuk</TableHead>
              <TableHead>Keluar</TableHead>
              <TableHead>Jam Kerja</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={r.id ?? i}>
                <TableCell className="whitespace-nowrap">{fmtDate(r.date)}</TableCell>
                <TableCell className="font-medium">{r.staff?.name ?? '-'}</TableCell>
                <TableCell>{r.staff?.department?.name ?? '-'}</TableCell>
                <TableCell>{r.clockIn ? fmtTime12(r.clockIn) : '-'}</TableCell>
                <TableCell>{r.clockOut ? fmtTime12(r.clockOut) : '-'}</TableCell>
                <TableCell>{r.workMinutes ? fmtMins(r.workMinutes) : '-'}</TableCell>
                <TableCell>{statusBadge(r.status)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </Card>
  )
}

function LeaveReport({ rows }: { rows: any[] }) {
  if (!rows.length) return <EmptyReport icon={Plane} />
  return (
    <Card className="glass-card p-0 overflow-hidden">
      <ScrollArea className="max-h-[60vh] scrollbar-thin">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Staf</TableHead>
              <TableHead>Jenis</TableHead>
              <TableHead>Mula</TableHead>
              <TableHead>Tamat</TableHead>
              <TableHead>Hari</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Pelulus</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={r.id ?? i}>
                <TableCell className="font-medium">{r.staff?.name ?? '-'}</TableCell>
                <TableCell>{r.type ?? '-'}</TableCell>
                <TableCell className="whitespace-nowrap">{fmtDate(r.startDate)}</TableCell>
                <TableCell className="whitespace-nowrap">{fmtDate(r.endDate)}</TableCell>
                <TableCell>{r.days ?? '-'}</TableCell>
                <TableCell>{statusBadge(r.status)}</TableCell>
                <TableCell>{r.approver?.name ?? '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </Card>
  )
}

function TasksReport({ rows }: { rows: any[] }) {
  if (!rows.length) return <EmptyReport icon={CheckSquare} />
  return (
    <Card className="glass-card p-0 overflow-hidden">
      <ScrollArea className="max-h-[60vh] scrollbar-thin">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tajuk</TableHead>
              <TableHead>Penerima</TableHead>
              <TableHead>Pemberi</TableHead>
              <TableHead>Keutamaan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Kemajuan</TableHead>
              <TableHead>Tarikh Akhir</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={r.id ?? i}>
                <TableCell className="font-medium">{r.title ?? '-'}</TableCell>
                <TableCell>{r.assignee?.name ?? '-'}</TableCell>
                <TableCell>{r.assigner?.name ?? '-'}</TableCell>
                <TableCell>{statusBadge(r.priority)}</TableCell>
                <TableCell>{statusBadge(r.status)}</TableCell>
                <TableCell>{r.progress != null ? `${r.progress}%` : '-'}</TableCell>
                <TableCell className="whitespace-nowrap">{r.dueDate ? fmtDate(r.dueDate) : '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </Card>
  )
}

function TrainingReport({ rows }: { rows: any[] }) {
  if (!rows.length) return <EmptyReport icon={GraduationCap} />
  return (
    <Card className="glass-card p-0 overflow-hidden">
      <ScrollArea className="max-h-[60vh] scrollbar-thin">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Staf</TableHead>
              <TableHead>Kursus</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Tarikh</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Kehadiran</TableHead>
              <TableHead>Markah</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={r.id ?? i}>
                <TableCell className="font-medium">{r.staff?.name ?? '-'}</TableCell>
                <TableCell>{r.course?.title ?? '-'}</TableCell>
                <TableCell>{r.course?.category ?? '-'}</TableCell>
                <TableCell className="whitespace-nowrap">{r.course?.startDate ? fmtDate(r.course.startDate) : '-'}</TableCell>
                <TableCell>{statusBadge(r.status)}</TableCell>
                <TableCell>{r.attendance ?? '-'}</TableCell>
                <TableCell>{r.score ?? '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </Card>
  )
}

function AchievementsReport({ rows }: { rows: any[] }) {
  if (!rows.length) return <EmptyReport icon={Trophy} />
  return (
    <Card className="glass-card p-0 overflow-hidden">
      <ScrollArea className="max-h-[60vh] scrollbar-thin">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Staf</TableHead>
              <TableHead>Tajuk</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Tarikh</TableHead>
              <TableHead>Mata</TableHead>
              <TableHead>Pemberi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={r.id ?? i}>
                <TableCell className="font-medium">{r.staff?.name ?? '-'}</TableCell>
                <TableCell>{r.title ?? '-'}</TableCell>
                <TableCell>{r.category ?? '-'}</TableCell>
                <TableCell className="whitespace-nowrap">{r.date ? fmtDate(r.date) : '-'}</TableCell>
                <TableCell>{r.points ?? '-'}</TableCell>
                <TableCell>{r.giver?.name ?? '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </Card>
  )
}

/* ============ Skeletons & Empty ============ */
function SummarySkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[1, 2, 3, 4, 5].map(i => <div key={i} className="glass-card h-24 animate-pulse" />)}
      </div>
      <div className="glass-card h-72 animate-pulse" />
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="glass-card p-4 space-y-2">
      {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-10 rounded-md bg-muted/40 animate-pulse" />)}
    </div>
  )
}

function EmptyReport({ icon: Icon }: { icon: any }) {
  return (
    <div className="glass-card p-10 flex flex-col items-center justify-center text-center">
      <div className="w-12 h-12 rounded-full bg-muted/40 flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">Tiada rekod dalam julat tarikh ini.</p>
      <p className="text-xs text-muted-foreground mt-1">Cuba laraskan julat tarikh di atas.</p>
    </div>
  )
}

function EmptyState({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-4">
      <div className="w-12 h-12 rounded-full bg-muted/40 flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground max-w-xs">{text}</p>
    </div>
  )
}
