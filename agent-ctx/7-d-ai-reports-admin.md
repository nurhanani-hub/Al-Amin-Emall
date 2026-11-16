# Task 7-D — AI / Reports / Admin modules

## Files written
- `/home/z/my-project/src/modules/ai.tsx` — `AiModule` (6 tabs)
- `/home/z/my-project/src/modules/reports.tsx` — `ReportsModule` (6 report types)
- `/home/z/my-project/src/modules/admin.tsx` — `AdminModule` (5 tabs incl. audit for HR/ADMIN)

## Key implementation notes
- All `'use client'` TS React components, Tailwind 4 + shadcn/ui.
- Bahasa Malaysia labels throughout; "AI"/SULIT retained.
- Glassmorphism: `glass-card`, `glass-input`, `text-gradient`, `scrollbar-thin`.
- Color palette: emerald/teal/amber/rose/cyan/fuchsia/slate — NO indigo/blue.
- Dynamic Tailwind classes avoided via static `COLOR_BADGE` / `COLOR_ICON` / `ROLE_BADGE` maps.
- Framer Motion subtle entry animations on cards/sections.
- Long lists: `max-h-* overflow-y-auto scrollbar-thin`.
- ReactMarkdown renders AI output (bahan HR, ringkasan mesyuarat, IDP, chatbot).
- "Dijana AI — perlu semakan manusia" amber badge + SULIT rose badge on IDP.
- Reports: CSV export with UTF-8 BOM; PDF via `window.print()`.
- Admin: holidays grouped by year; settings editable for HR/ADMIN; audit filterable.

## API contracts used
- GET/POST `/api/ai` (action-based)
- GET `/api/reports?type=&from=&to=`
- GET `/api/admin?scope=master|audit|settings`, POST `/api/admin` (ADD_HOLIDAY, UPDATE_SETTING)
- GET `/api/staff` for staff selectors in AI courses/IDP tabs

## Lint
- `bun run lint` — 0 errors in the three module files.
  (Pre-existing errors in `src/lib/auth.ts` and `src/app/api/staff/route.ts` are unrelated and unchanged.)
