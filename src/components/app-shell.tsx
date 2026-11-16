'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Clock, CheckSquare, Calendar as CalIcon, GraduationCap,
  Trophy, MessageCircle, FolderOpen, Sparkles, BarChart3, Settings,
  Menu, X, LogOut, Bell, Search, Moon, Sun, ChevronDown, Building2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ROLE_LABELS, navForRole } from '@/lib/rbac'
import { api, useApp, type SessionUser } from '@/lib/store'
import { initials, relTime } from '@/lib/format'
import { toast } from 'sonner'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet, SheetContent, SheetTrigger,
} from '@/components/ui/sheet'

const ICON_MAP: Record<string, any> = {
  LayoutDashboard, Clock, CheckSquare, Calendar: CalIcon, GraduationCap, Trophy,
  MessageCircle, FolderOpen, Sparkles, BarChart3, Settings,
}

import { DashboardModule } from '@/modules/dashboard'
import { AttendanceModule } from '@/modules/attendance'
import { TasksModule } from '@/modules/tasks'
import { CalendarModule } from '@/modules/calendar'
import { TrainingModule } from '@/modules/training'
import { AchievementsModule } from '@/modules/achievements'
import { ChatModule } from '@/modules/chat'
import { DocumentsModule } from '@/modules/documents'
import { AiModule } from '@/modules/ai'
import { ReportsModule } from '@/modules/reports'
import { AdminModule } from '@/modules/admin'

export function AppShell() {
  const { user, activeModule, setActiveModule, theme, toggleTheme, setUser } = useApp()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifs, setNotifs] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [unreadMsgs, setUnreadMsgs] = useState(0)

  // Poll notifications + chat every 30s
  useEffect(() => {
    async function load() {
      try {
        const d = await api<{ notifications: any[]; unreadCount: number }>('/api/notifications')
        setNotifs(d.notifications)
        setUnreadCount(d.unreadCount)
        const dash = await api<{ unreadMsgs: number }>('/api/dashboard')
        setUnreadMsgs(dash.unreadMsgs ?? 0)
      } catch {}
    }
    load()
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [])

  if (!user) return null
  const nav = navForRole(user.roleCode)
  const u = user as SessionUser

  async function logout() {
    try {
      await api('/api/auth', { method: 'DELETE' })
      setUser(null)
      toast.success('Anda telah log keluar')
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  async function markAllRead() {
    await api('/api/notifications', { method: 'POST', body: JSON.stringify({ action: 'MARK_READ' }) })
    setNotifs(n => n.map(x => ({ ...x, read: true })))
    setUnreadCount(0)
  }

  function renderModule() {
    switch (activeModule) {
      case 'dashboard': return <DashboardModule />
      case 'attendance': return <AttendanceModule />
      case 'tasks': return <TasksModule />
      case 'calendar': return <CalendarModule />
      case 'training': return <TrainingModule />
      case 'achievements': return <AchievementsModule />
      case 'chat': return <ChatModule />
      case 'documents': return <DocumentsModule />
      case 'ai': return <AiModule />
      case 'reports': return <ReportsModule />
      case 'admin': return <AdminModule />
      default: return <DashboardModule />
    }
  }

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="px-4 py-5 flex items-center gap-2 border-b border-sidebar-border/40">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
          <Building2 className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate">HRMS Al-Amin</p>
          <p className="text-[10px] text-muted-foreground truncate">Pengurusan Sumber Manusia</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5 scrollbar-thin">
        {nav.map((item) => {
          const Icon = ICON_MAP[item.icon] ?? LayoutDashboard
          const active = activeModule === item.key
          const badge = item.key === 'chat' ? unreadMsgs : (item.key === 'ai' ? 'AI' : null)
          return (
            <button
              key={item.key}
              onClick={() => { setActiveModule(item.key as any); setSidebarOpen(false) }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                active
                  ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/10 text-foreground shadow-sm border border-emerald-500/20'
                  : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-emerald-600' : ''}`} />
              <span className="flex-1 text-left truncate">{item.label}</span>
              {typeof badge === 'number' && badge > 0 && (
                <span className="text-[10px] bg-rose-500 text-white rounded-full px-1.5 py-0.5 min-w-[18px] text-center">{badge}</span>
              )}
              {badge === 'AI' && (
                <Sparkles className="w-3 h-3 text-fuchsia-500" />
              )}
            </button>
          )
        })}
      </nav>

      <div className="px-3 py-3 border-t border-sidebar-border/40">
        <div className="glass p-2 rounded-lg flex items-center gap-2">
          <Avatar className="w-8 h-8">
            <AvatarImage src={u.avatarUrl ?? undefined} />
            <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-xs">
              {initials(u.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{u.name}</p>
            <p className="text-[10px] text-muted-foreground truncate">{ROLE_LABELS[u.roleCode]}</p>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="app-shell">
      {/* Top bar */}
      <header className="glass-strong sticky top-0 z-40 border-b border-border/30">
        <div className="flex items-center gap-3 px-4 lg:px-6 py-3">
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 glass-strong">
              {sidebar}
            </SheetContent>
          </Sheet>

          <div className="lg:hidden flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" />
            </div>
          </div>

          <div className="flex-1 max-w-md">
            <div className="relative hidden sm:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                placeholder="Cari staf, dokumen, tugasan..."
                className="w-full glass-input rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="icon" onClick={toggleTheme} title="Tukar tema">
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>

            <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 glass-strong">
                <div className="flex items-center justify-between p-2">
                  <span className="text-sm font-semibold">Notifikasi</span>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-xs text-primary hover:underline">Tanda semua dibaca</button>
                  )}
                </div>
                <DropdownMenuSeparator />
                <div className="max-h-96 overflow-y-auto scrollbar-thin">
                  {notifs.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6">Tiada notifikasi</p>
                  ) : notifs.slice(0, 15).map((n) => (
                    <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-0.5 py-2 cursor-pointer">
                      <div className="flex items-center gap-2 w-full">
                        {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                        <span className="text-xs font-medium flex-1">{n.title}</span>
                        <span className="text-[10px] text-muted-foreground">{relTime(n.createdAt)}</span>
                      </div>
                      {n.body && <p className="text-[11px] text-muted-foreground line-clamp-2">{n.body}</p>}
                    </DropdownMenuItem>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-accent/40 transition-colors">
                  <Avatar className="w-7 h-7">
                    <AvatarImage src={u.avatarUrl ?? undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-xs">
                      {initials(u.name)}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="w-3 h-3 text-muted-foreground hidden sm:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="glass-strong">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{u.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">{u.email}</p>
                    <Badge variant="outline" className="w-fit mt-1 text-[10px]">{ROLE_LABELS[u.roleCode]}</Badge>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setActiveModule('attendance')}>Profil Saya</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveModule('achievements')}>Pencapaian Saya</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-rose-600 focus:text-rose-600">
                  <LogOut className="w-4 h-4 mr-2" /> Log Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex w-64 shrink-0 flex-col glass border-r border-border/30 sticky top-[57px] h-[calc(100vh-57px)]">
          {sidebar}
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 overflow-y-auto scrollbar-thin">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeModule}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="p-4 lg:p-6"
            >
              {renderModule()}
            </motion.div>
          </AnimatePresence>

          {/* Footer sticky */}
          <footer className="mt-8 glass border-t border-border/30 px-4 lg:px-6 py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
              <p>© 2026 Al-Amin Emall Sdn Bhd · HRMS v1.1 Prototaip</p>
              <p className="flex items-center gap-2">
                <span>Bahasa: BM</span>
                <span>·</span>
                <span>Zon: Asia/Kuala_Lumpur</span>
                <span>·</span>
                <span>Mata wang: RM</span>
              </p>
            </div>
          </footer>
        </main>
      </div>
    </div>
  )
}
