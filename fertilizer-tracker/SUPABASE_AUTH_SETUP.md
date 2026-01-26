# Supabase Auth Setup Guide

This guide explains how to configure Google OAuth with Supabase so users can log in with their Google accounts.

## Prerequisites

- Supabase project created
- Google Cloud Console project (same one used for Google Sheets auth)

## Step 1: Configure Google OAuth in Supabase

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Providers**
3. Find **Google** in the list and click to expand
4. Enable Google provider

## Step 2: Add OAuth Credentials

You'll need your Google OAuth credentials from Google Cloud Console:

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Find your existing OAuth 2.0 Client ID (the one used for Google Sheets auth)
3. Click Edit
4. Add Supabase redirect URI to **Authorized redirect URIs**:
   ```
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```
   Replace `<your-project-ref>` with your actual Supabase project reference

5. Copy the **Client ID** and **Client Secret**

## Step 3: Configure Supabase Provider

Back in Supabase Dashboard (Authentication → Providers → Google):

1. Paste your **Client ID** from Google
2. Paste your **Client Secret** from Google
3. Click **Save**

## Step 4: Add Redirect URL to Your App

In Supabase Dashboard:

1. Go to **Authentication** → **URL Configuration**
2. Add your app's callback URL to **Redirect URLs**:
   ```
   http://localhost:5173/auth/callback
   ```
   For production, add:
   ```
   https://yourdomain.com/auth/callback
   ```

## Step 5: Update .env File

Update your `.env` file with Supabase credentials:

```bash
# Backend switcher
VITE_USE_SUPABASE=true  # Enable Supabase auth

# Supabase credentials (from dashboard → Settings → API)
VITE_SUPABASE_URL=https://yourproject.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Step 6: Create Test User

Add yourself to the `users` table in Supabase:

```sql
INSERT INTO users (id, email, name, role) VALUES
  (gen_random_uuid(), 'your-email@gmail.com', 'Your Name', 'Manager');
```

## Step 7: Test Login

1. Start dev server: `npm run dev`
2. Go to http://localhost:5173/login
3. Click "Sign in with Google"
4. You should see Google OAuth consent screen
5. After approving, you'll be redirected to dashboard

## Troubleshooting

### "Invalid OAuth redirect URI"
- Make sure you added Supabase callback URL to Google Cloud Console
- Format: `https://<project-ref>.supabase.co/auth/v1/callback`

### "User not found in users table"
- Add your email to the `users` table in Supabase (see Step 6)
- Default role is "Field Agronomist" if not found

### RLS Policy Errors
- Verify RLS policies are enabled
- Check user exists in `users` table
- Verify `auth.jwt() ->> 'email'` matches user's email

### Still Using Google Sheets Backend
- Check `.env` has `VITE_USE_SUPABASE=true`
- Restart dev server after changing `.env`
- Check browser console for "🟢 Using Supabase backend" message

## Switching Between Backends

Toggle between Google Sheets and Supabase by changing one variable:

**Use Google Sheets:**
```bash
VITE_USE_SUPABASE=false
npm run dev
```

**Use Supabase:**
```bash
VITE_USE_SUPABASE=true
npm run dev
```

## Important Notes

- Both backends use Google OAuth (same user experience)
- Google Sheets: Direct OAuth → stores token in localStorage
- Supabase: OAuth redirect → Supabase manages session
- Same Google button, same consent screen, different implementation
- No component code changes needed - switcher handles everything
