# HRMS Al-Amin Emall — Sistem Pengurusan Sumber Manusia Berasaskan AI

> Comprehensive AI-powered Human Resource Management System for **Al-Amin Emall Sdn Bhd** (Malaysia), built per PRD v1.1.

![Next.js](https://img.shields.io/badge/Next.js-16-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Tailwind](https://img.shields.io/badge/Tailwind-4-38bdf8) ![Prisma](https://img.shields.io/badge/Prisma-6-2d3748) ![License](https://img.shields.io/badge/Status-Prototaip%20Fasa%201-emerald)

## Ringkasan

Platform HRMS bersepadu untuk menguruskan kehadiran, tugasan, kalendar, latihan, pencapaian, komunikasi dalaman, dokumen, dan modul AI HR. Dibangunkan sebagai prototaip fungsian Fasa 1 dengan pangkalan data dummy realistik, antara muka dalam **Bahasa Malaysia**, kesan **glassmorphism** moden, dan akses berasaskan peranan (RBAC).

## Tech Stack

| Lapisan | Teknologi |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript 5 |
| Styling | Tailwind CSS 4 + shadcn/ui (New York) |
| Database | Prisma ORM + SQLite (dummy, Fasa 1) |
| State | Zustand (client) + TanStack Query patterns |
| Charts | Recharts |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable |
| AI | z-ai-web-dev-sdk (GLM model) |
| Icons | lucide-react |
| Animations | Framer Motion |

## Modul (11)

1. **Papan Pemuka** — Dashboard berbeza mengikut peranan (staf, penyelia, HR, eksekutif, pentadbir)
2. **Kehadiran** — Clock In/Out, cuti & kelulusan, laporan bulanan, eksport CSV
3. **Tugasan** — Papan Kanban drag-drop, kemajuan, komen, tertunggak
4. **Kalendar** — Bulan/Minggu/Hari, mesyuarat, cuti umum (Persekutuan + Selangor)
5. **Latihan & Kursus** — Katalog 12 kursus, pendaftaran, kehadiran, markah, sijil
6. **Pencapaian** — Skor peribadi (SULIT), dinding pengiktirafan, KPI
7. **Sembang** — Mesej terus/kumpulan/pengumuman, lampiran, sebutan, balas
8. **Dokumen** — Muat naik, penapis, pemain audio, kuota 10 GB
9. **Pembantu AI** — Penjana bahan HR, cadangan kursus, ringkasan mesyuarat, chatbot, IDP
10. **Laporan** — 6 jenis laporan + eksport CSV/PDF
11. **Pentadbiran** — Direktori staf, data induk, cuti umum, tetapan, log audit

## Peranan (RBAC)

| Kod | Label | Keupayaan |
|---|---|---|
| `ADMIN` | Pentadbir Sistem | Konfigurasi, audit, semua data |
| `HR` | Pegawai HR | Operasi HR penuh, alat AI |
| `SUPERVISOR` | Ketua Jabatan | Agih tugas, lulus cuti, pantau pasukan |
| `STAFF` | Staf | Rekod sendiri, tugasan, kursus, sembang |
| `EXEC` | Pengurusan Atasan | Dashboard & laporan ringkasan |

## Log Masuk Demo

Kata laluan untuk semua akaun demo: `password`

| Peranan | E-mel |
|---|---|
| Pentadbir | `admin@al-amin.my` |
| HR | `noraishah.hr@al-amin.my` |
| Pengurusan Atasan | `ceo@al-amin.my` |
| Penyelia | `deepa.menon.18@al-amin.my` |
| Staf | `damia.binti.mohamad.21@al-amin.my` |

### Akaun Pemilik Projek (Nurhanani)

| Peranan | E-mel | Keupayaan |
|---|---|---|
| **Pentadbir Sistem** | `nurhanani@al-amin.edu.my` | Akses penuh — semua modul, konfigurasi, audit, tetapan |
| **Pengurusan Atasan** | `nurhanani.exec@al-amin.edu.my` | Dashboard eksekutif, laporan strategik, pengumuman rasmi |

Kedua-dua akaun: kata laluan `1Apr!l2024`

## Pemasangan Tempatan

```bash
# Install dependencies
bun install

# Push Prisma schema ke SQLite
bun run db:push

# Jana data dummy (31 staf, 1950 kehadiran, 40 tugasan, 12 kursus, dll)
bun prisma/seed.ts

# Mulakan dev server (port 3000)
bun run dev
```

Buka `http://localhost:3000` dan log masuk dengan akaun demo di atas.

## Struktur Projek

```
prisma/
  schema.prisma     # 20 entiti HRMS
  seed.ts           # Jana data dummy realistik Malaysia
src/
  app/
    api/            # 15 route API (REST)
    page.tsx        # Entry point (login + app shell)
    layout.tsx
    globals.css     # Glassmorphism design system
  components/
    ui/             # shadcn/ui components
    login-screen.tsx
    app-shell.tsx   # Sidebar + topbar + footer
  modules/          # 11 modul HRMS
  lib/
    auth.ts         # Sesi cookie (server-only)
    rbac.ts         # Peranan & navigasi (client-safe)
    store.ts        # Zustand store + api() helper
    db.ts           # Prisma client
    format.ts       # Tarikh/masa/mata wang/status BM
```

## Pengaturcaraan AI

Modul AI menggunakan `z-ai-web-dev-sdk` (model GLM) untuk:
- **FR-1001** Penjana Bahan HR (surat tawaran, amaran, memo, polisi, dll)
- **FR-1002** Cadangan Kursus Peribadi (skill-gap based)
- **FR-1003** Ringkasan Mesyuarat
- **FR-1004** Chatbot Soal Jawab HR
- **FR-1005** Pelan Pembangunan Individu (IDP) + KPI (SULIT)
- **FR-1006** Semua output dilabel "Dijana AI", perlu semakan manusia

Data KPI/markah **TIDAK** dihantar kepada model AI luar melainkan dinyahkenal.

## Pematuhan

- Akta Perlindungan Data Peribadi 2010 (PDPA) — akses terhad, tujuan terhad
- Akta Kerja 1955 — waktu kerja, cuti, kerja lebih masa
- Cuti umum persekutuan + negeri Selangor
- Antara muka Bahasa Malaysia, zon masa Asia/Kuala_Lumpur, mata wang RM

## Fasa

- **Fasa 1 (ini)**: Prototaip fungsian, pangkalan data dummy, AI live
- **Fasa 2 (dirancang)**: Backend pengeluaran, WebSocket (Socket.IO), storan objek 10 GB, integrasi KWSP/PERKESO, mesin cap jari, aplikasi mudah alih natif

## Lesen

Prototaip dalaman Al-Amin Emall Sdn Bhd. Hubungi pasukan produk untuk butiran lesen.

---

Dibangunkan dengan bantuan **z.ai** (model GLM).
