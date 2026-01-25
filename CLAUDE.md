# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Fertilizer Tracker is a React + TypeScript CRM application for managing agricultural sales leads, field visits, quotations, and payments. It uses Google Sheets as the database backend via the Google Sheets API and Google Visualization Query API.

## Common Commands

```bash
# Development
cd fertilizer-tracker && npm run dev     # Start Vite dev server with HMR

# Build
cd fertilizer-tracker && npm run build   # TypeScript compile + Vite production build

# Linting
cd fertilizer-tracker && npm run lint    # ESLint check

# Preview production build
cd fertilizer-tracker && npm run preview
```

## Architecture

### Data Flow
- **Backend**: Google Sheets serves as the database with separate sheets for each entity (Leads, FieldVisits, Quotations, Payments, Lookups, Roles)
- **API Layer**: [sheetsService.ts](fertilizer-tracker/src/services/sheetsService.ts) handles all CRUD operations using two approaches:
  - Google Sheets API (via Axios) for writes and direct reads
  - Google Visualization Query API for complex queries with filtering/pagination
- **Token Management**: [tokenService.ts](fertilizer-tracker/src/services/tokenService.ts) manages OAuth tokens with automatic 401 refresh via Axios interceptors
- **Row Number Generation**: Apps Script endpoint (VITE_APPS_SCRIPT_URL) generates sequential row numbers for display IDs

### State Management
- **Authentication**: Zustand store with localStorage persistence ([authStore.ts](fertilizer-tracker/src/store/authStore.ts))
- **Server State**: React Query for data fetching, caching, and mutations

### Key Patterns
- **Soft Deletes**: All entities use `isDeleted` flag instead of hard deletes, with `deletedBy`, `deletedDate`, `deleteReason` audit fields
- **UUID Primary Keys**: Each record has a UUID (`id` field) for joins; `displayId` is human-readable (e.g., LEA-0416, VIS-0064)
- **Lookup Values**: Dropdown options come from the Lookups sheet, organized by category (District, CropType, LeadStatus, etc.)
- **Role-Based Access**: User roles fetched from Roles sheet at login

### Entity Relationships
- Lead → FieldVisit (1:many via `leadId`)
- Lead → Quotation (1:many via `leadId`)
- FieldVisit → Quotation (optional 1:1 via `visitId`)
- Quotation → Payment (1:many via `quoteId`)

### Directory Structure
- `src/pages/` - Page components (Dashboard, Leads, FieldVisits, Quotations, Payments, Login)
- `src/components/` - Modal forms and shared components (Layout, ProtectedRoute)
- `src/services/` - API services (sheetsService, authService, tokenService)
- `src/types/` - TypeScript interfaces for all entities
- `src/utils/` - Utilities for date formatting, ID generation, validation

## Environment Variables

Required in `.env`:
- `VITE_GOOGLE_CLIENT_ID` - Google OAuth client ID
- `VITE_APPS_SCRIPT_URL` - Apps Script endpoint for row number generation
- Google Sheets API configuration (spreadsheet ID in tokenService)

## Sheet Column Mappings

When working with sheetsService.ts, note that Google Visualization queries reference columns by letter (A, B, C...). See the parse functions in sheetsService.ts for exact column mappings:
- `parseLeadRow`: A=id through X=deleteReason (24 columns)
- `parseFieldVisitRow`: A=id through U=deleteReason (21 columns)
- `parseQuotationRow`: A=id through P=deleteReason (16 columns)
- `parsePaymentRow`: A=id through O=deleteReason (15 columns)

## Important: Model Changes Require Apps Script Updates

The Google Sheets schema (column headers) is initialized from Google Apps Script. When modifying entity models (adding/removing/renaming columns):

1. **Update Apps Script**: The Apps Script at `VITE_APPS_SCRIPT_URL` initializes sheet schemas - update it first with new column definitions
2. **Update TypeScript**: Update the column mappings in `types/index.ts` (e.g., `FIELD_VISIT_COLUMNS`) to match
3. **Update Services**: Update parse/create/update functions in `sheetsService.ts` to handle new columns

The column order in `types/index.ts` must match the Apps Script schema exactly.
