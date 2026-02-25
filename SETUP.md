# Fertilizer Tracker - Environment Setup Guide

Complete guide for setting up a new environment (development, staging, production).

---

## 🏗️ Two Separate Implementation Stacks

This application supports **TWO COMPLETELY SEPARATE** backend implementations:

### Stack A: Google Sheets + Google Drive (Original)
- **Database**: Google Sheets
- **File Storage**: Google Drive (user's quota)
- **Authentication**: Google OAuth (direct)
- **Best for**: Small teams, no server costs, simple setup

### Stack B: Supabase + Cloudflare R2 (Modern)
- **Database**: Supabase PostgreSQL
- **File Storage**: Cloudflare R2 (centralized, 10GB free)
- **Authentication**: Supabase Auth (using Google OAuth provider)
- **Best for**: Scalability, centralized storage, better performance

**Toggle between stacks using**: `VITE_USE_SUPABASE=true/false`

---

## Table of Contents

1. [Google Cloud Setup](#1-google-cloud-setup) - **Required for BOTH stacks**
2. [Stack A: Google Sheets + Drive Setup](#2-stack-a-google-sheets--drive-setup) - **Only if using Google Sheets**
3. [Stack B: Supabase + R2 Setup](#3-stack-b-supabase--r2-setup) - **Only if using Supabase**
4. [Environment Variables](#4-environment-variables)
5. [Verification](#5-verification)

---

---

## 1. Google Cloud Setup

**Required for BOTH Stack A and Stack B**

### 1.1 Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Select a project"** → **"New Project"**
3. Project name: `Fertilizer Tracker` (or your preference)
4. Click **"Create"**

### 1.2 Enable Required APIs

1. In Cloud Console, go to **APIs & Services** → **Library**
2. Enable APIs based on which stack you're using:

**For Stack A (Google Sheets + Drive):**
   - ✅ **Google Sheets API** (for database)
   - ✅ **Google Drive API** (for file storage)

**For Stack B (Supabase + R2):**
   - ✅ Google Sheets API NOT required
   - ✅ Google Drive API NOT required
   - (Authentication handled by Supabase, uses Google OAuth)

### 1.3 Create OAuth 2.0 Credentials

**For Stack A (Google Sheets + Drive):** Full OAuth setup required
**For Stack B (Supabase + R2):** Only Client ID and Secret needed (used in Supabase)

1. Go to **APIs & Services** → **Credentials**
2. Click **"Create Credentials"** → **"OAuth client ID"**
3. If prompted, configure OAuth consent screen first:
   - User Type: **External**
   - App name: `Fertilizer Tracker`
   - User support email: Your email
   - Developer contact: Your email
   - Scopes:
     - **Stack A**: Add `openid`, `email`, `profile`, `spreadsheets`, `drive.file`
     - **Stack B**: Add `openid`, `email`, `profile` (Supabase handles the rest)
   - Test users: Add your email(s)
   - Click **"Save and Continue"**

4. Back to Create OAuth Client ID:
   - Application type: **Web application**
   - Name: `Fertilizer Tracker Web Client`
   - Authorized JavaScript origins:
     - **Stack A**: `http://localhost:5173`, `https://yourdomain.com`
     - **Stack B**: Not required (Supabase handles auth)
   - Authorized redirect URIs:
     - **Stack A**: `http://localhost:5173/auth/callback`
     - **Stack B**: Add Supabase callback URL (from Step 3.3)
   - Click **"Create"**

5. **Copy the Client ID and Client Secret** - you'll need these:
   - **Stack A**: Client ID goes in `.env` as `VITE_GOOGLE_CLIENT_ID`
   - **Stack B**: Both go in Supabase Auth settings

### 1.4 Create Service Account (Optional - for future Drive upload with bot account)

1. Go to **IAM & Admin** → **Service Accounts**
2. Click **"Create Service Account"**
3. Name: `fertilizer-tracker-drive`
4. Click **"Create and Continue"**
5. Skip granting access (click Continue)
6. Click **"Done"**
7. Click on the service account → **"Keys"** tab
8. **"Add Key"** → **"Create new key"** → **JSON**
9. Save the JSON file securely (you'll use it later if implementing bot account)

---

## 2. Stack A: Google Sheets + Drive Setup

**⚠️ SKIP THIS SECTION if using Stack B (Supabase + R2)**
**Only follow if `VITE_USE_SUPABASE=false`**

### 2.1 Create Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create new spreadsheet: **"Fertilizer Tracker CRM"**
3. **Copy the Spreadsheet ID** from URL:
   ```
   https://docs.google.com/spreadsheets/d/1jRQpU-NiCDOOtWxsUU_NlL6wCtDUaFGrKEovMlOZKIQ/edit
                                          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ (This part)
   ```

### 2.2 Deploy Apps Script

1. In your Google Sheet, go to **Extensions** → **Apps Script**
2. Delete default code and paste the Apps Script code from `apps-script/Code.gs`
3. Click **Deploy** → **New deployment**
4. Type: **Web app**
5. Description: `Fertilizer Tracker API`
6. Execute as: **Me**
7. Who has access: **Anyone** (or **Anyone with Google account**)
8. Click **Deploy**
9. **Copy the Web App URL** - you'll need this for `.env`

### 2.3 Share Sheet (if needed)

1. Click **Share** button
2. Add team members with appropriate permissions
3. If using service account for Drive (optional), add service account email as Editor

---

## 3. Stack B: Supabase + R2 Setup

**⚠️ SKIP THIS SECTION if using Stack A (Google Sheets + Drive)**
**Only follow if `VITE_USE_SUPABASE=true`**

---

### Part 1: Supabase Setup

### 3.1 Create Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Organization: Select or create
4. Project name: `fertilizer-tracker`
5. Database password: Generate strong password (save it)
6. Region: Choose closest to your users (e.g., `ap-south-1` for India)
7. Click **"Create new project"** (takes ~2 minutes)

### 3.2 Get Supabase Credentials

1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 3.3 Configure Authentication

1. Go to **Authentication** → **Providers**
2. Enable **Google** provider:
   - Toggle **"Google Enabled"** to ON
   - **Client ID**: Paste from Google Cloud (Step 1.3)
   - **Client Secret**: Paste from Google Cloud OAuth credentials
   - Click **Save**

### 3.4 Set Up Database (if using Supabase DB)

1. Go to **SQL Editor**
2. Run the migration files from `supabase/migrations/` in order
3. Or use Supabase CLI:
   ```bash
   supabase db push
   ```

---

### Part 2: Cloudflare R2 Setup

### 4.1 Create R2 Bucket

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Click **R2** in left sidebar
3. Click **"Create bucket"**
4. Bucket name: `fertilizer-tracker-files`
5. Location: Automatic (or choose region)
6. Click **"Create bucket"**

### 4.2 Create API Token

1. Go to **R2** → **Manage R2 API Tokens**
2. Click **"Create API Token"**
3. Token name: `fertilizer-tracker-upload`
4. Permissions:
   - ✅ **Object Read & Write**
5. (Optional) Specify buckets: `fertilizer-tracker-files`
6. TTL: Forever (or set expiration)
7. Click **"Create API Token"**
8. **Copy these values immediately** (won't be shown again):
   - **Access Key ID**
   - **Secret Access Key**

### 4.3 Get Account ID

1. In Cloudflare Dashboard, go to **R2**
2. Your **Account ID** is shown in the R2 overview section
3. Copy the Account ID

### 4.4 Configure Public Access (Optional)

If you want direct public access without presigned URLs:

1. Go to your bucket → **Settings**
2. **Public Access**: Configure custom domain or R2.dev subdomain
3. For this app, we use presigned URLs (more secure), so skip this step

---

## 4. Environment Variables

### Stack A Configuration (Google Sheets + Drive)

Create `fertilizer-tracker/.env`:

```env
# ============================================================================
# BACKEND SWITCHER
# ============================================================================
VITE_USE_SUPABASE=false

# ============================================================================
# GOOGLE CLOUD CONFIGURATION (Stack A)
# ============================================================================
# OAuth Client ID (from Step 1.3)
VITE_GOOGLE_CLIENT_ID=123456789-xxxxx.apps.googleusercontent.com

# Google Sheet ID (from Step 2.1)
VITE_GOOGLE_SHEET_ID=1jRQpU-NiCDOOtWxsUU_NlL6wCtDUaFGrKEovMlOZKIQ

# Apps Script Web App URL (from Step 2.2)
VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/xxxxx/exec

# Google Drive Folder ID (Optional - for organized storage)
VITE_DRIVE_FOLDER_ID=1yuAkLgdIcJ7hYwjBbG2hP8h8vswZZEN1

# ============================================================================
# SUPABASE - NOT NEEDED FOR STACK A
# ============================================================================
# Leave these empty or remove them
```

### Stack B Configuration (Supabase + R2)

Create `fertilizer-tracker/.env`:

```env
# ============================================================================
# BACKEND SWITCHER
# ============================================================================
VITE_USE_SUPABASE=true

# ============================================================================
# GOOGLE CLOUD - NOT NEEDED FOR STACK B (except in Supabase settings)
# ============================================================================
# You don't need VITE_GOOGLE_CLIENT_ID in .env
# Client ID and Secret go in Supabase Auth settings instead

# ============================================================================
# SUPABASE CONFIGURATION (Stack B)
# ============================================================================
# Supabase Project URL (from Step 3.2)
VITE_SUPABASE_URL=https://xxxxx.supabase.co

# Supabase Anon Key (from Step 3.2)
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ============================================================================
# GOOGLE SHEETS - NOT NEEDED FOR STACK B
# ============================================================================
# Leave these empty or remove them
# VITE_GOOGLE_SHEET_ID - NOT USED
# VITE_APPS_SCRIPT_URL - NOT USED
# VITE_DRIVE_FOLDER_ID - NOT USED
```

### Supabase Edge Function Secrets (Stack B Only)

**⚠️ SKIP if using Stack A**

Go to **Supabase Dashboard** → **Edge Functions** → **Settings** → **Secrets**

Add these secrets for R2 storage:

| Secret Name | Value | Source |
|-------------|-------|--------|
| `R2_ACCOUNT_ID` | `abc123...` | Cloudflare Account ID (Step 3.4.3) |
| `R2_ACCESS_KEY_ID` | `xxx...` | Cloudflare R2 Access Key (Step 3.4.2) |
| `R2_SECRET_ACCESS_KEY` | `yyy...` | Cloudflare R2 Secret Key (Step 3.4.2) |
| `R2_BUCKET_NAME` | `fertilizer-tracker-files` | Bucket name (Step 3.4.1) |

**Important**: Never commit these secrets to Git!

---

## 5. Edge Functions Deployment (Stack B Only)

**⚠️ SKIP if using Stack A - No Edge Functions needed**

### 6.1 Prerequisites

Install Supabase CLI:
```bash
npm install -g supabase
```

Login to Supabase:
```bash
supabase login
```

Link to your project:
```bash
supabase link --project-ref your-project-ref
```

### 6.2 Deploy Edge Functions

Deploy upload function:
```bash
supabase functions deploy upload-to-r2
```

Deploy download function:
```bash
supabase functions deploy get-r2-download-url
```

Or use the MCP server (if available):
- The Edge Functions are automatically deployed via MCP during setup

### 6.3 Verify Deployment

List deployed functions:
```bash
supabase functions list
```

Should show:
- ✅ `upload-to-r2`
- ✅ `get-r2-download-url`

---

## 6. Verification

### 6.1 Test Authentication

**Stack A (Google Sheets + Drive):**

1. Start the app:
   ```bash
   cd fertilizer-tracker
   npm run dev
   ```
2. Open http://localhost:5173
3. Click "Sign in with Google"
4. Should redirect to Google OAuth consent screen
5. After approval, should redirect back and show dashboard

**Stack B (Supabase + R2):**

1. Make sure `.env` has `VITE_USE_SUPABASE=true`
2. Start the app
3. Click "Sign in with Google"
4. Should redirect to Supabase Auth → Google OAuth
5. After approval, redirect back to dashboard

### 6.2 Test File Upload

**Stack A (Google Drive):**

With `VITE_USE_SUPABASE=false`:

1. Login to the app
2. Create a Field Visit or Quotation
3. Upload a file (image or document)
4. Should upload to user's Google Drive
5. Check your Google Drive - file should appear in "Fertilizer Tracker Files" folder

**Stack B (R2):**

With `VITE_USE_SUPABASE=true`:

1. Login to the app
2. Create a Field Visit or Quotation
3. Upload a file (image or document)
4. Should upload to Cloudflare R2
5. Check Cloudflare R2 bucket - file should appear in subfolder

### 6.3 Test File Download

**Stack A (Google Drive):**

1. In the uploaded record, click "Download"
2. File should download from Google Drive
3. Uses user's Google Drive quota

**Stack B (R2):**

1. In the uploaded record, click "Download"
2. File should download from R2 via presigned URL
3. Check browser network tab - should see redirect to R2

### 6.4 Test Data Persistence

**Stack A (Google Sheets):**

1. Create a Lead/Field Visit
2. Check your Google Sheet - new row should appear
3. Refresh browser - data should persist from Google Sheets

**Stack B (Supabase):**

1. Create a Lead/Field Visit
2. Check Supabase Dashboard → Table Editor - new row should appear
3. Refresh browser - data should persist from Supabase DB

---

## 7. Architecture Comparison

| Feature | Stack A (Sheets + Drive) | Stack B (Supabase + R2) |
|---------|-------------------------|------------------------|
| **Database** | Google Sheets | Supabase PostgreSQL |
| **File Storage** | User's Google Drive (15GB/user) | Cloudflare R2 (10GB centralized) |
| **Authentication** | Google OAuth (direct) | Supabase Auth (Google provider) |
| **Storage Quota** | Per user (distributed) | Centralized (all users share 10GB) |
| **Performance** | Slower (API rate limits) | Faster (dedicated DB) |
| **Scalability** | Limited (60 req/min/user) | High (DB indexing, caching) |
| **Cost** | Free (within Google limits) | Free (within Supabase/R2 limits) |
| **File Access** | Direct Google Drive links | Presigned R2 URLs (1hr expiry) |
| **Best For** | Small teams, simple setup | Medium teams, better performance |

---

## 8. Troubleshooting

### Stack A (Google Sheets + Drive) Issues

**OAuth Error: "redirect_uri_mismatch"**
- Solution: Add exact redirect URI to Google Cloud OAuth settings

**Sheet Access Denied**
- Solution: Share Google Sheet with your Google account email

**File Upload to Drive Fails**
- Solution: Check `drive.file` scope is included in OAuth scopes

**Apps Script Error**
- Solution: Verify Apps Script is deployed as Web App with correct permissions

### Stack B (Supabase + R2) Issues

**Login Redirect Loop**
- Solution: Check Google provider is enabled in Supabase Auth settings
- Verify Client ID and Secret are correct

**R2 Upload Failed: "Missing credentials"**
- Solution: Verify all 4 R2 secrets are added in Supabase Edge Functions settings

**File Download 500 Error**
- Solution: Check R2 secrets are correct, verify Edge Functions are deployed

**Supabase DB Connection Error**
- Solution: Check `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct

---

## 9. Switching Between Stacks

You can switch between stacks by changing one environment variable:

```env
# Switch to Google Sheets + Drive
VITE_USE_SUPABASE=false

# Switch to Supabase + R2
VITE_USE_SUPABASE=true
```

**Important Notes:**
- Data is NOT automatically migrated between stacks
- Each stack stores data independently
- File storage is separate (Drive vs R2)
- You'll need to manually migrate data if switching in production

---

## 10. Production Deployment

### 10.1 Stack A (Google Sheets + Drive) Production

1. **Update OAuth Redirect URIs** in Google Cloud:
   - Authorized JavaScript origins: `https://yourdomain.com`
   - Authorized redirect URIs: `https://yourdomain.com/auth/callback`

2. **Update Environment Variables**:
   ```env
   VITE_USE_SUPABASE=false
   VITE_GOOGLE_CLIENT_ID=production-client-id
   VITE_GOOGLE_SHEET_ID=production-sheet-id
   VITE_APPS_SCRIPT_URL=production-apps-script-url
   ```

3. **Deploy**:
   ```bash
   npm run build
   # Deploy dist/ folder
   ```

### 10.2 Stack B (Supabase + R2) Production

1. **Update Supabase Auth Settings**:
   - Go to Supabase → Authentication → URL Configuration
   - Add production URL to Site URL: `https://yourdomain.com`
   - Add to Redirect URLs: `https://yourdomain.com/**`

2. **Update Google OAuth** in Google Cloud:
   - Add Supabase production callback URL to Authorized redirect URIs

3. **Update Environment Variables**:
   ```env
   VITE_USE_SUPABASE=true
   VITE_SUPABASE_URL=https://production.supabase.co
   VITE_SUPABASE_ANON_KEY=production-anon-key
   ```

4. **Deploy Edge Functions**:
   ```bash
   supabase functions deploy upload-to-r2
   supabase functions deploy get-r2-download-url
   ```

5. **Deploy Frontend**:
   ```bash
   npm run build
   # Deploy dist/ folder
   ```

---

## 11. Maintenance

### Updating Edge Functions

When you update Edge Function code:

```bash
supabase functions deploy upload-to-r2
supabase functions deploy get-r2-download-url
```

### Rotating R2 Credentials

1. Create new API token in Cloudflare R2
2. Update secrets in Supabase Edge Functions settings
3. Delete old API token in Cloudflare

### Monitoring

- **Supabase Logs**: Dashboard → Edge Functions → Logs
- **R2 Usage**: Cloudflare Dashboard → R2 → Analytics
- **Google Sheets Quota**: Cloud Console → APIs & Services → Quotas

---

## 12. Cost Estimates (Free Tiers)

### Stack A (Google Sheets + Drive)

| Service | Free Tier | Limits |
|---------|-----------|--------|
| Google Sheets API | Free | 60 requests/min/user |
| Google Drive Storage | 15GB/user | Per Google account |

**Total Cost**: $0/month (within free tiers)

### Stack B (Supabase + R2)

| Service | Free Tier | Limits |
|---------|-----------|--------|
| Supabase | Free | 500MB DB, 2GB bandwidth, 2M Edge Function invocations/month |
| Cloudflare R2 | Free | 10GB storage, 1M Class B operations/month |

**Total Cost**: $0/month (within free tiers)

---

## 13. Security Checklist

- [ ] Never commit `.env` file to Git
- [ ] Keep service account JSON keys secure (not in Git)
- [ ] Use environment variables for all secrets
- [ ] Enable 2FA on Google/Supabase/Cloudflare accounts
- [ ] Regularly rotate API tokens
- [ ] Review OAuth scopes (use minimal required)
- [ ] Monitor Edge Function logs for errors
- [ ] Set up RLS policies in Supabase (if using Supabase DB)

---

## Support

For issues or questions:
- Check this SETUP.md first
- Review logs in Supabase Dashboard → Edge Functions → Logs
- Check browser console (F12) for frontend errors
- Verify environment variables are set correctly

---

**Last Updated**: 2026-01-26
