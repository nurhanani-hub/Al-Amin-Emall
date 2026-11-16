'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  GraduationCap, Search, MapPin, Video, Clock, Users, Sparkles,
  CheckCircle2, XCircle, Loader2, Award, FileText, Calendar,
  TrendingUp, BookOpen, UserCheck, Send,
} from 'lucide-react'
import { api, useApp } from '@/lib/store'
import { toast } from 'sonner'
import { fmtCurrency, fmtDate, fmtNumber, safeJson, statusLabel } from '@/lib/format'
import { ROLE_LABELS } from '@/lib/rbac'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

// ===== Types =====
type CourseStatus = 'DICADANG' | 'BERJALAN' | 'SELESAI'
type CourseMethod = 'FIZIKAL' | 'DALAM_TALIAN'
type RegStatus = 'DIMOHON' | 'LULUS' | 'DITOLAK'
type Attendance = 'HADIR' | 'TIDAK_HADIR' | null

interface Course {
  id: string
  code: string
  title: string
  description?: string
  category: string
  provider?: string
  method: CourseMethod
  quota: number
  durationHrs: number
  startDate: string
  endDate: string
  skillsJson?: string | null
  targetRoles?: string | null
  price: number
  status: CourseStatus
  registered?: string | null
  regCount: number
}

interface Registration {
  id: string
  courseId: string
  course: Course
  staffId: string
  staff?: { id: string; name: string; position?: string; staffNo?: string; department?: { name: string } | null }
  status: RegStatus
  attended: Attendance
  score: number | null
  pass: boolean | null
  feedback?: string | null
  certUrl?: string | null
  registeredAt: string
  approvedAt?: string | null
}

// PRD §7.2 — 7 categories
const CATEGORIES = [
  { key: 'SEMUA', label: 'Semua' },
  { key: 'TEKNIKAL', label: 'Teknikal' },
  { key: 'KESELAMATAN', label: 'Keselamatan & Kesihatan' },
  { key: 'PENGURUSAN', label: 'Pengurusan' },
  { key: 'KHIDMAT_PELANGGAN', label: 'Khidmat Pelanggan' },
  { key: 'JUALAN', label: 'Jualan & Pemasaran' },
  { key: 'PEMBANGUNAN_DIRI', label: 'Pembangunan Diri' },
  { key: 'KEMATANGAN_DIGITAL', label: 'Kematangan Digital' },
]

const METHOD_META: Record<CourseMethod, { label: string; icon: any; cls: string }> = {
  FIZIKAL: { label: 'Fizikal', icon: MapPin, cls: 'bg-teal-500/15 text-teal-700 dark:text-teal-400 border-teal-500/25' },
  DALAM_TALIAN: { label: 'Dalam Talian', icon: Video, cls: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-500/25' },
}

const REG_BADGE: Record<RegStatus, string> = {
  DIMOHON: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25',
  LULUS: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/25',
  DITOLAK: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/25',
}

// ===== Main =====
export function TrainingModule() {
  const { user } = useApp()
  const [tab, setTab] = useState('catalog')

  if (!user) {
    return (
      <div className="glass-card p-6 space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  const isHrOrSupervisor = ['SUPERVISOR', 'HR', 'ADMIN'].includes(user.roleCode)

  return (
    <div className="space-y-5">
      <motion.header
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="glass-card p-5 lg:p-6 relative overflow-hidden"
      >
        <div className="absolute -right-16 -top-16 w-48 h-48 rounded-full bg-gradient-to-br from-fuchsia-500/15 to-emerald-500/10 blur-3xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-fuchsia-500/15 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-fuchsia-600" />
            </div>
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-gradient">Latihan & Kursus</h1>
              <p className="text-xs text-muted-foreground">Pembangunan profesional staf Al-Amin Emall</p>
            </div>
          </div>
        </div>
      </motion.header>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="glass rounded-lg flex-wrap h-auto p-1">
          <TabsTrigger value="catalog"><BookOpen className="w-3.5 h-3.5" /> Katalog Kursus</TabsTrigger>
          <TabsTrigger value="mine"><UserCheck className="w-3.5 h-3.5" /> Kursus Saya</TabsTrigger>
          {isHrOrSupervisor && (
            <TabsTrigger value="manage"><TrendingUp className="w-3.5 h-3.5" /> Pengurusan</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="catalog" className="mt-4">
          <CatalogTab onRegistered={() => setTab('mine')} />
        </TabsContent>

        <TabsContent value="mine" className="mt-4">
          <MineTab />
        </TabsContent>

        {isHrOrSupervisor && (
          <TabsContent value="manage" className="mt-4">
            <ManageTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

/* =========================================================
   Tab 1 - Catalog
   ========================================================= */
function CatalogTab({ onRegistered }: { onRegistered: () => void }) {
  const [data, setData] = useState<{ courses: Course[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('SEMUA')
  const [search, setSearch] = useState('')
  const [detail, setDetail] = useState<Course | null>(null)
  const [registering, setRegistering] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ scope: 'catalog' })
      if (category !== 'SEMUA') params.set('category', category)
      const d = await api<{ courses: Course[] }>(`/api/courses?${params.toString()}`)
      setData(d)
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal memuatkan katalog')
    } finally {
      setLoading(false)
    }
  }, [category])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    const list = data?.courses ?? []
    if (!search.trim()) return list
    const q = search.toLowerCase()
    return list.filter(c =>
      c.title.toLowerCase().includes(q) ||
      (c.provider ?? '').toLowerCase().includes(q) ||
      (c.code ?? '').toLowerCase().includes(q),
    )
  }, [data, search])

  async function register(c: Course) {
    setRegistering(c.id)
    try {
      await api('/api/courses', { method: 'POST', body: JSON.stringify({ action: 'REGISTER', courseId: c.id }) })
      toast.success('Pendaftaran berjaya. Menunggu kelulusan.')
      await load()
      onRegistered()
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal mendaftar')
    } finally {
      setRegistering(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="glass-card p-3">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="glass-input pl-9"
              placeholder="Cari kursus mengikut tajuk, kod atau penyedia..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-1.5 max-w-full overflow-x-auto scrollbar-thin">
            {CATEGORIES.map(c => (
              <button
                key={c.key}
                onClick={() => setCategory(c.key)}
                className={`text-xs px-3 py-1.5 rounded-full border transition whitespace-nowrap ${
                  category === c.key
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'glass border-border/40 text-muted-foreground hover:bg-emerald-500/10'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-72 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="glass-card p-10 text-center">
          <BookOpen className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Tiada kursus ditemui untuk penapis ini.</p>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => (
            <CourseCard
              key={c.id}
              course={c}
              onRegister={() => register(c)}
              onOpen={() => setDetail(c)}
              registering={registering === c.id}
            />
          ))}
        </div>
      )}

      <CourseDetailDialog
        course={detail}
        onClose={() => setDetail(null)}
        onRegister={(c) => { register(c) }}
      />
    </div>
  )
}

function CourseCard({
  course, onRegister, onOpen, registering,
}: {
  course: Course
  onRegister: () => void
  onOpen: () => void
  registering: boolean
}) {
  const skills: string[] = safeJson(course.skillsJson, [])
  const method = METHOD_META[course.method]
  const MethodIcon = method.icon
  const quotaPct = course.quota > 0 ? Math.min((course.regCount / course.quota) * 100, 100) : 0
  const full = course.regCount >= course.quota
  const alreadyRegistered = !!course.registered

  return (
    <Card className="glass-card p-4 flex flex-col">
      <div className="flex items-start justify-between gap-2 mb-2">
        <button onClick={onOpen} className="text-left min-w-0 flex-1">
          <div className="text-[11px] text-muted-foreground font-mono">{course.code}</div>
          <h3 className="text-sm font-semibold leading-snug line-clamp-2 hover:text-emerald-600 transition">
            {course.title}
          </h3>
        </button>
        <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-700 bg-emerald-500/10 shrink-0">
          {course.category}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border ${method.cls}`}>
          <MethodIcon className="w-3 h-3" /> {method.label}
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border border-slate-500/20 bg-slate-500/10 text-slate-600 dark:text-slate-300">
          <Clock className="w-3 h-3" /> {course.durationHrs}j
        </span>
        {course.provider && (
          <span className="text-[10px] text-muted-foreground truncate">{course.provider}</span>
        )}
      </div>

      <p className="text-xs text-muted-foreground line-clamp-2 mb-3 flex-1">
        {course.description ?? 'Kursus pembangunan profesional.'}
      </p>

      {skills.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {skills.slice(0, 3).map((s, i) => (
            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-400">
              {s}
            </span>
          ))}
        </div>
      )}

      <div className="text-[11px] text-muted-foreground mb-2 flex items-center gap-1">
        <Calendar className="w-3 h-3" />
        {fmtDate(course.startDate)} - {fmtDate(course.endDate)}
      </div>

      {/* Quota */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
          <span>Kuota</span>
          <span>{course.regCount}/{course.quota}</span>
        </div>
        <Progress value={quotaPct} className="h-1.5" />
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
          {course.price > 0 ? fmtCurrency(course.price) : ' Percuma'}
        </span>
        <Button
          size="sm"
          disabled={alreadyRegistered || full || registering}
          onClick={onRegister}
          className={
            alreadyRegistered
              ? 'bg-slate-500/20 text-slate-600'
              : full
                ? 'bg-rose-500/20 text-rose-600'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
          }
        >
          {registering ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : alreadyRegistered ? 'Telah Daftar'
            : full ? 'Penuh'
            : 'Daftar'}
        </Button>
      </div>
    </Card>
  )
}

function CourseDetailDialog({
  course, onClose, onRegister,
}: {
  course: Course | null
  onClose: () => void
  onRegister: (c: Course) => void
}) {
  if (!course) return null
  const skills: string[] = safeJson(course.skillsJson, [])
  const targetRoles: string[] = safeJson(course.targetRoles, [])
  const method = METHOD_META[course.method]
  const MethodIcon = method.icon

  return (
    <Dialog open={!!course} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="glass-strong max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">{course.code}</div>
          <DialogTitle className="text-lg leading-snug">{course.title}</DialogTitle>
          <DialogDescription>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-700 bg-emerald-500/10">{course.category}</Badge>
              <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border ${method.cls}`}>
                <MethodIcon className="w-3 h-3" /> {method.label}
              </span>
              <span className="text-[10px]">{course.durationHrs} jam</span>
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto scrollbar-thin pr-1">
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {course.description ?? 'Tiada deskripsi.'}
          </p>
          <Separator />
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-[11px] text-muted-foreground">Penyedia</div>
              <div>{course.provider ?? '-'}</div>
            </div>
            <div>
              <div className="text-[11px] text-muted-foreground">Harga</div>
              <div className="font-semibold text-emerald-700 dark:text-emerald-400">
                {course.price > 0 ? fmtCurrency(course.price) : 'Percuma'}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-muted-foreground">Tarikh</div>
              <div>{fmtDate(course.startDate)} - {fmtDate(course.endDate)}</div>
            </div>
            <div>
              <div className="text-[11px] text-muted-foreground">Kuota</div>
              <div>{course.regCount}/{course.quota} didaftarkan</div>
            </div>
          </div>
          {skills.length > 0 && (
            <div>
              <div className="text-[11px] text-muted-foreground mb-1">Kemahiran Diperoleh</div>
              <div className="flex flex-wrap gap-1.5">
                {skills.map((s, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-400">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
          {targetRoles.length > 0 && (
            <div>
              <div className="text-[11px] text-muted-foreground mb-1">Peranan Sasaran</div>
              <div className="flex flex-wrap gap-1.5">
                {targetRoles.map((r, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded bg-teal-500/10 text-teal-700 dark:text-teal-400">
                    {ROLE_LABELS[r as keyof typeof ROLE_LABELS] ?? r}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="rounded-lg glass p-3 text-[11px] text-muted-foreground">
            <FileText className="w-3 h-3 inline mr-1" />
            Kursus ini boleh dituntut di bawah skim HRD Corp. Rujukan tuntutan akan diuruskan oleh HR.
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Tutup</Button>
          {!course.registered && course.regCount < course.quota && (
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => { onRegister(course); onClose() }}>
              Daftar Sekarang
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* =========================================================
   Tab 2 - Mine
   ========================================================= */
function MineTab() {
  const { setActiveModule } = useApp()
  const [data, setData] = useState<{ registrations: Registration[] } | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api<{ registrations: Registration[] }>('/api/courses?scope=mine')
      setData(d)
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal memuatkan pendaftaran')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const annualHours = useMemo(() => {
    const regs = data?.registrations ?? []
    const year = new Date().getFullYear()
    return regs
      .filter(r => r.status === 'LULUS' && r.attended === 'HADIR')
      .filter(r => new Date(r.course.endDate).getFullYear() === year)
      .reduce((sum, r) => sum + (r.course.durationHrs || 0), 0)
  }, [data])

  return (
    <div className="space-y-4">
      {/* AI CTA */}
      <Card className="glass-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-fuchsia-500/15 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-fuchsia-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Cadangan Kursus AI</h3>
            <p className="text-xs text-muted-foreground">Biarkan AI mencadangkan kursus berdasarkan profil & sejarah kerjaya anda.</p>
          </div>
        </div>
        <Button className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white" onClick={() => setActiveModule('ai')}>
          <Sparkles className="w-4 h-4" /> Buka Pembantu AI
        </Button>
      </Card>

      {/* Annual hours summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard
          icon={Clock}
          label={`Jam Latihan ${new Date().getFullYear()}`}
          value={`${annualHours}j`}
          color="emerald"
        />
        <StatCard
          icon={BookOpen}
          label="Jumlah Pendaftaran"
          value={fmtNumber(data?.registrations.length ?? 0)}
          color="teal"
        />
        <StatCard
          icon={Award}
          label="Lulus & Selesai"
          value={fmtNumber((data?.registrations ?? []).filter(r => r.status === 'LULUS' && r.attended === 'HADIR').length)}
          color="fuchsia"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : (data?.registrations ?? []).length === 0 ? (
        <Card className="glass-card p-10 text-center">
          <BookOpen className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Anda belum mendaftar sebarang kursus.</p>
        </Card>
      ) : (
        <div className="space-y-3 max-h-[70vh] overflow-y-auto scrollbar-thin pr-1">
          {data!.registrations.map(r => <RegCard key={r.id} reg={r} />)}
        </div>
      )}
    </div>
  )
}

function RegCard({ reg }: { reg: Registration }) {
  const c = reg.course
  const skills: string[] = safeJson(c.skillsJson, [])
  return (
    <Card className="glass-card p-4">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] text-muted-foreground font-mono">{c.code}</div>
          <h4 className="text-sm font-semibold">{c.title}</h4>
          <div className="text-xs text-muted-foreground mt-0.5">
            {c.provider ?? '-'} {'\u2022'} {fmtDate(c.startDate)} - {fmtDate(c.endDate)}
          </div>
        </div>
        <Badge variant="outline" className={`text-[10px] ${REG_BADGE[reg.status]}`}>
          {statusLabel(reg.status)}
        </Badge>
      </div>

      {reg.status === 'LULUS' && (
        <div className="mt-3 grid sm:grid-cols-3 gap-3 text-xs">
          <div>
            <div className="text-[10px] text-muted-foreground">Kehadiran</div>
            <div className={reg.attended === 'HADIR' ? 'text-emerald-600' : reg.attended === 'TIDAK_HADIR' ? 'text-rose-600' : 'text-muted-foreground'}>
              {reg.attended ? statusLabel(reg.attended) : 'Belum disahkan'}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground">Skor</div>
            <div>{reg.score != null ? `${reg.score}%` : '-'}</div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground">Keputusan</div>
            <div>
              {reg.pass == null ? '-' : reg.pass ? (
                <span className="text-emerald-600 inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Lulus</span>
              ) : (
                <span className="text-rose-600 inline-flex items-center gap-1"><XCircle className="w-3 h-3" /> Gagal</span>
              )}
            </div>
          </div>
        </div>
      )}

      {reg.feedback && (
        <div className="mt-2 rounded-lg glass p-2 text-xs">
          <div className="text-[10px] text-muted-foreground mb-0.5">Maklum Balas</div>
          <p className="whitespace-pre-wrap">{reg.feedback}</p>
        </div>
      )}

      {skills.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {skills.slice(0, 4).map((s, i) => (
            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-400">{s}</span>
          ))}
        </div>
      )}
    </Card>
  )
}

/* =========================================================
   Tab 3 - Management (HR/Supervisor)
   ========================================================= */
function ManageTab() {
  const [data, setData] = useState<{ registrations: Registration[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [resultFor, setResultFor] = useState<Registration | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api<{ registrations: Registration[] }>('/api/courses?scope=all_regs')
      setData(d)
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal memuatkan pendaftaran')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const pending = (data?.registrations ?? []).filter(r => r.status === 'DIMOHON')
  const approved = (data?.registrations ?? []).filter(r => r.status === 'LULUS')

  const attendanceRate = approved.length > 0
    ? Math.round((approved.filter(r => r.attended === 'HADIR').length / approved.length) * 100)
    : 0
  const scored = approved.filter(r => r.score != null)
  const avgScore = scored.length > 0
    ? Math.round(scored.reduce((a, r) => a + (r.score ?? 0), 0) / scored.length)
    : 0

  return (
    <div className="space-y-4">
      {/* Statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Jumlah Pendaftaran" value={fmtNumber(data?.registrations.length ?? 0)} color="emerald" />
        <StatCard icon={Clock} label="Menunggu Kelulusan" value={fmtNumber(pending.length)} color="amber" />
        <StatCard icon={UserCheck} label="Kadar Kehadiran" value={`${attendanceRate}%`} color="teal" />
        <StatCard icon={TrendingUp} label="Purata Skor" value={`${avgScore}%`} color="fuchsia" />
      </div>

      {/* Pending */}
      <Card className="glass-card p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-600" /> Pendaftaran Menunggu Kelulusan
        </h3>
        {loading ? (
          <div className="space-y-2">{[1, 2].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : pending.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">Tiada pendaftaran menunggu kelulusan.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Staf</TableHead>
                  <TableHead className="text-xs">Kursus</TableHead>
                  <TableHead className="text-xs">Tarikh</TableHead>
                  <TableHead className="text-xs text-right">Tindakan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6">
                          <AvatarFallback className="text-[10px]">
                            {(r.staff?.name ?? '?').split(' ').slice(0, 2).map(s => s[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="truncate font-medium">{r.staff?.name ?? '-'}</div>
                          <div className="text-[10px] text-muted-foreground">{r.staff?.position ?? ''}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="font-medium truncate max-w-[180px]">{r.course.title}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{r.course.code}</div>
                    </TableCell>
                    <TableCell className="text-xs">{fmtDate(r.registeredAt)}</TableCell>
                    <TableCell className="text-right">
                      <PendingActions reg={r} onChanged={load} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Completed / results */}
      <Card className="glass-card p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Award className="w-4 h-4 text-emerald-600" /> Kursus Diluluskan - Rekod Keputusan
        </h3>
        {approved.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">Tiada kursus diluluskan.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Staf</TableHead>
                  <TableHead className="text-xs">Kursus</TableHead>
                  <TableHead className="text-xs">Kehadiran</TableHead>
                  <TableHead className="text-xs">Skor</TableHead>
                  <TableHead className="text-xs">Keputusan</TableHead>
                  <TableHead className="text-xs text-right">Tindakan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {approved.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">{r.staff?.name ?? '-'}</TableCell>
                    <TableCell className="text-xs max-w-[180px] truncate">{r.course.title}</TableCell>
                    <TableCell className="text-xs">
                      {r.attended ? statusLabel(r.attended) : <span className="text-amber-600">Belum</span>}
                    </TableCell>
                    <TableCell className="text-xs">{r.score != null ? `${r.score}%` : '-'}</TableCell>
                    <TableCell className="text-xs">
                      {r.pass == null ? '-' : r.pass ? (
                        <span className="text-emerald-600">Lulus</span>
                      ) : (
                        <span className="text-rose-600">Gagal</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" className="glass h-7 text-[11px]" onClick={() => setResultFor(r)}>
                        <FileText className="w-3 h-3" /> Rekod
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <RecordResultDialog
        reg={resultFor}
        onClose={() => setResultFor(null)}
        onSaved={() => { setResultFor(null); load() }}
      />
    </div>
  )
}

function PendingActions({ reg, onChanged }: { reg: Registration; onChanged: () => void }) {
  const [busy, setBusy] = useState(false)
  async function act(action: 'APPROVE' | 'REJECT') {
    setBusy(true)
    try {
      await api('/api/courses', { method: 'POST', body: JSON.stringify({ action, registrationId: reg.id }) })
      toast.success(action === 'APPROVE' ? 'Pendaftaran diluluskan' : 'Pendaftaran ditolak')
      onChanged()
    } catch (e: any) {
      toast.error(e.message ?? 'Tindakan gagal')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="flex items-center justify-end gap-1">
      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-[11px]" disabled={busy} onClick={() => act('APPROVE')}>
        <CheckCircle2 className="w-3 h-3" /> Lulus
      </Button>
      <Button size="sm" variant="outline" className="glass text-rose-600 border-rose-500/30 h-7 text-[11px]" disabled={busy} onClick={() => act('REJECT')}>
        <XCircle className="w-3 h-3" /> Tolak
      </Button>
    </div>
  )
}

function RecordResultDialog({
  reg, onClose, onSaved,
}: {
  reg: Registration | null
  onClose: () => void
  onSaved: () => void
}) {
  const [attended, setAttended] = useState<'HADIR' | 'TIDAK_HADIR'>(reg?.attended ?? 'HADIR')
  const [score, setScore] = useState<string>(reg?.score != null ? String(reg.score) : '')
  const [pass, setPass] = useState<boolean>(reg?.pass ?? true)
  const [feedback, setFeedback] = useState(reg?.feedback ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (reg) {
      setAttended(reg.attended ?? 'HADIR')
      setScore(reg.score != null ? String(reg.score) : '')
      setPass(reg.pass ?? true)
      setFeedback(reg.feedback ?? '')
    }
  }, [reg])

  if (!reg) return null

  async function submit() {
    if (!reg) return
    setSaving(true)
    try {
      await api('/api/courses', {
        method: 'POST',
        body: JSON.stringify({
          action: 'RECORD_RESULT',
          registrationId: reg.id,
          attended,
          score: score.trim() ? Number(score) : null,
          pass,
          feedback: feedback.trim() || null,
        }),
      })
      toast.success('Keputusan berjaya direkod')
      onSaved()
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal menyimpan keputusan')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={!!reg} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="glass-strong max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Rekod Keputusan</DialogTitle>
          <DialogDescription>{reg.course.title} - {reg.staff?.name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Kehadiran</Label>
            <Select value={attended} onValueChange={(v) => setAttended(v as any)}>
              <SelectTrigger className="glass-input"><SelectValue /></SelectTrigger>
              <SelectContent className="glass-strong">
                <SelectItem value="HADIR">Hadir</SelectItem>
                <SelectItem value="TIDAK_HADIR">Tidak Hadir</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="r-score">Skor (%)</Label>
              <Input id="r-score" type="number" min={0} max={100} className="glass-input" value={score} onChange={(e) => setScore(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Keputusan</Label>
              <div className="flex items-center gap-2 h-9">
                <Switch checked={pass} onCheckedChange={setPass} />
                <span className={pass ? 'text-emerald-600 text-sm' : 'text-rose-600 text-sm'}>
                  {pass ? 'Lulus' : 'Gagal'}
                </span>
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r-fb">Maklum Balas</Label>
            <Textarea id="r-fb" className="glass-input min-h-[70px]" value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Maklum balas untuk staf..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={saving} onClick={submit}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ===== Shared StatCard ===== */
function StatCard({
  icon: Icon, label, value, color,
}: {
  icon: any
  label: string
  value: string
  color: 'emerald' | 'teal' | 'amber' | 'rose' | 'cyan' | 'fuchsia' | 'slate'
}) {
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-500/15 text-emerald-600',
    teal: 'bg-teal-500/15 text-teal-600',
    amber: 'bg-amber-500/15 text-amber-600',
    rose: 'bg-rose-500/15 text-rose-600',
    cyan: 'bg-cyan-500/15 text-cyan-600',
    fuchsia: 'bg-fuchsia-500/15 text-fuchsia-600',
    slate: 'bg-slate-500/15 text-slate-600',
  }
  return (
    <Card className="glass-card p-3 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${colorMap[color]}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] text-muted-foreground truncate">{label}</div>
        <div className="text-base font-semibold">{value}</div>
      </div>
    </Card>
  )
}
