# Google Sheets Backend (Legacy — UNUSED)

> **Status: Not in use.** The app runs Supabase only. This code (`src/services/sheetsService.ts`, `google-apps-script/`) remains in the repo but is dead code — scheduled for removal in a future cleanup sprint. Do NOT add new features here.

Was active when `VITE_USE_SUPABASE=false`. All logic in `src/services/sheetsService.ts`.

## Column Mappings
Visualization API references columns by letter. Order MUST match Apps Script schema exactly.

### parseLeadRow (24 columns: A–X)
A=id, B=displayId, C=rowNumber, D=farmerName, E=phone, F=village, G=taluk, H=district,
I=cropType, J=farmSizeAcres, K=leadSource, L=leadStatus, M=leadOwner, N=irrigationType,
O=notes, P=assignedTo, Q=lastUpdated, R=isDeleted, S=deletedBy, T=deletedDate,
U=deleteReason, V=numPlants, W=cropAge, X=addedBy

### parseFieldVisitRow (21 columns: A–U)
A=id, B=displayId, C=rowNumber, D=leadId, E=scheduledDate, F=visitedDate, G=status,
H=visitOutcome, I=cropCondition, J=notes, K=addedBy, L=lastUpdated, M=isDeleted,
N=deletedBy, O=deletedDate, P=deleteReason, Q–U=(reserved/unused)
Note: identifiedProblems NOT implemented in Sheets backend.

### parseQuotationRow (16 columns: A–P)
A=id, B=displayId, C=rowNumber, D=leadId, E=visitId, F=quoteDate, G=quoteAmount,
H=preparedBy, I=validUntil, J=status, K=notes, L=attachmentFileId, M=lastUpdated,
N=isDeleted, O=deletedBy, P=deletedDate (deleteReason omitted)

### parsePaymentRow (15 columns: A–O)
A=id, B=displayId, C=rowNumber, D=quoteId, E=leadId, F=paymentDate, G=amount,
H=paymentMode, I=referenceNumber, J=notes, K=receivedBy, L=lastUpdated,
M=isDeleted, N=deletedBy, O=deletedDate

## Apps Script
URL: `VITE_APPS_SCRIPT_URL` env variable
Purpose: generates sequential row numbers for display IDs
Files: `google-apps-script/IdGenerator.gs`, `SheetInitializer.gs`

## When Modifying Sheets Schema
1. Update Apps Script first (column order is source of truth)
2. Update column constants in `src/types/index.ts`
3. Update parse/create/update functions in `sheetsService.ts`
Column order in TypeScript MUST match Apps Script exactly.

## Limitations vs Supabase
- No identifiedProblems on FieldVisit
- No Products or LineItems tables
- No usageInstructions on Quotation
- No file attachment support
- Pagination via offset (slower on large datasets)
- No RLS — access controlled by Google Sheets sharing settings
