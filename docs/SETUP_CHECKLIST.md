# Setup Checklist

Use this checklist to track your progress setting up the Fertilizer Tracker application.

## Prerequisites
- [ ] Google account (Gmail or Google Workspace)
- [ ] Google Sheet created (will be used as database)
- [ ] Node.js installed (v18 or higher)
- [ ] Git installed
- [ ] Code editor (VS Code recommended)

---

## Phase 1: Project Setup ✅ COMPLETED

- [x] Initialize React + Vite project with TypeScript
- [x] Install dependencies (React Router, OAuth, TanStack Query, etc.)
- [x] Set up folder structure
- [x] Create TypeScript type definitions
- [x] Create utility functions (ID generation, date formatting, validation)
- [x] Create Google Apps Script code

---

## Phase 2: Google Cloud & Apps Script Setup 🚧 IN PROGRESS

### Google Apps Script Deployment
- [ ] Open your Google Sheet
- [ ] Create "Metadata" sheet tab
- [ ] Go to Extensions → Apps Script
- [ ] Copy `google-apps-script/IdGenerator.gs` code
- [ ] Paste into Apps Script editor
- [ ] Save project as "Fertilizer Tracker ID Generator"
- [ ] Run `initializeMetadata()` function (authorize when prompted)
- [ ] Verify Metadata sheet has counters (NextLeadNumber, etc.)
- [ ] Deploy as Web App:
  - [ ] Click Deploy → New deployment
  - [ ] Type: Web app
  - [ ] Execute as: Me
  - [ ] Who has access: Anyone
  - [ ] Click Deploy
- [ ] Copy Web App URL
- [ ] Test Web App by visiting URL in browser
- [ ] Verify ID generation works (click test buttons)

**Reference:** `google-apps-script/README.md`

### Google Cloud Project Setup
- [ ] Go to https://console.cloud.google.com/
- [ ] Create new project: "Fertilizer Tracker"
- [ ] Enable Google Sheets API
- [ ] Enable Google Drive API
- [ ] Configure OAuth Consent Screen:
  - [ ] Choose user type (Internal or External)
  - [ ] Set app name: "Fertilizer Tracker"
  - [ ] Set support email
  - [ ] Add scopes: userinfo.email, userinfo.profile, spreadsheets, drive.readonly
  - [ ] Add test users (if External)
- [ ] Create OAuth Client ID:
  - [ ] Type: Web application
  - [ ] Name: "Fertilizer Tracker Web Client"
  - [ ] Add authorized origins: `http://localhost:5173`
  - [ ] Add redirect URIs: `http://localhost:5173`
  - [ ] Click Create
  - [ ] Copy Client ID
- [ ] Get Google Sheet ID from URL
- [ ] Share Google Sheet with team members
- [ ] Create `.env` file in `fertilizer-tracker/` folder
- [ ] Add environment variables:
  - [ ] `VITE_GOOGLE_CLIENT_ID`
  - [ ] `VITE_GOOGLE_SHEET_ID`
  - [ ] `VITE_APPS_SCRIPT_URL`
- [ ] Verify `.env` is in `.gitignore`
- [ ] Test: Visit APIs dashboard, verify APIs are enabled

**Reference:** `docs/google-cloud-setup.md`

---

## Phase 3: Authentication Implementation 📋 TODO

- [ ] Create auth service (`services/auth.ts`)
- [ ] Create auth store with Zustand (`store/authStore.ts`)
- [ ] Create Login page component
- [ ] Implement Google OAuth sign-in
- [ ] Implement sign-out
- [ ] Create protected route wrapper
- [ ] Fetch user role from Roles sheet
- [ ] Test authentication flow

---

## Phase 4: Google Sheets API Integration 📋 TODO

- [ ] Create Sheets API service (`services/sheetsApi.ts`)
- [ ] Implement read operations (get leads, visits, etc.)
- [ ] Implement write operations (create lead, update lead, etc.)
- [ ] Implement delete operations (soft delete)
- [ ] Create audit log writer
- [ ] Test CRUD operations
- [ ] Set up React Query hooks for data fetching

---

## Phase 5: UI Components 📋 TODO

### Shared Components
- [ ] Create layout components (Header, Sidebar, Footer)
- [ ] Create form components (Input, Select, Button, etc.)
- [ ] Create table component with sorting/filtering
- [ ] Create modal/dialog component
- [ ] Create loading spinner
- [ ] Create error message component

### Lead Management
- [ ] Create Leads List page
- [ ] Create Lead Detail page
- [ ] Create Add Lead form
- [ ] Create Edit Lead form
- [ ] Implement soft delete with confirmation
- [ ] Add search and filters

### Field Visit Tracking
- [ ] Create Visits List page
- [ ] Create Visit Detail page
- [ ] Create Schedule Visit form
- [ ] Create Record Visit Outcome form
- [ ] Link visits to leads

### Quotation Management
- [ ] Create Quotations List page
- [ ] Create Quotation Detail page
- [ ] Create Add Quotation form
- [ ] Create Edit Quotation form
- [ ] Link quotations to visits

### Payment Tracking
- [ ] Create Payments List page
- [ ] Create Record Payment form
- [ ] Show payment history per quotation
- [ ] Calculate outstanding balance

---

## Phase 6: Dashboard 📋 TODO

### Basic Dashboard
- [ ] Create Dashboard page
- [ ] Add metric cards (total leads, visits, quotes)
- [ ] Add recent activity feed
- [ ] Show "My Assigned Leads" for field staff

### Advanced Dashboard
- [ ] Add sales funnel chart (Recharts)
- [ ] Add conversion rate metrics
- [ ] Add revenue trends chart
- [ ] Add district/crop breakdown charts
- [ ] Add leaderboard (top performers)

---

## Phase 7: Testing & Deployment 📋 TODO

### Testing
- [ ] Test with multiple users (concurrent edits)
- [ ] Test ID generation (verify no duplicates)
- [ ] Test soft deletes and audit trail
- [ ] Test role-based access control
- [ ] Test on mobile devices
- [ ] Test with slow internet (2G/3G)
- [ ] Test form validation

### Deployment
- [ ] Create Vercel account
- [ ] Connect GitHub repository to Vercel
- [ ] Add environment variables in Vercel dashboard
- [ ] Deploy to Vercel
- [ ] Test production deployment
- [ ] Update OAuth authorized origins with production URL
- [ ] Add production URL to Apps Script CORS

### Documentation
- [ ] Create user guide (how to use the app)
- [ ] Create admin guide (how to manage Sheet, add users)
- [ ] Document troubleshooting steps
- [ ] Create training materials for team

---

## Phase 8: Optional Enhancements 📋 LATER

- [ ] Implement offline support (PWA with service workers)
- [ ] Add push notifications
- [ ] Add export to Excel/PDF
- [ ] Add email reports
- [ ] Add data import tool
- [ ] Implement field photo uploads
- [ ] Add WhatsApp integration

---

## Progress Summary

- ✅ **Completed:** 6 tasks (Project setup, utilities, Apps Script code)
- 🚧 **In Progress:** 2 tasks (Google Cloud setup, Apps Script deployment)
- 📋 **TODO:** 50+ tasks (Authentication, API integration, UI, Dashboard, Testing)

---

## Need Help?

- **Apps Script:** See `google-apps-script/README.md`
- **Google Cloud:** See `docs/google-cloud-setup.md`
- **Type Definitions:** See `src/types/index.ts`
- **Utilities:** See `src/utils/` folder

---

## Quick Links

- Google Cloud Console: https://console.cloud.google.com/
- Google Sheets: https://sheets.google.com
- Vercel Dashboard: https://vercel.com/dashboard
- React Router Docs: https://reactrouter.com/
- TanStack Query Docs: https://tanstack.com/query/
- Recharts Docs: https://recharts.org/
