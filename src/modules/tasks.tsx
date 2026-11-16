'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  DndContext, DragEndEvent, PointerSensor, useDraggable, useDroppable, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  CheckSquare, Plus, GripVertical, CalendarClock, Flag, User, MessageCircle,
  Paperclip, AlertTriangle, Clock, CheckCircle2, ListChecks, KanbanSquare,
  Filter, Eye, Send, Loader2,
} from 'lucide-react'
import { api, useApp } from '@/lib/store'
import { toast } from 'sonner'
import {
  fmtDate, fmtMins, initials, statusLabel, statusColor, relTime, safeJson,
} from '@/lib/format'
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
import { Slider } from '@/components/ui/slider'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

// ---- Types ----
type TaskStatus = 'BELUM_MULA' | 'DALAM_PROSES' | 'SEMAKAN' | 'SELESAI'
type Priority = 'RENDAH' | 'SEDERHANA' | 'TINGGI' | 'KRITIKAL'

interface TaskAssignee { id: string; name: string; position: string }
interface TaskComment { author: string; authorId: string; text: string; at: string }

interface Task {
  id: string
  title: string
  description: string
  assignee: TaskAssignee
  assigner: TaskAssignee
  priority: Priority
  status: TaskStatus
  progress: number
  dueDate: string
  completedAt: string | null
  attachments: string | null
  comments: string | null
  createdAt: string
}

interface StaffItem {
  id: string
  name: string
  position: string
  department?: { name: string } | null
}

const COLUMNS: { key: TaskStatus; label: string; color: string; icon: any }[] = [
  { key: 'BELUM_MULA', label: 'Belum Mula', color: 'slate', icon: Clock },
  { key: 'DALAM_PROSES', label: 'Dalam Proses', color: 'teal', icon: Loader2 },
  { key: 'SEMAKAN', label: 'Semakan', color: 'amber', icon: Eye },
  { key: 'SELESAI', label: 'Selesai', color: 'emerald', icon: CheckCircle2 },
]

const PRIORITIES: Priority[] = ['RENDAH', 'SEDERHANA', 'TINGGI', 'KRITIKAL']

function statusBadgeClass(s: string) {
  const c = statusColor(s)
  return `border-${c}-500/30 text-${c}-700 bg-${c}-500/10 dark:text-${c}-400`
}

function daysUntil(due: string): number {
  const ms = new Date(due).getTime() - Date.now()
  return Math.ceil(ms / 86400000)
}

function isOverdue(t: Task): boolean {
  return t.status !== 'SELESAI' && new Date(t.dueDate).getTime() < Date.now()
}

export function TasksModule() {
  const { user } = useApp()
  const [tab, setTab] = useState('kanban')

  if (!user) {
    return (
      <div className="glass-card p-6 space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  const canCreate = ['SUPERVISOR', 'HR', 'ADMIN', 'EXEC'].includes(user.roleCode)
  const canSeeTeam = ['SUPERVISOR', 'HR', 'ADMIN', 'EXEC'].includes(user.roleCode)

  return (
    <div className="space-y-5">
      <header className="glass-card p-5 lg:p-6 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-48 h-48 rounded-full bg-gradient-to-br from-emerald-500/15 to-teal-500/10 blur-3xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <CheckSquare className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-gradient">Pengurusan Tugasan</h1>
              <p className="text-xs text-muted-foreground">Kanban, kemajuan & produktiviti pasukan</p>
            </div>
          </div>
          {canCreate && (
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setTab('create')}>
              <Plus className="w-4 h-4" /> Cipta Tugasan
            </Button>
          )}
        </div>
      </header>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="glass rounded-lg flex-wrap h-auto p-1">
          <TabsTrigger value="kanban"><KanbanSquare className="w-3.5 h-3.5" /> Papan Kanban</TabsTrigger>
          <TabsTrigger value="list"><ListChecks className="w-3.5 h-3.5" /> Senarai Tugasan</TabsTrigger>
          <TabsTrigger value="overdue"><AlertTriangle className="w-3.5 h-3.5" /> Tertunggak</TabsTrigger>
          {canCreate && (
            <TabsTrigger value="create"><Plus className="w-3.5 h-3.5" /> Cipta Tugasan</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="kanban" className="mt-4">
          <KanbanTab canSeeTeam={canSeeTeam} onOpenCreate={() => setTab('create')} />
        </TabsContent>

        <TabsContent value="list" className="mt-4">
          <ListTab canSeeTeam={canSeeTeam} />
        </TabsContent>

        <TabsContent value="overdue" className="mt-4">
          <OverdueTab />
        </TabsContent>

        {canCreate && (
          <TabsContent value="create" className="mt-4">
            <CreateTab onCreated={() => setTab('kanban')} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

/* =========================================================
   Hook - muat & kemaskini tugasan
   ========================================================= */
function useTasks(scope: 'self' | 'team' | 'all' = 'self', status?: TaskStatus) {
  const [data, setData] = useState<{ tasks: Task[]; overdue: Task[]; dueSoon: Task[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ scope })
      if (status) params.set('status', status)
      const d = await api<{ tasks: Task[]; overdue: Task[]; dueSoon: Task[] }>(`/api/tasks?${params.toString()}`)
      setData(d)
    } catch (e: any) {
      setError(e.message ?? 'Gagal memuatkan tugasan')
      toast.error(e.message ?? 'Gagal memuatkan tugasan')
    } finally {
      setLoading(false)
    }
  }, [scope, status])

  useEffect(() => { load() }, [load])

  const patchLocal = useCallback((taskId: string, patch: Partial<Task>) => {
    setData(prev => {
      if (!prev) return prev
      const map = (arr: Task[]) => arr.map(t => t.id === taskId ? { ...t, ...patch } : t)
      return {
        tasks: map(prev.tasks),
        overdue: map(prev.overdue),
        dueSoon: map(prev.dueSoon),
      }
    })
  }, [])

  return { data, loading, error, load, patchLocal, setData }
}

/* =========================================================
   Tab 1 - Kanban
   ========================================================= */
function KanbanTab({ canSeeTeam, onOpenCreate }: { canSeeTeam: boolean; onOpenCreate: () => void }) {
  const { user } = useApp()
  const [scope, setScope] = useState<'self' | 'team' | 'all'>(canSeeTeam ? 'team' : 'self')
  const { data, loading, load, patchLocal } = useTasks(scope)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  )

  const grouped = useMemo(() => {
    const g: Record<TaskStatus, Task[]> = { BELUM_MULA: [], DALAM_PROSES: [], SEMAKAN: [], SELESAI: [] }
    data?.tasks.forEach(t => { g[t.status]?.push(t) })
    return g
  }, [data])

  async function onDragEnd(e: DragEndEvent) {
    setDragId(null)
    const { active, over } = e
    if (!over) return
    const newStatus = over.id as TaskStatus
    const taskId = String(active.id)
    const task = data?.tasks.find(t => t.id === taskId)
    if (!task || task.status === newStatus) return
    // Optimistic
    patchLocal(taskId, { status: newStatus, progress: newStatus === 'SELESAI' ? 100 : (newStatus === 'DALAM_PROSES' && task.progress === 0 ? 10 : task.progress) })
    try {
      await api<{ task: Task }>('/api/tasks', { method: 'PATCH', body: JSON.stringify({ taskId, status: newStatus }) })
      toast.success(`Tugasan dipindah ke "${statusLabel(newStatus)}"`)
      await load()
    } catch (err: any) {
      toast.error(err.message ?? 'Gagal mengemas kini status')
      patchLocal(taskId, { status: task.status })
    }
  }

  if (loading) {
    return (
      <div className="grid lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-80 rounded-xl" />)}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {canSeeTeam && (
            <Select value={scope} onValueChange={(v) => setScope(v as any)}>
              <SelectTrigger className="glass-input w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent className="glass-strong">
                <SelectItem value="self">Tugasan Saya</SelectItem>
                <SelectItem value="team">Pasukan</SelectItem>
                {(user?.roleCode === 'HR' || user?.roleCode === 'ADMIN') && <SelectItem value="all">Seluruh</SelectItem>}
              </SelectContent>
            </Select>
          )}
          <span className="text-xs text-muted-foreground">{data?.tasks.length ?? 0} tugasan</span>
        </div>
        <Button variant="outline" size="sm" className="glass" onClick={onOpenCreate}>
          <Plus className="w-3.5 h-3.5" /> Tugasan Baharu
        </Button>
      </div>

      <DndContext sensors={sensors} onDragStart={(e) => setDragId(String(e.active.id))} onDragEnd={onDragEnd}>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
          {COLUMNS.map(col => {
            const list = grouped[col.key] ?? []
            return (
              <KanbanColumn key={col.key} col={col} count={list.length}>
                <div className="space-y-2 max-h-[60vh] overflow-y-auto scrollbar-thin pr-1">
                  {list.length === 0 ? (
                    <div className="text-center py-8 text-xs text-muted-foreground">Tiada tugasan</div>
                  ) : list.map(t => (
                    <KanbanCard
                      key={t.id}
                      task={t}
                      dragging={dragId === t.id}
                      onClick={() => setSelectedTask(t)}
                    />
                  ))}
                </div>
              </KanbanColumn>
            )
          })}
        </div>
      </DndContext>

      <TaskDetailDialog
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onUpdated={(updated) => {
          patchLocal(selectedTask?.id ?? '', updated)
          setSelectedTask(prev => prev ? { ...prev, ...updated } : prev)
          load()
        }}
      />
    </div>
  )
}

function KanbanColumn({ col, count, children }: { col: { key: TaskStatus; label: string; color: string; icon: any }; count: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.key })
  const Icon = col.icon
  return (
    <div
      ref={setNodeRef}
      className={`glass-card p-3 kanban-col transition-colors ${isOver ? `ring-2 ring-${col.color}-500/40 bg-${col.color}-500/5` : ''}`}
    >
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg bg-${col.color}-500/15 flex items-center justify-center`}>
            <Icon className={`w-3.5 h-3.5 text-${col.color}-600 ${col.key === 'DALAM_PROSES' ? 'animate-spin' : ''}`} />
          </div>
          <span className="text-sm font-semibold">{col.label}</span>
        </div>
        <Badge variant="outline" className="text-[10px]">{count}</Badge>
      </div>
      {children}
    </div>
  )
}

function KanbanCard({ task, dragging, onClick }: { task: Task; dragging: boolean; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id })
  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    zIndex: isDragging ? 50 : undefined,
    opacity: dragging ? 0.7 : 1,
  }
  const overdue = isOverdue(task)
  const dueDays = daysUntil(task.dueDate)
  const dueSoon = !overdue && dueDays <= 3 && task.status !== 'SELESAI'
  const pc = statusColor(task.priority)

  const comments: TaskComment[] = safeJson<TaskComment[]>(task.comments, [])
  const attachments: string[] = safeJson<string[]>(task.attachments, [])

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass p-2.5 rounded-lg cursor-pointer hover:ring-1 hover:ring-emerald-500/30 transition-all ${isDragging ? 'shadow-xl' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start gap-2">
        <button
          {...listeners}
          {...attributes}
          className="cursor-grab active:cursor-grabbing mt-0.5 text-muted-foreground hover:text-foreground touch-none"
          aria-label="Seret tugasan"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-snug line-clamp-2">{task.title}</p>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <Badge className={`${statusBadgeClass(task.priority)} text-[9px] py-0`}>
              <Flag className="w-2.5 h-2.5 mr-0.5" /> {statusLabel(task.priority)}
            </Badge>
            {overdue && (
              <Badge className="text-[9px] py-0 border-rose-500/30 text-rose-700 bg-rose-500/10">
                <AlertTriangle className="w-2.5 h-2.5 mr-0.5" /> Lewat
              </Badge>
            )}
            {dueSoon && (
              <Badge className="text-[9px] py-0 border-amber-500/30 text-amber-700 bg-amber-500/10">
                {dueDays === 0 ? 'Hari ini' : `${dueDays}h lagi`}
              </Badge>
            )}
          </div>
          <div className="mt-2">
            <Progress value={task.progress} className={`h-1 [&>div]:${overdue ? 'bg-rose-500' : 'bg-emerald-500'}`} />
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <Avatar className="w-5 h-5">
                <AvatarImage src={undefined} />
                <AvatarFallback className={`bg-gradient-to-br from-${pc}-500 to-emerald-600 text-white text-[8px]`}>
                  {initials(task.assignee.name)}
                </AvatarFallback>
              </Avatar>
              <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">{task.assignee.name}</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              {comments.length > 0 && (
                <span className="flex items-center gap-0.5"><MessageCircle className="w-2.5 h-2.5" />{comments.length}</span>
              )}
              {attachments.length > 0 && (
                <span className="flex items-center gap-0.5"><Paperclip className="w-2.5 h-2.5" />{attachments.length}</span>
              )}
              <span className={`flex items-center gap-0.5 ${overdue ? 'text-rose-600 font-medium' : ''}`}>
                <CalendarClock className="w-2.5 h-2.5" />
                {fmtDate(task.dueDate)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/* =========================================================
   Task Detail Dialog (shared)
   ========================================================= */
function TaskDetailDialog({ task, onClose, onUpdated }: {
  task: Task | null
  onClose: () => void
  onUpdated: (patch: Partial<Task>) => void
}) {
  const { user } = useApp()
  const [progress, setProgress] = useState(0)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (task) setProgress(task.progress)
  }, [task?.id, task?.progress])

  if (!task) return null

  const comments: TaskComment[] = safeJson<TaskComment[]>(task.comments, [])
  const attachments: string[] = safeJson<string[]>(task.attachments, [])
  const canEdit = task.assignee.id === user?.id || ['HR', 'ADMIN', 'SUPERVISOR'].includes(user?.roleCode ?? '')

  async function saveProgress() {
    setSaving(true)
    try {
      const d = await api<{ task: Task }>('/api/tasks', {
        method: 'POST',
        body: JSON.stringify({ action: 'UPDATE', taskId: task!.id, progress }),
      })
      toast.success('Kemajuan dikemas kini')
      onUpdated({ progress, status: d.task.status, completedAt: d.task.completedAt })
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal menyimpan')
    } finally {
      setSaving(false)
    }
  }

  async function changeStatus(status: TaskStatus) {
    setBusy(true)
    try {
      const d = await api<{ task: Task }>('/api/tasks', {
        method: 'PATCH',
        body: JSON.stringify({ taskId: task!.id, status }),
      })
      toast.success(`Status: ${statusLabel(status)}`)
      onUpdated({ status, progress: d.task.progress, completedAt: d.task.completedAt })
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal menukar status')
    } finally {
      setBusy(false)
    }
  }

  async function addComment() {
    if (!comment.trim()) return
    setBusy(true)
    try {
      const d = await api<{ task: Task }>('/api/tasks', {
        method: 'POST',
        body: JSON.stringify({ action: 'COMMENT', taskId: task!.id, text: comment.trim() }),
      })
      onUpdated({ comments: d.task.comments })
      setComment('')
      toast.success('Komen ditambah')
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal menambah komen')
    } finally {
      setBusy(false)
    }
  }

  const overdue = isOverdue(task)

  return (
    <Dialog open={!!task} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-strong max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-start gap-2 flex-wrap">
            <Badge className={`${statusBadgeClass(task.priority)} text-[10px]`}>
              <Flag className="w-3 h-3 mr-0.5" /> {statusLabel(task.priority)}
            </Badge>
            <Badge className={`${statusBadgeClass(task.status)} text-[10px]`}>{statusLabel(task.status)}</Badge>
            {overdue && (
              <Badge className="text-[10px] border-rose-500/30 text-rose-700 bg-rose-500/10">
                <AlertTriangle className="w-3 h-3 mr-0.5" /> Tertunggak
              </Badge>
            )}
          </div>
          <DialogTitle className="text-lg leading-snug">{task.title}</DialogTitle>
          <DialogDescription>{task.description || 'Tiada penerangan.'}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto scrollbar-thin pr-1 space-y-4">
          {/* Assignee / Assigner */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="glass p-2.5 rounded-lg flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-[10px]">
                  {initials(task.assignee.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground">Penerima</p>
                <p className="text-xs font-medium truncate">{task.assignee.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{task.assignee.position}</p>
              </div>
            </div>
            <div className="glass p-2.5 rounded-lg flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-gradient-to-br from-amber-500 to-rose-500 text-white text-[10px]">
                  {initials(task.assigner.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground">Pemberi Tugasan</p>
                <p className="text-xs font-medium truncate">{task.assigner.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{task.assigner.position}</p>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="grid sm:grid-cols-2 gap-3 text-xs">
            <div className="glass p-2.5 rounded-lg">
              <p className="text-[10px] text-muted-foreground">Tarikh Akhir</p>
              <p className={`font-medium ${overdue ? 'text-rose-600' : ''}`}>{fmtDate(task.dueDate, { withTime: true })}</p>
            </div>
            <div className="glass p-2.5 rounded-lg">
              <p className="text-[10px] text-muted-foreground">Dicipta</p>
              <p className="font-medium">{relTime(task.createdAt)}</p>
            </div>
          </div>

          {/* Progress */}
          {canEdit && (
            <div className="glass p-3 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs">Kemajuan ({progress}%)</Label>
                <Button size="sm" disabled={saving || progress === task.progress} onClick={saveProgress} className="h-7 bg-emerald-600 hover:bg-emerald-700 text-white">
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </Button>
              </div>
              <Slider value={[progress]} onValueChange={(v) => setProgress(v[0])} className="mt-2" />
              <div className="flex flex-wrap gap-1.5 mt-3">
                {COLUMNS.map(c => (
                  <Button
                    key={c.key}
                    size="sm"
                    variant={task.status === c.key ? 'default' : 'outline'}
                    disabled={busy || task.status === c.key}
                    onClick={() => changeStatus(c.key)}
                    className="h-7 text-xs"
                  >
                    {statusLabel(c.key)}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Attachments */}
          {attachments.length > 0 && (
            <div>
              <p className="text-xs font-medium flex items-center gap-1.5 mb-2"><Paperclip className="w-3.5 h-3.5 text-emerald-600" /> Lampiran</p>
              <ul className="space-y-1">
                {attachments.map((a, i) => (
                  <li key={i} className="glass px-2.5 py-1.5 rounded-md text-xs flex items-center gap-2">
                    <Paperclip className="w-3 h-3 text-muted-foreground" />
                    <span className="truncate">{typeof a === 'string' ? a : a?.name ?? `Lampiran ${i + 1}`}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Comments */}
          <div>
            <p className="text-xs font-medium flex items-center gap-1.5 mb-2"><MessageCircle className="w-3.5 h-3.5 text-emerald-600" /> Komen ({comments.length})</p>
            <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin">
              {comments.length === 0 ? (
                <p className="text-xs text-muted-foreground py-3 text-center">Tiada komen lagi.</p>
              ) : comments.map((c, i) => (
                <div key={i} className="glass p-2 rounded-md">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[11px] font-medium">{c.author}</span>
                    <span className="text-[10px] text-muted-foreground">{relTime(c.at)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{c.text}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <Input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Tambah komen..."
                className="glass-input h-9 text-xs"
                onKeyDown={(e) => { if (e.key === 'Enter' && !busy) addComment() }}
              />
              <Button size="sm" disabled={busy || !comment.trim()} onClick={addComment} className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white">
                <Send className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* =========================================================
   Tab 2 - Senarai Tugasan
   ========================================================= */
function ListTab({ canSeeTeam }: { canSeeTeam: boolean }) {
  const { user } = useApp()
  const [scope, setScope] = useState<'self' | 'team' | 'all'>(canSeeTeam ? 'team' : 'self')
  const [status, setStatus] = useState<TaskStatus | 'all'>('all')
  const [priority, setPriority] = useState<Priority | 'all'>('all')
  const [selected, setSelected] = useState<Task | null>(null)

  const { data, loading, patchLocal, load } = useTasks(scope, status === 'all' ? undefined : status)

  const filtered = useMemo(() => {
    let arr = data?.tasks ?? []
    if (priority !== 'all') arr = arr.filter(t => t.priority === priority)
    return arr
  }, [data, priority])

  return (
    <div className="space-y-4">
      <Card className="glass-card p-4">
        <div className="flex flex-col lg:flex-row lg:items-end gap-3">
          <div className="flex items-center gap-2 text-sm font-medium shrink-0">
            <Filter className="w-4 h-4 text-emerald-600" /> Tapisan
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 flex-1">
            {canSeeTeam && (
              <div>
                <Label className="text-xs">Skop</Label>
                <Select value={scope} onValueChange={(v) => setScope(v as any)}>
                  <SelectTrigger className="glass-input mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent className="glass-strong">
                    <SelectItem value="self">Saya</SelectItem>
                    <SelectItem value="team">Pasukan</SelectItem>
                    {(user?.roleCode === 'HR' || user?.roleCode === 'ADMIN') && <SelectItem value="all">Seluruh</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                <SelectTrigger className="glass-input mt-1"><SelectValue /></SelectTrigger>
                <SelectContent className="glass-strong">
                  <SelectItem value="all">Semua Status</SelectItem>
                  {COLUMNS.map(c => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Keutamaan</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
                <SelectTrigger className="glass-input mt-1"><SelectValue /></SelectTrigger>
                <SelectContent className="glass-strong">
                  <SelectItem value="all">Semua Keutamaan</SelectItem>
                  {PRIORITIES.map(p => <SelectItem key={p} value={p}>{statusLabel(p)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </Card>

      <Card className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-emerald-600" /> Senarai Tugasan
          </h3>
          <span className="text-xs text-muted-foreground">{filtered.length} rekod</span>
        </div>

        {loading ? (
          <div className="space-y-2">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : filtered.length === 0 ? (
          <EmptyState text="Tiada tugasan dijumpai untuk tapisan ini." icon={ListChecks} />
        ) : (
          <ScrollArea className="max-h-[28rem]">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs">Tajuk</TableHead>
                  <TableHead className="text-xs">Penerima</TableHead>
                  <TableHead className="text-xs">Pemberi</TableHead>
                  <TableHead className="text-xs">Keutamaan</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Kemajuan</TableHead>
                  <TableHead className="text-xs">Tarikh Akhir</TableHead>
                  <TableHead className="text-xs text-right">Tindakan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(t => {
                  const od = isOverdue(t)
                  const ds = daysUntil(t.dueDate)
                  return (
                    <TableRow key={t.id} className="text-xs cursor-pointer hover:bg-emerald-500/5" onClick={() => setSelected(t)}>
                      <TableCell className="font-medium max-w-[200px] truncate">{t.title}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Avatar className="w-5 h-5">
                            <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-[8px]">
                              {initials(t.assignee.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate max-w-[100px]">{t.assignee.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="truncate max-w-[100px] text-muted-foreground">{t.assigner.name}</TableCell>
                      <TableCell><Badge className={`${statusBadgeClass(t.priority)} text-[10px]`}>{statusLabel(t.priority)}</Badge></TableCell>
                      <TableCell><Badge className={`${statusBadgeClass(t.status)} text-[10px]`}>{statusLabel(t.status)}</Badge></TableCell>
                      <TableCell className="min-w-[100px]">
                        <div className="flex items-center gap-2">
                          <Progress value={t.progress} className={`h-1.5 [&>div]:${od ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                          <span className="text-[10px] tabular-nums w-8">{t.progress}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={od ? 'text-rose-600 font-medium' : (ds <= 3 && t.status !== 'SELESAI' ? 'text-amber-600 font-medium' : '')}>
                          {fmtDate(t.dueDate)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelected(t) }} aria-label="Lihat butiran">
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </Card>

      <TaskDetailDialog
        task={selected}
        onClose={() => setSelected(null)}
        onUpdated={(patch) => {
          patchLocal(selected?.id ?? '', patch)
          load()
        }}
      />
    </div>
  )
}

/* =========================================================
   Tab 3 - Tugasan Tertunggak
   ========================================================= */
function OverdueTab() {
  const { data, loading, patchLocal, load } = useTasks('self')
  const [selected, setSelected] = useState<Task | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  async function quickUpdate(t: Task, status: TaskStatus) {
    setBusy(t.id)
    try {
      const d = await api<{ task: Task }>('/api/tasks', {
        method: 'PATCH',
        body: JSON.stringify({ taskId: t.id, status }),
      })
      toast.success(status === 'SELESAI' ? 'Tugasan ditandakan selesai' : `Status: ${statusLabel(status)}`)
      patchLocal(t.id, { status, progress: d.task.progress, completedAt: d.task.completedAt })
      await load()
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal mengemas kini')
    } finally {
      setBusy(null)
    }
  }

  async function bumpProgress(t: Task, delta: number) {
    const next = Math.max(0, Math.min(100, t.progress + delta))
    setBusy(t.id)
    try {
      await api('/api/tasks', {
        method: 'POST',
        body: JSON.stringify({ action: 'UPDATE', taskId: t.id, progress: next }),
      })
      patchLocal(t.id, { progress: next })
      toast.success(`Kemajuan: ${next}%`)
      await load()
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal mengemas kini')
    } finally {
      setBusy(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  const overdue = data?.overdue ?? []
  const dueSoon = data?.dueSoon ?? []

  return (
    <div className="space-y-4">
      {/* Overdue */}
      <Card className="glass-card p-4 border-rose-500/20">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-rose-600" />
          <h3 className="font-semibold text-sm">Lewat ({overdue.length})</h3>
        </div>
        {overdue.length === 0 ? (
          <EmptyState text="Tiada tugasan lewat. Tahniah!" icon={CheckCircle2} />
        ) : (
          <div className="grid sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto scrollbar-thin pr-1">
            {overdue.map(t => {
              const daysLate = Math.abs(daysUntil(t.dueDate))
              return (
                <OverdueCard
                  key={t.id}
                  task={t}
                  tone="rose"
                  highlight={`${daysLate} hari lewat`}
                  busy={busy === t.id}
                  onClick={() => setSelected(t)}
                  onProgress={(d) => bumpProgress(t, d)}
                  onComplete={() => quickUpdate(t, 'SELESAI')}
                />
              )
            })}
          </div>
        )}
      </Card>

      {/* Due soon */}
      <Card className="glass-card p-4 border-amber-500/20">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-amber-600" />
          <h3 className="font-semibold text-sm">Hampir Tamat ({dueSoon.length})</h3>
        </div>
        {dueSoon.length === 0 ? (
          <EmptyState text="Tiada tugasan hampir tamat dalam 3 hari." icon={Clock} />
        ) : (
          <div className="grid sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto scrollbar-thin pr-1">
            {dueSoon.map(t => {
              const d = daysUntil(t.dueDate)
              return (
                <OverdueCard
                  key={t.id}
                  task={t}
                  tone="amber"
                  highlight={d === 0 ? 'Tamat hari ini' : `${d} hari lagi`}
                  busy={busy === t.id}
                  onClick={() => setSelected(t)}
                  onProgress={(delta) => bumpProgress(t, delta)}
                  onComplete={() => quickUpdate(t, 'SELESAI')}
                />
              )
            })}
          </div>
        )}
      </Card>

      <TaskDetailDialog
        task={selected}
        onClose={() => setSelected(null)}
        onUpdated={(patch) => {
          patchLocal(selected?.id ?? '', patch)
          load()
        }}
      />
    </div>
  )
}

function OverdueCard({ task, tone, highlight, busy, onClick, onProgress, onComplete }: {
  task: Task
  tone: 'rose' | 'amber'
  highlight: string
  busy: boolean
  onClick: () => void
  onProgress: (delta: number) => void
  onComplete: () => void
}) {
  return (
    <div className={`glass p-3 rounded-lg border-${tone}-500/30 bg-${tone}-500/5`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-medium leading-snug flex-1 cursor-pointer hover:underline" onClick={onClick}>{task.title}</p>
        <Badge className={`${statusBadgeClass(task.priority)} text-[9px]`}>{statusLabel(task.priority)}</Badge>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
        <Avatar className="w-5 h-5">
          <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-[8px]">
            {initials(task.assignee.name)}
          </AvatarFallback>
        </Avatar>
        <span className="truncate">{task.assignee.name}</span>
      </div>
      <div className={`text-xs mb-2 font-medium text-${tone}-600`}>
        <CalendarClock className="w-3 h-3 inline mr-1" />
        {fmtDate(task.dueDate, { withTime: true })} - {highlight}
      </div>
      <Progress value={task.progress} className={`h-1.5 [&>div]:bg-${tone}-500`} />
      <div className="flex items-center justify-between mt-3">
        <span className="text-[10px] text-muted-foreground">{task.progress}%</span>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" disabled={busy} onClick={() => onProgress(10)} className="h-6 text-[10px] px-2 glass">
            +10%
          </Button>
          <Button size="sm" disabled={busy} onClick={onComplete} className="h-6 text-[10px] px-2 bg-emerald-600 hover:bg-emerald-700 text-white">
            <CheckCircle2 className="w-3 h-3" /> Selesai
          </Button>
        </div>
      </div>
    </div>
  )
}

/* =========================================================
   Tab 4 - Cipta Tugasan
   ========================================================= */
function CreateTab({ onCreated }: { onCreated: () => void }) {
  const [staff, setStaff] = useState<StaffItem[]>([])
  const [loadingStaff, setLoadingStaff] = useState(true)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [priority, setPriority] = useState<Priority>('SEDERHANA')
  const [dueDate, setDueDate] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    api<{ staff: StaffItem[] }>('/api/staff')
      .then(d => setStaff(d.staff))
      .catch(() => toast.error('Gagal memuatkan senarai staf'))
      .finally(() => setLoadingStaff(false))
  }, [])

  async function submit() {
    if (!title.trim() || !assigneeId || !dueDate) {
      toast.error('Sila isi tajuk, penerima dan tarikh akhir')
      return
    }
    setSubmitting(true)
    try {
      await api('/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
          action: 'CREATE',
          title: title.trim(),
          description: description.trim(),
          assigneeId,
          priority,
          dueDate,
        }),
      })
      toast.success('Tugasan baharu dicipta')
      setTitle(''); setDescription(''); setAssigneeId(''); setPriority('SEDERHANA'); setDueDate('')
      onCreated()
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal mencipta tugasan')
    } finally {
      setSubmitting(false)
    }
  }

  // Default due date: 7 hari dari sekarang
  useEffect(() => {
    if (!dueDate) {
      const d = new Date(Date.now() + 7 * 86400000)
      setDueDate(d.toISOString().slice(0, 10))
    }
  }, [dueDate])

  return (
    <Card className="glass-card p-5 max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <Plus className="w-4 h-4 text-emerald-600" />
        <h3 className="font-semibold text-sm">Cipta Tugasan Baharu</h3>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="text-xs">Tajuk Tugasan *</Label>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="cth. Sediakan laporan jualan bulanan" className="glass-input mt-1" />
        </div>

        <div>
          <Label className="text-xs">Penerangan</Label>
          <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="glass-input mt-1" placeholder="Butiran tugasan, keperluan, dll..." />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Penerima Tugasan *</Label>
            {loadingStaff ? (
              <Skeleton className="h-9 w-full mt-1" />
            ) : (
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger className="glass-input mt-1"><SelectValue placeholder="Pilih staf" /></SelectTrigger>
                <SelectContent className="glass-strong max-h-72">
                  {staff.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} - {s.position}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div>
            <Label className="text-xs">Keutamaan</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
              <SelectTrigger className="glass-input mt-1"><SelectValue /></SelectTrigger>
              <SelectContent className="glass-strong">
                {PRIORITIES.map(p => <SelectItem key={p} value={p}>{statusLabel(p)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className="text-xs">Tarikh Akhir *</Label>
          <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="glass-input mt-1" />
        </div>

        <Separator />

        <div className="flex justify-end gap-2">
          <Button variant="outline" className="glass" onClick={() => { setTitle(''); setDescription(''); setAssigneeId(''); setPriority('SEDERHANA'); setDueDate('') }}>
            Reset
          </Button>
          <Button disabled={submitting || !title.trim() || !assigneeId || !dueDate} onClick={submit} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            {submitting ? 'Mencipta...' : <><Plus className="w-4 h-4" /> Cipta Tugasan</>}
          </Button>
        </div>
      </div>
    </Card>
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
