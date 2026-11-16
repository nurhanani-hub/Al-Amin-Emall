# Task 7-C: Chat & Documents Modules (HRMS Al-Amin Emall)

## Summary
Built two production-ready `'use client'` TypeScript React modules for the HRMS Next.js 16 app:

1. **`src/modules/chat.tsx`** — exports `ChatModule` (WhatsApp-style two-pane)
2. **`src/modules/documents.tsx`** — exports `DocumentsModule` (file management w/ quota)

## Stack
- Next.js 16 App Router + React 19 + TypeScript 5 strict
- Tailwind 4 + shadcn/ui (New York) + Lucide icons
- framer-motion for enter/exit animations
- sonner for toasts
- Existing helpers: `api`, `useApp`, `fmtDate`, `fmtTime`, `fmtTime12`, `fmtBytes`, `initials`, `safeJson`, `ROLE_LABELS`

## Chat Module (`chat.tsx`) — FR-801 to FR-806
WhatsApp-style two-pane layout (`grid md:grid-cols-[320px_1fr]`):

**Left pane (320px)**:
- Search bar (filters by name + last message content)
- "Baru" dropdown: Kumpulan Baharu / Mesej Langsung / Pengumuman Rasmi (HR/ADMIN/EXEC gated)
- Conversation list items: avatar (with type badge: Users icon for KUMPULAN, Megaphone for PENGUMUMAN), name (computed for TERUS using the other participant), last message preview + time (12h), unread rose badge, muted (BellOff) indicator

**Right pane**:
- Header: avatar + name, participant count + position (TERUS), Pentadbir/Pengumuman badges, Info button
- Messages area (`flex-1 overflow-y-auto scrollbar-thin`):
  - Own: right-aligned, emerald→teal gradient bubble, rounded-br-sm, CheckCheck indicator
  - Others: left-aligned glass bubble, sender name+avatar shown in groups
  - Pinned messages: amber ring + Pin icon overlay
  - Reply indicator: small bar above message with sender name + truncated content
  - Attachments: file chip (Paperclip + name + size)
  - Reply bar: above input with X to cancel
- Input bar: file picker (hidden input, multi-file), emoji Popover (30 emojis grid), textarea (Enter to send / Shift+Enter newline), Send button
- Mentions: typing `@name` shows participant popover (filtered, mouse-down insert)
- Empty state: welcome illustration + "Pilih perbualan untuk mula berbual"

**Polling**: every 5s when conversation open, but only if user hasn't scrolled up (tracked via `userScrolledUpRef`). Cleaned up on unmount via `useEffect` cleanup. Conversation list also refreshed every 8s.

**Announcement channel (PENGUMUMAN)**:
- HR/ADMIN/EXEC can send via dedicated dialog (amber styling, Megaphone icon)
- Non-admin users see read-only banner "Saluran pengumuman rasmi — hanya HR/Pengurusan boleh menghantar" and the input is hidden

**Info Sheet (right drawer)**: list of participants (avatar, name, position, role label, admin badge) + pinned messages section.

**Dialogs**:
- NewGroupDialog: name input + staff multi-select checklist (loaded from `/api/staff`)
- NewDirectDialog: searchable staff list, click to start 1-1
- AnnouncementDialog: textarea + amber info banner

## Documents Module (`documents.tsx`) — FR-901 to FR-907

**Quota banner** (top): `Progress` bar showing used/total (10 GB), percent label, color shifts (emerald→amber at 80%→rose at 95%), HardDrive icon, HR hint that quota adjustment is Fasa 2.

**Toolbar**: search input, type filter select (all/LAPORAN/AUDIO/SLAID/GAMBAR/LEMBARAN/TEKS/VIDEO), tag filter select (derived from documents), scope filter (mine/dept/company + "all" for HR/ADMIN only).

**Documents grid** (responsive 1/2/3 columns):
- Card with type-colored icon (FileText/Audio/Presentation/Image/Video/FileSpreadsheet), title, filename, size + type label, tags chips, event link, uploader initials + name + dept/position, access badge (PERIBADI=slate, JABATAN=cyan, SYARIKAT=emerald), date, Preview + Delete actions (with Tooltip)
- AnimatePresence + layout for smooth mount/unmount/reorder
- Delete gated to owner or HR/ADMIN with `confirm()` guard

**UploadDialog**:
- Drag-and-drop zone + click-to-pick (multi-file)
- Selected files list with detected type icon, size, "pratonton terhad" note if ≥5MB
- Auto-detected type from mime/extension (`detectType`), shown below title field
- Title auto-fills from first filename (editable)
- Tags input (comma-separated → array on submit)
- Access level radio cards (PERIBADI/JABATAN/SYARIKAT) with descriptions
- Optional event select (fetched from `/api/calendar`)
- Size validation: 100MB docs/images, 500MB audio/video — rejected with toast
- Files <5MB read as base64 dataURL for inline preview; larger files just store metadata
- On submit: POST each file sequentially; reports success/failure counts

**PreviewDialog**:
- AUDIO with dataUrl: native `<audio controls>` styled with Music icon + filename
- PDF (LAPORAN/SLAID) with dataUrl: `<iframe>` at 60vh
- GAMBAR: `<img>` centered with alt text
- VIDEO with dataUrl: native `<video controls>`
- Other/large files: placeholder card with metadata + amber note "Pratonton tidak tersedia untuk fail besar (Fasa 2)"
- Footer: access badge, tags, uploader + date, Delete (if owner/HR), Download link (if dataUrl available)

**Empty state**: glass icon card "Tiada dokumen. Muat naik fail pertama anda." with CTA button.

## Type Detection Map
- audio/* → AUDIO
- video/* → VIDEO
- image/* → GAMBAR
- application/pdf → LAPORAN (or SLAID if filename suggests presentation)
- powerpoint mimes + ppt/pptx/pps/odp → SLAID
- excel mimes + xls/xlsx/csv/ods → LEMBARAN
- word mimes + doc/docx/txt/rtf/odt → TEKS
- default → TEKS

## Quality Compliance
- BM throughout all UI labels, toasts, descriptions
- Glassmorphism: `glass-card` on every panel, `glass` on icons, `glass-strong` on modals/sheets, `glass-input` on form fields
- No indigo/blue — colors: emerald, teal, amber, rose, cyan, fuchsia, slate
- Skeleton loaders during list fetch; empty states with icon + message + CTA
- try/catch around every api call with `toast.error` + description
- Responsive: mobile single column / mobile back button in chat header / desktop two-pane
- ARIA labels on all icon-only buttons (`aria-label="Hantar mesej"`, `"Padam dokumen"`, etc.)
- Framer Motion enter animations on bubbles & doc cards
- Long lists: `max-h-* overflow-y-auto scrollbar-thin` on participants, conversation list, files
- Semantic HTML: `<header>`, `<ul>`/`<li>`, `<motion.div>` w/ `role="log"` for messages
- No emojis in UI text (emoji picker is content-only)
- Chat polling: `clearInterval` on unmount + when conversation changes; respects `userScrolledUpRef` so polling doesn't fight manual scroll

## Lint Result
`bun run lint` → **clean for both new files**. Only 2 pre-existing errors remain in `src/app/api/staff/route.ts:76` and `src/lib/auth.ts:51` (`@typescript-eslint/no-require-imports`) — NOT introduced by this task; both files untouched.

Note: refactored `typeIcon` function (returning a component) into a stable `<TypeIcon type=… className=… />` component to satisfy `react-hooks/static-components` rule (avoiding "components created during render").

## Dev Server
GET http://localhost:3000/ → 200; modules compile via existing app-shell. Verified by `dev.log`: "✓ Compiled in 13.8s" after edit.

## Notes for Downstream Tasks
- Chat conversation list polls every 8s; active conversation polls every 5s — both via `api()` helper from `@/lib/store`.
- For mentions, `insertMention` strips whitespace from staff name to form a compact `@name` token.
- Document preview uses raw HTML5 media elements (audio/video/iframe/img) with `dataUrl` from server (base64 stored only for <5MB uploads).
- Quota progress bar uses `[&>div]:bg-{color}-500` selector pattern (consistent with existing dashboard.tsx).
- Dynamic Tailwind classes `bg-${color}-500/15` etc. are JIT-compiled and safelisted through existing codebase usage.
