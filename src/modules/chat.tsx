'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageCircle, Send, Paperclip, Smile, Pin, Reply, Search, Users, Info,
  Plus, Megaphone, Hash, User as UserIcon, BellOff, ArrowLeft, X, Check,
  CheckCheck, Loader2, Volume2,
} from 'lucide-react'
import { api, useApp } from '@/lib/store'
import { toast } from 'sonner'
import {
  fmtTime, fmtTime12, fmtDate, relTime, initials, safeJson,
} from '@/lib/format'
import { ROLE_LABELS } from '@/lib/rbac'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

// ---- Types ----
type ConvType = 'TERUS' | 'KUMPULAN' | 'PENGUMUMAN'

interface ParticipantStaff {
  id: string
  name: string
  position: string
  avatarUrl: string | null
  roleCode: string
}
interface Participant {
  staffId: string
  isAdmin: boolean
  staff: ParticipantStaff
}

interface Attachment {
  name: string
  size: number
  mime?: string
}

interface ChatMessage {
  id: string
  senderId: string
  sender: { id: string; name: string; avatarUrl: string | null }
  content: string
  attachments: string | null
  replyToId: string | null
  pinned: boolean
  createdAt: string
}

interface Conversation {
  id: string
  type: ConvType
  name: string | null
  avatarUrl: string | null
  isAdmin: boolean
  muted: string | null
  participants: Participant[]
  lastMessage: {
    id: string
    content: string
    sender: { id: string; name: string }
    createdAt: string
  } | null
  unread: number
}

interface ConversationDetail extends Conversation {
  messages: ChatMessage[]
}

interface StaffListItem {
  id: string
  name: string
  position: string
  department?: { name: string } | null
  avatarUrl?: string | null
  roleCode?: string
}

const EMOJIS = [
  '😀','😁','😂','🤣','😊','😍','😘','😎','🤔','😴',
  '🙏','👏','👍','👎','👌','🙌','💪','🤝','👋','✌️',
  '❤️','🔥','✨','🎉','🎊','💯','⭐','🌟','📌','📎',
]

function convTypeIcon(type: ConvType) {
  if (type === 'PENGUMUMAN') return Megaphone
  if (type === 'KUMPULAN') return Users
  return UserIcon
}

function convDisplay(c: Conversation, meId: string): string {
  if (c.type === 'TERUS') {
    const other = c.participants.find(p => p.staffId !== meId)
    return other?.staff.name ?? 'Perbualan'
  }
  return c.name ?? 'Kumpulan'
}

function convAvatar(c: Conversation, meId: string): { name: string; url: string | null } {
  if (c.type === 'TERUS') {
    const other = c.participants.find(p => p.staffId !== meId)
    return { name: other?.staff.name ?? 'P', url: other?.staff.avatarUrl ?? null }
  }
  return { name: c.name ?? 'K', url: c.avatarUrl ?? null }
}

// ============== CHAT MODULE ==============
export function ChatModule() {
  const { user } = useApp()
  const meId = user?.id ?? ''

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [search, setSearch] = useState('')

  const [activeId, setActiveId] = useState<string | null>(null)
  const [active, setActive] = useState<ConversationDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const [draft, setDraft] = useState('')
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([])
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null)
  const [showEmoji, setShowEmoji] = useState(false)
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionStart, setMentionStart] = useState(0)

  const [infoOpen, setInfoOpen] = useState(false)
  const [showNewGroup, setShowNewGroup] = useState(false)
  const [showNewDirect, setShowNewDirect] = useState(false)
  const [showAnnouncement, setShowAnnouncement] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const userScrolledUpRef = useRef(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // ---- Load conversation list ----
  const loadList = useCallback(async () => {
    try {
      const data = await api<{ conversations: Conversation[] }>('/api/chat')
      setConversations(data.conversations ?? [])
    } catch (e: any) {
      toast.error('Gagal memuatkan perbualan', { description: e?.message })
    } finally {
      setLoadingList(false)
    }
  }, [])

  useEffect(() => {
    loadList()
    const i = setInterval(loadList, 8000)
    return () => clearInterval(i)
  }, [loadList])

  // ---- Load active conversation ----
  const loadConversation = useCallback(async (id: string, initial = false) => {
    try {
      if (initial) setLoadingDetail(true)
      const data = await api<{ conversation: ConversationDetail }>(`/api/chat?conversationId=${id}`)
      setActive(data.conversation)
      // Update unread in list locally
      setConversations(prev => prev.map(c => c.id === id ? { ...c, unread: 0 } : c))
    } catch (e: any) {
      if (initial) toast.error('Gagal memuatkan mesej', { description: e?.message })
    } finally {
      setLoadingDetail(false)
    }
  }, [])

  // ---- Polling when conversation is open ----
  useEffect(() => {
    if (!activeId) {
      setActive(null)
      return
    }
    loadConversation(activeId, true)
    pollRef.current = setInterval(() => {
      if (!userScrolledUpRef.current) {
        loadConversation(activeId, false)
      }
    }, 5000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [activeId, loadConversation])

  // ---- Auto scroll to bottom on new messages ----
  useEffect(() => {
    if (!active || userScrolledUpRef.current) return
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [active?.messages.length])

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120
    userScrolledUpRef.current = !nearBottom
  }, [])

  // ---- Filtered conversation list ----
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return conversations
    return conversations.filter(c => {
      const name = convDisplay(c, meId).toLowerCase()
      const last = c.lastMessage?.content?.toLowerCase() ?? ''
      return name.includes(q) || last.includes(q)
    })
  }, [conversations, search, meId])

  // ---- Send message ----
  const send = useCallback(async () => {
    if (!activeId || (!draft.trim() && pendingAttachments.length === 0)) return
    const content = draft.trim()
    const attachments = pendingAttachments
    const replyToId = replyTo?.id ?? null
    setDraft('')
    setPendingAttachments([])
    setReplyTo(null)
    setShowEmoji(false)
    setMentionQuery(null)
    try {
      await api('/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          action: 'SEND',
          conversationId: activeId,
          content: content || '(lampiran)',
          attachments,
          replyToId,
        }),
      })
      await loadConversation(activeId, false)
      loadList()
    } catch (e: any) {
      toast.error('Gagal menghantar mesej', { description: e?.message })
      setDraft(content)
    }
  }, [activeId, draft, pendingAttachments, replyTo, loadConversation, loadList])

  // ---- Handle typing for mentions ----
  const onDraftChange = (v: string) => {
    setDraft(v)
    // detect @mention
    const caret = v.length
    const before = v.slice(0, caret)
    const match = before.match(/@(\w*)$/)
    if (match) {
      setMentionQuery(match[1].toLowerCase())
      setMentionStart(before.length - match[0].length)
    } else {
      setMentionQuery(null)
    }
  }

  const insertMention = (staff: ParticipantStaff) => {
    const before = draft.slice(0, mentionStart)
    const after = draft.slice(mentionStart + (mentionQuery?.length ?? 0) + 1)
    const name = staff.name.replace(/\s+/g, '')
    setDraft(`${before}@${name} ${after}`)
    setMentionQuery(null)
    textareaRef.current?.focus()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    const next: Attachment[] = files.map(f => ({
      name: f.name,
      size: f.size,
      mime: f.type,
    }))
    setPendingAttachments(prev => [...prev, ...next])
    e.target.value = ''
  }

  const canSendAnnouncement = (user?.roleCode === 'HR' || user?.roleCode === 'ADMIN' || user?.roleCode === 'EXEC')

  const participantsForMention = useMemo(() => {
    if (!active) return []
    const q = mentionQuery ?? ''
    return active.participants
      .filter(p => p.staffId !== meId)
      .filter(p => !q || p.staff.name.toLowerCase().includes(q))
      .slice(0, 6)
  }, [active, mentionQuery, meId])

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-180px)] min-h-[480px]">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl glass flex items-center justify-center text-emerald-600">
            <MessageCircle className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gradient">Sembang</h1>
            <p className="text-xs text-muted-foreground">Perbualan langsung, kumpulan & pengumuman rasmi</p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="gap-2">
              <Plus className="size-4" />
              <span className="hidden sm:inline">Baru</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Buat Perbualan</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setShowNewGroup(true)}>
              <Users className="size-4 mr-2" /> Kumpulan Baharu
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setShowNewDirect(true)}>
              <UserIcon className="size-4 mr-2" /> Mesej Langsung
            </DropdownMenuItem>
            {canSendAnnouncement && (
              <DropdownMenuItem onSelect={() => setShowAnnouncement(true)}>
                <Megaphone className="size-4 mr-2" /> Pengumuman Rasmi
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4 min-h-0">
        {/* Left pane: conversation list */}
        <Card className="glass-card p-0 overflow-hidden flex flex-col">
          <div className="p-3 border-b border-border/40">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari perbualan…"
                className="pl-9 glass-input"
                aria-label="Cari perbualan"
              />
            </div>
          </div>
          <ScrollArea className="flex-1 scrollbar-thin">
            {loadingList ? (
              <div className="p-3 space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                <MessageCircle className="size-8 mx-auto mb-2 opacity-40" />
                Tiada perbualan.
              </div>
            ) : (
              <ul className="p-2 space-y-1">
                {filtered.map((c) => {
                  const disp = convDisplay(c, meId)
                  const av = convAvatar(c, meId)
                  const Icon = convTypeIcon(c.type)
                  const mutedArr = safeJson<string[]>(c.muted, [])
                  const isMuted = mutedArr.includes(meId)
                  return (
                    <li key={c.id}>
                      <button
                        onClick={() => { setActiveId(c.id); userScrolledUpRef.current = false }}
                        className={`w-full flex items-start gap-3 p-3 rounded-xl transition-colors text-left ${
                          activeId === c.id ? 'bg-emerald-500/15' : 'hover:bg-accent/60'
                        }`}
                        aria-current={activeId === c.id}
                      >
                        <div className="relative shrink-0">
                          <Avatar className="size-10">
                            {av.url && <AvatarImage src={av.url} alt={disp} />}
                            <AvatarFallback className="bg-emerald-500/20 text-emerald-700 text-xs font-semibold">
                              {initials(disp)}
                            </AvatarFallback>
                          </Avatar>
                          {c.type === 'KUMPULAN' && (
                            <span className="absolute -bottom-1 -right-1 size-4 rounded-full bg-teal-500 text-white flex items-center justify-center">
                              <Icon className="size-2.5" />
                            </span>
                          )}
                          {c.type === 'PENGUMUMAN' && (
                            <span className="absolute -bottom-1 -right-1 size-4 rounded-full bg-amber-500 text-white flex items-center justify-center">
                              <Icon className="size-2.5" />
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium truncate text-sm">{disp}</span>
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              {c.lastMessage ? fmtTime12(c.lastMessage.createdAt) : ''}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground truncate">
                              {c.type === 'PENGUMUMAN' && 'Pengumuman: '}
                              {c.lastMessage?.content ?? 'Tiada mesej lagi'}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              {isMuted && <BellOff className="size-3 text-muted-foreground" />}
                              {c.unread > 0 && (
                                <Badge className="bg-rose-500 text-white rounded-full text-[10px] h-4 min-w-4 px-1 justify-center">
                                  {c.unread > 99 ? '99+' : c.unread}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </ScrollArea>
        </Card>

        {/* Right pane: active conversation */}
        <Card className="glass-card p-0 overflow-hidden flex flex-col">
          {!active ? (
            <EmptyConversation />
          ) : loadingDetail ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="size-6 animate-spin text-emerald-600" />
            </div>
          ) : (
            <>
              {/* Header */}
              <header className="flex items-center gap-3 p-3 border-b border-border/40">
                <Button
                  variant="ghost" size="icon"
                  className="md:hidden -ml-1"
                  onClick={() => { setActiveId(null); setActive(null) }}
                  aria-label="Kembali"
                >
                  <ArrowLeft className="size-4" />
                </Button>
                <Avatar className="size-9">
                  {convAvatar(active, meId).url && <AvatarImage src={convAvatar(active, meId).url} alt={convDisplay(active, meId)} />}
                  <AvatarFallback className="bg-emerald-500/20 text-emerald-700 text-xs">
                    {initials(convDisplay(active, meId))}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold truncate">{convDisplay(active, meId)}</h2>
                    {active.type === 'PENGUMUMAN' && (
                      <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30">
                        <Megaphone className="size-3 mr-1" /> Pengumuman
                      </Badge>
                    )}
                    {active.isAdmin && active.type === 'KUMPULAN' && (
                      <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30">Pentadbir</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {active.participants.length} peserta
                    {active.type === 'TERUS' && (
                      <> · {active.participants.find(p => p.staffId !== meId)?.staff.position}</>
                    )}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setInfoOpen(true)} aria-label="Maklumat perbualan">
                  <Info className="size-4" />
                </Button>
              </header>

              {/* Announcement banner */}
              {active.type === 'PENGUMUMAN' && !canSendAnnouncement && (
                <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                  <Megaphone className="size-3.5" />
                  Saluran pengumuman rasmi — hanya HR/Pengurusan boleh menghantar.
                </div>
              )}

              {/* Messages */}
              <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3"
                role="log"
                aria-live="polite"
              >
                {active.messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                    <div className="text-center">
                      <MessageCircle className="size-10 mx-auto mb-2 opacity-40" />
                      Mulakan perbualan anda.
                    </div>
                  </div>
                ) : (
                  active.messages.map((m) => (
                    <MessageBubble
                      key={m.id}
                      msg={m}
                      mine={m.senderId === meId}
                      isGroup={active.type !== 'TERUS'}
                      replyTo={m.replyToId ? active.messages.find(x => x.id === m.replyToId) ?? null : null}
                      onReply={() => setReplyTo(m)}
                      canPin={active.isAdmin || canSendAnnouncement}
                    />
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply preview */}
              <AnimatePresence>
                {replyTo && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-border/40 px-3 py-2 flex items-center gap-2 bg-emerald-500/5"
                  >
                    <Reply className="size-4 text-emerald-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">
                        Balas kepada <span className="font-medium text-foreground">{replyTo.sender.name}</span>
                      </p>
                      <p className="text-xs truncate">{replyTo.content}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="size-7" onClick={() => setReplyTo(null)} aria-label="Batal balas">
                      <X className="size-4" />
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Pending attachments */}
              {pendingAttachments.length > 0 && (
                <div className="border-t border-border/40 px-3 py-2 flex flex-wrap gap-2">
                  {pendingAttachments.map((a, i) => (
                    <span key={i} className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 text-xs">
                      <Paperclip className="size-3" />
                      <span className="truncate max-w-[160px]">{a.name}</span>
                      <span className="text-muted-foreground">{fmtBytesLocal(a.size)}</span>
                      <button onClick={() => setPendingAttachments(prev => prev.filter((_, idx) => idx !== i))} aria-label="Buang lampiran">
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Input */}
              {active.type === 'PENGUMUMAN' && !canSendAnnouncement ? (
                <div className="p-3 border-t border-border/40 text-center text-xs text-muted-foreground">
                  Saluran hanya untuk dibaca.
                </div>
              ) : (
                <div className="p-3 border-t border-border/40 flex items-end gap-2 relative">
                  {/* Mention popover */}
                  {mentionQuery !== null && participantsForMention.length > 0 && (
                    <div className="absolute bottom-full left-3 right-3 mb-1 glass-strong rounded-xl p-1 z-10">
                      {participantsForMention.map(p => (
                        <button
                          key={p.staffId}
                          onMouseDown={(e) => { e.preventDefault(); insertMention(p.staff) }}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-accent text-left"
                        >
                          <Avatar className="size-6">
                            {p.staff.avatarUrl && <AvatarImage src={p.staff.avatarUrl} alt={p.staff.name} />}
                            <AvatarFallback className="text-[10px] bg-emerald-500/20 text-emerald-700">{initials(p.staff.name)}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{p.staff.name}</span>
                          <span className="text-xs text-muted-foreground">{p.staff.position}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={onPickFile}
                    aria-label="Pilih lampiran"
                  />
                  <Button
                    variant="ghost" size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Lampir fail"
                  >
                    <Paperclip className="size-4" />
                  </Button>

                  <Popover open={showEmoji} onOpenChange={setShowEmoji}>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label="Pilih emoji">
                        <Smile className="size-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72" align="start">
                      <div className="grid grid-cols-8 gap-1">
                        {EMOJIS.map((em) => (
                          <button
                            key={em}
                            className="size-8 rounded hover:bg-accent flex items-center justify-center text-lg"
                            onClick={() => {
                              setDraft(d => d + em)
                              setShowEmoji(false)
                              textareaRef.current?.focus()
                            }}
                            aria-label={`Emoji ${em}`}
                          >
                            {em}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>

                  <Textarea
                    ref={textareaRef}
                    value={draft}
                    onChange={(e) => onDraftChange(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder="Tulis mesej… (Enter untuk hantar, Shift+Enter untuk baris baru)"
                    className="flex-1 min-h-[40px] max-h-32 resize-none glass-input"
                    rows={1}
                    aria-label="Mesej"
                  />

                  <Button onClick={send} disabled={!draft.trim() && pendingAttachments.length === 0} className="gap-2" aria-label="Hantar mesej">
                    <Send className="size-4" />
                    <span className="hidden sm:inline">Hantar</span>
                  </Button>
                </div>
              )}
            </>
          )}
        </Card>
      </div>

      {/* Info Sheet */}
      <Sheet open={infoOpen} onOpenChange={setInfoOpen}>
        <SheetContent className="glass-strong border-l border-border/40 w-full sm:max-w-sm overflow-y-auto scrollbar-thin">
          <SheetHeader>
            <SheetTitle className="text-gradient">
              {active ? convDisplay(active, meId) : 'Maklumat'}
            </SheetTitle>
            <SheetDescription>
              {active?.type === 'KUMPULAN' && 'Kumpulan · '}
              {active?.type === 'PENGUMUMAN' && 'Saluran pengumuman · '}
              {active?.participants.length ?? 0} peserta
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6 space-y-3">
            {active?.messages.filter(m => m.pinned).length ? (
              <>
                <div className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1">
                  <Pin className="size-3" /> Disemat
                </div>
                {active.messages.filter(m => m.pinned).map(m => (
                  <div key={m.id} className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-xs">
                    <p className="font-medium">{m.sender.name}</p>
                    <p className="mt-1">{m.content}</p>
                  </div>
                ))}
                <Separator />
              </>
            ) : null}
            <div className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1">
              <Users className="size-3" /> Peserta
            </div>
            <ul className="space-y-2">
              {active?.participants.map(p => (
                <li key={p.staffId} className="flex items-center gap-3">
                  <Avatar className="size-8">
                    {p.staff.avatarUrl && <AvatarImage src={p.staff.avatarUrl} alt={p.staff.name} />}
                    <AvatarFallback className="text-[10px] bg-emerald-500/20 text-emerald-700">{initials(p.staff.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.staff.name}{p.staffId === meId && ' (Anda)'}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {p.staff.position} · {(ROLE_LABELS as any)[p.staff.roleCode] ?? p.staff.roleCode}
                    </p>
                  </div>
                  {p.isAdmin && <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30">Pentadbir</Badge>}
                </li>
              ))}
            </ul>
          </div>
        </SheetContent>
      </Sheet>

      {/* New Group Dialog */}
      <NewGroupDialog
        open={showNewGroup}
        onOpenChange={setShowNewGroup}
        onCreated={(convId) => {
          setShowNewGroup(false)
          setActiveId(convId)
          loadList()
        }}
      />

      {/* New Direct Dialog */}
      <NewDirectDialog
        open={showNewDirect}
        onOpenChange={setShowNewDirect}
        onCreated={(convId) => {
          setShowNewDirect(false)
          setActiveId(convId)
          loadList()
        }}
      />

      {/* Announcement Dialog */}
      <AnnouncementDialog
        open={showAnnouncement}
        onOpenChange={setShowAnnouncement}
        onSent={() => {
          setShowAnnouncement(false)
          loadList()
        }}
      />
    </div>
  )
}

// ---- Message Bubble ----
function MessageBubble({
  msg, mine, isGroup, replyTo, onReply, canPin,
}: {
  msg: ChatMessage
  mine: boolean
  isGroup: boolean
  replyTo: ChatMessage | null
  onReply: () => void
  canPin: boolean
}) {
  const attachments = safeJson<Attachment[]>(msg.attachments, [])
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${mine ? 'justify-end' : 'justify-start'} gap-2`}
    >
      {!mine && (
        <Avatar className="size-8 mt-auto">
          {msg.sender.avatarUrl && <AvatarImage src={msg.sender.avatarUrl} alt={msg.sender.name} />}
          <AvatarFallback className="text-[10px] bg-emerald-500/20 text-emerald-700">{initials(msg.sender.name)}</AvatarFallback>
        </Avatar>
      )}
      <div className={`max-w-[78%] ${mine ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        {!mine && isGroup && (
          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400 px-1">{msg.sender.name}</span>
        )}
        {replyTo && (
          <div className={`rounded-lg border-l-2 px-2 py-1 text-xs ${mine ? 'bg-emerald-500/15 border-emerald-600' : 'bg-muted/60 border-muted-foreground'}`}>
            <span className="font-medium">{replyTo.sender.name}: </span>
            <span className="text-muted-foreground truncate">{replyTo.content}</span>
          </div>
        )}
        <div
          className={`rounded-2xl px-3 py-2 text-sm shadow-sm relative ${
            mine
              ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-br-sm'
              : 'glass rounded-bl-sm'
          } ${msg.pinned ? 'ring-2 ring-amber-500/60' : ''}`}
        >
          {msg.pinned && (
            <Pin className="size-3 absolute -top-2 -right-2 text-amber-600 bg-amber-500/20 rounded-full p-0.5" />
          )}
          {msg.content && <p className="whitespace-pre-wrap break-words">{msg.content}</p>}
          {attachments.length > 0 && (
            <div className="mt-1.5 space-y-1">
              {attachments.map((a, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 rounded-lg px-2 py-1 text-xs ${
                    mine ? 'bg-white/15' : 'bg-emerald-500/10 border border-emerald-500/20'
                  }`}
                >
                  <Paperclip className="size-3 shrink-0" />
                  <span className="truncate flex-1">{a.name}</span>
                  <span className="opacity-70 shrink-0">{fmtBytesLocal(a.size)}</span>
                </div>
              ))}
            </div>
          )}
          <div className={`flex items-center gap-1 mt-0.5 text-[10px] ${mine ? 'text-white/80 justify-end' : 'text-muted-foreground'}`}>
            <span>{fmtTime(msg.createdAt)}</span>
            {mine && <CheckCheck className="size-3" />}
          </div>
        </div>
        <div className={`flex items-center gap-1 text-[10px] text-muted-foreground ${mine ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={onReply}
            className="hover:text-emerald-600 inline-flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-accent"
            aria-label="Balas mesej"
          >
            <Reply className="size-3" /> Balas
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// ---- Empty State ----
function EmptyConversation() {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="size-16 mx-auto mb-4 rounded-2xl glass flex items-center justify-center text-emerald-600">
          <MessageCircle className="size-8" />
        </div>
        <h3 className="font-semibold text-lg text-gradient">Selamat Datang ke Sembang</h3>
        <p className="text-sm text-muted-foreground mt-2">
          Pilih perbualan untuk mula berbual, atau cipta perbualan baharu dengan butang "Baru".
        </p>
      </div>
    </div>
  )
}

// ---- New Group Dialog ----
function NewGroupDialog({
  open, onOpenChange, onCreated,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onCreated: (convId: string) => void
}) {
  const [name, setName] = useState('')
  const [members, setMembers] = useState<string[]>([])
  const [staff, setStaff] = useState<StaffListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingStaff, setLoadingStaff] = useState(false)

  useEffect(() => {
    if (open && staff.length === 0) {
      setLoadingStaff(true)
      api<{ staff: StaffListItem[] }>('/api/staff')
        .then(d => setStaff(d.staff ?? []))
        .catch(() => setStaff([]))
        .finally(() => setLoadingStaff(false))
    }
  }, [open, staff.length])

  const toggle = (id: string) =>
    setMembers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const submit = async () => {
    if (!name.trim()) {
      toast.error('Nama kumpulan diperlukan')
      return
    }
    if (members.length === 0) {
      toast.error('Pilih sekurang-kurangnya satu ahli')
      return
    }
    setLoading(true)
    try {
      const data = await api<{ conversation: { id: string } }>('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ action: 'CREATE_GROUP', name: name.trim(), memberIds: members }),
      })
      toast.success('Kumpulan dicipta')
      setName('')
      setMembers([])
      onCreated(data.conversation.id)
    } catch (e: any) {
      toast.error('Gagal mencipta kumpulan', { description: e?.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong max-w-md">
        <DialogHeader>
          <DialogTitle className="text-gradient">Kumpulan Baharu</DialogTitle>
          <DialogDescription>Cipta kumpulan perbualan dengan staf lain.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="grp-name">Nama Kumpulan</Label>
            <Input id="grp-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="cth. Projek Emas 2025" className="glass-input mt-1" />
          </div>
          <div>
            <Label>Pilih Ahli</Label>
            <div className="mt-2 max-h-64 overflow-y-auto scrollbar-thin rounded-lg border border-border/40">
              {loadingStaff ? (
                <div className="p-3 space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : staff.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground text-center">Tiada staf.</p>
              ) : (
                <ul className="divide-y divide-border/30">
                  {staff.map(s => (
                    <li key={s.id}>
                      <label className="flex items-center gap-3 p-2 hover:bg-accent cursor-pointer">
                        <Checkbox checked={members.includes(s.id)} onCheckedChange={() => toggle(s.id)} />
                        <Avatar className="size-7">
                          {s.avatarUrl && <AvatarImage src={s.avatarUrl} alt={s.name} />}
                          <AvatarFallback className="text-[10px] bg-emerald-500/20 text-emerald-700">{initials(s.name)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{s.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{s.position}{s.department?.name ? ` · ${s.department.name}` : ''}</p>
                        </div>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {members.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">{members.length} ahli dipilih</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={submit} disabled={loading} className="gap-2">
            {loading && <Loader2 className="size-4 animate-spin" />}
            Cipta Kumpulan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---- New Direct Dialog ----
function NewDirectDialog({
  open, onOpenChange, onCreated,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onCreated: (convId: string) => void
}) {
  const [staff, setStaff] = useState<StaffListItem[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingStaff, setLoadingStaff] = useState(false)

  useEffect(() => {
    if (open && staff.length === 0) {
      setLoadingStaff(true)
      api<{ staff: StaffListItem[] }>('/api/staff')
        .then(d => setStaff(d.staff ?? []))
        .catch(() => setStaff([]))
        .finally(() => setLoadingStaff(false))
    }
  }, [open, staff.length])

  const filtered = staff.filter(s =>
    s.name.toLowerCase().includes(q.toLowerCase()) ||
    (s.position ?? '').toLowerCase().includes(q.toLowerCase()),
  )

  const start = async (targetId: string) => {
    setLoading(true)
    try {
      const data = await api<{ conversation: { id: string } }>('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ action: 'CREATE_DIRECT', targetStaffId: targetId }),
      })
      onCreated(data.conversation.id)
    } catch (e: any) {
      toast.error('Gagal memulakan perbualan', { description: e?.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong max-w-md">
        <DialogHeader>
          <DialogTitle className="text-gradient">Mesej Langsung</DialogTitle>
          <DialogDescription>Pilih staf untuk memulakan perbualan peribadi.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari staf…" className="pl-9 glass-input" />
          </div>
          <div className="max-h-72 overflow-y-auto scrollbar-thin rounded-lg border border-border/40">
            {loadingStaff ? (
              <div className="p-3 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : filtered.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground text-center">Tiada staf dijumpai.</p>
            ) : (
              <ul className="divide-y divide-border/30">
                {filtered.map(s => (
                  <li key={s.id}>
                    <button
                      onClick={() => start(s.id)}
                      disabled={loading}
                      className="w-full flex items-center gap-3 p-2 hover:bg-accent text-left"
                    >
                      <Avatar className="size-8">
                        {s.avatarUrl && <AvatarImage src={s.avatarUrl} alt={s.name} />}
                        <AvatarFallback className="text-[10px] bg-emerald-500/20 text-emerald-700">{initials(s.name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{s.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{s.position}{s.department?.name ? ` · ${s.department.name}` : ''}</p>
                      </div>
                      <MessageCircle className="size-4 text-emerald-600" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---- Announcement Dialog ----
function AnnouncementDialog({
  open, onOpenChange, onSent,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSent: () => void
}) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!content.trim()) {
      toast.error('Mesej pengumuman diperlukan')
      return
    }
    setLoading(true)
    try {
      await api('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ action: 'ANNOUNCEMENT', content: content.trim() }),
      })
      toast.success('Pengumuman dihantar')
      setContent('')
      onSent()
    } catch (e: any) {
      toast.error('Gagal menghantar pengumuman', { description: e?.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-gradient flex items-center gap-2">
            <Megaphone className="size-5 text-amber-600" /> Pengumuman Rasmi
          </DialogTitle>
          <DialogDescription>
            Disiarkan ke saluran pengumuman seluruh syarikat. Hanya boleh dihantar oleh HR/Pengurusan.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-800 dark:text-amber-300">
            Pengumuman akan dipaparkan kepada semua staf dan disemat secara automatik.
          </div>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Tulis pengumuman rasmi di sini…"
            className="glass-input min-h-[120px]"
            rows={5}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={submit} disabled={loading} className="gap-2 bg-amber-600 hover:bg-amber-700 text-white">
            {loading && <Loader2 className="size-4 animate-spin" />}
            <Megaphone className="size-4" /> Siarkan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---- Local byte formatter (avoids import collisions) ----
function fmtBytesLocal(bytes: number) {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}
