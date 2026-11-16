'use client'

import { useEffect } from 'react'
import { useApp, api, type SessionUser } from '@/lib/store'
import { LoginScreen } from '@/components/login-screen'
import { AppShell } from '@/components/app-shell'

export default function Home() {
  const { user, loadingUser, setUser, setLoadingUser, theme, setTheme } = useApp()

  // Initialize theme on mount
  useEffect(() => {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('theme') : null
    const prefersDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
    const t = (stored ?? (prefersDark ? 'dark' : 'light')) as 'light' | 'dark'
    setTheme(t)
  }, [setTheme])

  // Check session
  useEffect(() => {
    let mounted = true
    setLoadingUser(true)
    api<{ user: SessionUser | null }>('/api/auth')
      .then((d) => { if (mounted) setUser(d.user ?? null) })
      .catch(() => { if (mounted) setUser(null) })
      .finally(() => { if (mounted) setLoadingUser(false) })
    return () => { mounted = false }
  }, [setUser, setLoadingUser])

  // Apply theme class
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', theme === 'dark')
    }
  }, [theme])

  if (loadingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-8 flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground text-sm">Memuat HRMS Al-Amin...</p>
        </div>
      </div>
    )
  }

  if (!user) return <LoginScreen />
  return <AppShell />
}
