# Backend Switcher Guide

## Overview

Your app now supports **two backends** that can be switched with a single environment variable:
- **Google Sheets** (current/existing)
- **Supabase** (new/parallel)

## How to Switch Backends

### Option 1: Use Google Sheets (Current)
```bash
# In .env file:
VITE_USE_SUPABASE=false
```

### Option 2: Use Supabase (New)
```bash
# In .env file:
VITE_USE_SUPABASE=true
```

After changing, restart your dev server:
```bash
npm run dev
```

## Getting Supabase Credentials

1. Go to your Supabase project: https://supabase.com/dashboard
2. Click on your project
3. Go to **Settings** → **API**
4. Copy these values to your `.env`:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Note:** The `anon` key is safe to use in frontend code (it's public).

## How to Use in Your Code

### Before (Direct Import):
```typescript
import { fetchLeads, createLead } from '../services/sheetsService';
```

### After (Backend Switcher):
```typescript
import { fetchLeads, createLead } from '../services/backend';
```

That's it! The backend switcher automatically imports from the correct service.

## File Structure

```
src/services/
├── sheetsService.ts       ← Google Sheets implementation (unchanged)
├── tokenService.ts        ← Google Sheets auth (unchanged)
├── authService.ts         ← Google Sheets auth (unchanged)
│
├── supabase/              ← NEW: Supabase implementation
│   ├── client.ts          ← Supabase connection
│   ├── leads.ts           ← Lead CRUD operations
│   └── index.ts           ← Re-exports all functions
│
└── backend.ts             ← NEW: Automatic switcher
```

## What's Implemented So Far

### ✅ Leads (Fully Implemented)
- `fetchLeads(limit, offset)` - Paginated leads
- `fetchAllLeads()` - All leads
- `createLead(data)` - Create new lead
- `updateLead(id, updates)` - Update lead
- `deleteLead(id, userEmail)` - Soft delete (only "New" status)
- `fetchLeadById(id)` - Single lead by ID
- `fetchLeadsByIds(ids)` - Multiple leads by IDs
- `searchLeads(term, limit)` - Search leads

### ⏳ Coming Next
- Field Visits
- Quotations
- Payments
- Lookups
- Dashboard Stats

## Testing Both Backends

### Test 1: Google Sheets
```bash
# Set in .env
VITE_USE_SUPABASE=false

# Start dev server
npm run dev

# Test: Create a lead, should work as before
```

### Test 2: Supabase
```bash
# Set in .env
VITE_USE_SUPABASE=true

# Start dev server
npm run dev

# Test: Create a lead, should work with Supabase
```

### Verify Which Backend is Active

Open browser console, you'll see:
- 🔵 Using Google Sheets backend
- OR
- 🟢 Using Supabase backend

## Important Notes

1. **Same API** - Both backends have identical function signatures
2. **UUIDv7** - Supabase uses time-ordered UUIDs (better performance)
3. **No Migration Yet** - Both backends are independent (no shared data yet)
4. **Parallel Development** - You can develop both without breaking existing code

## Troubleshooting

### Error: "Missing Supabase environment variables"
- Check `.env` file has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Make sure they're not commented out
- Restart dev server after changing `.env`

### Error: "Not implemented yet"
- Some functions (visits, quotations, payments) aren't implemented in Supabase yet
- Use `VITE_USE_SUPABASE=false` to use Google Sheets for those features

### Both backends work, but data is different
- **Expected!** They're separate databases
- Google Sheets has your existing data
- Supabase is empty (need to migrate data or start fresh)

## Next Steps

1. ✅ Test leads with Supabase backend
2. Implement remaining entities (visits, quotations, payments)
3. Build data migration script (optional)
4. Test authentication with Supabase Auth
5. Gradually migrate users to Supabase
