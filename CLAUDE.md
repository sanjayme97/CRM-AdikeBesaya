# CLAUDE.md

Fertilizer Tracker — React + TypeScript CRM for agricultural sales (leads, field visits, quotations, payments).
Backend: Supabase (primary) or Google Sheets (legacy). See `docs/` for deep detail.

## Commands
```bash
cd fertilizer-tracker && npm run dev      # Dev server (Vite HMR)
cd fertilizer-tracker && npm run build    # TypeScript + Vite production build
cd fertilizer-tracker && npm run lint     # ESLint
cd fertilizer-tracker && npm run preview  # Preview production build
```

## Directory Structure
```
fertilizer-tracker/src/
  pages/       — Page components (Dashboard, Leads, FieldVisits, Quotations, Payments, Login)
  components/  — Modal forms + shared (Layout, ProtectedRoute, QuotationPDF, FieldVisitPDF)
  services/    — backend.ts (router), supabase/, sheets/ (legacy)
  types/       — TypeScript interfaces + CROP_PROBLEMS + column constants
  utils/       — dateFormatting, idGeneration, numberToWords, validation
  store/       — authStore (Zustand), modalStore
```

## Backend
**Active: Supabase only** (`VITE_USE_SUPABASE=true` in production and dev).
Google Sheets code (`src/services/sheetsService.ts`, `src/services/sheets/`) still exists but is **unused legacy** — scheduled for removal in a future cleanup.
All service calls go through `src/services/backend.ts` — never import supabase/ directly in pages.

## Universal Rules
- Soft deletes only — never hard delete (isDeleted + deletedBy + deletedDate + deleteReason)
- UUID primary keys; displayId is human-readable (LEA-0001, VIS-0001, QUO-0001)
- All DB writes go through the backend router, not direct Supabase client in components
- No @file imports in CLAUDE.md — use `See docs/` pointers

## Entity Relationships
Lead → FieldVisit (1:many, leadId) → Quotation (optional 1:1, visitId) → Payment (1:many, quoteId)
Lead → Quotation (1:many, leadId)

## Key Files
- `src/services/backend.ts` — service router (Supabase vs Sheets)
- `src/types/index.ts` — all interfaces, CROP_PROBLEMS, column maps
- `src/components/QuotationPDF.tsx` — react-pdf quotation document
- `src/components/FieldVisitPDF.tsx` — react-pdf field visit report
- `google-apps-script/` — Apps Script for row number generation (legacy)

## Deep Detail
- See `docs/architecture.md` — data flow, auth, state management, service layer
- See `docs/supabase-backend.md` — schema, migrations, RLS, Supabase-only features
- See `docs/google-sheets-backend.md` — column mappings, Apps Script, limitations
- See `docs/entities.md` — full field list per entity, relationships, lookup categories
