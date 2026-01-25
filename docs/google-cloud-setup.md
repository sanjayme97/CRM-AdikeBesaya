# Google Cloud Project Setup Guide

This guide walks you through setting up Google Cloud Project, enabling APIs, and configuring OAuth for the Fertilizer Tracker application.

## Overview

We need to set up:
1. ✅ Google Cloud Project
2. ✅ Enable Google Sheets API
3. ✅ Configure OAuth Consent Screen
4. ✅ Create OAuth Client ID (for web application)
5. ✅ Get credentials for React app

**Cost:** 100% FREE - All APIs we use are within Google's free tier forever.

---

## Step 1: Create Google Cloud Project

1. **Go to Google Cloud Console:**
   - Visit: https://console.cloud.google.com/
   - Sign in with your Google account (the one that owns the Google Sheet)

2. **Create New Project:**
   - Click the project dropdown (top left, next to "Google Cloud")
   - Click **"New Project"**
   - Fill in:
     - **Project name:** `Fertilizer Tracker`
     - **Organization:** (leave as "No organization" if you don't have one)
     - **Location:** (leave as "No organization")
   - Click **"Create"**

3. **Wait for Project Creation:**
   - Takes 10-30 seconds
   - You'll see a notification when it's ready
   - Click **"Select Project"** from the notification

4. **Verify Project is Selected:**
   - Check the project name at the top left
   - Should say "Fertilizer Tracker"

---

## Step 2: Enable Google Sheets API

1. **Open APIs & Services:**
   - In the left sidebar, click **"APIs & Services"** → **"Library"**
   - Or use direct link: https://console.cloud.google.com/apis/library

2. **Search for Sheets API:**
   - In the search box, type: `Google Sheets API`
   - Click on **"Google Sheets API"** from results

3. **Enable the API:**
   - Click the blue **"Enable"** button
   - Wait for it to enable (takes a few seconds)
   - You'll be redirected to the API details page

4. **Verify Enabled:**
   - You should see "API enabled" with a green checkmark
   - The "Enable" button is now replaced with "Manage"

---

## Step 3: Configure OAuth Consent Screen

This is what users see when they sign in to your app.

1. **Go to OAuth Overview:**
   - Click **"APIs & Services"** → **"OAuth consent screen"** (left sidebar)
   - Or use direct link: https://console.cloud.google.com/apis/credentials/consent
   - You'll see "Google auth platform not configured yet"
   - Click the blue **"Get started"** button

2. **Step 1: App Information**
   - **App name:** `Fertilizer Tracker`
   - **User support email:** (select your email from dropdown)
   - Click **"Next"**

3. **Step 2: Audience (Choose User Type)**
   - If you have **Google Workspace** (paid): Choose **"Internal"**
     - Only users in your organization can use the app
     - Simpler setup, no verification needed
   - If you have **regular Gmail** (free): Choose **"External"**
     - Anyone with a Gmail can use the app
     - Need to add test users later
   - Click **"Next"**

4. **Step 3: Contact Information**
   - Enter your email address (should be pre-filled)
   - Click **"Next"**

5. **Step 4: Finish**
   - Check the box: "I agree to the Google API services user data policy"
   - Click the blue **"Create"** button

6. **OAuth Consent Screen Created:**
   - You'll be redirected to the OAuth overview page
   - Shows "OAuth access is restricted to test users" (for External apps)

**Note about Test Users (External Apps Only):**
- Later, go to **"Audience"** in the left sidebar
- Click **"+ Add Users"**
- Enter email addresses of people who will use the app
- Example: `manjunath@example.com`, `keerthi@example.com`
- In "testing" mode, only these email addresses can sign in

---

## Step 4: Create OAuth Client ID

This gives you credentials to use in your React app.

1. **Go to OAuth Overview:**
   - After creating the OAuth consent screen, you'll be on the OAuth overview page
   - Or navigate: **"APIs & Services"** → **"Overview"** (left sidebar)
   - Click the blue **"Create OAuth client"** button (top right)

2. **Configure OAuth Client:**

   **Application type:**
   - Select **"Web application"** from the dropdown (should be selected by default)

   **Name:**
   - Change "Web client 1" to: `Fertilizer Tracker Web Client`

   **Authorised JavaScript origins:**
   - Click **"+ Add URI"**
   - Add: `http://localhost:5173` (for local development with Vite)
   - Click **"+ Add URI"** again
   - Add: `http://localhost:4173` (for local preview)
   - Later, add your production URL (e.g., `https://fertilizer-tracker.vercel.app`)

   **Authorised redirect URIs:**
   - **Leave empty** - Not needed for client-side React apps using `@react-oauth/google`
   - The JavaScript library handles authentication in a popup/modal
   - (Optional: You can add the same URIs as above if you plan to use redirect-based flow)

3. **Create:**
   - Click **"Create"** at the bottom
   - A popup will show your credentials:
     - **Client ID:** `383958724215-b6eu...apps.googleusercontent.com`
     - **Client Secret:** (you don't need this for client-side apps)
   - **Copy the Client ID** - you'll need it for your React app
   - Click **"OK"**

4. **Find Your Client ID Later:**
   - Go to: **"APIs & Services"** → **"Clients"** (left sidebar)
   - You'll see your "Fertilizer Tracker Web Client" listed
   - Click the copy icon next to Client ID to copy it

**Note about Client Secret:**
- Client Secret is only needed for server-side OAuth flows
- For client-side React apps, you only need the Client ID
- Never expose Client Secret in frontend code

---

## Step 5: Get Your Google Sheet ID

You need the Sheet ID to tell your app which sheet to use.

1. **Open Your Google Sheet:**
   - Go to https://sheets.google.com
   - Open the sheet you'll use as database

2. **Get Sheet ID from URL:**
   - Look at the URL in your browser
   - Format: `https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit`
   - The Sheet ID is the long string between `/d/` and `/edit`
   - Example URL:
     ```
     https://docs.google.com/spreadsheets/d/1abc-xyz-12345/edit
     ```
   - Sheet ID: `1abc-xyz-12345`
   - **Copy this Sheet ID** - you'll need it

---

## Step 6: Configure Environment Variables

Now set up your React app with the credentials.

1. **Create `.env` File:**
   - In your project root (`c:\Learning\adike-besaya-tracker\fertilizer-tracker\`)
   - Create a new file named `.env`

2. **Add Credentials:**

   ```env
   # Google OAuth Client ID (from Step 5)
   VITE_GOOGLE_CLIENT_ID=123456789-abcdefgh.apps.googleusercontent.com

   # Google Sheet ID (from Step 6)
   VITE_GOOGLE_SHEET_ID=1abc-xyz-12345

   # Google Apps Script Web App URL (from Apps Script deployment)
   # You'll get this after deploying the Apps Script
   VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
   ```

3. **Replace Placeholders:**
   - Replace `123456789-abcdefgh.apps.googleusercontent.com` with your actual Client ID
   - Replace `1abc-xyz-12345` with your actual Sheet ID
   - Replace `YOUR_SCRIPT_ID` with your Apps Script deployment URL (do this later)

4. **Important: Add to `.gitignore`:**

   Make sure `.env` is in your `.gitignore` file (it should be by default with Vite):
   ```gitignore
   # .gitignore
   .env
   .env.local
   .env*.local
   ```

   **Never commit `.env` to Git!** It contains sensitive credentials.

---

## Step 7: Share Your Google Sheet

Make sure all team members can access the Sheet.

1. **Open Your Google Sheet**

2. **Click "Share" Button:**
   - Top right corner, blue "Share" button

3. **Add Team Members:**
   - Enter email addresses of team members
   - Example:
     ```
     manjunath@example.com
     keerthi@example.com
     manager@example.com
     ```

4. **Set Permissions:**
   - **Field Staff:** Set to "Viewer" or "Commenter"
     - They'll edit via the app, not directly in Sheet
   - **Sales Team:** Set to "Editor"
     - Can edit via app and directly in Sheet
   - **Managers:** Set to "Editor" or "Owner"
     - Full access

5. **Important Note:**
   - Only people with access to this Sheet can use your app
   - This is your security layer!
   - Sheet permissions = App permissions

---

## Step 8: Deploy Apps Script & Initialize Sheet

Before testing, set up the Google Apps Script for ID generation and sheet structure.

### 8.1: Deploy Apps Script

1. **Open Your Google Sheet**

2. **Go to Extensions → Apps Script**

3. **Copy Both Script Files:**
   - In Apps Script editor, you'll see `Code.gs`
   - Delete the default code
   - Copy entire contents of `google-apps-script/IdGenerator.gs`
   - Paste into the editor
   - Click **"+"** next to Files → **"Script"**
   - Name it: `SheetInitializer`
   - Copy entire contents of `google-apps-script/SheetInitializer.gs`
   - Paste into the new file

4. **Save the Project:**
   - Click the disk icon or Ctrl+S
   - Name the project: **"Fertilizer Tracker Scripts"**

5. **Close and Reopen Your Google Sheet**
   - This triggers the `onOpen()` function

6. **Initialize Sheet Structure:**
   - You'll see a new menu: **"🌾 Fertilizer Tracker"**
   - Click: **"🔧 Initialize All Sheets"**
   - Click **"Yes"** when prompted
   - Wait for success message
   - Verify: You should now have 7 tabs (Metadata, Roles, Lookups, Leads, FieldVisits, Quotations, Payments)

7. **Deploy as Web App:**
   - In Apps Script editor, click **Deploy** → **New deployment**
   - Click gear icon ⚙️ → **Web app**
   - Fill in:
     - **Description:** "ID Generator API"
     - **Execute as:** Me
     - **Who has access:** Anyone with a Google account
   - Click **Deploy**
   - **Copy the Web App URL** (looks like: `https://script.google.com/macros/s/AKfycby.../exec`)
   - Click **Done**

8. **Test the Deployment:**
   - In your Google Sheet, click menu: **"🌾 Fertilizer Tracker"**
   - Click: **"Test: Generate Lead Number"**
   - Should show popup: "Generated Lead Number: 1"
   - Click again → Should show "2"
   - Check **Metadata** sheet → NextLeadNumber should increment

9. **Add Apps Script URL to `.env`:**
   - Open your `.env` file
   - Add the Web App URL:
     ```env
     VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
     ```

10. **Customize Roles Sheet (Important!):**
    - Open **Roles** tab in your Google Sheet
    - You'll see your email with "Manager" role
    - Add your team members:
      ```
      Email                    | Role
      ------------------------|------------------
      yourname@gmail.com      | Manager
      manjunath@example.com   | Field Agronomist
      keerthi@example.com     | Sales Executive
      ```

---

## Step 9: Test the Setup

Let's verify everything is working.

1. **Check APIs are Enabled:**
   - Go to: https://console.cloud.google.com/apis/dashboard
   - You should see:
     - ✅ Google Sheets API (enabled)

2. **Check OAuth Client ID:**
   - Go to: https://console.cloud.google.com/apis/credentials
   - You should see your "Fertilizer Tracker Web Client" listed

3. **Check OAuth Consent Screen:**
   - Go to: https://console.cloud.google.com/apis/credentials/consent
   - Status should be "Testing" (if External) or "Internal"
   - Test users should be listed (if External)

4. **Check Environment Variables:**
   - Open your `.env` file
   - Verify all three variables are set:
     - ✅ `VITE_GOOGLE_CLIENT_ID`
     - ✅ `VITE_GOOGLE_SHEET_ID`
     - ✅ `VITE_APPS_SCRIPT_URL`

---

## Common Issues & Troubleshooting

### Issue: "Access blocked: This app's request is invalid"

**Solution:**
- Make sure "Authorized JavaScript origins" includes your current URL
- For local dev, must include `http://localhost:5173`
- No trailing slash in URLs!

### Issue: "The OAuth client was not found"

**Solution:**
- Double-check the Client ID in your `.env` file
- Make sure you copied it correctly (no extra spaces)
- Restart your Vite dev server after changing `.env`

### Issue: "User is not authorized to access this app"

**Solution (External apps only):**
- Go to OAuth consent screen → Test users
- Add the user's email address to test users list
- Or switch to "Internal" user type (if you have Google Workspace)

### Issue: "The caller does not have permission"

**Solution:**
- Make sure the Google Sheet is shared with the user
- Check Sheet sharing settings (Share button → People with access)

### Issue: "API key not valid"

**Solution:**
- We don't use API keys - only OAuth
- Remove any `apiKey` configuration if you added one
- Use only Client ID

### Issue: Environment variables not working

**Solution:**
- Restart Vite dev server (Ctrl+C, then `npm run dev` again)
- Vite only reads `.env` on startup
- Make sure variable names start with `VITE_`

---

## Security Best Practices

### ✅ DO:
- Keep `.env` file in `.gitignore`
- Only share Sheet with people who should use the app
- Use "Internal" user type if you have Google Workspace
- Regularly review who has access to the Sheet

### ❌ DON'T:
- Don't commit `.env` to Git (GitHub, etc.)
- Don't share your Client ID publicly (it's not super sensitive, but still)
- Don't give "Editor" permissions to users who only need to view
- Don't use API keys (we use OAuth for better security)

---

## Next Steps

After completing this setup:

1. ✅ You have Google Cloud Project created
2. ✅ Google Sheets API is enabled
3. ✅ OAuth is configured with Client ID
4. ✅ Google Sheet is structured with all tabs
5. ✅ Apps Script is deployed as Web App
6. ✅ All credentials in `.env` file
7. ✅ Team members added to Roles sheet
8. ✅ Sheet is shared with team

**Ready for:** Implementing Google OAuth authentication in React app!

---

## Quick Reference

### Important URLs:
- **Google Cloud Console:** https://console.cloud.google.com/
- **APIs Dashboard:** https://console.cloud.google.com/apis/dashboard
- **Credentials:** https://console.cloud.google.com/apis/credentials
- **OAuth Consent:** https://console.cloud.google.com/apis/credentials/consent

### Files You Created:
- `.env` (in `fertilizer-tracker/` folder)
- Contains: `VITE_GOOGLE_CLIENT_ID`, `VITE_GOOGLE_SHEET_ID`, `VITE_APPS_SCRIPT_URL`

### What to Keep Secret:
- ❌ OAuth Client Secret (we don't use it, but don't share if you downloaded it)
- ⚠️ OAuth Client ID (not super sensitive, but don't publish publicly)
- ⚠️ Google Sheet ID (not sensitive, but reveals which Sheet you're using)
- ❌ Apps Script Web App URL (not sensitive, but don't publish)

### What's Safe to Share:
- ✅ Google Cloud Project name
- ✅ API names (Sheets API, Drive API)
- ✅ OAuth scopes list
