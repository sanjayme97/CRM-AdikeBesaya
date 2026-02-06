# Plan: Server-Side Sorting, Dropdown Filters & Visit Navigation

## Context
All 5 table pages (Leads, FieldVisits, Quotations, Payments, Products) have only a text search bar. There is no column sorting and no dropdown filters. Additionally, from the Quotations page, users can click through to the linked Lead but cannot navigate to the linked Field Visit. This plan adds:
1. Clickable column headers with server-side sort (ascending/descending toggle)
2. Dropdown filters for key columns (Status, District, etc.) using lookup values
3. FieldVisitModal on QuotationsPage so linked visits are viewable

## Files to Modify

**New shared components:**
- `src/components/SortableHeader.tsx` (new)
- `src/components/FilterBar.tsx` (new)

**Service layer (add optional `options` param to fetch functions):**
- `src/services/supabase/leads.ts`
- `src/services/supabase/fieldVisits.ts`
- `src/services/supabase/quotations.ts`
- `src/services/supabase/payments.ts`
- `src/services/supabase/products.ts`
- `src/services/sheetsService.ts` (add `options?: any` to 4 fetch signatures for TS compat)

**Pages (add sort state, filter state, SortableHeader, FilterBar):**
- `src/pages/LeadsPage.tsx`
- `src/pages/FieldVisitsPage.tsx`
- `src/pages/QuotationsPage.tsx` — also add FieldVisitModal
- `src/pages/PaymentsPage.tsx`
- `src/pages/ProductsPage.tsx`

**Types:**
- `src/types/index.ts` — add `SortConfig` interface

---

## Step 1: Types — Add SortConfig

**File:** `src/types/index.ts`

```typescript
export interface SortConfig {
  column: string;    // DB column name (snake_case)
  ascending: boolean;
}
```

---

## Step 2: Shared Components

### 2a: `src/components/SortableHeader.tsx` (new)

Replaces plain `<th>` for sortable columns. Renders a `<th>` with click handler and sort indicator.

```typescript
interface SortableHeaderProps {
  label: string;
  sortKey: string;           // DB column name
  currentSort: SortConfig;
  onSort: (key: string) => void;
  className?: string;        // pass-through for num-col etc.
}
```

Behavior:
- Click toggles ascending/descending if same column, or sets ascending if new column
- Shows ` ▲` / ` ▼` on active sort column only
- Styled with `cursor: pointer; user-select: none` + hover color `#667eea`

### 2b: `src/components/FilterBar.tsx` (new)

A row of dropdown filters rendered as `<select>` elements. Each page passes its own filter config.

```typescript
interface FilterItem {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}

interface FilterBarProps {
  filters: FilterItem[];
}
```

Renders a flex row of styled `<select>` elements matching the existing `search-input` style. Each has an "All {label}" default option.

---

## Step 3: Service Layer — Add Optional Sort/Filter Params

Same pattern for all 5 fetch functions: add an optional trailing `options` parameter. The existing positional params stay unchanged for backward compat.

### 3a: `supabase/leads.ts` — `fetchLeads`

**Current:** `fetchLeads(limit, offset)`
**New:** `fetchLeads(limit, offset, options?)`

```typescript
options?: {
  sortColumn?: string;
  sortAscending?: boolean;
  filters?: { status?: string; district?: string };
}
```

Implementation: Apply `.eq()` for each non-empty filter, then `.order(sortColumn || 'row_number', { ascending })`.

### 3b: `supabase/fieldVisits.ts` — `fetchFieldVisits`

**Current:** `fetchFieldVisits(limit, offset, leadId?)`
**New:** `fetchFieldVisits(limit, offset, leadId?, options?)`

```typescript
options?: {
  sortColumn?: string;
  sortAscending?: boolean;
  filters?: { status?: string };
}
```

### 3c: `supabase/quotations.ts` — `fetchQuotations`

**Current:** `fetchQuotations(limit, offset, leadId?, preparedBy?)`
**New:** `fetchQuotations(limit, offset, leadId?, preparedBy?, options?)`

```typescript
options?: {
  sortColumn?: string;
  sortAscending?: boolean;
  filters?: { status?: string };
}
```

### 3d: `supabase/payments.ts` — `fetchPayments`

**Current:** `fetchPayments(limit, offset, quoteId?)`
**New:** `fetchPayments(limit, offset, quoteId?, options?)`

```typescript
options?: {
  sortColumn?: string;
  sortAscending?: boolean;
  filters?: { paymentType?: string; paymentMethod?: string };
}
```

### 3e: `supabase/products.ts` — `fetchProducts`

**Current:** `fetchProducts(activeOnly?)`
**New:** `fetchProducts(activeOnly?, options?)`

```typescript
options?: {
  sortColumn?: string;
  sortAscending?: boolean;
  filters?: { category?: string; isActive?: string }; // 'true'/'false'/''
}
```

### 3f: `sheetsService.ts` — Add `options?: any` to 4 fetch functions

Just add the unused parameter so TypeScript doesn't complain when `backend.ts` destructures them. No logic changes.

---

## Step 4: Page Changes (Same Pattern for All 5)

Each page gets the same modifications:

### State additions:
```typescript
const [sortConfig, setSortConfig] = useState<SortConfig>({ column: 'row_number', ascending: false });
const [filters, setFilters] = useState<{ [key: string]: string }>({});
```

### Sort handler:
```typescript
const handleSort = (key: string) => {
  setSortConfig(prev => ({
    column: key,
    ascending: prev.column === key ? !prev.ascending : true,
  }));
};
```

### Filter handler:
```typescript
const handleFilterChange = (key: string, value: string) => {
  setFilters(prev => ({ ...prev, [key]: value }));
};
```

### useEffect — reload on sort/filter change:
```typescript
useEffect(() => {
  // Reset data + pagination, then re-fetch
  setData([]);
  setHasMore(true);
  loadData();
}, [sortConfig, filters]);
```

### Pass options to fetch call:
```typescript
const data = await fetchXxx(PAGE_SIZE, offset, ..., {
  sortColumn: sortConfig.column,
  sortAscending: sortConfig.ascending,
  filters: { status: filters.status || undefined, ... },
});
```

### Replace `<th>` with `<SortableHeader>` for sortable columns.

### Add `<FilterBar>` between search bar and table.

---

## Step 4 Page-Specific Details

### LeadsPage
- **Sortable columns:** ID (`row_number`), Farmer Name (`farmer_name`), District (`district`), Crop (`crop_type`), Status (`status`)
- **Non-sortable:** Phone, Actions
- **Filters:** Status (`lookups.leadStatuses`), District (`lookups.districts`)

### FieldVisitsPage
- **Sortable columns:** Visit ID (`row_number`), Scheduled (`scheduled_date`), Actual (`actual_date`), Status (`status`)
- **Non-sortable:** Farmer, Visitor, Outcome, Actions
- **Filters:** Status (`lookups.visitStatuses`)

### QuotationsPage
- **Sortable columns:** Quote ID (`row_number`), Date (`quote_date`), Amount (`quote_amount`), Valid Until (`valid_until`), Status (`status`)
- **Non-sortable:** Farmer, Prepared By, Actions
- **Filters:** Status (`lookups.quotationStatuses`)
- **Note:** Sort/filter hidden for "Pending Payment" tab (uses separate `fetchDeliveredQuotations`)

### PaymentsPage
- **Sortable columns:** Payment ID (`row_number`), Date (`payment_date`), Amount (`payment_amount`), Type (`payment_type`), Method (`payment_method`)
- **Non-sortable:** Quote, Farmer, Received By, Actions
- **Filters:** Payment Type (`lookups.paymentTypes`), Payment Method (`lookups.paymentMethods`)
- **Note:** Sort/filter hidden when filtered by quoteId URL param

### ProductsPage
- **Default sort:** `display_order` ascending (not `row_number`)
- **Sortable columns:** Name (`name`), Unit Price (`unit_price`), Category (`category`), SKU (`sku`)
- **Non-sortable:** Name (Kannada), Unit, Status, Actions
- **Filters:** Category (derived from loaded products: `[...new Set(products.map(p => p.category))]`), Status ("All"/"Active"/"Inactive")

---

## Step 5: Visit Navigation from QuotationsPage

### 5a: Add FieldVisitModal state + imports

```typescript
import { FieldVisitModal } from '../components/FieldVisitModal';
import type { FieldVisit } from '../types';

// State
const [visitModalOpen, setVisitModalOpen] = useState(false);
const [selectedVisit, setSelectedVisit] = useState<FieldVisit | null>(null);
```

Update `isAnyModalOpen` to include `visitModalOpen`.
Update `closeAllModals` to reset visit modal state.

### 5b: Visit click handler

```typescript
const handleVisitClick = async (visitId: string, e: React.MouseEvent) => {
  e.stopPropagation();
  try {
    const visit = await fetchFieldVisitById(visitId);
    if (visit) {
      setSelectedVisit(visit);
      setVisitModalOpen(true);
    }
  } catch (err) {
    console.error('Failed to fetch visit:', err);
  }
};
```

`fetchFieldVisitById` is already exported from `backend.ts`.

### 5c: Add Visit column to table

Between "Farmer" and "Date" columns, add a "Visit" column:
- If `quotation.visitId` exists: show clickable "View Visit" link
- If not: show `-`

Same for mobile card view — show visit link if linked.

### 5d: Add FieldVisitModal JSX

After the existing LeadModal:
```tsx
<FieldVisitModal
  isOpen={visitModalOpen}
  mode="view"
  visit={selectedVisit}
  leadMap={leadMap}
  onSearchLeads={searchLeads}
  lookups={lookups}
  onClose={() => closeWithHistory()}
  onSave={async () => {}}
/>
```

---

## Implementation Order

```
Step 1 (types) — SortConfig
Step 2 (shared components) — SortableHeader + FilterBar
Step 3 (services) — all 5 supabase services + sheetsService compat
Step 4 (pages) — LeadsPage first (reference), then remaining 4
Step 5 (visit nav) — QuotationsPage additions
Build verification
```

Steps 2 and 3 are independent and can be done in parallel.

---

## Verification
1. **Sorting:** On each page, click column headers — verify data reloads from server in correct order, arrow indicator shows, clicking again toggles direction
2. **Filters:** Select a dropdown value — verify table shows only matching records, "Load More" continues to work with filter applied
3. **Sort + Filter combined:** Apply a filter then sort — verify both work together
4. **Pagination:** After sorting/filtering, click "Load More" — verify subsequent pages maintain the same sort/filter
5. **Visit nav:** On Quotations page, find a quotation with a linked visit, click "View Visit" — verify FieldVisitModal opens in view mode
6. **Mobile:** Verify filter dropdowns stack properly on mobile, card views still work
7. **Build:** `cd fertilizer-tracker && npm run build` — no TypeScript errors
