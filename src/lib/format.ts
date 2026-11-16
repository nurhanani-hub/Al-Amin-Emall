/** Format helpers - timezone Asia/Kuala_Lumpur, mata wang RM, tarikh DD/MM/YYYY */

export function fmtDate(d: Date | string, opts?: { withTime?: boolean; long?: boolean }) {
  const date = typeof d === 'string' ? new Date(d) : d
  if (isNaN(date.getTime())) return '-'
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yyyy = date.getFullYear()
  if (opts?.withTime) {
    const h = String(date.getHours()).padStart(2, '0')
    const m = String(date.getMinutes()).padStart(2, '0')
    return `${dd}/${mm}/${yyyy} ${h}:${m}`
  }
  if (opts?.long) {
    return date.toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' })
  }
  return `${dd}/${mm}/${yyyy}`
}

export function fmtTime(d: Date | string) {
  const date = typeof d === 'string' ? new Date(d) : d
  if (isNaN(date.getTime())) return '-'
  const h = String(date.getHours()).padStart(2, '0')
  const m = String(date.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

export function fmtTime12(d: Date | string) {
  const date = typeof d === 'string' ? new Date(d) : d
  if (isNaN(date.getTime())) return '-'
  let h = date.getHours()
  const m = String(date.getMinutes()).padStart(2, '0')
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12
  if (h === 0) h = 12
  return `${h}:${m} ${ampm}`
}

export function fmtMins(mins: number) {
  if (!mins) return '0m'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m}m`
  return `${h}j ${m}m`
}

export function fmtCurrency(n: number) {
  return new Intl.NumberFormat('ms-MY', { style: 'currency', currency: 'MYR', minimumFractionDigits: 2 }).format(n)
}

export function fmtNumber(n: number) {
  return new Intl.NumberFormat('ms-MY').format(n)
}

export function fmtBytes(bytes: number) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

export function relTime(d: Date | string) {
  const date = typeof d === 'string' ? new Date(d) : d
  const diff = Date.now() - date.getTime()
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return 'baru saja'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} minit lalu`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} jam lalu`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day} hari lalu`
  const mon = Math.floor(day / 30)
  if (mon < 12) return `${mon} bulan lalu`
  return `${Math.floor(mon / 12)} tahun lalu`
}

export function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map(s => s[0]?.toUpperCase() ?? '').join('')
}

// Status translations & colors
export const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  // Attendance
  HADIR: { label: 'Hadir', color: 'emerald' },
  TERLAMBAT: { label: 'Terlambat', color: 'amber' },
  CUTI: { label: 'Cuti', color: 'violet' },
  TIDAK_HADIR: { label: 'Tidak Hadir', color: 'rose' },
  KERJA_LUAR: { label: 'Kerja Luar', color: 'cyan' },
  CUTI_UMUM: { label: 'Cuti Umum', color: 'fuchsia' },
  // Leave
  DIMOHON: { label: 'Dimohon', color: 'amber' },
  LULUS: { label: 'Dilulus', color: 'emerald' },
  DITOLAK: { label: 'Ditolak', color: 'rose' },
  // Task
  BELUM_MULA: { label: 'Belum Mula', color: 'slate' },
  DALAM_PROSES: { label: 'Dalam Proses', color: 'sky' },
  SEMAKAN: { label: 'Semakan', color: 'amber' },
  SELESAI: { label: 'Selesai', color: 'emerald' },
  // Priority
  RENDAH: { label: 'Rendah', color: 'slate' },
  SEDERHANA: { label: 'Sederhana', color: 'sky' },
  TINGGI: { label: 'Tinggi', color: 'amber' },
  KRITIKAL: { label: 'Kritikal', color: 'rose' },
}

export function statusLabel(s: string) {
  return STATUS_LABELS[s]?.label ?? s
}
export function statusColor(s: string) {
  return STATUS_LABELS[s]?.color ?? 'slate'
}

export function safeJson<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback
  try { return JSON.parse(s) as T } catch { return fallback }
}
