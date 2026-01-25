# Fertilizer Tracker - Implementation Status

## Project Overview

A sales tracking system for a fertilizer company in Karnataka, India. Built with React + Vite + TypeScript, using Google Sheets as the database and Google OAuth for authentication.

**Tech Stack:**
- Frontend: React 19 + Vite + TypeScript
- Database: Google Sheets API v4
- Auth: Google OAuth (@react-oauth/google)
- ID Generation: Google Apps Script (atomic counters)
- Hosting: Vercel (planned)

---

## COMPLETED FEATURES

### 1. Project Setup
- [x] React + Vite project with TypeScript
- [x] Dependencies installed (React Router, Google OAuth, Zustand, etc.)
- [x] Folder structure: `components/`, `pages/`, `services/`, `types/`, `hooks/`, `utils/`, `store/`
- [x] TypeScript type definitions (`src/types/index.ts`)
- [x] Environment variables setup (`.env` file)

### 2. Google Cloud Setup
- [x] OAuth Client ID configured
- [x] Google Sheets API enabled
- [x] Apps Script deployed for atomic ID generation

### 3. Authentication
- [x] Google OAuth login (`src/pages/LoginPage.tsx`)
- [x] Auth state management with Zustand (`src/store/authStore.ts`)
- [x] Protected routes (`src/components/ProtectedRoute.tsx`)
- [x] User role fetching from Roles sheet

### 4. Layout & Navigation
- [x] Main layout with header (`src/components/Layout.tsx`)
- [x] Navigation tabs: Dashboard, Leads, Visits, Quotes
- [x] User avatar and sign out button
- [x] Mobile-responsive header

### 5. Leads Module (COMPLETE)
- [x] **LeadsPage** (`src/pages/LeadsPage.tsx`)
  - Desktop table view / Mobile card view
  - Search by name, phone, district, displayId
  - Pagination with "Load More"
- [x] **LeadModal** (`src/components/LeadModal.tsx`)
  - View mode (read-only)
  - Add mode (create new lead)
  - Edit mode (update existing)
- [x] **Sheets API Functions** (`src/services/sheetsService.ts`)
  - `fetchLeads()` - with pagination, sorted by rowNumber DESC
  - `createLead()` - with Apps Script ID generation
  - `updateLead()` - update existing lead
  - `deleteLead()` - soft delete
  - `fetchLookups()` - dropdown values

### 6. Field Visits Module (COMPLETE)
- [x] **FieldVisitsPage** (`src/pages/FieldVisitsPage.tsx`)
  - Desktop table view / Mobile card view
  - Search by visit ID, farmer name, status
  - Pagination with "Load More"
  - Shows linked farmer info
- [x] **FieldVisitModal** (`src/components/FieldVisitModal.tsx`)
  - View mode with farmer details
  - Add mode (select farmer from dropdown)
  - Edit mode (update visit outcome, status, notes)
- [x] **Sheets API Functions**
  - `fetchFieldVisits()` - with pagination, optional leadId filter
  - `fetchVisitsByLeadId()` - visits for specific lead
  - `createFieldVisit()` - schedule new visit
  - `updateFieldVisit()` - update visit details
  - `deleteFieldVisit()` - soft delete
  - `fetchLeadById()` - helper for displaying lead info

### 7. Google Apps Script
- [x] `IdGenerator.gs` - Atomic ID generation with LockService
- [x] `SheetInitializer.gs` - Creates all sheets with proper structure
- [x] Web App endpoint for POST requests

### 8. Sheet Structure (via SheetInitializer.gs)
- [x] **Metadata** - ID counters (NextLeadNumber, NextVisitNumber, etc.)
- [x] **Roles** - Email to role mapping
- [x] **Lookups** - Dropdown values (Districts, CropTypes, LeadSources, etc.)
- [x] **Leads** - Farmer/customer data (23 columns)
- [x] **FieldVisits** - Visit tracking (19 columns)
- [x] **Quotations** - Quote data (16 columns)
- [x] **Payments** - Payment records (15 columns)

---

## NOT YET IMPLEMENTED

### 1. Quotations Module
- [ ] QuotationsPage with list view
- [ ] QuotationModal for add/edit/view
- [ ] API functions: `fetchQuotations()`, `createQuotation()`, `updateQuotation()`, `deleteQuotation()`
- [ ] Link to Lead and optional Visit

### 2. Payments Module
- [ ] PaymentsPage with list view
- [ ] PaymentModal for add/edit/view
- [ ] API functions: `fetchPayments()`, `createPayment()`, `updatePayment()`, `deletePayment()`
- [ ] Link to Quotation
- [ ] Payment types: Advance, Partial, Final

### 3. Dashboard
- [ ] Summary cards (Total Leads, Visits, Quotes, Revenue)
- [ ] Charts with Recharts:
  - Sales funnel (Lead → Visit → Quote → Sale)
  - Leads by district (bar chart)
  - Revenue trends (line chart)
  - Conversion rates
- [ ] Recent activity feed

### 4. Advanced Features
- [ ] Role-based access control (Field Staff vs Manager views)
- [ ] Audit logging (track changes)
- [ ] Offline support (PWA with service workers)
- [ ] Automated daily backups (Apps Script trigger)
- [ ] Export to Excel/PDF

---

## KEY FILES REFERENCE

### Frontend
```
src/
├── App.tsx                     # Routes: /login, /dashboard, /leads, /visits
├── main.tsx                    # React entry point (StrictMode enabled)
├── components/
│   ├── Layout.tsx              # Header with nav tabs
│   ├── ProtectedRoute.tsx      # Auth guard
│   ├── LeadModal.tsx           # Lead CRUD modal
│   └── FieldVisitModal.tsx     # Visit CRUD modal
├── pages/
│   ├── LoginPage.tsx           # Google OAuth login
│   ├── DashboardPage.tsx       # Placeholder (needs implementation)
│   ├── LeadsPage.tsx           # Lead list with table/card view
│   └── FieldVisitsPage.tsx     # Visit list with table/card view
├── services/
│   └── sheetsService.ts        # All Google Sheets API functions
├── store/
│   └── authStore.ts            # Zustand auth state
├── types/
│   └── index.ts                # TypeScript interfaces
└── utils/
    └── idGeneration.ts         # UUID generation
```

### Google Apps Script
```
google-apps-script/
├── IdGenerator.gs              # Atomic ID generation, Web App endpoint
└── SheetInitializer.gs         # Creates all sheets with headers
```

### Configuration
```
.env                            # Environment variables (not committed)
├── VITE_GOOGLE_CLIENT_ID       # OAuth client ID
├── VITE_GOOGLE_SHEET_ID        # Google Sheet ID
└── VITE_APPS_SCRIPT_URL        # Deployed Apps Script URL
```

---

## SHEET COLUMN MAPPINGS

### Leads Sheet (23 columns)
```
A=id, B=rowNumber, C=displayId, D=createdDate, E=farmerName, F=phone, G=whatsapp,
H=village, I=taluk, J=district, K=farmSizeAcres, L=cropType, M=cropAge,
N=numPlants, O=irrigationType, P=leadSource, Q=assignedTo, R=status,
S=lastUpdated, T=isDeleted, U=deletedBy, V=deletedDate, W=deleteReason
```

### FieldVisits Sheet (19 columns)
```
A=id, B=rowNumber, C=displayId, D=leadId, E=scheduledDate, F=actualDate,
G=visitorId, H=visitOutcome, I=cropCondition, J=diagnosisNotes,
K=recommendationsSent, L=followUpDate, M=status, N=createdBy, O=createdDate,
P=isDeleted, Q=deletedBy, R=deletedDate, S=deleteReason
```

### Quotations Sheet (16 columns)
```
A=id, B=rowNumber, C=displayId, D=leadId, E=visitId, F=quoteDate,
G=quoteAmount, H=preparedBy, I=validUntil, J=status, K=notes, L=lastUpdated,
M=isDeleted, N=deletedBy, O=deletedDate, P=deleteReason
```

### Payments Sheet (15 columns)
```
A=id, B=rowNumber, C=displayId, D=quoteId, E=paymentDate, F=paymentAmount,
G=paymentType, H=paymentMethod, I=transactionRef, J=receivedBy, K=notes,
L=isDeleted, M=deletedBy, N=deletedDate, O=deleteReason
```

---

## KNOWN ISSUES / NOTES

1. **PAGE_SIZE in LeadsPage** - Currently set to 5 for testing, change to 100 for production
2. **React StrictMode** - Causes double API calls in development (normal behavior, doesn't affect production)
3. **Column Type Detection** - Google Visualization API auto-detects types; ensure text columns have text data to avoid null values
4. **Lookups Extended** - `fetchLookups()` now includes `visitStatuses`, `visitOutcomes`, `cropConditions`

---

## TO CONTINUE DEVELOPMENT

1. Clear context and start fresh
2. Read this file for context
3. Next priority: **Quotations Module** (QuotationsPage, QuotationModal, API functions)
4. Then: **Payments Module**
5. Finally: **Dashboard with charts**

---

Last Updated: 2026-01-18
