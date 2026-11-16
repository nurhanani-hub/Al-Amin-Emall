'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Sparkles, FileText, GraduationCap, ClipboardList,
  Bot, History, Copy, Check, Save, Lock, AlertTriangle, Send,
  Loader2, User, ChevronDown, ChevronRight, ShieldCheck, FileCheck2,
} from 'lucide-react'
import { api, useApp } from '@/lib/store'
import { toast } from 'sonner'
import { fmtDate, relTime } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import ReactMarkdown from 'react-markdown'

type AiOutput = {
  id: string
  type: string
  input: string
  output: string
  userId: string
  reviewed: boolean
  createdAt: string
}

const MATERIAL_OPTIONS: { value: string; label: string }[] = [
  { value: 'surat_tawaran', label: 'Surat Tawaran Kerja' },
  { value: 'surat_amaran', label: 'Surat Amaran' },
  { value: 'memo', label: 'Memo Dalaman' },
  { value: 'polisi', label: 'Draf Polisi' },
  { value: 'perihal_tugas', label: 'Perihal Tugas (Job Description)' },
  { value: 'skrip_orientasi', label: 'Skrip Orientasi Staf Baharu' },
]

const TYPE_LABEL: Record<string, string> = {
  BAHAN_HR: 'Bahan HR',
  CADANGAN_KURSUS: 'Cadangan Kursus',
  RINGKASAN_MESYUARAT: 'Ringkasan Mesyuarat',
  CHATBOT: 'Chatbot HR',
  IDP: 'Pelan IDP',
}

const QUICK_QUESTIONS = [
  'Berapa hari cuti tahunan saya?',
  'Bagaimana permohonan cuti sakit?',
  'Apakah waktu kerja?',
  'Berapa kuota dokumen saya?',
]

export function AiModule() {
  const { user } = useApp()
  return (
    <div className="space-y-4">
      <div className="glass-card p-5 lg:p-6 relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-44 h-44 rounded-full bg-gradient-to-br from-emerald-500/15 to-teal-500/10 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-gradient">Pembantu AI HR</h1>
            <p className="text-xs text-muted-foreground">
              Jana bahan HR, cadangan kursus, ringkasan mesyuarat dan IDP — semua output perlu semakan manusia.
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="material" className="w-full">
        <ScrollArea className="w-full whitespace-nowrap">
          <TabsList className="inline-flex w-auto h-auto p-1">
            <TabsTrigger value="material" className="gap-1.5"><FileText className="w-3.5 h-3.5" /> Penjana Bahan HR</TabsTrigger>
            <TabsTrigger value="courses" className="gap-1.5"><GraduationCap className="w-3.5 h-3.5" /> Cadangan Kursus</TabsTrigger>
            <TabsTrigger value="meeting" className="gap-1.5"><ClipboardList className="w-3.5 h-3.5" /> Ringkasan Mesyuarat</TabsTrigger>
            <TabsTrigger value="chatbot" className="gap-1.5"><Bot className="w-3.5 h-3.5" /> Chatbot HR</TabsTrigger>
            <TabsTrigger value="idp" className="gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Pelan IDP</TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5"><History className="w-3.5 h-3.5" /> Sejarah Output</TabsTrigger>
          </TabsList>
        </ScrollArea>

        <TabsContent value="material"><MaterialTab /></TabsContent>
        <TabsContent value="courses"><CoursesTab /></TabsContent>
        <TabsContent value="meeting"><MeetingTab /></TabsContent>
        <TabsContent value="chatbot"><ChatbotTab /></TabsContent>
        <TabsContent value="idp"><IdpTab /></TabsContent>
        <TabsContent value="history"><HistoryTab /></TabsContent>
      </Tabs>

      <p className="text-[11px] text-muted-foreground text-center">
        Output AI adalah draf. Semakan manusia wajib sebelum digunakan untuk keputusan HR.
      </p>
    </div>
  )
}

/* ============ AI Label & Disclaimer ============ */
function AiLabel({ sulit }: { sulit?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-2">
      <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30 gap-1">
        <Sparkles className="w-3 h-3" /> Dijana AI
      </Badge>
      <Badge variant="outline" className="text-amber-700 border-amber-500/40 gap-1">
        <AlertTriangle className="w-3 h-3" /> Perlu semakan manusia
      </Badge>
      {sulit && (
        <Badge className="bg-rose-500/15 text-rose-700 border-rose-500/30 gap-1">
          <Lock className="w-3 h-3" /> SULIT
        </Badge>
      )}
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      variant="outline" size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setCopied(true)
          toast.success('Disalin ke papan keratan')
          setTimeout(() => setCopied(false), 1500)
        } catch { toast.error('Gagal menyalin') }
      }}
      className="gap-1.5"
      aria-label="Salin output"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Disalin' : 'Salin'}
    </Button>
  )
}

function MarkdownView({ source }: { source: string }) {
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-foreground prose-a:text-emerald-600 prose-strong:text-foreground">
      <ReactMarkdown>{source}</ReactMarkdown>
    </div>
  )
}

function LoadingHint({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
      <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
      {label}
    </div>
  )
}

/* ============ Tab 1: Material HR ============ */
function MaterialTab() {
  const [materialType, setMaterialType] = useState('surat_tawaran')
  const [language, setLanguage] = useState<'BM' | 'EN'>('BM')
  const [context, setContext] = useState('')
  const [output, setOutput] = useState('')
  const [label, setLabel] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  async function generate() {
    setLoading(true); setOutput('')
    try {
      const d = await api<{ output: string; label: string }>('/api/ai', {
        method: 'POST',
        body: JSON.stringify({ action: 'GENERATE_HR_MATERIAL', materialType, language, context }),
      })
      setOutput(d.output); setLabel(d.label)
      toast.success('Draf dijana')
    } catch (e: any) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  async function saveReviewed() {
    if (!output) return
    setSaving(true)
    try {
      // The API already saved during generation; mark the latest as reviewed by fetching history.
      // Simpler: re-call MARK_REVIEWED against latest output via history fetch.
      const hist = await api<{ outputs: AiOutput[] }>('/api/ai')
      const latest = hist.outputs[0]
      if (!latest) throw new Error('Tiada output untuk disimpan')
      await api('/api/ai', { method: 'POST', body: JSON.stringify({ action: 'MARK_REVIEWED', outputId: latest.id }) })
      toast.success('Disimpan dan ditandai disemak')
    } catch (e: any) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid lg:grid-cols-2 gap-4">
      <div className="glass-card p-5 space-y-4">
        <div>
          <Label className="text-xs">Jenis Bahan HR</Label>
          <Select value={materialType} onValueChange={setMaterialType}>
            <SelectTrigger className="glass-input mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MATERIAL_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Bahasa</Label>
          <div className="flex gap-2 mt-1">
            {(['BM', 'EN'] as const).map(l => (
              <Button
                key={l} size="sm" variant={language === l ? 'default' : 'outline'}
                onClick={() => setLanguage(l)}
                className={language === l ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
              >
                {l === 'BM' ? 'Bahasa Malaysia' : 'English'}
              </Button>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-xs">Konteks Tambahan (pilihan)</Label>
          <Textarea
            className="glass-input mt-1 min-h-[120px]"
            placeholder="Contoh: Jawatan Eksekutif Jualan, gaji RM4,500, mula 1 Mac 2025, lokasi Shah Alam..."
            value={context}
            onChange={e => setContext(e.target.value)}
          />
        </div>
        <Button onClick={generate} disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {loading ? 'AI sedang menjana...' : 'Jana Draf'}
        </Button>
        <Alert className="border-amber-500/30 bg-amber-500/5">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <AlertTitle className="text-sm">Peringatan</AlertTitle>
          <AlertDescription className="text-xs">
            Output AI adalah draf. Semakan manusia wajib sebelum digunakan untuk keputusan HR.
          </AlertDescription>
        </Alert>
      </div>

      <div className="glass-card p-5 min-h-[400px]">
        <AiLabel />
        {loading ? <LoadingHint label="AI sedang menjana draf..." /> :
          output ? (
            <div className="space-y-3">
              <div className="max-h-[60vh] overflow-y-auto scrollbar-thin pr-2">
                <MarkdownView source={output} />
              </div>
              <Separator />
              <div className="flex flex-wrap gap-2">
                <CopyButton text={output} />
                <Button onClick={saveReviewed} disabled={saving} size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Simpan & Tandai Disemak
                </Button>
              </div>
            </div>
          ) : (
            <EmptyState icon={FileText} text={'Belum ada draf. Isi borang di sebelah kiri dan tekan "Jana Draf".'} />
          )
        }
      </div>
    </motion.div>
  )
}

/* ============ Tab 2: Cadangan Kursus ============ */
function CoursesTab() {
  const { user } = useApp()
  const isHrOrSup = user && ['HR', 'SUPERVISOR', 'ADMIN'].includes(user.roleCode)
  const [staffList, setStaffList] = useState<any[]>([])
  const [staffId, setStaffId] = useState(user?.id ?? '')
  const [recs, setRecs] = useState<any[]>([])
  const [raw, setRaw] = useState('')
  const [loading, setLoading] = useState(false)
  const setModule = useApp(s => s.setActiveModule)

  useEffect(() => {
    if (isHrOrSup) {
      api<{ staff: any[] }>('/api/staff').then(d => setStaffList(d.staff ?? [])).catch(() => {})
    }
  }, [isHrOrSup])

  useEffect(() => {
    if (user && !staffId) setStaffId(user.id)
  }, [user, staffId])

  async function generate() {
    setLoading(true); setRecs([])
    try {
      const d = await api<{ recommendations: any[]; raw: string }>('/api/ai', {
        method: 'POST',
        body: JSON.stringify({ action: 'RECOMMEND_COURSES', staffId }),
      })
      setRecs(d.recommendations ?? [])
      setRaw(d.raw ?? '')
      if (!d.recommendations?.length) toast.info('Tiada cadangan kursus dijana untuk profil ini')
    } catch (e: any) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  const priorityClass: Record<string, string> = {
    'Tinggi': 'bg-rose-500/15 text-rose-700 border-rose-500/30',
    'Sederhana': 'bg-amber-500/15 text-amber-700 border-amber-500/30',
    'Tahap': 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="glass-card p-4 flex flex-col sm:flex-row sm:items-end gap-3">
        {isHrOrSup && (
          <div className="flex-1">
            <Label className="text-xs">Pilih Staf</Label>
            <Select value={staffId} onValueChange={setStaffId}>
              <SelectTrigger className="glass-input mt-1"><SelectValue placeholder="Pilih staf" /></SelectTrigger>
              <SelectContent>
                {staffList.map(s => <SelectItem key={s.id} value={s.id}>{s.name} — {s.staffNo}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        <Button onClick={generate} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GraduationCap className="w-4 h-4" />}
          {loading ? 'Menjana cadangan...' : 'Jana Cadangan'}
        </Button>
      </div>

      <Alert className="border-emerald-500/30 bg-emerald-500/5">
        <ShieldCheck className="w-4 h-4 text-emerald-600" />
        <AlertDescription className="text-xs">
          Cadangan menggunakan data anonim (jawatan, kemahiran, sejarah latihan) untuk menghormati privasi staf.
        </AlertDescription>
      </Alert>

      {loading ? <div className="glass-card p-6"><LoadingHint label="AI menganalisis profil dan katalog kursus..." /></div> :
        recs.length ? (
          <div className="grid md:grid-cols-2 gap-3">
            {recs.map((r, i) => {
              const c = r.course
              if (!c) return null
              return (
                <motion.div key={r.courseId ?? i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <Card className="glass-card p-4 h-full flex flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm">{c.title}</p>
                        <Badge variant="outline" className="mt-1 text-[10px]">{c.category}</Badge>
                      </div>
                      <Badge className={(priorityClass[r.priority] ?? priorityClass['Tahap']) + ' text-[10px]'}>
                        {r.priority ?? 'Tahap'}
                      </Badge>
                    </div>
                    <div className="mt-3 rounded-md bg-amber-500/10 border border-amber-500/20 p-2.5">
                      <p className="text-[10px] text-amber-700 uppercase tracking-wide mb-0.5">Sebab Cadangan</p>
                      <p className="text-xs text-foreground">{r.reason}</p>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                      <span>Tarikh: {fmtDate(c.startDate)}</span>
                      <span>Tempoh: {c.durationHrs}j</span>
                      <span>Kaedah: {c.method}</span>
                      <span>Status: {c.status}</span>
                    </div>
                    <Button
                      size="sm" className="mt-3 bg-emerald-600 hover:bg-emerald-700 gap-1.5"
                      onClick={() => setModule('training')}
                    >
                      <GraduationCap className="w-3.5 h-3.5" /> Daftar Sekarang
                    </Button>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        ) : (
          <div className="glass-card p-6">
            <EmptyState icon={GraduationCap} text={'Tekan "Jana Cadangan" untuk menerima 3-5 kursus yang sesuai dengan profil dan matlamat kerjaya.'} />
          </div>
        )
      }
      {raw && <details className="glass-card p-3 text-xs"><summary className="cursor-pointer text-muted-foreground">Respon mentah AI</summary><pre className="mt-2 whitespace-pre-wrap">{raw}</pre></details>}
    </motion.div>
  )
}

/* ============ Tab 3: Ringkasan Mesyuarat ============ */
function MeetingTab() {
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)

  async function generate() {
    if (!notes.trim()) { toast.error('Nota/transkrip mesyuarat diperlukan'); return }
    setLoading(true); setOutput('')
    try {
      const d = await api<{ output: string }>('/api/ai', {
        method: 'POST',
        body: JSON.stringify({ action: 'SUMMARIZE_MEETING', notes, meetingTitle: title }),
      })
      setOutput(d.output)
      toast.success('Ringkasan dijana')
    } catch (e: any) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  async function markReviewed() {
    try {
      const hist = await api<{ outputs: AiOutput[] }>('/api/ai')
      const latest = hist.outputs[0]
      if (!latest) return
      await api('/api/ai', { method: 'POST', body: JSON.stringify({ action: 'MARK_REVIEWED', outputId: latest.id }) })
      toast.success('Disimpan dan ditandai disemak')
    } catch (e: any) { toast.error(e.message) }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid lg:grid-cols-2 gap-4">
      <div className="glass-card p-5 space-y-3">
        <div>
          <Label className="text-xs">Tajuk Mesyuarat (pilihan)</Label>
          <Input className="glass-input mt-1" value={title} onChange={e => setTitle(e.target.value)} placeholder="Contoh: Mesyuarat Jualan Q1 2025" />
        </div>
        <div>
          <Label className="text-xs">Nota / Transkrip Mesyuarat</Label>
          <Textarea
            className="glass-input mt-1 min-h-[260px]"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Tampal nota atau transkrip mesyuarat di sini..."
          />
        </div>
        <Button onClick={generate} disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardList className="w-4 h-4" />}
          {loading ? 'AI sedang menjana...' : 'Jana Ringkasan'}
        </Button>
        <p className="text-[11px] text-muted-foreground">
          Transkripsi audio automatik akan tersedia pada Fasa 2.
        </p>
      </div>

      <div className="glass-card p-5 min-h-[400px]">
        <AiLabel />
        {loading ? <LoadingHint label="AI sedang meringkaskan mesyuarat..." /> :
          output ? (
            <div className="space-y-3">
              <div className="max-h-[60vh] overflow-y-auto scrollbar-thin pr-2">
                <MarkdownView source={output} />
              </div>
              <Separator />
              <div className="flex flex-wrap gap-2">
                <CopyButton text={output} />
                <Button onClick={markReviewed} size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
                  <FileCheck2 className="w-3.5 h-3.5" /> Tandai Disemak
                </Button>
              </div>
            </div>
          ) : (
            <EmptyState icon={ClipboardList} text="Ringkasan akan dipaparkan di sini selepas dijana." />
          )
        }
      </div>
    </motion.div>
  )
}

/* ============ Tab 4: Chatbot HR ============ */
type ChatMsg = { role: 'user' | 'assistant'; content: string }
function ChatbotTab() {
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: 'assistant', content: 'Salam! Saya chatbot HR Al-Amin Emall. Tanya saya tentang polisi cuti, kehadiran, latihan atau dokumen.' },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send(q?: string) {
    const question = (q ?? input).trim()
    if (!question || loading) return
    const next: ChatMsg[] = [...messages, { role: 'user', content: question }]
    setMessages(next); setInput(''); setLoading(true)
    try {
      const history = next.slice(-7).map(m => ({ role: m.role, content: m.content }))
      const d = await api<{ output: string }>('/api/ai', {
        method: 'POST',
        body: JSON.stringify({ action: 'CHATBOT', question, history }),
      })
      setMessages(prev => [...prev, { role: 'assistant', content: d.output }])
    } catch (e: any) {
      toast.error(e.message)
      setMessages(prev => [...prev, { role: 'assistant', content: 'Maaf, berlaku ralat. Sila cuba lagi.' }])
    } finally { setLoading(false) }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-0 overflow-hidden flex flex-col h-[70vh]">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40 bg-emerald-500/5">
        <Bot className="w-5 h-5 text-emerald-600" />
        <div>
          <p className="text-sm font-semibold">Chatbot HR</p>
          <p className="text-[10px] text-muted-foreground">Merujuk polisi HR Al-Amin Emall</p>
        </div>
      </div>

      <ScrollArea className="flex-1 px-4 py-3 scrollbar-thin">
        <div className="space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0 ${m.role === 'user' ? 'bg-slate-500' : 'bg-gradient-to-br from-emerald-500 to-teal-600'}`}>
                {m.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>
              <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${m.role === 'user' ? 'bg-slate-500/15' : 'bg-emerald-500/10 border border-emerald-500/20'}`}>
                {m.role === 'assistant' && (
                  <div className="flex items-center gap-1 mb-1">
                    <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30 text-[9px] py-0 gap-0.5">
                      <Sparkles className="w-2.5 h-2.5" /> Dijana AI
                    </Badge>
                  </div>
                )}
                <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-0 prose-ul:my-0">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white"><Bot className="w-3.5 h-3.5" /></div>
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2 text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin" /> AI sedang menaip...
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </ScrollArea>

      <div className="px-3 pb-2 flex flex-wrap gap-1.5">
        {QUICK_QUESTIONS.map(q => (
          <button
            key={q}
            onClick={() => send(q)}
            className="text-[11px] px-2.5 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/5 text-emerald-700 hover:bg-emerald-500/10 transition"
          >{q}</button>
        ))}
      </div>

      <div className="px-3 pb-3 flex gap-2 border-t border-border/40 pt-2">
        <Input
          className="glass-input"
          placeholder="Taip soalan anda..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          aria-label="Mesej chatbot"
        />
        <Button onClick={() => send()} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 gap-1.5" aria-label="Hantar mesej">
          <Send className="w-4 h-4" /> Hantar
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground text-center pb-2 px-3">
        Chatbot ini merujuk polisi HR Al-Amin. Untuk kes kompleks, hubungi HR.
      </p>
    </motion.div>
  )
}

/* ============ Tab 5: IDP (SULIT) ============ */
function IdpTab() {
  const { user } = useApp()
  const isHrOrSup = user && ['HR', 'SUPERVISOR', 'ADMIN'].includes(user.roleCode)
  const [staffList, setStaffList] = useState<any[]>([])
  const [staffId, setStaffId] = useState(user?.id ?? '')
  const [period, setPeriod] = useState('6')
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isHrOrSup) api<{ staff: any[] }>('/api/staff').then(d => setStaffList(d.staff ?? [])).catch(() => {})
  }, [isHrOrSup])

  useEffect(() => { if (user && !staffId) setStaffId(user.id) }, [user, staffId])

  async function generate() {
    setLoading(true); setOutput('')
    try {
      const d = await api<{ output: string; label: string }>('/api/ai', {
        method: 'POST',
        body: JSON.stringify({ action: 'GENERATE_IDP', staffId, period }),
      })
      setOutput(d.output)
      toast.success('Pelan IDP dijana')
    } catch (e: any) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  async function markReviewed() {
    try {
      const hist = await api<{ outputs: AiOutput[] }>('/api/ai')
      const latest = hist.outputs[0]
      if (!latest) return
      await api('/api/ai', { method: 'POST', body: JSON.stringify({ action: 'MARK_REVIEWED', outputId: latest.id }) })
      toast.success('Disimpan dan ditandai disemak')
    } catch (e: any) { toast.error(e.message) }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <Alert className="border-rose-500/30 bg-rose-500/5">
        <Lock className="w-4 h-4 text-rose-600" />
        <AlertTitle className="text-sm">Data SULIT</AlertTitle>
        <AlertDescription className="text-xs">
          Data KPI dan IDP adalah SULIT — hanya anda, penyelia langsung dan HR dibenarkan.
        </AlertDescription>
      </Alert>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="glass-card p-5 space-y-4">
          {isHrOrSup && (
            <div>
              <Label className="text-xs">Pilih Staf (akses terhad)</Label>
              <Select value={staffId} onValueChange={setStaffId}>
                <SelectTrigger className="glass-input mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {staffList.map(s => <SelectItem key={s.id} value={s.id}>{s.name} — {s.staffNo}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label className="text-xs">Tempoh Pelan</Label>
            <div className="flex gap-2 mt-1">
              {['6', '12'].map(p => (
                <Button key={p} size="sm" variant={period === p ? 'default' : 'outline'}
                  onClick={() => setPeriod(p)}
                  className={period === p ? 'bg-emerald-600 hover:bg-emerald-700' : ''}>
                  {p} bulan
                </Button>
              ))}
            </div>
          </div>
          <Button onClick={generate} disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            {loading ? 'AI sedang menjana...' : 'Jana IDP'}
          </Button>
          <p className="text-[11px] text-muted-foreground">
            IDP menggabungkan skor KPI semasa, sejarah latihan dan matlamat kerjaya staf.
          </p>
        </div>

        <div className="glass-card p-5 min-h-[400px]">
          <AiLabel sulit />
          {loading ? <LoadingHint label="AI sedang menyediakan Pelan Pembangunan Individu..." /> :
            output ? (
              <div className="space-y-3">
                <div className="max-h-[60vh] overflow-y-auto scrollbar-thin pr-2">
                  <MarkdownView source={output} />
                </div>
                <Separator />
                <div className="flex flex-wrap gap-2">
                  <CopyButton text={output} />
                  <Button onClick={markReviewed} size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
                    <FileCheck2 className="w-3.5 h-3.5" /> Tandai Disemak
                  </Button>
                </div>
              </div>
            ) : (
              <EmptyState icon={ShieldCheck} text="Pelan IDP (Matlamat, Pelan Tindakan, Sokongan, Penunjuk Kejayaan, Risiko) akan dipaparkan di sini." />
            )
          }
        </div>
      </div>
    </motion.div>
  )
}

/* ============ Tab 6: Sejarah Output ============ */
function HistoryTab() {
  const [outputs, setOutputs] = useState<AiOutput[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => { load() }, [])
  async function load() {
    setLoading(true)
    try {
      const d = await api<{ outputs: AiOutput[] }>('/api/ai')
      setOutputs(d.outputs ?? [])
    } catch (e: any) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  async function markReviewed(id: string) {
    try {
      await api('/api/ai', { method: 'POST', body: JSON.stringify({ action: 'MARK_REVIEWED', outputId: id }) })
      setOutputs(prev => prev.map(o => o.id === id ? { ...o, reviewed: true } : o))
      toast.success('Ditandai disemak')
    } catch (e: any) { toast.error(e.message) }
  }

  if (loading) {
    return <div className="glass-card p-6 space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 rounded-lg bg-muted/40 animate-pulse" />)}</div>
  }

  if (!outputs.length) {
    return <div className="glass-card p-6"><EmptyState icon={History} text="Tiada sejarah output AI lagi. Hasil yang dijana akan tersenarai di sini." /></div>
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2 max-h-[70vh] overflow-y-auto scrollbar-thin pr-1">
      {outputs.map(o => (
        <Card key={o.id} className="glass-card p-3">
          <button
            className="w-full flex items-center gap-3 text-left"
            onClick={() => setExpanded(expanded === o.id ? null : o.id)}
            aria-expanded={expanded === o.id}
          >
            {expanded === o.id ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
            <Badge variant="outline" className="text-[10px]">{TYPE_LABEL[o.type] ?? o.type}</Badge>
            <span className="text-sm truncate flex-1">{o.input.slice(0, 80) || '(tiada input)'}</span>
            {o.reviewed ? (
              <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 text-[10px] gap-0.5">
                <Check className="w-3 h-3" /> Disemak
              </Badge>
            ) : (
              <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30 text-[10px] gap-0.5">
                <AlertTriangle className="w-3 h-3" /> Belum disemak
              </Badge>
            )}
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">{relTime(o.createdAt)}</span>
          </button>
          {expanded === o.id && (
            <div className="mt-3 pt-3 border-t border-border/40">
              <AiLabel />
              <div className="max-h-[40vh] overflow-y-auto scrollbar-thin pr-2">
                <MarkdownView source={o.output} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <CopyButton text={o.output} />
                {!o.reviewed && (
                  <Button size="sm" onClick={() => markReviewed(o.id)} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
                    <FileCheck2 className="w-3.5 h-3.5" /> Tandai Disemak
                  </Button>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">Dijana {fmtDate(o.createdAt, { withTime: true })}</p>
            </div>
          )}
        </Card>
      ))}
    </motion.div>
  )
}

/* ============ Empty state ============ */
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
