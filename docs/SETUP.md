# Adike Besaya CRM — Setup Guide

Complete guide to set up the Fertilizer Tracker CRM from scratch.

> **Google Sheets backend is deprecated.** See `google-sheets-backend.md` and `google-cloud-setup.md` for legacy reference. This guide covers the active Supabase stack only.

---

## Prerequisites

- Node.js v18+ installed
- Git installed
- A Google account (for OAuth)
- A Supabase account (free tier works)

---

## 1. Clone & Install

```bash
git clone <repo-url>
cd CRM-AdikeBesaya/fertilizer-tracker
npm install
```

---

## 2. Supabase Project Setup

### 2.1 Create Project

1. Go to https://supabase.com/dashboard
2. Click **New Project**
3. Fill in:
   - **Name:** `fertilizer-tracker`
   - **Database Password:** Generate a strong password (save it)
   - **Region:** Choose closest to your users (e.g., `ap-south-1` for India)
4. Wait for project to be created (~2 minutes)

### 2.2 Get Credentials

1. Go to **Project Settings** → **API**
2. Copy these values (you'll need them for `.env`):
   - **Project URL:** `https://xxxxx.supabase.co`
   - **anon public key:** `eyJhbGci...`
   - **service_role key:** `eyJhbGci...` (keep this secret — only for admin/migration tasks)

### 2.3 Run Database Migrations

Go to **SQL Editor** in your Supabase dashboard and run each migration file from `supabase/migrations/` **in order**:

| # | File | What it does |
|---|------|-------------|
| 1 | `20260125190000_initial_schema.sql` | Creates all tables (users, leads, field_visits, quotations, payments, lookups) with RLS |
| 2 | `20260125194028_insert_lookup_data.sql` | Inserts dropdown values (Districts, CropTypes, etc.) |
| 3 | `20260125194113_insert_taluks_batch1.sql` | Taluk data batch 1 |
| 4 | `20260125194234_insert_taluks_batch2.sql` | Taluk data batch 2 |
| 5 | `20260125194327_insert_taluks_batch3_and_other_lookups.sql` | Taluk batch 3 + remaining lookups |
| 6 | `20260128000000_user_access_control.sql` | Creates `allowed_users` table (email allowlist) — **edit the seed emails at the bottom to add your admin email** |
| 7 | `20260128000001_enforce_allowlist_with_rls.sql` | Enforces allowlist in all RLS policies |
| 8 | `20260128000002_fix_rls_update_policies.sql` | RLS policy fixes |
| 9 | `20260128100000_add_identified_problems_to_field_visits.sql` | Crop problems array on field visits |
| 10 | `20260205000000_add_usage_instructions_to_quotations.sql` | Usage instructions field |
| 11 | `20260206000000_add_products_and_quotation_line_items.sql` | Products table + quotation line items |
| 12 | `20260207100000_add_can_ask_db_and_ask_function.sql` | AI query feature flag |
| 13 | `20260207120000_add_created_by_to_leads.sql` | Created by field on leads |
| 14 | `20260207130000_fix_rls_for_field_agronomists.sql` | Field Agronomist RLS fixes |
| 15 | `20260321000000_add_admin_role.sql` | Adds Admin role above Manager |

**Important:** Before running migration #6, edit the `INSERT INTO allowed_users` at the bottom to include **your email** as Manager or Admin. Without this, nobody can log in.

### 2.4 Configure Google OAuth in Supabase

1. In Supabase dashboard, go to **Authentication** → **Providers** → **Google**
2. Toggle **Enable Google provider** ON
3. Fill in:
   - **Client ID:** (from Google Cloud — see Step 3 below)
   - **Client Secret:** (from Google Cloud — see Step 3 below)
4. Click **Save**

### 2.5 Configure Redirect URLs

1. Go to **Authentication** → **URL Configuration**
2. Set:
   - **Site URL:** `http://localhost:5173` (change to production URL later)
   - **Redirect URLs:** Add:
     - `http://localhost:5173/**`
     - `http://localhost:4173/**`
     - Your production URL when ready (e.g., `https://yourdomain.com/**`)

---

## 3. Google Cloud Setup (OAuth)

Google OAuth is used for the "Sign in with Google" button. This is needed regardless of backend.

### 3.1 Create Google Cloud Project

1. Go to https://console.cloud.google.com/
2. Click project dropdown → **New Project**
3. Name: `Fertilizer Tracker` → **Create**

### 3.2 Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Click **Get Started**
3. Fill in:
   - **App name:** `Adike Besaya`
   - **User support email:** Your email
4. **Audience:**
   - **Internal** (if Google Workspace) — only your org can sign in
   - **External** (if Gmail) — choose External
5. **Contact info:** Your email
6. **Finish** → Accept terms → **Create**

> **No test users needed.** The app uses Google's "Sign In With Google" (GIS) library which only requests basic identity scopes (`openid`, `email`, `profile`). Google does not enforce test user restrictions for these scopes. Access control is handled entirely by the `allowed_users` table in Supabase.

#### Scopes used

| Scope | Purpose | Requested by |
|-------|---------|-------------|
| `openid` | Authentication | Google Sign In button (automatic) |
| `email` | Get user's email | Google Sign In button (automatic) |
| `profile` | Get user's name and picture | Google Sign In button (automatic) |

No sensitive scopes (Sheets, Drive, etc.) are requested — those were only needed for the deprecated Google Sheets backend.

### 3.3 Create OAuth Client ID

1. Go to **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**
2. **Application type:** Web application
3. **Name:** `Fertilizer Tracker Web Client`
4. **Authorized JavaScript origins:** Add:
   - `http://localhost:5173`
   - `http://localhost:4173`
   - Your production URL (e.g., `https://yourdomain.com`)
5. **Authorized redirect URIs:** Add:
   - Your Supabase callback URL: `https://xxxxx.supabase.co/auth/v1/callback` (get from Supabase → Authentication → Providers → Google)
6. Click **Create**
7. Copy **Client ID** and **Client Secret**

**Use these in:**
- `.env` → `VITE_GOOGLE_CLIENT_ID` = Client ID
- Supabase → Authentication → Google Provider → Client ID + Client Secret

---

## 4. Environment Variables

Create `fertilizer-tracker/.env`:

```env
# Backend (always true for new setups)
VITE_USE_SUPABASE=true

# Google OAuth Client ID (from Google Cloud Step 3.3)
VITE_GOOGLE_CLIENT_ID=123456789-xxxxx.apps.googleusercontent.com

# Supabase (from Step 2.2)
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Optional: for admin SQL operations via CLI/scripts
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Never commit `.env` to git.** It's already in `.gitignore`.

---

## 5. Cloudflare R2 Setup (File Storage)

File attachments (field visit photos, quotation documents) are stored in Cloudflare R2 via a Supabase Edge Function.

### 5.1 Create R2 Bucket

1. Go to https://dash.cloudflare.com/ → **R2**
2. Click **Create bucket**
3. **Bucket name:** `fertilizer-tracker-files`
4. **Location:** Automatic (or choose closest region)
5. Click **Create bucket**

### 5.2 Create API Token

1. In Cloudflare, go to **R2** → **Manage R2 API Tokens**
2. Click **Create API token**
3. **Token name:** `fertilizer-tracker-upload`
4. **Permissions:** Object Read & Write
5. **Bucket scope:** `fertilizer-tracker-files`
6. Click **Create API Token**
7. Copy **Access Key ID** and **Secret Access Key** (shown only once)

### 5.3 Get Account ID

1. In Cloudflare, go to **R2** → **Overview**
2. Copy your **Account ID** from the right sidebar

### 5.4 Add Secrets to Supabase Edge Functions

1. In Supabase dashboard, go to **Edge Functions** → **Secrets**
2. Add these secrets:

| Secret Name | Value |
|-------------|-------|
| `R2_ACCOUNT_ID` | Your Cloudflare Account ID |
| `R2_ACCESS_KEY_ID` | R2 API Access Key |
| `R2_SECRET_ACCESS_KEY` | R2 API Secret Key |
| `R2_BUCKET_NAME` | `fertilizer-tracker-files` |

### 5.5 Deploy Edge Function

```bash
npx supabase functions deploy upload-to-r2
```

> **Note:** If file uploads aren't needed immediately, you can skip this step. The app works without it — file attachment fields will just fail on upload.

---

## 6. Add Your First Admin User

Before anyone can log in, their email must be in the `allowed_users` table.

If you edited migration #6 with your email, you're set. Otherwise, run this in the **Supabase SQL Editor**:

```sql
INSERT INTO allowed_users (email, role, notes)
VALUES ('youremail@gmail.com', 'Admin', 'System administrator');
```

### Roles

| Role | Access |
|------|--------|
| **Admin** | Everything + User Management page |
| **Manager** | Dashboard, Leads, Visits, Quotations, Payments, Products |
| **Sales Executive** | Dashboard, Leads, Visits, Quotations, Payments |
| **Field Agronomist** | Leads, Field Visits |

---

## 7. Run the App

```bash
cd fertilizer-tracker
npm run dev
```

Open http://localhost:5173 — you should see the login page. Click **Sign in with Google**, pick your account, and you're in.

On first login, the app automatically creates your record in the `users` table.

---

## 8. Add Team Members

Once logged in as Admin, go to the **Users** page (visible in the nav bar for Admins only) to add team members. Or run SQL:

```sql
INSERT INTO allowed_users (email, role, notes) VALUES
  ('person1@gmail.com', 'Manager', 'Sales manager'),
  ('person2@gmail.com', 'Field Agronomist', 'Tarikere region');
```

They can now sign in. Their `users` record is created on first login.

---

## 9. Production Deployment

### Build

```bash
cd fertilizer-tracker
npm run build    # outputs to dist/
```

### Deploy to any static host (Vercel, Netlify, etc.)

1. Deploy the `dist/` folder
2. Set the same environment variables on your hosting platform
3. Update these URLs:
   - **Google Cloud** → OAuth Client → Add production URL to Authorized JavaScript Origins
   - **Supabase** → Authentication → URL Configuration → Add production URL to Redirect URLs
   - **Supabase** → Authentication → URL Configuration → Set Site URL to production URL

### SPA Routing

A `public/_redirects` file handles SPA routing for Netlify: `/* /index.html 200`

For Vercel, add a `vercel.json`:
```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

---

## 10. Public Assets

Place these files in `fertilizer-tracker/public/`:

| File | Purpose |
|------|---------|
| `logo.jpg` | App logo (header + login page) |
| `quotation-header.jpg` | PDF header image for quotations |
| `quotation-footer.jpg` | PDF footer image for quotations |
| `visit-header.jpg` | PDF header image for field visit reports |
| `visit-footer.jpg` | PDF footer image for field visit reports |

---

## 11. Troubleshooting

### "Access Denied" on login
- Email not in `allowed_users` table, or `is_active = false`
- Fix: Add email via SQL or Users page

### "Access blocked: This app's request is invalid"
- Google Cloud OAuth origins don't include your URL
- Fix: Add `http://localhost:5173` to Authorized JavaScript Origins

### Users not appearing in dropdowns
- They haven't logged in yet (no record in `users` table)
- Fix: Ask them to log in once, or manually insert into `users` table

### File upload fails
- Cloudflare R2 not configured, or Edge Function not deployed
- Fix: Follow Step 5 (Cloudflare R2 Setup)

### Environment variables not working
- Restart the dev server (`npm run dev`) — Vite only reads `.env` on startup
- Variable names must start with `VITE_`

---

## Deprecated: Google Sheets Backend

The Google Sheets backend (`VITE_USE_SUPABASE=false`) still exists in the codebase but is **no longer maintained**. It will be removed in a future cleanup.

If you need to reference it:
- `docs/google-sheets-backend.md` — Column mappings, limitations
- `docs/google-cloud-setup.md` — Full Google Cloud + Sheets setup (legacy)
- `google-apps-script/` — Apps Script for row number generation

Legacy env vars (not needed for Supabase):
```env
VITE_USE_SUPABASE=false
VITE_GOOGLE_SHEET_ID=...
VITE_APPS_SCRIPT_URL=...
VITE_DRIVE_FOLDER_ID=...
```
