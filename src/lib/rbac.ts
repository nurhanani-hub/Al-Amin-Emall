// Client-safe RBAC constants & types (no next/headers imports)

export type RoleCode = 'ADMIN' | 'HR' | 'SUPERVISOR' | 'STAFF' | 'EXEC'

export type SessionUser = {
  id: string
  staffNo: string
  name: string
  email: string
  roleCode: RoleCode
  departmentId: string | null
  position: string
  avatarUrl: string | null
}

export const ROLE_LABELS: Record<RoleCode, string> = {
  ADMIN: 'Pentadbir Sistem',
  HR: 'Pegawai HR',
  SUPERVISOR: 'Ketua Jabatan',
  STAFF: 'Staf',
  EXEC: 'Pengurusan Atasan',
}

export const NAV_ITEMS = [
  { key: 'dashboard', label: 'Papan Pemuka', icon: 'LayoutDashboard', roles: ['ADMIN', 'HR', 'SUPERVISOR', 'STAFF', 'EXEC'] },
  { key: 'attendance', label: 'Kehadiran', icon: 'Clock', roles: ['ADMIN', 'HR', 'SUPERVISOR', 'STAFF', 'EXEC'] },
  { key: 'tasks', label: 'Tugasan', icon: 'CheckSquare', roles: ['ADMIN', 'HR', 'SUPERVISOR', 'STAFF', 'EXEC'] },
  { key: 'calendar', label: 'Kalendar', icon: 'Calendar', roles: ['ADMIN', 'HR', 'SUPERVISOR', 'STAFF', 'EXEC'] },
  { key: 'training', label: 'Latihan & Kursus', icon: 'GraduationCap', roles: ['ADMIN', 'HR', 'SUPERVISOR', 'STAFF', 'EXEC'] },
  { key: 'achievements', label: 'Pencapaian', icon: 'Trophy', roles: ['ADMIN', 'HR', 'SUPERVISOR', 'STAFF', 'EXEC'] },
  { key: 'chat', label: 'Sembang', icon: 'MessageCircle', roles: ['ADMIN', 'HR', 'SUPERVISOR', 'STAFF', 'EXEC'] },
  { key: 'documents', label: 'Dokumen', icon: 'FolderOpen', roles: ['ADMIN', 'HR', 'SUPERVISOR', 'STAFF', 'EXEC'] },
  { key: 'ai', label: 'Pembantu AI', icon: 'Sparkles', roles: ['ADMIN', 'HR', 'SUPERVISOR', 'STAFF', 'EXEC'] },
  { key: 'reports', label: 'Laporan', icon: 'BarChart3', roles: ['ADMIN', 'HR', 'SUPERVISOR', 'EXEC'] },
  { key: 'admin', label: 'Pentadbiran', icon: 'Settings', roles: ['ADMIN', 'HR'] },
] as const

export function navForRole(role: string) {
  return NAV_ITEMS.filter(n => n.roles.includes(role as any))
}
