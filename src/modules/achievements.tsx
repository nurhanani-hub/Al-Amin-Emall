'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Trophy, Award, Target, FileBadge, FolderKanban, Heart, Sparkles,
  ShieldCheck, Lock, Send, Loader2, Star, Medal, Gift,
} from 'lucide-react'
import { api, useApp } from '@/lib/store'
import { toast } from 'sonner'
import { fmtDate, fmtNumber, relTime, initials } from '@/lib/format'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
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
type Category = 'ANUGERAH' | 'SASARAN' | 'SIJIL' | 'PROJEK'
type BadgeKey = 'EMAS' | 'PERAK' | 'GANGSA' | 'PUJIAN' | 'TERBILANG' | 'CEMERLANG'

interface StaffLite {
  id: string
  name: string
  position?: string
  avatarUrl?: string | null
  department?: { name: string } | null
}
interface Achievement {
  id: string
  staffId: string
  staff: StaffLite
  title: string
  category: Category
  date: string
  giver?: { id: string; name: string } | null
  points: number
  badge: string | null
  note?: string | null
  praise?: boolean
  message?: string | null
}
interface Kpi {
  id: string
  staffId: string
  period: string
  indicator: string
  weight: number
  target: string
  actual: string
  score: number | null
  finalScore: number | null
  assessor?: { id: string; name: string } | null
  accessLevel?: string
}
interface AchData {
  achievements: Achievement[]
  kpis: Kpi[]
  canViewKpi: boolean
  myStats: { totalPoints: number; badgeCount: number; achievementCount: number }
}

const CATEGORY_META: Record<Category, { label: string; icon: any; cls: string; chip: string }> = {
  ANUGERAH: { label: 'Anugerah',   icon: Award,            cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25',  chip: 'bg-amber-500/20' },
  SASARAN:  { label: 'Sasaran',    icon: Target,           cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/25', chip: 'bg-emerald-500/20' },
  SIJIL:    { label: 'Sijil',      icon: FileBadge,        cls: 'bg-teal-500/15 text-teal-700 dark:text-teal-400 border-teal-500/25',         chip: 'bg-teal-500/20' },
  PROJEK:   { label: 'Projek',     icon: FolderKanban,     cls: 'bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-400 border-fuchsia-500/25', chip: 'bg-fuchsia-500/20' },
}

const BADGE_META: Record<string, { label: string; icon: any; cls: string }> = {
  EMAS:      { label: 'Emas',      icon: Medal,   cls: 'bg-amber-500/15 text-amber-600 border-amber-500/40' },
  PERAK:     { label: 'Perak',     icon: Medal,   cls: 'bg-slate-400/15 text-slate-600 border-slate-400/40' },
  GANGSA:    { label: 'Gangsa',    icon: Medal,   cls: 'bg-orange-700/15 text-orange-700 border-orange-700/40' },
  PUJIAN:    { label: 'Pujian',    icon: Heart,   cls: 'bg-rose-500/15 text-rose-600 border-rose-500/40' },
  TERBILANG: { label: 'Terbilang', icon: Star,    cls: 'bg-fuchsia-500/15 text-fuchsia-600 border-fuchsia-500/40' },
  CEMERLANG: { label: 'Cemerlang', icon: Sparkles,cls: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/40' },
}

// ===== Main =====
export function AchievementsModule() {
  const { user } = useApp()
  const [tab, setTab] = useState('profile')

  if (!user) {
    return (
      <div className="glass-card p-6 space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  const canGive = ['HR', 'ADMIN', 'SUPERVISOR', 'EXEC'].includes(user.roleCode)

  return (
    <div className="space-y-5">
      <motion.header
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="glass-card p-5 lg:p-6 relative overflow-hidden"
      >
        <div className="absolute -right-16 -top-16 w-48 h-48 rounded-full bg-gradient-to-br from-amber-500/15 to-emerald-500/10 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-500/15 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-gradient">Pencapaian & Pengiktirafan</h1>
            <p className="text-xs text-muted-foreground">Profil peribadi, dinding pengiktirafan & anugerah staf</p>
          </div>
        </div>
      </motion.header>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="glass rounded-lg flex-wrap h-auto p-1">
          <TabsTrigger value="profile"><ShieldCheck className="w-3.5 h-3.5" /> Profil Saya</TabsTrigger>
          <TabsTrigger value="wall"><Heart className="w-3.5 h-3.5" /> Dinding Pengiktirafan</TabsTrigger>
          {canGive && (
            <TabsTrigger value="give"><Gift className="w-3.5 h-3.5" /> Beri Pencapaian</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <ProfileTab />
        </TabsContent>

        <TabsContent value="wall" className="mt-4">
          <WallTab />
        </TabsContent>

        {canGive && (
          <TabsContent value="give" className="mt-4">
            <GiveTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

/* =========================================================
   Tab 1 - Profile (PRIVATE)
   ========================================================= */
function ProfileTab() {
  const { user } = useApp()
  const [data, setData] = useState<AchData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api<AchData>(`/api/achievements?scope=self&staffId=${user?.id ?? ''}`)
      setData(d)
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal memuatkan profil pencapaian')
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => { load() }, [load])

  if (loading) {
    return <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
  }
  if (!data) return null

  const myAch = data.achievements.filter(a => !a.praise)
  const myBadges = myAch.filter(a => a.badge)

  return (
    <div className="space-y-4">
      {/* Privacy banner */}
      <Card className="glass-card p-4 border-emerald-500/20">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
            <Lock className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Skor Peribadi - SULIT</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Hanya anda, penyelia langsung dan HR boleh lihat skor ini. Tiada papan kedudukan. Tiada perbandingan antara staf.
            </p>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={Star} label="Jumlah Mata" value={fmtNumber(data.myStats.totalPoints)} color="amber" />
        <StatCard icon={Medal} label="Bilangan Lencana" value={fmtNumber(data.myStats.badgeCount)} color="fuchsia" />
        <StatCard icon={Trophy} label="Bilangan Pencapaian" value={fmtNumber(data.myStats.achievementCount)} color="emerald" />
      </div>

      {/* Badges gallery */}
      {myBadges.length > 0 && (
        <Card className="glass-card p-4">
          <h3 className="text-sm font-semibold mb-3">Galeri Lencana</h3>
          <div className="flex flex-wrap gap-3">
            {myBadges.map(a => {
              const bm = a.badge ? BADGE_META[a.badge] : null
              if (!bm) return null
              const Icon = bm.icon
              return (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border ${bm.cls} w-24`}
                >
                  <Icon className="w-6 h-6" />
                  <span className="text-[10px] font-medium text-center">{bm.label}</span>
                </motion.div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Achievements timeline */}
      <Card className="glass-card p-4">
        <h3 className="text-sm font-semibold mb-3">Sejarah Pencapaian</h3>
        {myAch.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">
            Belum ada pencapaian direkod. Teruskan usaha cemerlang!
          </p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin pr-1">
            {myAch.map((a, idx) => {
              const cm = CATEGORY_META[a.category]
              const Icon = cm.icon
              return (
                <div key={a.id} className="relative pl-6">
                  {idx < myAch.length - 1 && (
                    <span className="absolute left-2 top-3 bottom-0 w-px bg-border" />
                  )}
                  <span className={`absolute left-0 top-1.5 w-4 h-4 rounded-full ${cm.chip}`} />
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{a.title}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {fmtDate(a.date, { long: true })}
                        {a.giver && <> - oleh {a.giver.name}</>}
                      </div>
                      {a.note && <p className="text-xs text-muted-foreground mt-1">{a.note}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge variant="outline" className={`text-[10px] ${cm.cls}`}>
                        <Icon className="w-3 h-3" /> {cm.label}
                      </Badge>
                      <span className="text-xs font-semibold text-amber-600">+{a.points} mata</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* KPI section (private) */}
      {data.canViewKpi && (
        <Card className="glass-card p-4 border-rose-500/15">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-600" /> Penunjuk Prestasi (KPI)
            </h3>
            <Badge variant="outline" className="text-[10px] border-rose-500/30 text-rose-700 bg-rose-500/10">
              <Lock className="w-3 h-3" /> SULIT
            </Badge>
          </div>
          {data.kpis.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">Tiada KPI ditetapkan untuk tempoh semasa.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Penunjuk</TableHead>
                    <TableHead className="text-xs">Pemberat</TableHead>
                    <TableHead className="text-xs">Sasaran</TableHead>
                    <TableHead className="text-xs">Sebenar</TableHead>
                    <TableHead className="text-xs">Skor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.kpis.map(k => (
                    <TableRow key={k.id}>
                      <TableCell className="text-xs font-medium">{k.indicator}</TableCell>
                      <TableCell className="text-xs">{k.weight}%</TableCell>
                      <TableCell className="text-xs">{k.target}</TableCell>
                      <TableCell className="text-xs">{k.actual}</TableCell>
                      <TableCell className="text-xs">
                        {k.score != null ? `${k.score}%` : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {data.kpis.length > 0 && (
            <div className="mt-3 rounded-lg glass p-3 flex items-center justify-between">
              <div>
                <div className="text-[11px] text-muted-foreground">Skor Akhir Berpemberat</div>
                <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
                  {data.kpis[0].finalScore != null ? `${data.kpis[0].finalScore}%` : '-'}
                </div>
              </div>
              <Progress value={data.kpis[0].finalScore ?? 0} className="w-32 h-2" />
            </div>
          )}
          <p className="text-[10px] text-muted-foreground mt-3 flex items-center gap-1">
            <Lock className="w-3 h-3" /> Data KPI dan markah adalah SULIT. Jangan berkongsi dengan staf lain.
          </p>
        </Card>
      )}
    </div>
  )
}

/* =========================================================
   Tab 2 - Wall (PUBLIC, NO SCORES)
   ========================================================= */
function WallTab() {
  const [data, setData] = useState<AchData | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'SEMUA' | Category>('SEMUA')
  const [praiseFor, setPraiseFor] = useState<StaffLite | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api<AchData>('/api/achievements?scope=wall')
      setData(d)
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal memuatkan dinding pengiktirafan')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    const list = data?.achievements ?? []
    if (filter === 'SEMUA') return list
    return list.filter(a => a.category === filter)
  }, [data, filter])

  return (
    <div className="space-y-4">
      <Card className="glass-card p-4 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-gradient-to-br from-fuchsia-500/15 to-amber-500/10 blur-2xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-fuchsia-500/15 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-fuchsia-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Dinding Pengiktirafan</h3>
              <p className="text-xs text-muted-foreground">Raikan pencapaian rakan sekerja. Tiada skor dipaparkan.</p>
            </div>
          </div>
          <Button size="sm" className="bg-rose-600 hover:bg-rose-700 text-white" onClick={() => setPraiseFor({} as any)}>
            <Heart className="w-4 h-4" /> Berikan Pujian
          </Button>
        </div>
      </Card>

      {/* Filter */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setFilter('SEMUA')}
          className={`text-xs px-3 py-1.5 rounded-full border ${filter === 'SEMUA' ? 'bg-emerald-600 text-white border-emerald-600' : 'glass border-border/40 text-muted-foreground'}`}
        >
          Semua
        </button>
        {(Object.keys(CATEGORY_META) as Category[]).map(k => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`text-xs px-3 py-1.5 rounded-full border ${filter === k ? 'bg-emerald-600 text-white border-emerald-600' : 'glass border-border/40 text-muted-foreground'}`}
          >
            {CATEGORY_META[k].label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="glass-card p-10 text-center">
          <Heart className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Tiada pengiktirafan untuk ditunjukkan buat masa ini.</p>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto scrollbar-thin pr-1">
          {filtered.map(a => {
            const cm = CATEGORY_META[a.category]
            const Icon = cm.icon
            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              >
                <Card className={`glass-card p-4 border ${cm.cls}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg ${cm.chip} flex items-center justify-center shrink-0`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-semibold">{a.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Avatar className="w-5 h-5">
                          <AvatarImage src={a.staff.avatarUrl ?? undefined} />
                          <AvatarFallback className="text-[9px]">{initials(a.staff.name)}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs">{a.staff.name}</span>
                        {a.staff.department?.name && (
                          <span className="text-[10px] text-muted-foreground">- {a.staff.department.name}</span>
                        )}
                      </div>
                      {a.note && !a.praise && <p className="text-xs text-muted-foreground mt-1.5">{a.note}</p>}
                      {a.praise && a.message && (
                        <p className="text-xs italic mt-1.5">"{a.message}"</p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-muted-foreground">
                          {relTime(a.date)} oleh {a.giver?.name ?? 'Sistem'}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-[11px] text-rose-600 hover:bg-rose-500/10"
                          onClick={() => setPraiseFor(a.staff)}
                        >
                          <Heart className="w-3 h-3" /> Pujian
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      <PraiseDialog
        target={praiseFor}
        onClose={() => setPraiseFor(null)}
        onSent={() => { setPraiseFor(null); load() }}
      />
    </div>
  )
}

function PraiseDialog({
  target, onClose, onSent,
}: {
  target: StaffLite | null
  onClose: () => void
  onSent: () => void
}) {
  const [staff, setStaff] = useState<StaffLite[]>([])
  const [staffId, setStaffId] = useState<string>(target?.id ?? '')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (target) {
      setStaffId(target.id ?? '')
      setMessage('')
    }
  }, [target])

  useEffect(() => {
    if (!target) return
    api<{ staff: StaffLite[] }>('/api/staff')
      .then(d => setStaff(d.staff ?? []))
      .catch(() => {})
  }, [target])

  if (!target) return null

  async function submit() {
    if (!staffId) { toast.error('Sila pilih staf'); return }
    if (!message.trim()) { toast.error('Sila tulis ucapan pujian'); return }
    setSaving(true)
    try {
      await api('/api/achievements', {
        method: 'POST',
        body: JSON.stringify({ action: 'PRAISE', staffId, message: message.trim() }),
      })
      toast.success('Pujian berjaya dihantar')
      onSent()
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal menghantar pujian')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={!!target} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="glass-strong max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <Heart className="w-4 h-4 text-rose-600" /> Berikan Pujian
          </DialogTitle>
          <DialogDescription>Hantarkan ucapan pujian kepada rakan sekerja. Pujian adalah awam - tiada mata.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Staf</Label>
            <Select value={staffId} onValueChange={setStaffId}>
              <SelectTrigger className="glass-input"><SelectValue placeholder="Pilih staf" /></SelectTrigger>
              <SelectContent className="glass-strong max-h-64 overflow-y-auto scrollbar-thin">
                {staff.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name} {s.position ? `- ${s.position}` : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="praise-msg">Ucapan Pujian</Label>
            <Textarea
              id="praise-msg"
              className="glass-input min-h-[90px]"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Terima kasih atas komitmen cemerlang dalam projek..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button className="bg-rose-600 hover:bg-rose-700 text-white" disabled={saving} onClick={submit}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Hantar Pujian
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* =========================================================
   Tab 3 - Give Achievement (HR/Supervisor/Exec)
   ========================================================= */
function GiveTab() {
  const { user } = useApp()
  const [staff, setStaff] = useState<StaffLite[]>([])
  const [staffId, setStaffId] = useState('')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<Category>('ANUGERAH')
  const [points, setPoints] = useState('10')
  const [badge, setBadge] = useState<string>('CEMERLANG')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [recent, setRecent] = useState<Achievement[]>([])

  const load = useCallback(async () => {
    try {
      const [s, a] = await Promise.all([
        api<{ staff: StaffLite[] }>('/api/staff'),
        api<AchData>('/api/achievements?scope=all'),
      ])
      setStaff(s.staff ?? [])
      setRecent((a.achievements ?? []).slice(0, 6))
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal memuatkan data')
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function submit() {
    if (!staffId) { toast.error('Sila pilih staf'); return }
    if (!title.trim()) { toast.error('Sila isi tajuk pencapaian'); return }
    setSaving(true)
    try {
      await api('/api/achievements', {
        method: 'POST',
        body: JSON.stringify({
          action: 'GIVE',
          staffId,
          title: title.trim(),
          category,
          points: Number(points) || 0,
          badge: badge || null,
          note: note.trim() || null,
        }),
      })
      toast.success('Pencapaian berjaya direkod')
      setTitle(''); setNote(''); setPoints('10')
      await load()
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal merekod pencapaian')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      {/* Form */}
      <Card className="glass-card p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Gift className="w-4 h-4 text-emerald-600" /> Beri Pencapaian Baru
        </h3>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Staf *</Label>
            <Select value={staffId} onValueChange={setStaffId}>
              <SelectTrigger className="glass-input"><SelectValue placeholder="Pilih staf" /></SelectTrigger>
              <SelectContent className="glass-strong max-h-64 overflow-y-auto scrollbar-thin">
                {staff.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name} {s.position ? `- ${s.position}` : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ach-title">Tajuk Pencapaian *</Label>
            <Input id="ach-title" className="glass-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Anugerah Staf Cemerlang Q1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Kategori</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
                <SelectTrigger className="glass-input"><SelectValue /></SelectTrigger>
                <SelectContent className="glass-strong">
                  {(Object.keys(CATEGORY_META) as Category[]).map(k => (
                    <SelectItem key={k} value={k}>{CATEGORY_META[k].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ach-pts">Mata</Label>
              <Input id="ach-pts" type="number" min={0} className="glass-input" value={points} onChange={(e) => setPoints(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Lencana</Label>
            <Select value={badge} onValueChange={setBadge}>
              <SelectTrigger className="glass-input"><SelectValue /></SelectTrigger>
              <SelectContent className="glass-strong">
                {Object.entries(BADGE_META).map(([k, m]) => (
                  <SelectItem key={k} value={k}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ach-note">Nota</Label>
            <Textarea id="ach-note" className="glass-input min-h-[70px]" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Deskripsi pencapaian..." />
          </div>
          <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" disabled={saving} onClick={submit}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />} Rekod Pencapaian
          </Button>
        </div>
      </Card>

      {/* Recent given */}
      <Card className="glass-card p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-600" /> Pencapaian Terkini Direkod
        </h3>
        {recent.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">Belum ada pencapaian direkod.</p>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto scrollbar-thin pr-1">
            {recent.map(a => {
              const cm = CATEGORY_META[a.category]
              const Icon = cm.icon
              const isMine = a.giver?.id === user?.id
              return (
                <div key={a.id} className="rounded-lg glass p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{a.title}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {a.staff.name} - {fmtDate(a.date)}
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-[10px] ${cm.cls}`}>
                      <Icon className="w-3 h-3" /> {cm.label}
                    </Badge>
                  </div>
                  {isMine && (
                    <div className="mt-1 text-[10px] text-emerald-600">Direkod oleh anda</div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
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
