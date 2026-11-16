'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Building2, Lock, Mail, Sparkles, ShieldCheck, Users, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api, useApp } from '@/lib/store'
import { toast } from 'sonner'

const DEMO_ACCOUNTS = [
  { email: 'admin@al-amin.my', role: 'Pentadbir Sistem', desc: 'Konfigurasi & audit' },
  { email: 'noraishah.hr@al-amin.my', role: 'Pegawai HR', desc: 'Operasi HR penuh' },
  { email: 'ceo@al-amin.my', role: 'Pengurusan Atasan', desc: 'Dashboard eksekutif' },
  { email: 'AAE-0006@al-amin.my', role: 'Penyelia', desc: 'Selia pasukan' },
]

export function LoginScreen() {
  const { setUser } = useApp()
  const [email, setEmail] = useState('admin@al-amin.my')
  const [password, setPassword] = useState('password')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const d = await api<{ user: any }>('/api/auth', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      setUser(d.user)
      toast.success(`Selamat datang, ${d.user.name}!`)
    } catch (err: any) {
      toast.error(err.message ?? 'Log masuk gagal')
    } finally {
      setLoading(false)
    }
  }

  function quickLogin(em: string) {
    setEmail(em)
    setPassword('password')
    setTimeout(() => {
      const form = document.getElementById('login-form') as HTMLFormElement | null
      form?.requestSubmit()
    }, 50)
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left: Brand panel */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="lg:w-1/2 p-8 lg:p-12 flex flex-col justify-between relative overflow-hidden"
      >
        <div className="glass-card p-8 lg:p-10 flex flex-col gap-6 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Al-Amin Emall</h1>
              <p className="text-xs text-muted-foreground">Sistem Pengurusan Sumber Manusia Berasaskan AI</p>
            </div>
          </div>

          <div>
            <h2 className="text-3xl lg:text-4xl font-bold leading-tight text-gradient">
              HRMS Bersepadu
              <br />untuk Pasukan Moden
            </h2>
            <p className="mt-3 text-muted-foreground text-sm leading-relaxed">
              Platform pusat untuk kehadiran, tugasan, kalendar, latihan, pencapaian,
              komunikasi dalaman, dokumen, dan pembantu AI HR — semuanya dalam satu sistem.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Clock, label: 'Kehadiran & Cuti', color: 'text-emerald-600' },
              { icon: Users, label: 'Pengurusan Staf', color: 'text-amber-600' },
              { icon: ShieldCheck, label: 'RBAC & Audit', color: 'text-rose-600' },
              { icon: Sparkles, label: 'Pembantu AI HR', color: 'text-fuchsia-600' },
            ].map((f, i) => (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i + 0.3 }}
                className="glass p-3 rounded-lg flex items-center gap-2"
              >
                <f.icon className={`w-4 h-4 ${f.color}`} />
                <span className="text-xs font-medium">{f.label}</span>
              </motion.div>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-6 relative z-10">
          Prototaip Fasa 1 · Pangkalan data dummy · Dibangunkan dengan z.ai (GLM)
        </p>
      </motion.div>

      {/* Right: Login form */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="lg:w-1/2 p-8 lg:p-12 flex items-center justify-center"
      >
        <div className="w-full max-w-md glass-strong rounded-2xl p-6 lg:p-8">
          <h3 className="text-xl font-bold mb-1">Log Masuk</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Sila log masuk menggunakan e-mel dan kata laluan anda.
          </p>

          <form id="login-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mel</Label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 glass-input"
                  placeholder="nama@al-amin.my"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Kata Laluan</Label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 glass-input"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Sedang log masuk...' : 'Log Masuk'}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-border/40">
            <p className="text-xs text-muted-foreground mb-3">Log masuk pantas (demo):</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((a) => (
                <button
                  key={a.email}
                  onClick={() => quickLogin(a.email)}
                  className="text-left p-2 rounded-lg glass hover:bg-accent/50 transition-colors group"
                >
                  <p className="text-xs font-semibold group-hover:text-primary">{a.role}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{a.email}</p>
                  <p className="text-[10px] text-muted-foreground/80">{a.desc}</p>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground/70 mt-3 text-center">
              Kata laluan demo: <code className="bg-muted px-1 rounded">password</code>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
