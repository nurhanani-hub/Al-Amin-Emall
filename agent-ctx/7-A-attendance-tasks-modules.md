# Task 7-A: Attendance & Tasks Modules (HRMS Al-Amin Emall)

## Summary
Built two production-ready `'use client'` TypeScript React modules for the HRMS Next.js 16 app:

1. **`src/modules/attendance.tsx`** - exports `AttendanceModule`
2. **`src/modules/tasks.tsx`** - exports `TasksModule`

## Stack
- Next.js 16 App Router + React 19 + TypeScript 5 strict
- Tailwind 4 + shadcn/ui (New York)
- @dnd-kit/core for kanban DnD
- framer-motion for enter animations
- sonner for toasts
- Existing utilities: `api`, `useApp`, `fmtDate`, `fmtTime12`, `fmtMins`, `initials`, `statusLabel`, `statusColor`, `relTime`, `safeJson`, `ROLE_LABELS`

## Attendance Module (`attendance.tsx`)
Tabs (BM):
- **Kehadiran Saya** - Live clock widget (updates every second), Clock In/Out buttons (POST `/api/attendance` action=CLOCK_IN/CLOCK_OUT), today's stats (Masuk/Keluar/Jam Kerja/Lebih Masa/Terlambat/Awal Keluar), weekly summary bars with 48h policy warning (rose alert when exceeded).
- **Rekod & Laporan** - Filter by scope (self/team/dept/all - role gated), date range (default current month). Stats cards: total, hadir %, terlambat, overtime. Table with avatar+name+position columns. CSV export built client-side (Blob + download anchor, UTF-8 BOM for Excel compatibility).
- **Cuti** - Leave balance cards (TAHUNAN/SAKIT/KECEMASAN/BERSALIN_PATERNITI) with progress bars + icon + per-type max. "Mohon Cuti" dialog (Select type, dates, auto-calc days, reason). My applications list. For supervisors: "Permohonan Menunggu Kelulusan" with Approve/Reject buttons (POST /api/leave action=APPROVE/REJECT).
- **Pelarasan** (HR/Supervisor/Admin only) - Adjust form (staff select via GET /api/staff, date, status, note). Recent adjustments session audit list.

## Tasks Module (`tasks.tsx`)
Tabs (BM):
- **Papan Kanban** - 4 columns (Belum Mula / Dalam Proses / Semakan / Selesai) using `@dnd-kit/core` `useDraggable` + `useDroppable` + `PointerSensor` (distance 6px). Card shows title, priority badge, overdue/due-soon badges, progress bar, assignee avatar+initials, comment/attachment counts, due date. On drop → PATCH `/api/tasks` with optimistic update + rollback on error. Card click opens detail dialog. Top "Tugasan Baharu" button for supervisors.
- **Senarai Tugasan** - Filters (scope/status/priority). shadcn Table: Tajuk, Penerima, Pemberi, Keutamaan, Status, Kemajuan (progress bar + %), Tarikh Akhir (rose if overdue, amber if ≤3 days), Tindakan (Lihat button).
- **Tugasan Tertunggak** - Two sections: "Lewat" (rose cards) + "Hampir Tamat" (amber cards). Each shows highlight ("X hari lewat" / "X hari lagi"), progress, quick actions: +10% progress, "Selesai" button.
- **Cipta Tugasan** (Supervisors/HR/EXEC only) - Form: title, description, assignee select (fetched from GET /api/staff), priority select, due date (defaults to 7 days ahead). On submit POST CREATE then auto-switch to Kanban tab.

## Task Detail Dialog (shared)
Full details: assignee/assigner cards, dates (overdue highlighted), progress slider (0-100) with save, status quick-change buttons (PATCH), attachments list (parsed via `safeJson`), comments list with add-comment input (Enter to send).

## Quality Compliance
- BM throughout UI labels/toasts/messages
- Glassmorphism: every panel uses `glass-card`, surfaces use `glass`, forms use `glass-input`, modals `glass-strong`
- No indigo/blue - colors used: emerald, teal, amber, rose, cyan, fuchsia, slate
- Skeleton loaders while fetching; empty states with icon + message
- try/catch around all api calls with `toast.error`
- Responsive (mobile-first, sm/lg breakpoints, scrollable long lists `max-h-* overflow-y-auto scrollbar-thin`)
- ARIA labels on icon-only buttons (e.g. "Seret tugasan", "Lihat butiran")
- Framer Motion enter animations (opacity/y/scale)
- Semantic HTML (header, TabsList, Table, etc.)
- No emojis

## Lint Result
`bunx eslint src/modules/attendance.tsx src/modules/tasks.tsx` → **clean** (no errors, no warnings).

Full `bun run lint` shows only 2 pre-existing errors in `src/app/api/staff/route.ts:76` and `src/lib/auth.ts:51` (`@typescript-eslint/no-require-imports`) — NOT introduced by this task; both files untouched.

## Dev Server
GET http://localhost:3000/ returns 200; modules compile via existing app-shell.

## Notes
- Dynamic Tailwind class names like `bg-${color}-500/15` are already used throughout the codebase (e.g. `dashboard.tsx`) and safelisted via the JIT setup — verified working.
- `Progress` className override `[&>div]:bg-{color}-500` used to color progress bars per-status (matches existing dashboard pattern).
- Optimistic DnD: status updates apply locally before PATCH; rollback if API fails.
