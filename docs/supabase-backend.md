# Supabase Backend

## Tables
- `leads`, `field_visits`, `quotations`, `payments` — core entities
- `products`, `line_items` — product catalog and quotation line items
- `lookups` — dropdown option values by category
- `roles` — user email → role mapping

## Supabase-Only Features
These features are NOT implemented in the Google Sheets backend:

| Feature | Entity | Field |
|---------|--------|-------|
| Identified Problems | FieldVisit | `identified_problems TEXT[]` |
| Products catalog | — | `products` table |
| Line Items | Quotation | `line_items` table |
| Usage Instructions | Quotation | `usage_instructions TEXT` |
| File attachments | Quotation/FieldVisit | Cloudflare R2 via Supabase storage |

## Migrations
Location: `supabase/migrations/`
Apply with: `mcp__supabase__apply_migration`
See `.claude/skills/supabase-migration/SKILL.md` for full procedure.

## RLS (Row Level Security)
- Enabled on all tables
- Policy pattern: authenticated users can SELECT/INSERT/UPDATE/DELETE their own org's data
- After any schema change, run `mcp__supabase__get_advisors` type=security

## snake_case ↔ camelCase Mapping
DB columns are snake_case; TypeScript interfaces are camelCase.
Each service file has a mapper function, e.g.:
```ts
const mapLead = (row: any): Lead => ({
  id: row.id,
  farmerId: row.farmer_id,
  farmerName: row.farmer_name,
  isDeleted: row.is_deleted,
  ...
})
```

## Auth
- Supabase Auth with Google OAuth provider
- Session managed by Supabase client, exposed via `src/services/auth/supabaseAuth.ts`
- User email used as `preparedBy` / `deletedBy` / `addedBy` audit values
