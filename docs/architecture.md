# Architecture

## Tech Stack
- **Frontend**: React 18 + TypeScript, Vite, React Router v6
- **State**: Zustand (auth), React Query (server state)
- **Backend**: Supabase (primary) or Google Sheets (legacy), toggled via VITE_USE_SUPABASE
- **PDF**: @react-pdf/renderer (QuotationPDF, FieldVisitPDF)
- **Storage**: Cloudflare R2 via Supabase (file attachments)

## Data Flow
```
Component/Page
  → src/services/backend.ts  (router)
      → src/services/supabase/<entity>.ts   (if VITE_USE_SUPABASE=true)
      → src/services/sheetsService.ts       (if VITE_USE_SUPABASE=false)
          → Google Visualization Query API  (reads)
          → Google Sheets API via Axios     (writes)
```

## Authentication
- Google OAuth via Supabase Auth (`src/services/auth/supabaseAuth.ts`)
- Auth callback handled by `AuthCallbackPage.tsx`
- User session stored in Zustand authStore with localStorage persistence
- Role loaded from Supabase `roles` table (or Roles sheet) at login
- ProtectedRoute component guards all authenticated routes

## Service Layer Detail
- `backend.ts` — imports both implementations, exports unified API based on env flag
- `supabase/client.ts` — single Supabase client instance
- `supabase/leads.ts`, `fieldVisits.ts`, `quotations.ts`, `payments.ts`, `products.ts`, `lineItems.ts`
- `driveService.ts` — file upload to Cloudflare R2 via Supabase storage
- `authService.ts` — login/logout/session helpers

## PDF Architecture
- PDFs generated client-side using @react-pdf/renderer
- Dynamic import (`await import('./QuotationPDF')`) keeps PDF bundle out of initial load
- Fonts loaded from CDN (NotoSans, NotoSansKannada) at PDF generation time
- Header/footer images from `/public/` folder served as static assets
- See `.claude/skills/pdf-generation/SKILL.md` for layout rules

## Modal System
- Each entity has a Modal component supporting view/add/edit modes
- `useModalHistory` hook intercepts browser back button to close modals
- Modal state (open/mode/selected) managed locally in each Page component
