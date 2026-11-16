'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FolderOpen, FileText, FileAudio as AudioIcon, Presentation, Image as ImageIcon,
  Video, FileSpreadsheet, Upload, Search, Filter, Trash2, Eye, Download,
  Loader2, AlertTriangle, HardDrive, Tag as TagIcon, Link2, X,
  FileUp, Music, PlayCircle, Pause,
} from 'lucide-react'
import { api, useApp } from '@/lib/store'
import { toast } from 'sonner'
import {
  fmtDate, fmtBytes, initials, safeJson,
} from '@/lib/format'
import { ROLE_LABELS } from '@/lib/rbac'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  RadioGroup, RadioGroupItem,
} from '@/components/ui/radio-group'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'

// ---- Types ----
type DocType = 'LAPORAN' | 'AUDIO' | 'SLAID' | 'GAMBAR' | 'LEMBARAN' | 'TEKS' | 'VIDEO'
type AccessLevel = 'PERIBADI' | 'JABATAN' | 'SYARIKAT'

interface DocUploader {
  id: string
  name: string
  position: string
  department?: { name: string } | null
}
interface DocEvent { id: string; title: string }

interface DocItem {
  id: string
  title: string
  type: DocType
  fileName: string
  fileSize: number
  mimeType: string | null
  dataUrl: string | null
  tags: string
  accessLevel: AccessLevel
  uploader: DocUploader
  event: DocEvent | null
  createdAt: string
  sizeLabel?: string
}

interface Quota {
  usedBytes: number
  totalBytes: number
  percent: number
}

interface CalendarEvent {
  id: string
  title: string
  startAt: string
}

const TYPE_LABELS: Record<DocType, string> = {
  LAPORAN: 'Laporan',
  AUDIO: 'Audio',
  SLAID: 'Slaid',
  GAMBAR: 'Gambar',
  LEMBARAN: 'Lembaran',
  TEKS: 'Teks',
  VIDEO: 'Video',
}

const ACCESS_LABELS: Record<AccessLevel, string> = {
  PERIBADI: 'Peribadi',
  JABATAN: 'Jabatan',
  SYARIKAT: 'Syarikat',
}

function TypeIcon({ type, className }: { type: DocType; className?: string }) {
  switch (type) {
    case 'AUDIO': return <AudioIcon className={className} />
    case 'VIDEO': return <Video className={className} />
    case 'SLAID': return <Presentation className={className} />
    case 'GAMBAR': return <ImageIcon className={className} />
    case 'LEMBARAN': return <FileSpreadsheet className={className} />
    case 'LAPORAN':
    case 'TEKS':
    default: return <FileText className={className} />
  }
}

function typeColor(type: DocType): string {
  switch (type) {
    case 'AUDIO': return 'fuchsia'
    case 'VIDEO': return 'rose'
    case 'SLAID': return 'amber'
    case 'GAMBAR': return 'cyan'
    case 'LEMBARAN': return 'teal'
    case 'LAPORAN': return 'emerald'
    case 'TEKS': default: return 'slate'
  }
}

function accessColor(a: AccessLevel): string {
  if (a === 'SYARIKAT') return 'emerald'
  if (a === 'JABATAN') return 'cyan'
  return 'slate'
}

const SIZE_LIMITS = {
  docs: 100 * 1024 * 1024,
  media: 500 * 1024 * 1024,
}

// Map mime/extension to DocType
function detectType(mime: string, name: string): DocType {
  const ext = name.toLowerCase().split('.').pop() ?? ''
  if (mime.startsWith('audio/')) return 'AUDIO'
  if (mime.startsWith('video/')) return 'VIDEO'
  if (mime.startsWith('image/')) return 'GAMBAR'
  if (mime === 'application/pdf') {
    if (ext === 'pdf' && /slide|syllabus|kursus|pembentangan/i.test(name)) return 'SLAID'
    return 'LAPORAN'
  }
  if (
    mime.includes('powerpoint') ||
    ['ppt', 'pptx', 'pps', 'ppsx', 'odp'].includes(ext)
  ) return 'SLAID'
  if (
    mime.includes('excel') ||
    mime === 'text/csv' ||
    ['xls', 'xlsx', 'csv', 'ods'].includes(ext)
  ) return 'LEMBARAN'
  if (
    mime.includes('msword') ||
    mime.includes('wordprocessing') ||
    mime === 'text/plain' ||
    ['doc', 'docx', 'txt', 'rtf', 'odt'].includes(ext)
  ) return 'TEKS'
  return 'TEKS'
}

function isMedia(type: DocType) {
  return type === 'AUDIO' || type === 'VIDEO'
}

// ============== DOCUMENTS MODULE ==============
export function DocumentsModule() {
  const { user } = useApp()
  const isHR = user?.roleCode === 'HR' || user?.roleCode === 'ADMIN'

  const [docs, setDocs] = useState<DocItem[]>([])
  const [quota, setQuota] = useState<Quota | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [tagFilter, setTagFilter] = useState('all')
  const [scope, setScope] = useState<string>('mine')

  const [showUpload, setShowUpload] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<DocItem | null>(null)

  // derived tag list
  const allTags = useMemo(() => {
    const t = new Set<string>()
    docs.forEach(d => safeJson<string[]>(d.tags, []).forEach(x => t.add(x)))
    return Array.from(t).sort()
  }, [docs])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return docs.filter(d => {
      if (typeFilter !== 'all' && d.type !== typeFilter) return false
      if (tagFilter !== 'all' && !safeJson<string[]>(d.tags, []).includes(tagFilter)) return false
      if (q) {
        const inTitle = d.title.toLowerCase().includes(q)
        const inFile = d.fileName.toLowerCase().includes(q)
        const inUploader = d.uploader.name.toLowerCase().includes(q)
        if (!inTitle && !inFile && !inUploader) return false
      }
      return true
    })
  }, [docs, search, typeFilter, tagFilter])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('scope', scope)
      if (typeFilter !== 'all') params.set('type', typeFilter)
      if (tagFilter && tagFilter !== 'all') params.set('tag', tagFilter)
      if (search.trim()) params.set('search', search.trim())
      const data = await api<{ documents: DocItem[]; quota: Quota }>(`/api/documents?${params.toString()}`)
      setDocs(data.documents ?? [])
      setQuota(data.quota ?? null)
    } catch (e: any) {
      toast.error('Gagal memuatkan dokumen', { description: e?.message })
    } finally {
      setLoading(false)
    }
  }, [scope, typeFilter, tagFilter, search])

  useEffect(() => {
    const t = setTimeout(load, 200)
    return () => clearTimeout(t)
  }, [load])

  const onDelete = async (d: DocItem) => {
    if (!confirm(`Padam dokumen "${d.title}"?`)) return
    try {
      await api(`/api/documents?id=${d.id}`, { method: 'DELETE' })
      toast.success('Dokumen dipadam')
      setDocs(prev => prev.filter(x => x.id !== d.id))
      setPreviewDoc(null)
      load()
    } catch (e: any) {
      toast.error('Gagal memadam', { description: e?.message })
    }
  }

  const canDelete = (d: DocItem) => d.uploader.id === user?.id || isHR

  const quotaColor = (quota?.percent ?? 0) >= 95 ? 'rose' : (quota?.percent ?? 0) >= 80 ? 'amber' : 'emerald'

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl glass flex items-center justify-center text-emerald-600">
            <FolderOpen className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gradient">Dokumen</h1>
            <p className="text-xs text-muted-foreground">Pengurusan fail, audio mesyuarat & lampiran</p>
          </div>
        </div>
        <Button className="gap-2" onClick={() => setShowUpload(true)}>
          <Upload className="size-4" /> Muat Naik
        </Button>
      </header>

      {/* Quota banner */}
      {quota && (
        <Card className="glass-card p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className={`size-10 rounded-xl flex items-center justify-center bg-${quotaColor}-500/15 text-${quotaColor}-700`}>
                <HardDrive className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">
                  Kuota StorAN: {fmtBytes(quota.usedBytes)} / {fmtBytes(quota.totalBytes)}
                </p>
                <p className="text-xs text-muted-foreground">
                  10 GB kuota per staf · {quota.percent}% digunakan
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-2xl font-bold text-${quotaColor}-600`}>{quota.percent}%</p>
              {quota.percent >= 95 && (
                <p className="text-xs text-rose-600 flex items-center gap-1 justify-end">
                  <AlertTriangle className="size-3" /> Hampir penuh
                </p>
              )}
              {quota.percent >= 80 && quota.percent < 95 && (
                <p className="text-xs text-amber-600">Hampir mencapai had</p>
              )}
            </div>
          </div>
          <Progress value={quota.percent} className={`mt-3 h-2 [&>div]:bg-${quotaColor}-500`} />
          {isHR && (
            <p className="text-xs text-muted-foreground mt-2">
              HR boleh melaraskan kuota staf lain melalui panel pentadbiran (Fasa 2).
            </p>
          )}
        </Card>
      )}

      {/* Toolbar */}
      <Card className="glass-card p-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari dokumen, nama fail, atau pemuat naik…"
              className="pl-9 glass-input"
              aria-label="Cari dokumen"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-44 glass-input">
              <Filter className="size-4 mr-1 text-muted-foreground" />
              <SelectValue placeholder="Jenis" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Jenis</SelectItem>
              {(Object.keys(TYPE_LABELS) as DocType[]).map(t => (
                <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={tagFilter} onValueChange={setTagFilter}>
            <SelectTrigger className="w-full sm:w-40 glass-input">
              <TagIcon className="size-4 mr-1 text-muted-foreground" />
              <SelectValue placeholder="Tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tag</SelectItem>
              {allTags.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={scope} onValueChange={setScope}>
            <SelectTrigger className="w-full sm:w-40 glass-input">
              <SelectValue placeholder="Skop" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mine">Saya</SelectItem>
              <SelectItem value="dept">Jabatan</SelectItem>
              <SelectItem value="company">Syarikat</SelectItem>
              {isHR && <SelectItem value="all">Semua</SelectItem>}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Documents grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="glass-card p-10 text-center">
          <div className="size-14 mx-auto mb-3 rounded-xl glass flex items-center justify-center text-muted-foreground">
            <FolderOpen className="size-7" />
          </div>
          <h3 className="font-semibold text-lg">Tiada dokumen</h3>
          <p className="text-sm text-muted-foreground mt-1">Muat naik fail pertama anda untuk mula.</p>
          <Button className="mt-4 gap-2" onClick={() => setShowUpload(true)}>
            <Upload className="size-4" /> Muat Naik Sekarang
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filtered.map(d => (
              <DocCard
                key={d.id}
                doc={d}
                canDelete={canDelete(d)}
                onPreview={() => setPreviewDoc(d)}
                onDelete={() => onDelete(d)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Upload Dialog */}
      <UploadDialog
        open={showUpload}
        onOpenChange={setShowUpload}
        onUploaded={() => {
          setShowUpload(false)
          load()
        }}
      />

      {/* Preview Dialog */}
      <PreviewDialog
        doc={previewDoc}
        onOpenChange={(v) => !v && setPreviewDoc(null)}
        onDelete={previewDoc && canDelete(previewDoc) ? () => onDelete(previewDoc) : undefined}
      />
    </div>
  )
}

// ---- Document Card ----
function DocCard({
  doc, canDelete, onPreview, onDelete,
}: {
  doc: DocItem
  canDelete: boolean
  onPreview: () => void
  onDelete: () => void
}) {
  const color = typeColor(doc.type)
  const tags = safeJson<string[]>(doc.tags, [])
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      layout
    >
      <Card className="glass-card p-4 h-full flex flex-col">
        <div className="flex items-start gap-3">
          <div className={`size-12 rounded-xl flex items-center justify-center bg-${color}-500/15 text-${color}-700 shrink-0`}>
            <TypeIcon type={doc.type} className="size-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate" title={doc.title}>{doc.title}</h3>
            <p className="text-xs text-muted-foreground truncate" title={doc.fileName}>{doc.fileName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {doc.sizeLabel ?? fmtBytes(doc.fileSize)} · {TYPE_LABELS[doc.type]}
            </p>
          </div>
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {tags.slice(0, 4).map(t => (
              <Badge key={t} variant="secondary" className="text-[10px] py-0 h-5">
                <TagIcon className="size-2.5 mr-0.5" /> {t}
              </Badge>
            ))}
            {tags.length > 4 && <Badge variant="secondary" className="text-[10px] py-0 h-5">+{tags.length - 4}</Badge>}
          </div>
        )}

        {doc.event && (
          <div className="mt-2 inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400 truncate">
            <Link2 className="size-3 shrink-0" />
            <span className="truncate">{doc.event.title}</span>
          </div>
        )}

        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <UploaderBadge name={doc.uploader.name} />
          <div className="flex-1 min-w-0">
            <p className="truncate">{doc.uploader.name}</p>
            <p className="truncate">{doc.uploader.department?.name ?? doc.uploader.position}</p>
          </div>
          <Badge className={`bg-${accessColor(doc.accessLevel)}-500/15 text-${accessColor(doc.accessLevel)}-700 border-${accessColor(doc.accessLevel)}-500/30 text-[10px] py-0 h-5`}>
            {ACCESS_LABELS[doc.accessLevel]}
          </Badge>
        </div>

        <div className="mt-3 pt-3 border-t border-border/40 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">{fmtDate(doc.createdAt)}</span>
          <div className="flex items-center gap-1">
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8" onClick={onPreview} aria-label="Pratonton dokumen">
                    <Eye className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Pratonton</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {canDelete && (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8 text-rose-600 hover:text-rose-700" onClick={onDelete} aria-label="Padam dokumen">
                      <Trash2 className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Padam</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

// Small initials avatar for uploader
function UploaderBadge({ name }: { name: string }) {
  return (
    <div className="size-6 rounded-full bg-emerald-500/20 text-emerald-700 flex items-center justify-center text-[10px] font-semibold shrink-0">
      {initials(name)}
    </div>
  )
}

// ---- Upload Dialog ----
interface UploadFile {
  file: File
  dataUrl: string | null
}

function UploadDialog({
  open, onOpenChange, onUploaded,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onUploaded: () => void
}) {
  const { user } = useApp()
  const [title, setTitle] = useState('')
  const [tagsText, setTagsText] = useState('')
  const [accessLevel, setAccessLevel] = useState<AccessLevel>('PERIBADI')
  const [selectedFiles, setSelectedFiles] = useState<UploadFile[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [eventId, setEventId] = useState<string>('none')
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Reset on open
  useEffect(() => {
    if (open) {
      setTitle('')
      setTagsText('')
      setAccessLevel('PERIBADI')
      setSelectedFiles([])
      setEventId('none')
    }
  }, [open])

  // Load events
  useEffect(() => {
    if (open && events.length === 0) {
      setLoadingEvents(true)
      api<{ events: CalendarEvent[] }>('/api/calendar')
        .then(d => setEvents(d.events ?? []))
        .catch(() => setEvents([]))
        .finally(() => setLoadingEvents(false))
    }
  }, [open, events.length])

  const detectedType = useMemo<DocType | null>(() => {
    if (selectedFiles.length === 0) return null
    const f = selectedFiles[0]
    return detectType(f.file.type, f.file.name)
  }, [selectedFiles])

  const addFiles = useCallback(async (fileList: FileList | File[]) => {
    const files = Array.from(fileList)
    const next: UploadFile[] = []
    for (const f of files) {
      // Validate size
      const type = detectType(f.type, f.name)
      const limit = isMedia(type) ? SIZE_LIMITS.media : SIZE_LIMITS.docs
      if (f.size > limit) {
        toast.error(`${f.name} melebihi had saiz`, {
          description: `Had ${isMedia(type) ? 'audio/video' : 'dokumen/gambar'}: ${fmtBytes(limit)}`,
        })
        continue
      }
      let dataUrl: string | null = null
      // Read as base64 if < 5MB
      if (f.size < 5 * 1024 * 1024) {
        try {
          dataUrl = await new Promise<string>((resolve, reject) => {
            const r = new FileReader()
            r.onload = () => resolve(r.result as string)
            r.onerror = reject
            r.readAsDataURL(f)
          })
        } catch {
          dataUrl = null
        }
      }
      next.push({ file: f, dataUrl })
    }
    setSelectedFiles(prev => [...prev, ...next])
    if (next.length > 0 && !title) {
      const first = next[0].file.name.replace(/\.[^.]+$/, '')
      setTitle(first)
    }
  }, [title])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files?.length) {
      addFiles(e.dataTransfer.files)
    }
  }, [addFiles])

  const removeFile = (idx: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== idx))
  }

  const submit = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Pilih sekurang-kurangnya satu fail')
      return
    }
    if (!title.trim()) {
      toast.error('Tajuk diperlukan')
      return
    }
    setSubmitting(true)
    const tagsArr = tagsText.split(',').map(t => t.trim()).filter(Boolean)
    let okCount = 0
    let failCount = 0
    try {
      for (const uf of selectedFiles) {
        const type = detectType(uf.file.type, uf.file.name)
        try {
          await api('/api/documents', {
            method: 'POST',
            body: JSON.stringify({
              title: selectedFiles.length === 1 ? title.trim() : `${title.trim()} - ${uf.file.name}`,
              type,
              fileName: uf.file.name,
              fileSize: uf.file.size,
              mimeType: uf.file.type || null,
              dataUrl: uf.dataUrl,
              tags: tagsArr,
              accessLevel,
              eventId: eventId === 'none' ? null : eventId,
            }),
          })
          okCount++
        } catch {
          failCount++
        }
      }
      if (okCount > 0) toast.success(`${okCount} dokumen dimuat naik`)
      if (failCount > 0) toast.error(`${failCount} dokumen gagal dimuat naik`)
      onUploaded()
    } catch (e: any) {
      toast.error('Ralat muat naik', { description: e?.message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="text-gradient flex items-center gap-2">
            <FileUp className="size-5 text-emerald-600" /> Muat Naik Dokumen
          </DialogTitle>
          <DialogDescription>
            Sahkan fail, jenis & tahap akses sebelum dihantar. Had: 100 MB (dokumen/gambar), 500 MB (audio/video).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`rounded-xl border-2 border-dashed transition-colors p-6 text-center cursor-pointer ${
              dragOver ? 'border-emerald-500 bg-emerald-500/10' : 'border-border/60 hover:border-emerald-500/60'
            }`}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') fileInputRef.current?.click() }}
            aria-label="Klik untuk pilih fail atau seret fail ke sini"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && addFiles(e.target.files)}
              aria-label="Pilih fail"
            />
            <div className="size-12 mx-auto mb-2 rounded-xl glass flex items-center justify-center text-emerald-600">
              <Upload className="size-6" />
            </div>
            <p className="text-sm font-medium">Seret fail ke sini atau klik untuk pilih</p>
            <p className="text-xs text-muted-foreground mt-1">PDF, DOC, XLS, PPT, gambar, audio, video</p>
          </div>

          {/* Selected files */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              {selectedFiles.map((uf, i) => {
                const type = detectType(uf.file.type, uf.file.name)
                const color = typeColor(type)
                return (
                  <div key={i} className="flex items-center gap-3 rounded-lg border border-border/40 p-2">
                    <div className={`size-9 rounded-lg flex items-center justify-center bg-${color}-500/15 text-${color}-700 shrink-0`}>
                      <TypeIcon type={type} className="size-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{uf.file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {fmtBytes(uf.file.size)} · {TYPE_LABELS[type]}
                        {!uf.dataUrl && uf.file.size >= 5 * 1024 * 1024 && ' · pratonton terhad'}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="size-7" onClick={() => removeFile(i)} aria-label="Buang fail">
                      <X className="size-4" />
                    </Button>
                  </div>
                )
              })}
            </div>
          )}

          {/* Metadata form */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label htmlFor="doc-title">Tajuk Dokumen</Label>
              <Input
                id="doc-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="cth. Minit Mesyuarat Pengurusan Nov 2025"
                className="glass-input mt-1"
              />
              {detectedType && (
                <p className="text-xs text-muted-foreground mt-1">
                  Jenis dikesan: <span className="font-medium text-emerald-700">{TYPE_LABELS[detectedType]}</span>
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="doc-tags">Tag (dipisah dengan koma)</Label>
              <Input
                id="doc-tags"
                value={tagsText}
                onChange={(e) => setTagsText(e.target.value)}
                placeholder="mesyuarat, Q4, pengurusan"
                className="glass-input mt-1"
              />
            </div>

            <div>
              <Label htmlFor="doc-event">Paut ke Acara Kalendar (pilihan)</Label>
              <Select value={eventId} onValueChange={setEventId}>
                <SelectTrigger id="doc-event" className="glass-input mt-1">
                  <SelectValue placeholder="Tiada acara" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tiada acara</SelectItem>
                  {loadingEvents ? (
                    <SelectItem value="loading" disabled>Memuatkan…</SelectItem>
                  ) : (
                    events.map(ev => (
                      <SelectItem key={ev.id} value={ev.id}>
                        {ev.title} · {fmtDate(ev.startAt)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-2">
              <Label>Tahap Akses</Label>
              <RadioGroup
                value={accessLevel}
                onValueChange={(v) => setAccessLevel(v as AccessLevel)}
                className="grid grid-cols-3 gap-2 mt-1"
              >
                {(['PERIBADI', 'JABATAN', 'SYARIKAT'] as AccessLevel[]).map(a => (
                  <Label
                    key={a}
                    className={`flex flex-col items-center gap-1 rounded-lg border p-3 cursor-pointer transition-colors ${
                      accessLevel === a
                        ? `border-${accessColor(a)}-500 bg-${accessColor(a)}-500/10`
                        : 'border-border/40 hover:bg-accent'
                    }`}
                  >
                    <RadioGroupItem value={a} className="sr-only" />
                    <span className="text-sm font-medium">{ACCESS_LABELS[a]}</span>
                    <span className="text-[10px] text-muted-foreground text-center">
                      {a === 'PERIBADI' && 'Hanya anda'}
                      {a === 'JABATAN' && 'Ahli jabatan'}
                      {a === 'SYARIKAT' && 'Seluruh syarikat'}
                    </span>
                  </Label>
                ))}
              </RadioGroup>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={submit} disabled={submitting || selectedFiles.length === 0} className="gap-2">
            {submitting && <Loader2 className="size-4 animate-spin" />}
            Muat Naik {selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---- Preview Dialog ----
function PreviewDialog({
  doc, onOpenChange, onDelete,
}: {
  doc: DocItem | null
  onOpenChange: (v: boolean) => void
  onDelete?: () => void
}) {
  return (
    <Dialog open={!!doc} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {doc && (
          <>
            <DialogHeader>
              <DialogTitle className="text-gradient truncate">{doc.title}</DialogTitle>
              <DialogDescription className="truncate">
                {doc.fileName} · {doc.sizeLabel ?? fmtBytes(doc.fileSize)} · {TYPE_LABELS[doc.type]}
              </DialogDescription>
            </DialogHeader>
            <div className="overflow-y-auto scrollbar-thin">
              <PreviewContent doc={doc} />
            </div>
            <DialogFooter className="gap-2 flex-wrap">
              <div className="flex-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge className={`bg-${accessColor(doc.accessLevel)}-500/15 text-${accessColor(doc.accessLevel)}-700 border-${accessColor(doc.accessLevel)}-500/30`}>
                  {ACCESS_LABELS[doc.accessLevel]}
                </Badge>
                {safeJson<string[]>(doc.tags, []).map(t => (
                  <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                ))}
                <span className="ml-auto">Dimuat naik oleh {doc.uploader.name} · {fmtDate(doc.createdAt, { long: true })}</span>
              </div>
              <div className="flex items-center gap-2">
                {onDelete && (
                  <Button variant="ghost" className="text-rose-600 hover:text-rose-700 gap-2" onClick={onDelete}>
                    <Trash2 className="size-4" /> Padam
                  </Button>
                )}
                {doc.dataUrl && (
                  <a href={doc.dataUrl} download={doc.fileName}>
                    <Button variant="outline" className="gap-2">
                      <Download className="size-4" /> Muat Turun
                    </Button>
                  </a>
                )}
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function PreviewContent({ doc }: { doc: DocItem }) {
  const color = typeColor(doc.type)

  if (doc.type === 'AUDIO' && doc.dataUrl) {
    return (
      <div className="p-4">
        <div className={`rounded-xl bg-${color}-500/10 border border-${color}-500/30 p-4`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`size-12 rounded-xl flex items-center justify-center bg-${color}-500/20 text-${color}-700`}>
              <Music className="size-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{doc.fileName}</p>
              <p className="text-xs text-muted-foreground">{doc.sizeLabel ?? fmtBytes(doc.fileSize)}</p>
            </div>
          </div>
          <audio controls className="w-full" src={doc.dataUrl} aria-label={`Pemain audio untuk ${doc.fileName}`}>
            Pelayar anda tidak menyokong elemen audio.
          </audio>
        </div>
      </div>
    )
  }

  if (doc.type === 'GAMBAR' && doc.dataUrl) {
    return (
      <div className="p-4 flex justify-center bg-muted/30">
        <img src={doc.dataUrl} alt={doc.title} className="max-h-[60vh] rounded-lg" />
      </div>
    )
  }

  if (doc.type === 'LAPORAN' && doc.mimeType === 'application/pdf' && doc.dataUrl) {
    return (
      <div className="p-4">
        <iframe
          src={doc.dataUrl}
          title={doc.title}
          className="w-full h-[60vh] rounded-lg border border-border/40"
          aria-label={`Pratonton PDF ${doc.title}`}
        />
      </div>
    )
  }

  if (doc.type === 'SLAID' && doc.dataUrl && doc.mimeType === 'application/pdf') {
    return (
      <div className="p-4">
        <iframe
          src={doc.dataUrl}
          title={doc.title}
          className="w-full h-[60vh] rounded-lg border border-border/40"
          aria-label={`Pratonton slaid ${doc.title}`}
        />
      </div>
    )
  }

  if (doc.type === 'VIDEO' && doc.dataUrl) {
    return (
      <div className="p-4">
        <video controls className="w-full rounded-lg max-h-[60vh]" src={doc.dataUrl} aria-label={`Pemain video untuk ${doc.fileName}`}>
          Pelayar anda tidak menyokong elemen video.
        </video>
      </div>
    )
  }

  // Placeholder / metadata fallback
  return (
    <div className="p-6 text-center">
      <div className={`size-16 mx-auto mb-3 rounded-xl bg-${color}-500/15 text-${color}-700 flex items-center justify-center`}>
        <TypeIcon type={doc.type} className="size-8" />
      </div>
      <h3 className="font-semibold">{doc.fileName}</h3>
      <p className="text-xs text-muted-foreground mt-1">
        {doc.sizeLabel ?? fmtBytes(doc.fileSize)} · {doc.mimeType ?? 'mime tidak diketahui'}
      </p>
      <div className="mt-4 max-w-sm mx-auto rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-800 dark:text-amber-300">
        Pratonton tidak tersedia untuk fail besar (Fasa 2).
        {doc.dataUrl ? ' Saluran muat turun tersedia.' : ' Fail hanya metadata disimpan.'}
      </div>
      {doc.event && (
        <div className="mt-4 inline-flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400">
          <Link2 className="size-3" /> Dipautkan ke: <span className="font-medium">{doc.event.title}</span>
        </div>
      )}
    </div>
  )
}
