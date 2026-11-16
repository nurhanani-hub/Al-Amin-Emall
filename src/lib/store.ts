'use client'

import { create } from 'zustand'
import type { SessionUser } from '@/lib/rbac'

export type { SessionUser }

export type ModuleKey =
  | 'dashboard' | 'attendance' | 'tasks' | 'calendar' | 'training'
  | 'achievements' | 'chat' | 'documents' | 'ai' | 'reports' | 'admin'

type AppState = {
  user: SessionUser | null
  loadingUser: boolean
  activeModule: ModuleKey
  theme: 'light' | 'dark'
  setUser: (u: SessionUser | null) => void
  setLoadingUser: (b: boolean) => void
  setActiveModule: (m: ModuleKey) => void
  toggleTheme: () => void
  setTheme: (t: 'light' | 'dark') => void
}

export const useApp = create<AppState>((set, get) => ({
  user: null,
  loadingUser: true,
  activeModule: 'dashboard',
  theme: (typeof window !== 'undefined' && localStorage.getItem('theme') === 'dark') ? 'dark' : 'light',
  setUser: (u) => set({ user: u }),
  setLoadingUser: (b) => set({ loadingUser: b }),
  setActiveModule: (m) => set({ activeModule: m }),
  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark'
    set({ theme: next })
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', next === 'dark')
    }
    if (typeof localStorage !== 'undefined') localStorage.setItem('theme', next)
  },
  setTheme: (t) => {
    set({ theme: t })
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', t === 'dark')
    }
    if (typeof localStorage !== 'undefined') localStorage.setItem('theme', t)
  },
}))

// API helper
export async function api<T = any>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts?.headers ?? {}) },
    credentials: 'include',
  })
  if (res.status === 401) {
    // session expired
    if (typeof window !== 'undefined') {
      useApp.getState().setUser(null)
    }
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((data as any)?.error ?? `Ralat ${res.status}`)
  }
  return data as T
}
