'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Settings, Users, Database, CalendarDays, History, Plus, Save, Search,
  Loader2, Mail, Phone, Building2, MapPin, Trophy, LayoutGrid,
  ShieldAlert, Download, Filter, Network,
} from 'lucide-react'
import { api, useApp } from '@/lib/store'
import { toast } from 'sonner'
import { fmtDate, initials } from '@/lib/format'
import { ROLE_LABELS } from '@/lib/rbac'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

const ROLE_BADGE: Record<string, string> = {
  ADMIN: 'bg-rose-500/15 text-rose-700 border-rose-500/30',
  HR: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
  SUPERVISOR: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  EXEC: 'bg-fuchsia-500/15 text-fuchsia-700 border-fuchsia-500/30',
  STAFF: 'bg-slate-500/15 text-slate-700 border-slate-500/30',
}

const AUDIT_LABELS: Record<string, string> = {
  LOG_MASUK: 'Log Masuk',
  LULUS_CUTI: 'Lulus Cuti',
  TOLAK_CUTI: 'Tolak Cuti',
  MUAT_NAIK_DOKUMEN: 'Muat Naik Dokumen',
  PADAM_DOKUMEN: 'Padam Dokumen',
  TUKAR_KATA_LALUAN: 'Tukar Kata Laluan',
  KEMASKINI_TETAPAN: 'Kemaskini Tetapan',
}

export function AdminModule() {
  const { user } = useApp()
  const isHrAdmin = user && ['HR', 'ADMIN'].includes(user.roleCode)

  return (
    <div className="space-y-4">
      <div className="glass-card p-5 lg:p-6 relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-44 h-44 rounded-full bg-gradient-to-br from-amber-500/15 to-rose-500/10 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-rose-600 flex items-center justify-center text-white shadow-md">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-gradient">Pentadbiran</h1>
            <p className="text-xs text-muted-foreground">Direktori staf, data induk, cuti umum, tetapan sistem dan log audit.</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="directory" className="w-full">
        <ScrollArea className="w-full whitespace-nowrap">
          <TabsList className="inline-flex w-auto h-auto p-1">
            <TabsTrigger value="directory" className="gap-1.5"><Users className="w-3.5 h-3.5" /> Direktori Staf</TabsTrigger>
            <TabsTrigger value="master" className="gap-1.5"><Database className="w-3.5 h-3.5" /> Data Induk</TabsTrigger>
            <TabsTrigger value="holidays" className="gap-1.5"><CalendarDays className="w-3.5 h-3.5" /> Cuti Umum</TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5"><Settings className="w-3.5 h-3.5" /> Tetapan</TabsTrigger>
            {isHrAdmin && (
              <TabsTrigger value="audit" className="gap-1.5"><History className="w-3.5 h-3.5" /> Log Audit</TabsTrigger>
            )}
          </TabsList>
        </ScrollArea>

        <TabsContent value="directory"><DirectoryTab /></TabsContent>
        <TabsContent value="master"><MasterTab /></TabsContent>
        <TabsContent value="holidays"><HolidaysTab canEdit={!!isHrAdmin} /></TabsContent>
        <TabsContent value="settings"><SettingsTab canEdit={!!isHrAdmin} /></TabsContent>
        {isHrAdmin && <TabsContent value="audit"><AuditTab /></TabsContent>}
      </Tabs>
    </div>
  )
}

/* ============ Tab 1: Direktori Staf ============ */
function DirectoryTab() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [deptFilter, setDeptFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState('all')
  const [view, setView] = useState<'cards' | 'org'>('cards')
  const [selected, setSelected] = useState<any>(null)
  const setModule = useApp(s => s.setActiveModule)

  useEffect(() => { load() }, [])
  async function load() {
    setLoading(true)
    try {
      const d = await api('/api/admin?scope=master')
      setData(d)
    } catch (e: any) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  const filtered = useMemo(() => {
    if (!data?.staffDirectory) return []
    return data.staffDirectory.filter((s: any) => {
      const ql = q.toLowerCase()
      const matchesQ = !ql ||
        s.name.toLowerCase().includes(ql) ||
        (s.position ?? '').toLowerCase().includes(ql) ||
        (s.email ?? '').toLowerCase().includes(ql) ||
        (s.staffNo ?? '').toLowerCase().includes(ql)
      const matchesD = deptFilter === 'all' || s.department?.id === deptFilter
      const matchesR = roleFilter === 'all' || s.roleCode === roleFilter
      return matchesQ && matchesD && matchesR
    })
  }, [data, q, deptFilter, roleFilter])

  if (loading) {
    return <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{[1, 2, 3].map(i => <div key={i} className="glass-card h-40 animate-pulse" />)}</div>
  }

  return (
    <div className="space-y-4">
      <div className="glass-card p-3 flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="glass-input pl-9"
            placeholder="Cari nama, jawatan, emel atau no. staf..."
            value={q}
            onChange={e => setQ(e.target.value)}
            aria-label="Carian staf"
          />
        </div>
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="glass-input w-full sm:w-48"><SelectValue placeholder="Jabatan" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Jabatan</SelectItem>
            {(data?.departments ?? []).map((d: any) => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="glass-input w-full sm:w-44"><SelectValue placeholder="Peranan" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Peranan</SelectItem>
            {Object.entries(ROLE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-1 border rounded-md p-0.5">
          <Button size="sm" variant={view === 'cards' ? 'default' : 'ghost'} onClick={() => setView('cards')} className={view === 'cards' ? 'bg-emerald-600 hover:bg-emerald-700' : ''} aria-label="Paparan kad">
            <LayoutGrid className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" variant={view === 'org' ? 'default' : 'ghost'} onClick={() => setView('org')} className={view === 'org' ? 'bg-emerald-600 hover:bg-emerald-700' : ''} aria-label="Paparan carta organisasi">
            <Network className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="glass-card p-10 text-center text-sm text-muted-foreground">Tiada staf dijumpai untuk penapis ini.</div>
      ) : view === 'cards' ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[70vh] overflow-y-auto scrollbar-thin pr-1">
          {filtered.map((s: any, i: number) => (
            <motion.div key={s.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
              <Card className="glass-card p-4 cursor-pointer" onClick={() => setSelected(s)}>
                <div className="flex items-start gap-3">
                  <Avatar className="w-11 h-11 ring-2 ring-emerald-500/20">
                    <AvatarImage src={s.avatarUrl ?? undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-xs">{initials(s.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{s.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{s.position}</p>
                    <div className="flex flex-wrap items-center gap-1 mt-1">
                      <Badge className={`${ROLE_BADGE[s.roleCode] ?? ROLE_BADGE.STAFF} text-[9px]`}>{ROLE_LABELS[s.roleCode as keyof typeof ROLE_LABELS] ?? s.roleCode}</Badge>
                      {s.department && <Badge variant="outline" className="text-[9px]">{s.department.name}</Badge>}
                    </div>
                  </div>
                </div>
                <Separator className="my-2" />
                <div className="space-y-1 text-[11px] text-muted-foreground">
                  <p className="flex items-center gap-1.5"><Mail className="w-3 h-3" /> <span className="truncate">{s.email ?? '-'}</span></p>
                  <p className="flex items-center gap-1.5"><Phone className="w-3 h-3" /> {s.phone ?? '-'}</p>
                  <p className="flex items-center gap-1.5"><CalendarDays className="w-3 h-3" /> Sertai: {s.joinDate ? fmtDate(s.joinDate) : '-'}</p>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <OrgChartView departments={data?.departments ?? []} staff={filtered} />
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Profil Staf</DialogTitle>
            <DialogDescription>Maklumat terperinci staf</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Avatar className="w-14 h-14 ring-2 ring-emerald-500/20">
                  <AvatarImage src={selected.avatarUrl ?? undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white">{initials(selected.name)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{selected.name}</p>
                  <p className="text-xs text-muted-foreground">{selected.staffNo}</p>
                  <Badge className={`${ROLE_BADGE[selected.roleCode] ?? ROLE_BADGE.STAFF} text-[10px] mt-1`}>
                    {ROLE_LABELS[selected.roleCode as keyof typeof ROLE_LABELS] ?? selected.roleCode}
                  </Badge>
                </div>
              </div>
              <Separator />
              <DetailRow label="Jawatan" value={selected.position} />
              <DetailRow label="Jabatan" value={selected.department?.name ?? '-'} />
              <DetailRow label="Emel" value={selected.email ?? '-'} />
              <DetailRow label="Telefon" value={selected.phone ?? '-'} />
              <DetailRow label="Penyelia Langsung" value={selected.supervisor?.name ?? '-'} />
              <DetailRow label="Tarikh Sertai" value={selected.joinDate ? fmtDate(selected.joinDate) : '-'} />
              <DetailRow label="Status" value={selected.status ?? '-'} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>Tutup</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 gap-1.5" onClick={() => { setModule('achievements'); setSelected(null) }}>
              <Trophy className="w-3.5 h-3.5" /> Lihat Pencapaian
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  )
}

function OrgChartView({ departments, staff }: { departments: any[]; staff: any[] }) {
  return (
    <div className="max-h-[70vh] overflow-y-auto scrollbar-thin">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {departments.map((d: any) => {
          const members = staff.filter((s: any) => s.department?.id === d.id)
          const head = members.find((s: any) => s.roleCode === 'SUPERVISOR') ?? members[0]
          const rest = members.filter((s: any) => s !== head)
          return (
            <Card key={d.id} className="glass-card p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                <p className="text-sm font-semibold truncate">{d.name}</p>
              </div>
              {head && (
                <div className="rounded-md bg-emerald-500/10 border border-emerald-500/20 p-2 mb-2">
                  <p className="text-[10px] text-emerald-700 uppercase">Ketua</p>
                  <p className="text-xs font-medium truncate">{head.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{head.position}</p>
                </div>
              )}
              <div className="space-y-1">
                {rest.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground text-center py-2">Tiada ahli lain</p>
                ) : rest.map((s: any) => (
                  <div key={s.id} className="flex items-center gap-2 py-1 px-1.5 rounded hover:bg-muted/40">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-xs truncate flex-1">{s.name}</span>
                    <span className="text-[10px] text-muted-foreground truncate">{s.position}</span>
                  </div>
                ))}
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

/* ============ Tab 2: Data Induk ============ */
function MasterTab() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api('/api/admin?scope=master').then(setData).catch((e) => toast.error(e.message)).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="grid sm:grid-cols-2 gap-3">{[1, 2].map(i => <div key={i} className="glass-card h-40 animate-pulse" />)}</div>
  if (!data) return <div className="glass-card p-6 text-sm text-muted-foreground">Tiada data.</div>

  return (
    <div className="space-y-4">
      <Alert className="border-amber-500/30 bg-amber-500/5">
        <ShieldAlert className="w-4 h-4 text-amber-600" />
        <AlertDescription className="text-xs">Pindaan data induk tersedia pada Fasa 2. Paparan ini adalah bacaan sahaja.</AlertDescription>
      </Alert>

      <div className="grid lg:grid-cols-3 gap-3">
        <Card className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-semibold">Jabatan</h3>
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-thin">
            {data.departments?.map((d: any) => (
              <div key={d.id} className="rounded-md border border-border/40 p-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{d.name}</p>
                    <p className="text-[10px] text-muted-foreground">{d.code}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{d._count?.staff ?? 0} staf</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Ketua: {d.head?.name ?? '-'}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-semibold">Jenis Cuti</h3>
          </div>
          <div className="space-y-2">
            {data.leaveTypes?.map((t: any) => (
              <div key={t.code} className="flex items-center justify-between rounded-md border border-border/40 p-2">
                <span className="text-sm">{t.label}</span>
                <Badge variant="outline" className="text-[10px]">{t.code}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Database className="w-4 h-4 text-fuchsia-600" />
            <h3 className="text-sm font-semibold">Kategori Kursus</h3>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {data.courseCategories?.map((c: string) => (
              <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

/* ============ Tab 3: Cuti Umum ============ */
function HolidaysTab({ canEdit }: { canEdit: boolean }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', date: '', type: 'PERSEKUTUAN', state: '' })

  useEffect(() => { load() }, [])
  async function load() {
    setLoading(true)
    try {
      const d = await api('/api/admin?scope=master')
      setData(d)
    } catch (e: any) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  async function addHoliday() {
    if (!form.name || !form.date) { toast.error('Nama dan tarikh diperlukan'); return }
    setSaving(true)
    try {
      await api('/api/admin', {
        method: 'POST',
        body: JSON.stringify({
          action: 'ADD_HOLIDAY',
          name: form.name,
          date: form.date,
          type: form.type,
          state: form.state || undefined,
        }),
      })
      toast.success('Cuti umum ditambah')
      setDialogOpen(false)
      setForm({ name: '', date: '', type: 'PERSEKUTUAN', state: '' })
      load()
    } catch (e: any) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  const grouped = useMemo(() => {
    const holidays = data?.holidays ?? []
    const byYear: Record<string, any[]> = {}
    for (const h of holidays) {
      const y = new Date(h.date).getFullYear().toString()
      if (!byYear[y]) byYear[y] = []
      byYear[y].push(h)
    }
    return Object.entries(byYear).sort((a, b) => Number(b[0]) - Number(a[0]))
  }, [data])

  if (loading) return <div className="glass-card h-60 animate-pulse" />

  return (
    <div className="space-y-3">
      {canEdit && (
        <div className="flex justify-end">
          <Button onClick={() => setDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 gap-1.5">
            <Plus className="w-4 h-4" /> Tambah Cuti Umum
          </Button>
        </div>
      )}

      {grouped.length === 0 ? (
        <div className="glass-card p-10 text-center text-sm text-muted-foreground">Tiada cuti umum direkodkan.</div>
      ) : (
        grouped.map(([year, items]) => (
          <Card key={year} className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-semibold">{year}</h3>
              <Badge variant="outline" className="text-[10px] ml-auto">{items.length} hari</Badge>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              {items.map((h: any) => (
                <div key={h.id} className="flex items-center gap-2 rounded-md border border-border/40 p-2">
                  <div className="text-center px-2">
                    <p className="text-[10px] text-muted-foreground uppercase">{new Date(h.date).toLocaleString('ms-MY', { month: 'short' })}</p>
                    <p className="text-base font-bold leading-tight">{new Date(h.date).getDate()}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{h.name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {h.type === 'PERSEKUTUAN' ? (
                        <Badge className="bg-fuchsia-500/15 text-fuchsia-700 border-fuchsia-500/30 text-[9px]">Persekutuan</Badge>
                      ) : (
                        <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30 text-[9px]">Negeri Selangor</Badge>
                      )}
                      {h.state && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" /> {h.state}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Cuti Umum</DialogTitle>
            <DialogDescription>Isi maklumat cuti umum baharu</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Nama Cuti</Label>
              <Input className="glass-input mt-1" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Contoh: Hari Kebangsaan" />
            </div>
            <div>
              <Label className="text-xs">Tarikh</Label>
              <Input type="date" className="glass-input mt-1" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Jenis</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger className="glass-input mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERSEKUTUAN">Persekutuan</SelectItem>
                  <SelectItem value="NEGERI_SELANGOR">Negeri Selangor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.type === 'NEGERI_SELANGOR' && (
              <div>
                <Label className="text-xs">Negeri (pilihan)</Label>
                <Input className="glass-input mt-1" value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} placeholder="Contoh: Selangor" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={addHoliday} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 gap-1.5">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ============ Tab 4: Tetapan ============ */
function SettingsTab({ canEdit }: { canEdit: boolean }) {
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState<Record<string, any>>({})

  useEffect(() => { load() }, [])
  async function load() {
    setLoading(true)
    try {
      const d = await api('/api/admin?scope=settings')
      const s = d.settings ?? {}
      setSettings(s)
      setDraft({
        bahasa: s.bahasa ?? 'BM',
        timezone: s.timezone ?? 'Asia/Kuala_Lumpur',
        dateFormat: s.dateFormat ?? 'DD/MM/YYYY',
        currency: s.currency ?? 'RM',
        docQuotaGB: Number(s.docQuotaGB ?? 10),
        maxFileMB: Number(s.maxFileMB ?? 100),
        workStart: s.workStart ?? '09:00',
        workEnd: s.workEnd ?? '18:00',
        weeklyMaxHours: Number(s.weeklyMaxHours ?? 48),
        companyName: s.companyName ?? 'Al-Amin Emall Sdn Bhd',
      })
    } catch (e: any) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  async function save() {
    setSaving(true)
    try {
      const changed = Object.keys(draft).filter(k => draft[k] !== (settings?.[k] ?? defaultsFor(k)))
      for (const k of changed) {
        await api('/api/admin', { method: 'POST', body: JSON.stringify({ action: 'UPDATE_SETTING', key: k, value: draft[k] }) })
      }
      toast.success(`Tetapan disimpan (${changed.length} perubahan)`)
      load()
    } catch (e: any) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  if (loading) return <div className="glass-card h-60 animate-pulse" />

  return (
    <div className="space-y-4">
      <Alert className="border-emerald-500/30 bg-emerald-500/5">
        <Settings className="w-4 h-4 text-emerald-600" />
        <AlertDescription className="text-xs">
          Sistem dikonfigurasi untuk Malaysia — zon masa Asia/Kuala_Lumpur, format tarikh DD/MM/YYYY, mata wang RM.
        </AlertDescription>
      </Alert>

      <Card className="glass-card p-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Bahasa Sistem</Label>
            {canEdit ? (
              <RadioGroup
                value={draft.bahasa}
                onValueChange={(v) => setDraft({ ...draft, bahasa: v })}
                className="flex gap-4 mt-2"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="BM" id="bm" />
                  <Label htmlFor="bm" className="text-sm font-normal cursor-pointer">Bahasa Malaysia</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="EN" id="en" />
                  <Label htmlFor="en" className="text-sm font-normal cursor-pointer">English</Label>
                </div>
              </RadioGroup>
            ) : (
              <p className="text-sm mt-2">{draft.bahasa === 'BM' ? 'Bahasa Malaysia' : 'English'}</p>
            )}
          </div>

          <ReadonlyField label="Zon Masa" value="Asia/Kuala_Lumpur (UTC+8)" />
          <ReadonlyField label="Format Tarikh" value="DD/MM/YYYY" />
          <ReadonlyField label="Mata Wang" value="RM (MYR)" />
          <ReadonlyField label="Waktu Kerja" value={`${draft.workStart} - ${draft.workEnd}`} />

          <EditableField label="Kuota Dokumen (GB)" canEdit={canEdit}
            value={draft.docQuotaGB} onChange={(v) => setDraft({ ...draft, docQuotaGB: Number(v) })} type="number" />
          <EditableField label="Saiz Fail Maksimum (MB)" canEdit={canEdit}
            value={draft.maxFileMB} onChange={(v) => setDraft({ ...draft, maxFileMB: Number(v) })} type="number" />
          <EditableField label="Had Jam Mingguan" canEdit={canEdit}
            value={draft.weeklyMaxHours} onChange={(v) => setDraft({ ...draft, weeklyMaxHours: Number(v) })} type="number" />
          <EditableField label="Nama Syarikat" canEdit={canEdit}
            value={draft.companyName} onChange={(v) => setDraft({ ...draft, companyName: v })} />
        </div>

        {canEdit && (
          <>
            <Separator className="my-4" />
            <div className="flex justify-end">
              <Button onClick={save} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 gap-1.5">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Simpan Tetapan
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}

function defaultsFor(key: string) {
  const d: Record<string, any> = {
    bahasa: 'BM', timezone: 'Asia/Kuala_Lumpur', dateFormat: 'DD/MM/YYYY', currency: 'RM',
    docQuotaGB: 10, maxFileMB: 100, workStart: '09:00', workEnd: '18:00',
    weeklyMaxHours: 48, companyName: 'Al-Amin Emall Sdn Bhd',
  }
  return d[key]
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1 px-3 py-2 rounded-md border border-border/40 bg-muted/20 text-sm text-muted-foreground">
        {value}
      </div>
    </div>
  )
}

function EditableField({ label, value, onChange, canEdit, type = 'text' }: {
  label: string; value: any; onChange: (v: string) => void; canEdit: boolean; type?: string
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      {canEdit ? (
        <Input type={type} className="glass-input mt-1" value={value} onChange={e => onChange(e.target.value)} />
      ) : (
        <div className="mt-1 px-3 py-2 rounded-md border border-border/40 bg-muted/20 text-sm text-muted-foreground">
          {value}
        </div>
      )}
    </div>
  )
}

/* ============ Tab 5: Log Audit ============ */
function AuditTab() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [actionFilter, setActionFilter] = useState('all')

  useEffect(() => { load() }, [])
  async function load() {
    setLoading(true)
    try {
      const d = await api('/api/admin?scope=audit')
      setLogs(d.logs ?? [])
    } catch (e: any) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  const filtered = actionFilter === 'all' ? logs : logs.filter(l => l.action === actionFilter)

  function exportCSV() {
    if (!filtered.length) { toast.info('Tiada data untuk dieksport'); return }
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const header = ['Tarikh/Masa', 'Pelaku', 'No. Staf', 'Tindakan', 'Butiran'].map(esc).join(',')
    const body = filtered.map(l => [
      fmtDate(l.createdAt, { withTime: true }),
      l.actor?.name ?? '-',
      l.actor?.staffNo ?? '-',
      AUDIT_LABELS[l.action] ?? l.action,
      l.detail ?? '',
    ].map(esc).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + header + '\n' + body], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `log-audit-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Log audit dieksport')
  }

  if (loading) return <div className="glass-card h-60 animate-pulse" />

  return (
    <div className="space-y-3">
      <div className="glass-card p-3 flex flex-col sm:flex-row sm:items-end gap-2">
        <div className="flex-1">
          <Label className="text-xs"><Filter className="w-3 h-3 inline mr-1" /> Tapis Tindakan</Label>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="glass-input mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tindakan</SelectItem>
              {Object.entries(AUDIT_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5">
          <Download className="w-3.5 h-3.5" /> Eksport CSV
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="glass-card p-10 text-center text-sm text-muted-foreground">Tiada log audit dalam penapis ini.</div>
      ) : (
        <Card className="glass-card p-0 overflow-hidden">
          <ScrollArea className="max-h-[65vh] scrollbar-thin">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarikh/Masa</TableHead>
                  <TableHead>Pelaku</TableHead>
                  <TableHead>Tindakan</TableHead>
                  <TableHead>Butiran</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((l, i) => (
                  <TableRow key={l.id ?? i}>
                    <TableCell className="whitespace-nowrap text-xs">{fmtDate(l.createdAt, { withTime: true })}</TableCell>
                    <TableCell className="font-medium text-sm">{l.actor?.name ?? '-'} <span className="text-[10px] text-muted-foreground">({l.actor?.staffNo ?? '-'})</span></TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{AUDIT_LABELS[l.action] ?? l.action}</Badge></TableCell>
                    <TableCell className="text-xs">{l.detail ?? '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      )}
      <p className="text-[11px] text-muted-foreground text-center">Menunjukkan 100 log terkini.</p>
    </div>
  )
}
