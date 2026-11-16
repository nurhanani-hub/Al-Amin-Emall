'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CalendarDays, ChevronLeft, ChevronRight, Plus, MapPin, Link as LinkIcon,
  Users, Trash2, Clock, Calendar as CalendarIcon, ListChecks, X, Loader2,
  PartyPopper, GraduationCap, Plane,
} from 'lucide-react'
import {
  addDays, addMonths, endOfMonth, endOfWeek,
  format, isSameDay, isSameMonth, isToday, parseISO, startOfDay,
  startOfMonth, startOfWeek,
} from 'date-fns'
import { api, useApp } from '@/lib/store'
import { toast } from 'sonner'
import { fmtDate, fmtTime12, initials } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ToggleGroup, ToggleGroupItem,
} from '@/components/ui/toggle-group'

// ===== Types =====
type EventType = 'MESYUARAT' | 'CUTI' | 'LATIHAN' | 'TUGAS' | 'CUTI_UMUM'

interface Person { id: string; name: string; position?: string; avatarUrl?: string | null }
interface CalEvent {
  id: string
  title: string
  type: EventType
  start: string
  end: string
  location?: string | null
  link?: string | null
  agenda?: string | null
  organizer?: Person | null
  participants?: Person[]
}
interface Holiday {
  id: string
  title: string
  name?: string
  start: string
  end: string
  type: string
  holidayType?: string
}
interface CalData {
  events: CalEvent[]
  taskEvents: CalEvent[]
  holidays: Holiday[]
  leaves: CalEvent[]
}
interface StaffItem { id: string; name: string; position?: string }

const TYPE_META: Record<EventType, { label: string; chip: string; dot: string; icon: any }> = {
  MESYUARAT:  { label: 'Mesyuarat', chip: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/25', dot: 'bg-emerald-500', icon: Users },
  LATIHAN:    { label: 'Latihan',   chip: 'bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-400 border-fuchsia-500/25', dot: 'bg-fuchsia-500', icon: GraduationCap },
  TUGAS:      { label: 'Tugasan',   chip: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25', dot: 'bg-amber-500', icon: ListChecks },
  CUTI:       { label: 'Cuti Saya', chip: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-500/25', dot: 'bg-cyan-500', icon: Plane },
  CUTI_UMUM:  { label: 'Cuti Umum', chip: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/25', dot: 'bg-rose-500', icon: PartyPopper },
}

const WEEKDAYS = ['Ahd', 'Isn', 'Sel', 'Rab', 'Kha', 'Jum', 'Sab']
const MONTHS_MY = ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun',
                   'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember']

type ViewMode = 'Bulan' | 'Minggu' | 'Hari'

// ===== Main =====
export function CalendarModule() {
  const { user } = useApp()
  const [view, setView] = useState<ViewMode>('Bulan')
  const [cursor, setCursor] = useState<Date>(new Date())
  const [data, setData] = useState<CalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [detailEvent, setDetailEvent] = useState<CalEvent | null>(null)

  const range = useMemo(() => {
    if (view === 'Bulan') {
      return { from: startOfMonth(cursor), to: endOfMonth(cursor) }
    }
    if (view === 'Minggu') {
      const from = startOfWeek(cursor, { weekStartsOn: 0 })
      return { from, to: endOfWeek(cursor, { weekStartsOn: 0 }) }
    }
    return { from: startOfDay(cursor), to: endOfDayLocal(cursor) }
  }, [view, cursor])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        from: range.from.toISOString(),
        to: range.to.toISOString(),
      })
      const d = await api<CalData>(`/api/calendar?${params.toString()}`)
      setData(d)
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal memuatkan kalendar')
    } finally {
      setLoading(false)
    }
  }, [range.from, range.to])

  useEffect(() => { if (user) load() }, [user, load])

  // Merge all into one display list
  const allEvents = useMemo<CalEvent[]>(() => {
    if (!data) return []
    const holidaysAsEvents: CalEvent[] = data.holidays.map(h => ({
      id: h.id, title: h.name ?? h.title, type: 'CUTI_UMUM',
      start: h.start, end: h.end ?? h.start, location: null, link: null,
      agenda: h.type, organizer: null, participants: [],
    }))
    return [
      ...(data.events ?? []),
      ...(data.taskEvents ?? []),
      ...(data.leaves ?? []),
      ...holidaysAsEvents,
    ]
  }, [data])

  const shift = (delta: number) => {
    if (view === 'Bulan') setCursor(c => addMonths(c, delta))
    else if (view === 'Minggu') setCursor(c => addDays(c, delta * 7))
    else setCursor(c => addDays(c, delta))
  }

  if (!user) {
    return (
      <div className="glass-card p-6 space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  const title = view === 'Bulan'
    ? `${MONTHS_MY[cursor.getMonth()]} ${cursor.getFullYear()}`
    : view === 'Minggu'
      ? `${format(startOfWeek(cursor, { weekStartsOn: 0 }), 'dd MMM')} - ${format(endOfWeek(cursor, { weekStartsOn: 0 }), 'dd MMM yyyy')}`
      : format(cursor, 'EEEE, dd MMMM yyyy')

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="glass-card p-5 lg:p-6 relative overflow-hidden"
      >
        <div className="absolute -right-16 -top-16 w-48 h-48 rounded-full bg-gradient-to-br from-emerald-500/15 to-teal-500/10 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-gradient">Kalendar Al-Amin Emall</h1>
              <p className="text-xs text-muted-foreground">Mesyuarat, latihan, cuti & cuti umum (Malaysia)</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" className="glass" onClick={() => setCursor(new Date())}>
              Hari Ini
            </Button>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="glass h-9 w-9" onClick={() => shift(-1)} aria-label="Sebelum">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" className="glass h-9 w-9" onClick={() => shift(1)} aria-label="Seterusnya">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v as ViewMode)} className="glass rounded-lg p-1">
              <ToggleGroupItem value="Bulan" className="text-xs px-3">Bulan</ToggleGroupItem>
              <ToggleGroupItem value="Minggu" className="text-xs px-3">Minggu</ToggleGroupItem>
              <ToggleGroupItem value="Hari" className="text-xs px-3">Hari</ToggleGroupItem>
            </ToggleGroup>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4" /> Mesyuarat Baharu
            </Button>
          </div>
        </div>

        <div className="relative mt-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{title}</h2>
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 text-[11px]">
            {Object.entries(TYPE_META).map(([k, m]) => (
              <span key={k} className="inline-flex items-center gap-1.5 text-muted-foreground">
                <span className={`w-2.5 h-2.5 rounded-full ${m.dot}`} />
                {m.label}
              </span>
            ))}
          </div>
        </div>
      </motion.header>

      {/* Calendar body */}
      {loading ? (
        <Skeleton className="h-[600px] w-full rounded-xl" />
      ) : view === 'Bulan' ? (
        <MonthView cursor={cursor} events={allEvents} onSelectDay={setSelectedDay} onSelectEvent={setDetailEvent} />
      ) : view === 'Minggu' ? (
        <WeekView cursor={cursor} events={allEvents} onSelectEvent={setDetailEvent} />
      ) : (
        <DayView cursor={cursor} events={allEvents} onSelectEvent={setDetailEvent} />
      )}

      {/* Selected day side panel (Bulan) */}
      <AnimatePresence>
        {selectedDay && (
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
          >
            <DayDetailPanel
              day={selectedDay}
              events={allEvents.filter(e => isSameDay(parseISO(e.start), selectedDay))}
              onClose={() => setSelectedDay(null)}
              onSelectEvent={setDetailEvent}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <CreateEventDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultStart={selectedDay ?? new Date()}
        onCreated={() => { setCreateOpen(false); load() }}
      />

      <EventDetailDialog
        event={detailEvent}
        onClose={() => setDetailEvent(null)}
        onChanged={() => { setDetailEvent(null); load() }}
      />
    </div>
  )
}

function endOfDayLocal(d: Date) {
  const x = new Date(d)
  x.setHours(23, 59, 0, 0)
  return x
}

/* =========================================================
   Month View
   ========================================================= */
function MonthView({
  cursor, events, onSelectDay, onSelectEvent,
}: {
  cursor: Date
  events: CalEvent[]
  onSelectDay: (d: Date) => void
  onSelectEvent: (e: CalEvent) => void
}) {
  const monthStart = startOfMonth(cursor)
  const monthEnd = endOfMonth(cursor)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
  const days: Date[] = []
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) days.push(d)

  return (
    <Card className="glass-card p-2 sm:p-4 overflow-hidden">
      {/* Weekday header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEKDAYS.map(d => (
          <div key={d} className="text-center text-[11px] sm:text-xs font-semibold text-muted-foreground py-1">
            {d}
          </div>
        ))}
      </div>
      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, idx) => {
          const inMonth = isSameMonth(day, cursor)
          const today = isToday(day)
          const dayEvents = events.filter(e => isSameDay(parseISO(e.start), day))
          const isHoliday = dayEvents.some(e => e.type === 'CUTI_UMUM')
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectDay(day)}
              className={`group relative min-h-[80px] sm:min-h-[110px] rounded-lg p-1.5 text-left transition
                ${inMonth ? 'bg-background/40 hover:bg-emerald-500/10' : 'bg-muted/30 opacity-50'}
                ${isHoliday ? 'border border-rose-500/30' : 'border border-transparent'}
                ${today ? 'ring-2 ring-emerald-500/60' : ''}`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold ${today ? 'text-emerald-600' : ''}`}>
                  {day.getDate()}
                </span>
                {dayEvents.length > 0 && (
                  <span className="text-[10px] text-muted-foreground">{dayEvents.length}</span>
                )}
              </div>
              <div className="mt-1 space-y-1 max-h-[60px] sm:max-h-[80px] overflow-hidden">
                {dayEvents.slice(0, 3).map(e => {
                  const m = TYPE_META[e.type]
                  return (
                    <div
                      key={e.id}
                      role="button"
                      tabIndex={0}
                      onClick={(ev) => { ev.stopPropagation(); onSelectEvent(e) }}
                      onKeyDown={(ev) => { if (ev.key === 'Enter') { ev.stopPropagation(); onSelectEvent(e) } }}
                      className={`text-[10px] sm:text-[11px] truncate px-1.5 py-0.5 rounded border ${m.chip}`}
                    >
                      {e.title}
                    </div>
                  )
                })}
                {dayEvents.length > 3 && (
                  <div className="text-[10px] text-muted-foreground px-1">+{dayEvents.length - 3} lagi</div>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </Card>
  )
}

/* =========================================================
   Week View
   ========================================================= */
function WeekView({
  cursor, events, onSelectEvent,
}: {
  cursor: Date
  events: CalEvent[]
  onSelectEvent: (e: CalEvent) => void
}) {
  const weekStart = startOfWeek(cursor, { weekStartsOn: 0 })
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  return (
    <Card className="glass-card p-3 overflow-hidden">
      <div className="grid grid-cols-7 gap-2">
        {days.map((d, idx) => {
          const dayEvents = events.filter(e => isSameDay(parseISO(e.start), d))
          const today = isToday(d)
          return (
            <div key={idx} className={`rounded-lg border p-2 min-h-[300px] ${today ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-border/40 bg-background/30'}`}>
              <div className="flex flex-col items-center mb-2">
                <span className="text-[10px] text-muted-foreground uppercase">{WEEKDAYS[idx]}</span>
                <span className={`text-sm font-semibold ${today ? 'text-emerald-600' : ''}`}>{d.getDate()}</span>
              </div>
              <div className="space-y-1.5">
                {dayEvents.length === 0 ? (
                  <div className="text-[10px] text-muted-foreground/60 text-center py-2">-</div>
                ) : dayEvents.map(e => {
                  const m = TYPE_META[e.type]
                  const Icon = m.icon
                  return (
                    <button
                      key={e.id}
                      onClick={() => onSelectEvent(e)}
                      className={`w-full text-left text-[11px] px-2 py-1.5 rounded border ${m.chip} hover:scale-[1.02] transition`}
                    >
                      <div className="flex items-start gap-1">
                        <Icon className="w-3 h-3 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <div className="font-medium truncate">{e.title}</div>
                          <div className="opacity-70 text-[10px]">{fmtTime12(e.start)}</div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

/* =========================================================
   Day View (hourly timeline 8-20)
   ========================================================= */
function DayView({
  cursor, events, onSelectEvent,
}: {
  cursor: Date
  events: CalEvent[]
  onSelectEvent: (e: CalEvent) => void
}) {
  const startHour = 8
  const endHour = 20
  const totalHours = endHour - startHour
  const hours = Array.from({ length: totalHours + 1 }, (_, i) => startHour + i)
  const dayEvents = events.filter(e => isSameDay(parseISO(e.start), cursor))

  return (
    <Card className="glass-card p-3 sm:p-4 overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">{format(cursor, 'EEEE, dd MMMM yyyy')}</h3>
        <Badge variant="outline" className="text-[11px]">{dayEvents.length} acara</Badge>
      </div>
      <div className="relative" style={{ height: `${(totalHours + 1) * 56}px` }}>
        {/* Hour grid */}
        {hours.map((h, i) => (
          <div key={h} className="absolute left-0 right-0 flex items-start" style={{ top: `${i * 56}px`, height: '56px' }}>
            <div className="w-14 sm:w-16 text-[10px] sm:text-xs text-muted-foreground pt-1 text-right pr-2">
              {String(h).padStart(2, '0')}:00
            </div>
            <div className="flex-1 border-t border-border/40" />
          </div>
        ))}
        {/* Events */}
        {dayEvents.map(e => {
          const start = parseISO(e.start)
          const end = parseISO(e.end ?? e.start)
          const startH = Math.max(start.getHours() + start.getMinutes() / 60, startHour)
          const endH = Math.min(end.getHours() + end.getMinutes() / 60 || (startH + 1), endHour + 1)
          if (endH <= startHour || startH >= endHour + 1) return null
          const top = (startH - startHour) * 56
          const height = Math.max((endH - startH) * 56, 28)
          const m = TYPE_META[e.type]
          const Icon = m.icon
          return (
            <button
              key={e.id}
              onClick={() => onSelectEvent(e)}
              className={`absolute left-16 sm:left-20 right-2 rounded-md border ${m.chip} px-2 py-1 text-left overflow-hidden hover:scale-[1.01] transition`}
              style={{ top, height }}
            >
              <div className="flex items-start gap-1">
                <Icon className="w-3 h-3 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold truncate">{e.title}</div>
                  <div className="text-[10px] opacity-70">
                    {fmtTime12(e.start)} - {fmtTime12(e.end ?? e.start)}
                  </div>
                </div>
              </div>
            </button>
          )
        })}
        {dayEvents.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            Tiada acara untuk hari ini
          </div>
        )}
      </div>
    </Card>
  )
}

/* =========================================================
   Day Detail Panel (selected day in Bulan view)
   ========================================================= */
function DayDetailPanel({
  day, events, onClose, onSelectEvent,
}: {
  day: Date
  events: CalEvent[]
  onClose: () => void
  onSelectEvent: (e: CalEvent) => void
}) {
  return (
    <Card className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold">{format(day, 'EEEE, dd MMMM yyyy')}</h3>
          <p className="text-xs text-muted-foreground">{events.length} acara</p>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose} aria-label="Tutup">
          <X className="w-4 h-4" />
        </Button>
      </div>
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Tiada acara pada hari ini.</p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin">
          {events.map(e => {
            const m = TYPE_META[e.type]
            const Icon = m.icon
            return (
              <button
                key={e.id}
                onClick={() => onSelectEvent(e)}
                className={`w-full text-left rounded-lg border ${m.chip} px-3 py-2 hover:scale-[1.01] transition`}
              >
                <div className="flex items-start gap-2">
                  <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{e.title}</div>
                    <div className="text-[11px] opacity-75 flex items-center gap-2">
                      <Clock className="w-3 h-3" /> {fmtTime12(e.start)}
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </Card>
  )
}

/* =========================================================
   Create Event Dialog
   ========================================================= */
function CreateEventDialog({
  open, onOpenChange, defaultStart, onCreated,
}: {
  open: boolean
  onOpenChange: (b: boolean) => void
  defaultStart: Date
  onCreated: () => void
}) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState<'MESYUARAT' | 'LATIHAN'>('MESYUARAT')
  const [start, setStart] = useState(toLocalInput(defaultStart))
  const [end, setEnd] = useState(toLocalInput(addDays(defaultStart, 0)))
  const [location, setLocation] = useState('')
  const [link, setLink] = useState('')
  const [agenda, setAgenda] = useState('')
  const [participantIds, setParticipantIds] = useState<string[]>([])
  const [staff, setStaff] = useState<StaffItem[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setStart(toLocalInput(defaultStart))
      setEnd(toLocalInput(defaultStart))
    }
  }, [open, defaultStart])

  useEffect(() => {
    if (!open) return
    api<{ staff: StaffItem[] }>('/api/staff')
      .then(d => setStaff(d.staff ?? []))
      .catch(() => { /* silent */ })
  }, [open])

  const toggleParticipant = (id: string) => {
    setParticipantIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function submit() {
    if (!title.trim()) { toast.error('Sila isi tajuk'); return }
    if (!start) { toast.error('Sila pilih tarikh mula'); return }
    setSaving(true)
    try {
      await api('/api/calendar', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(), type,
          start: new Date(start).toISOString(),
          end: new Date(end || start).toISOString(),
          location: location.trim() || null,
          link: link.trim() || null,
          agenda: agenda.trim() || null,
          participantIds,
        }),
      })
      toast.success('Acara berjaya dicipta')
      setTitle(''); setLocation(''); setLink(''); setAgenda(''); setParticipantIds([])
      onCreated()
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal mencipta acara')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong max-w-2xl">
        <DialogHeader>
          <DialogTitle>Mesyuarat / Acara Baharu</DialogTitle>
          <DialogDescription>Cipta mesyuarat atau sesi latihan baru dengan jemputan peserta.</DialogDescription>
        </DialogHeader>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="ev-title">Tajuk *</Label>
            <Input id="ev-title" className="glass-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Mesyuarat Pengurusan Bulanan" />
          </div>
          <div className="space-y-1.5">
            <Label>Jenis</Label>
            <Select value={type} onValueChange={(v) => setType(v as any)}>
              <SelectTrigger className="glass-input"><SelectValue /></SelectTrigger>
              <SelectContent className="glass-strong">
                <SelectItem value="MESYUARAT">Mesyuarat</SelectItem>
                <SelectItem value="LATIHAN">Latihan</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ev-loc">Lokasi</Label>
            <Input id="ev-loc" className="glass-input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Bilik Mesyuarat A" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ev-start">Mula *</Label>
            <Input id="ev-start" type="datetime-local" className="glass-input" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ev-end">Tamat</Label>
            <Input id="ev-end" type="datetime-local" className="glass-input" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="ev-link">Pautan (Google Meet / Zoom)</Label>
            <Input id="ev-link" className="glass-input" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://meet.google.com/..." />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="ev-agenda">Agenda</Label>
            <Textarea id="ev-agenda" className="glass-input min-h-[80px]" value={agenda} onChange={(e) => setAgenda(e.target.value)} placeholder="Perkara-perkara untuk dibincangkan..." />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Peserta</Label>
            <div className="glass-input rounded-lg p-3 max-h-48 overflow-y-auto scrollbar-thin">
              {staff.length === 0 ? (
                <p className="text-xs text-muted-foreground">Memuatkan staf...</p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-1.5">
                  {staff.map(s => (
                    <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-emerald-500/10 rounded px-1.5 py-1">
                      <input
                        type="checkbox"
                        checked={participantIds.includes(s.id)}
                        onChange={() => toggleParticipant(s.id)}
                        className="accent-emerald-600"
                      />
                      <span className="truncate">{s.name}</span>
                      {s.position && <span className="text-[10px] text-muted-foreground">- {s.position}</span>}
                    </label>
                  ))}
                </div>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">{participantIds.length} peserta dipilih</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={saving} onClick={submit}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Cipta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/* =========================================================
   Event Detail Dialog
   ========================================================= */
function EventDetailDialog({
  event, onClose, onChanged,
}: {
  event: CalEvent | null
  onClose: () => void
  onChanged: () => void
}) {
  const { user } = useApp()
  const [deleting, setDeleting] = useState(false)

  if (!event) return null
  const m = TYPE_META[event.type]
  const Icon = m.icon
  const canDelete = !!event.organizer && event.organizer.id === user?.id

  async function del() {
    if (!event) return
    setDeleting(true)
    try {
      await api(`/api/calendar?id=${encodeURIComponent(event.id)}`, { method: 'DELETE' })
      toast.success('Acara dipadam')
      onChanged()
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal memadam acara')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={!!event} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="glass-strong max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border ${m.chip}`}>
              <Icon className="w-3 h-3" /> {m.label}
            </span>
          </div>
          <DialogTitle className="text-lg">{event.title}</DialogTitle>
          <DialogDescription>
            {fmtDate(event.start, { long: true })} - {fmtTime12(event.start)}
            {event.end && <> {'\u2022'} tamat {fmtTime12(event.end)}</>}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {event.location && (
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="w-4 h-4 text-emerald-600 mt-0.5" />
              <span>{event.location}</span>
            </div>
          )}
          {event.link && (
            <div className="flex items-start gap-2 text-sm">
              <LinkIcon className="w-4 h-4 text-emerald-600 mt-0.5" />
              <a href={event.link} target="_blank" rel="noreferrer" className="text-emerald-600 hover:underline truncate">
                {event.link}
              </a>
            </div>
          )}
          {event.agenda && (
            <div className="rounded-lg glass p-3">
              <div className="text-[11px] text-muted-foreground mb-1">Agenda</div>
              <p className="text-sm whitespace-pre-wrap">{event.agenda}</p>
            </div>
          )}
          {event.organizer && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-[11px] text-muted-foreground">Penganjur:</span>
              <Avatar className="w-6 h-6">
                <AvatarImage src={event.organizer.avatarUrl ?? undefined} />
                <AvatarFallback className="text-[10px]">{initials(event.organizer.name)}</AvatarFallback>
              </Avatar>
              <span>{event.organizer.name}</span>
            </div>
          )}
          {event.participants && event.participants.length > 0 && (
            <div>
              <div className="text-[11px] text-muted-foreground mb-1.5">Peserta ({event.participants.length})</div>
              <div className="flex flex-wrap gap-2">
                {event.participants.map(p => (
                  <div key={p.id} className="flex items-center gap-1.5 glass rounded-full pl-1 pr-2 py-1">
                    <Avatar className="w-5 h-5">
                      <AvatarImage src={p.avatarUrl ?? undefined} />
                      <AvatarFallback className="text-[9px]">{initials(p.name)}</AvatarFallback>
                    </Avatar>
                    <span className="text-[11px]">{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        {canDelete && (
          <DialogFooter>
            <Button variant="destructive" size="sm" onClick={del} disabled={deleting}>
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Padam Acara
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
