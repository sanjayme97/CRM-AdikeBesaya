/**
 * Google Sheets API Service
 *
 * Handles all CRUD operations for Leads, Field Visits, Quotations, and Payments
 * Uses Axios with interceptors for automatic token handling and 401 refresh
 */

import type { Lead, FieldVisit, Quotation, Payment } from '../types';
import {
  LEAD_COLUMNS,
  FIELD_VISIT_COLUMNS,
  QUOTATION_COLUMNS,
  PAYMENT_COLUMNS,
} from '../types';
import { generateUUID } from '../utils/idGeneration';
import { sheetsApi, sheetsQueryApi, AuthError } from './tokenService';

const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

// Re-export AuthError for consumers
export { AuthError };

// ============================================================================
// HELPER FUNCTIONS (using Axios with auto token injection)
// ============================================================================

/**
 * Helper: Get next row number from Apps Script
 */
async function getNextRowNumber(
  entityType: 'Lead' | 'FieldVisit' | 'Quotation' | 'Payment'
): Promise<number> {
  const response = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'getNextNumber', entityType }),
  });

  if (!response.ok) {
    throw new Error('Failed to get next row number from Apps Script');
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Apps Script error');
  }

  return data.number;
}

/**
 * Helper: Fetch all rows from a sheet using Axios
 */
async function fetchSheetData(sheetName: string): Promise<string[][]> {
  const range = `${sheetName}!A2:Z`;
  const response = await sheetsApi.get(`/values/${range}`);
  return response.data.values || [];
}

/**
 * Helper: Query sheet data using Google Visualization API
 */
async function querySheetData(sheetName: string, query: string): Promise<string[][]> {
  const encodedQuery = encodeURIComponent(query);
  const url = `/gviz/tq?tqx=out:json&sheet=${sheetName}&tq=${encodedQuery}&headers=1`;

  const response = await sheetsQueryApi.get(url);
  const text = response.data;

  const jsonMatch = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?$/);
  if (!jsonMatch) {
    throw new Error('Invalid query response format');
  }

  const data = JSON.parse(jsonMatch[1]);
  if (data.status === 'error') {
    throw new Error(data.errors?.[0]?.message || 'Query error');
  }

  const rows: string[][] = [];
  const table = data.table;

  if (table?.rows) {
    for (const row of table.rows) {
      const rowData: string[] = [];
      if (row.c) {
        for (const cell of row.c) {
          if (cell === null || cell === undefined) {
            rowData.push('');
          } else if (cell.v === null || cell.v === undefined) {
            rowData.push('');
          } else {
            rowData.push(cell.f !== undefined ? cell.f : String(cell.v));
          }
        }
      }
      rows.push(rowData);
    }
  }

  return rows;
}

/**
 * Pagination result type
 */
export interface PaginatedResult<T> {
  data: T[];
  totalCount: number;
  hasMore: boolean;
  nextOffset: number;
}

/**
 * Helper: Append a row to a sheet using Axios
 */
async function appendRowToSheet(sheetName: string, values: unknown[]): Promise<void> {
  const range = `${sheetName}!A:Z`;
  await sheetsApi.post(`/values/${range}:append?valueInputOption=USER_ENTERED`, {
    values: [values],
  });
}

/**
 * Helper: Find row index by UUID
 */
async function findRowByUUID(sheetName: string, uuid: string): Promise<number | null> {
  const rows = await fetchSheetData(sheetName);

  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0] === uuid) {
      return i + 2; // +2 because: +1 for 0-index, +1 for header row
    }
  }

  return null;
}

/**
 * Helper: Update a specific row using Axios
 */
async function updateRow(sheetName: string, rowIndex: number, values: unknown[]): Promise<void> {
  const range = `${sheetName}!A${rowIndex}:Z${rowIndex}`;
  await sheetsApi.put(`/values/${range}?valueInputOption=USER_ENTERED`, {
    values: [values],
  });
}

// ============================================================================
// LEADS API
// ============================================================================

/**
 * Parse a row into Lead object
 * Column mapping defined in LEAD_COLUMNS (types/index.ts)
 */
function parseLeadRow(row: string[]): Lead {
  return {
    id: row[0] || '',
    rowNumber: parseInt(row[1]) || 0,
    displayId: row[2] || '',
    createdDate: row[3] || '',
    createdBy: row[16] || '', // Default to leadOwner for legacy Google Sheets data
    farmerName: row[4] || '',
    phone: row[5] || '',
    whatsapp: row[6] || '',
    village: row[7] || '',
    taluk: row[8] || '',
    district: row[9] || '',
    farmSizeAcres: parseFloat(row[10]) || 0,
    cropType: row[11] || '',
    cropAge: row[12] || '',
    numPlants: parseInt(row[13]) || 0,
    irrigationType: row[14] || '',
    leadSource: row[15] || '',
    leadOwner: row[16] || '',
    status: row[17] || '',
    remarks: row[18] || '',
    lastUpdated: row[19] || '',
    isDeleted: row[20] === 'TRUE' || row[20] === 'true',
    deletedBy: row[21] || '',
    deletedDate: row[22] || '',
    deleteReason: row[23] || '',
  };
}

/**
 * Fetch leads using Google Sheets Query API
 */
export async function fetchLeads(
  limit: number = 5, // TODO: Change back to 100 after testing
  offset: number = 0
): Promise<Lead[]> {
  const { IS_DELETED, ROW_NUMBER } = LEAD_COLUMNS;
  let query = `SELECT * WHERE ${IS_DELETED} = false OR ${IS_DELETED} IS NULL ORDER BY ${ROW_NUMBER} DESC`;

  if (limit > 0) {
    query += ` LIMIT ${limit}`;
  }

  if (offset > 0) {
    query += ` OFFSET ${offset}`;
  }

  const rows = await querySheetData('Leads', query);
  return rows.map(parseLeadRow);
}

/**
 * Fetch all leads (no limit) - for exports
 */
export async function fetchAllLeads(): Promise<Lead[]> {
  return fetchLeads(0);
}

/**
 * Create a new lead
 */
export async function createLead(
  leadData: Omit<Lead, 'id' | 'rowNumber' | 'displayId' | 'createdDate' | 'lastUpdated' | 'isDeleted' | 'deletedBy' | 'deletedDate' | 'deleteReason'>
): Promise<Lead> {
  const id = generateUUID();
  const rowNumber = await getNextRowNumber('Lead');
  const now = new Date().toISOString();
  const displayId = `LEA-${String(rowNumber).padStart(4, '0')}`;

  const rowData = [
    id, rowNumber, displayId, now,
    leadData.farmerName, leadData.phone, leadData.whatsapp || '',
    leadData.village || '', leadData.taluk || '', leadData.district,
    leadData.farmSizeAcres, leadData.cropType, leadData.cropAge || '',
    leadData.numPlants || 0, leadData.irrigationType || '', leadData.leadSource,
    leadData.leadOwner || '', leadData.status, leadData.remarks || '', now,
    false, '', '', '',
  ];

  await appendRowToSheet('Leads', rowData);

  return {
    id, rowNumber, displayId, createdDate: now,
    ...leadData,
    lastUpdated: now,
    isDeleted: false, deletedBy: '', deletedDate: '', deleteReason: '',
  };
}

/**
 * Update an existing lead
 */
export async function updateLead(id: string, updates: Partial<Lead>): Promise<void> {
  const rowIndex = await findRowByUUID('Leads', id);

  if (!rowIndex) {
    throw new Error('Lead not found');
  }

  const rows = await fetchSheetData('Leads');
  const currentRow = rows[rowIndex - 2];
  const now = new Date().toISOString();

  const rowData = [
    currentRow[0], currentRow[1], currentRow[2], currentRow[3],
    updates.farmerName ?? currentRow[4],
    updates.phone ?? currentRow[5],
    updates.whatsapp ?? currentRow[6],
    updates.village ?? currentRow[7],
    updates.taluk ?? currentRow[8],
    updates.district ?? currentRow[9],
    updates.farmSizeAcres ?? currentRow[10],
    updates.cropType ?? currentRow[11],
    updates.cropAge ?? currentRow[12],
    updates.numPlants ?? currentRow[13],
    updates.irrigationType ?? currentRow[14],
    updates.leadSource ?? currentRow[15],
    updates.leadOwner ?? currentRow[16],
    updates.status ?? currentRow[17],
    updates.remarks ?? currentRow[18],
    now,
    currentRow[20], currentRow[21], currentRow[22], currentRow[23],
  ];

  await updateRow('Leads', rowIndex, rowData);
}

/**
 * Soft delete a lead
 */
export async function deleteLead(id: string, userEmail: string): Promise<void> {
  const rowIndex = await findRowByUUID('Leads', id);

  if (!rowIndex) {
    throw new Error('Lead not found');
  }

  const rows = await fetchSheetData('Leads');
  const currentRow = rows[rowIndex - 2];
  const now = new Date().toISOString();

  // Keep columns A-T (0-19), then set U=isDeleted, V=deletedBy, W=deletedDate, X=deleteReason
  const rowData = [
    ...currentRow.slice(0, 20),
    true, userEmail, now, 'User deleted',
  ];

  await updateRow('Leads', rowIndex, rowData);
}

// ============================================================================
// LOOKUPS API
// ============================================================================

import type { TalukWithDistrict } from '../types';

/**
 * Fetch lookup values from Lookups sheet
 *
 * Lookups sheet columns:
 * A=Category, B=Value, C=DisplayOrder, D=Active, E=ParentValue
 *
 * ParentValue is used for hierarchical lookups (e.g., Taluk's parent District)
 */
export async function fetchLookups(): Promise<{
  districts: string[];
  taluks: TalukWithDistrict[];
  cropTypes: string[];
  leadSources: string[];
  leadStatuses: string[];
  irrigationTypes: string[];
  visitStatuses: string[];
  visitOutcomes: string[];
  cropConditions: string[];
  quotationStatuses: string[];
  deliveryStatuses: string[];
  paymentTypes: string[];
  paymentMethods: string[];
}> {
  const rows = await fetchSheetData('Lookups');

  const lookups: Record<string, string[]> = {
    District: [], CropType: [], LeadSource: [], LeadStatus: [],
    IrrigationType: [], VisitStatus: [], VisitOutcome: [], CropCondition: [],
    QuotationStatus: [], DeliveryStatus: [], PaymentType: [], PaymentMethod: [],
  };

  // Taluks with their parent district for cascade filtering
  const taluks: TalukWithDistrict[] = [];

  for (const row of rows) {
    const category = row[0];
    const value = row[1];
    const active = row[3] === 'TRUE' || row[3] === 'true';
    const parentValue = row[4] || ''; // Column E for parent value

    if (!active) continue;

    // Handle Taluk category separately for parent-child relationship
    if (category === 'Taluk' && parentValue) {
      taluks.push({ taluk: value, district: parentValue });
    } else if (lookups[category] !== undefined) {
      lookups[category].push(value);
    }
  }

  return {
    districts: lookups.District,
    taluks,
    cropTypes: lookups.CropType,
    leadSources: lookups.LeadSource,
    leadStatuses: lookups.LeadStatus,
    irrigationTypes: lookups.IrrigationType,
    visitStatuses: lookups.VisitStatus,
    visitOutcomes: lookups.VisitOutcome,
    cropConditions: lookups.CropCondition,
    quotationStatuses: lookups.QuotationStatus,
    deliveryStatuses: lookups.DeliveryStatus,
    paymentTypes: lookups.PaymentType,
    paymentMethods: lookups.PaymentMethod,
  };
}

/**
 * Fetch users from Roles sheet
 * Returns list of users with email and role
 *
 * Roles sheet columns: A=email, B=role
 */
export async function fetchUsers(): Promise<Array<{ email: string; role: string }>> {
  const rows = await fetchSheetData('Roles');

  return rows
    .filter(row => row[0] && row[0].trim()) // Filter out empty rows
    .map(row => ({
      email: row[0] || '',
      role: row[1] || '',
    }));
}

// ============================================================================
// FIELD VISITS API
// ============================================================================

/**
 * Parse a row into FieldVisit object
 * Column mapping defined in FIELD_VISIT_COLUMNS (types/index.ts)
 */
function parseFieldVisitRow(row: string[]): FieldVisit {
  // Parse visitedBy - stored as comma-separated emails in sheet (column M, index 12)
  const visitedBy = row[12] && row[12].trim()
    ? row[12].split(',').map((email: string) => email.trim()).filter(Boolean)
    : [];

  return {
    id: row[0] || '',
    rowNumber: parseInt(row[1]) || 0,
    displayId: row[2] || '',
    leadId: row[3] || '',
    scheduledDate: row[4] || '',
    actualDate: row[5] || '',
    visitorId: row[6] || '',
    visitOutcome: row[7] || '',
    cropCondition: row[8] || '',
    diagnosisNotes: row[9] || '',
    followUpDate: row[10] || '',
    status: row[11] || '',
    visitedBy: visitedBy,
    quotationRequested: row[13] === 'TRUE' || row[13] === 'true',
    assignedTo: row[14] || '',
    attachmentFileId: row[15] || '',
    createdBy: row[16] || '',
    createdDate: row[17] || '',
    isDeleted: row[18] === 'TRUE' || row[18] === 'true',
    deletedBy: row[19] || '',
    deletedDate: row[20] || '',
    deleteReason: row[21] || '',
  };
}

/**
 * Fetch field visits using Google Sheets Query API
 */
export async function fetchFieldVisits(
  limit: number = 100,
  offset: number = 0,
  leadId?: string
): Promise<FieldVisit[]> {
  const { IS_DELETED, LEAD_ID, ROW_NUMBER } = FIELD_VISIT_COLUMNS;
  let query = `SELECT * WHERE (${IS_DELETED} = false OR ${IS_DELETED} IS NULL)`;

  if (leadId) {
    query += ` AND ${LEAD_ID} = '${leadId}'`;
  }

  query += ` ORDER BY ${ROW_NUMBER} DESC`;

  if (limit > 0) {
    query += ` LIMIT ${limit}`;
  }

  if (offset > 0) {
    query += ` OFFSET ${offset}`;
  }

  const rows = await querySheetData('FieldVisits', query);
  return rows.map(parseFieldVisitRow);
}

/**
 * Fetch visits for a specific lead
 */
export async function fetchVisitsByLeadId(leadId: string): Promise<FieldVisit[]> {
  return fetchFieldVisits(0, 0, leadId);
}

/**
 * Fetch a single field visit by ID
 */
export async function fetchFieldVisitById(visitId: string): Promise<FieldVisit | null> {
  const { ID, IS_DELETED } = FIELD_VISIT_COLUMNS;
  const query = `SELECT * WHERE ${ID} = '${visitId}' AND (${IS_DELETED} = false OR ${IS_DELETED} IS NULL) LIMIT 1`;
  const rows = await querySheetData('FieldVisits', query);
  return rows.length > 0 ? parseFieldVisitRow(rows[0]) : null;
}

/**
 * Create a new field visit
 */
export async function createFieldVisit(
  visitData: Omit<FieldVisit, 'id' | 'rowNumber' | 'displayId' | 'createdDate' | 'isDeleted' | 'deletedBy' | 'deletedDate' | 'deleteReason'>
): Promise<FieldVisit> {
  const id = generateUUID();
  const rowNumber = await getNextRowNumber('FieldVisit');
  const now = new Date().toISOString();
  const displayId = `VIS-${String(rowNumber).padStart(4, '0')}`;

  // Serialize visitedBy array to comma-separated string
  const visitedByStr = (visitData.visitedBy || []).join(',');

  const rowData = [
    id, rowNumber, displayId, visitData.leadId,
    visitData.scheduledDate, visitData.actualDate || '',
    visitData.visitorId, visitData.visitOutcome || '',
    visitData.cropCondition || '', visitData.diagnosisNotes || '',
    visitData.followUpDate || '', visitData.status,
    visitedByStr, visitData.quotationRequested || false,
    visitData.assignedTo || '', visitData.attachmentFileId || '',
    visitData.createdBy, now,
    false, '', '', '',
  ];

  await appendRowToSheet('FieldVisits', rowData);

  return {
    id, rowNumber, displayId,
    ...visitData,
    visitedBy: visitData.visitedBy || [],
    quotationRequested: visitData.quotationRequested || false,
    assignedTo: visitData.assignedTo || '',
    attachmentFileId: visitData.attachmentFileId || '',
    createdDate: now,
    isDeleted: false, deletedBy: '', deletedDate: '', deleteReason: '',
  };
}

/**
 * Update an existing field visit
 */
export async function updateFieldVisit(id: string, updates: Partial<FieldVisit>): Promise<void> {
  const rowIndex = await findRowByUUID('FieldVisits', id);

  if (!rowIndex) {
    throw new Error('Field visit not found');
  }

  const rows = await fetchSheetData('FieldVisits');
  const currentRow = rows[rowIndex - 2];

  // Handle visitedBy serialization to comma-separated string (column M, index 12)
  let visitedByStr = currentRow[12];
  if (updates.visitedBy !== undefined) {
    visitedByStr = updates.visitedBy.join(',');
  }

  const rowData = [
    currentRow[0], currentRow[1], currentRow[2], currentRow[3],
    updates.scheduledDate ?? currentRow[4],
    updates.actualDate ?? currentRow[5],
    updates.visitorId ?? currentRow[6],
    updates.visitOutcome ?? currentRow[7],
    updates.cropCondition ?? currentRow[8],
    updates.diagnosisNotes ?? currentRow[9],
    updates.followUpDate ?? currentRow[10],
    updates.status ?? currentRow[11],
    visitedByStr,
    updates.quotationRequested ?? currentRow[13],
    updates.assignedTo ?? currentRow[14],
    updates.attachmentFileId ?? currentRow[15],
    currentRow[16], currentRow[17], currentRow[18],
    currentRow[19], currentRow[20], currentRow[21],
  ];

  await updateRow('FieldVisits', rowIndex, rowData);
}

/**
 * Soft delete a field visit
 */
export async function deleteFieldVisit(id: string, userEmail: string): Promise<void> {
  const rowIndex = await findRowByUUID('FieldVisits', id);

  if (!rowIndex) {
    throw new Error('Field visit not found');
  }

  const rows = await fetchSheetData('FieldVisits');
  const currentRow = rows[rowIndex - 2];
  const now = new Date().toISOString();

  // Keep columns 0-17 (A-R: id through createdDate), set isDeleted fields (S-V)
  const rowData = [
    ...currentRow.slice(0, 18),
    true, userEmail, now, 'User deleted',
  ];

  await updateRow('FieldVisits', rowIndex, rowData);
}

/**
 * Fetch a single lead by ID
 */
export async function fetchLeadById(leadId: string): Promise<Lead | null> {
  const { ID, IS_DELETED } = LEAD_COLUMNS;
  const query = `SELECT * WHERE ${ID} = '${leadId}' AND (${IS_DELETED} = false OR ${IS_DELETED} IS NULL)`;
  const rows = await querySheetData('Leads', query);

  if (rows.length > 0) {
    return parseLeadRow(rows[0]);
  }

  return null;
}

/**
 * Fetch multiple leads by their IDs
 */
export async function fetchLeadsByIds(leadIds: string[]): Promise<Lead[]> {
  if (leadIds.length === 0) return [];

  const { ID, IS_DELETED } = LEAD_COLUMNS;
  const idConditions = leadIds.map(id => `${ID} = '${id}'`).join(' OR ');
  const query = `SELECT * WHERE (${idConditions}) AND (${IS_DELETED} = false OR ${IS_DELETED} IS NULL)`;
  const rows = await querySheetData('Leads', query);

  return rows.map(parseLeadRow);
}

/**
 * Search leads by farmer name, phone, or displayId
 * Used for searchable dropdown in visit creation
 * Excludes leads with "New" status (visits can only be created for non-New leads)
 */
export async function searchLeads(
  searchTerm: string,
  limit: number = 100
): Promise<Lead[]> {
  const { IS_DELETED, ROW_NUMBER, FARMER_NAME, PHONE, DISPLAY_ID, VILLAGE, DISTRICT, STATUS } = LEAD_COLUMNS;
  let query: string;

  // Exclude deleted leads AND leads with "New" status (visits can only be created for non-New leads)
  const baseFilter = `(${IS_DELETED} = false OR ${IS_DELETED} IS NULL) AND ${STATUS} != 'New'`;

  if (searchTerm.trim()) {
    const term = searchTerm.toLowerCase();
    query = `SELECT * WHERE ${baseFilter} AND (
      lower(${FARMER_NAME}) CONTAINS '${term}' OR
      lower(${PHONE}) CONTAINS '${term}' OR
      lower(${DISPLAY_ID}) CONTAINS '${term}' OR
      lower(${VILLAGE}) CONTAINS '${term}' OR
      lower(${DISTRICT}) CONTAINS '${term}'
    ) ORDER BY ${ROW_NUMBER} DESC`;
  } else {
    query = `SELECT * WHERE ${baseFilter} ORDER BY ${ROW_NUMBER} DESC`;
  }

  if (limit > 0) {
    query += ` LIMIT ${limit}`;
  }

  const rows = await querySheetData('Leads', query);
  return rows.map(parseLeadRow);
}

// ============================================================================
// QUOTATIONS API
// ============================================================================

/**
 * Parse a row into Quotation object
 * Column mapping defined in QUOTATION_COLUMNS (types/index.ts)
 */
function parseQuotationRow(row: string[]): Quotation {
  return {
    id: row[0] || '',
    rowNumber: parseInt(row[1]) || 0,
    displayId: row[2] || '',
    leadId: row[3] || '',
    visitId: row[4] || '',
    quoteDate: row[5] || '',
    quoteAmount: parseFloat(row[6]) || 0,
    preparedBy: row[7] || '',
    validUntil: row[8] || '',
    status: row[9] || '',
    notes: row[10] || '',
    attachmentFileId: row[11] || '',
    deliveryStatus: row[12] || '',
    deliveryDate: row[13] || '',
    lastUpdated: row[14] || '',
    isDeleted: row[15] === 'TRUE' || row[15] === 'true',
    deletedBy: row[16] || '',
    deletedDate: row[17] || '',
    deleteReason: row[18] || '',
  };
}

/**
 * Fetch quotations using Google Sheets Query API
 * @param limit - Number of records to fetch (0 for all)
 * @param offset - Number of records to skip
 * @param leadId - Optional filter by lead ID
 * @param preparedBy - Optional filter by user email who prepared the quotation
 */
export async function fetchQuotations(
  limit: number = 100,
  offset: number = 0,
  leadId?: string,
  preparedBy?: string
): Promise<Quotation[]> {
  const { IS_DELETED, LEAD_ID, ROW_NUMBER, PREPARED_BY } = QUOTATION_COLUMNS;
  let query = `SELECT * WHERE (${IS_DELETED} = false OR ${IS_DELETED} IS NULL)`;

  if (leadId) {
    query += ` AND ${LEAD_ID} = '${leadId}'`;
  }

  if (preparedBy) {
    query += ` AND ${PREPARED_BY} = '${preparedBy}'`;
  }

  query += ` ORDER BY ${ROW_NUMBER} DESC`;

  if (limit > 0) {
    query += ` LIMIT ${limit}`;
  }

  if (offset > 0) {
    query += ` OFFSET ${offset}`;
  }

  const rows = await querySheetData('Quotations', query);
  return rows.map(parseQuotationRow);
}

/**
 * Fetch quotations for a specific lead
 */
export async function fetchQuotationsByLeadId(leadId: string): Promise<Quotation[]> {
  return fetchQuotations(0, 0, leadId);
}

/**
 * Fetch a single quotation by ID
 */
export async function fetchQuotationById(quotationId: string): Promise<Quotation | null> {
  const { ID, IS_DELETED } = QUOTATION_COLUMNS;
  const query = `SELECT * WHERE ${ID} = '${quotationId}' AND (${IS_DELETED} = false OR ${IS_DELETED} IS NULL)`;
  const rows = await querySheetData('Quotations', query);

  if (rows.length > 0) {
    return parseQuotationRow(rows[0]);
  }

  return null;
}

/**
 * Fetch quotation linked to a specific visit
 */
export async function fetchQuotationByVisitId(visitId: string): Promise<Quotation | null> {
  const { VISIT_ID, IS_DELETED } = QUOTATION_COLUMNS;
  const query = `SELECT * WHERE ${VISIT_ID} = '${visitId}' AND (${IS_DELETED} = false OR ${IS_DELETED} IS NULL) LIMIT 1`;
  const rows = await querySheetData('Quotations', query);
  return rows.length > 0 ? parseQuotationRow(rows[0]) : null;
}

/**
 * Fetch delivered quotations (status = Accepted and deliveryStatus = Delivered or Partial)
 * Used for tracking unpaid deliveries
 */
export async function fetchDeliveredQuotations(): Promise<Quotation[]> {
  const { IS_DELETED, STATUS, DELIVERY_STATUS, ROW_NUMBER } = QUOTATION_COLUMNS;
  const query = `SELECT * WHERE (${IS_DELETED} = false OR ${IS_DELETED} IS NULL) AND ${STATUS} = 'Accepted' AND (${DELIVERY_STATUS} = 'Delivered' OR ${DELIVERY_STATUS} = 'Partial') ORDER BY ${ROW_NUMBER} DESC`;
  const rows = await querySheetData('Quotations', query);
  return rows.map(parseQuotationRow);
}

/**
 * Get payment totals by quote IDs
 * Returns a Map of quoteId -> total paid amount
 * Used for calculating balance due on deliveries
 */
export async function getPaymentTotalsByQuoteIds(quoteIds: string[]): Promise<Map<string, number>> {
  if (quoteIds.length === 0) return new Map();

  const { IS_DELETED, QUOTE_ID } = PAYMENT_COLUMNS;
  const idConditions = quoteIds.map(id => `${QUOTE_ID} = '${id}'`).join(' OR ');
  const query = `SELECT * WHERE (${idConditions}) AND (${IS_DELETED} = false OR ${IS_DELETED} IS NULL)`;
  const rows = await querySheetData('Payments', query);
  const payments = rows.map(parsePaymentRow);

  // Sum payments by quoteId
  const totals = new Map<string, number>();
  for (const payment of payments) {
    const current = totals.get(payment.quoteId) || 0;
    totals.set(payment.quoteId, current + payment.paymentAmount);
  }

  return totals;
}

/**
 * Create a new quotation
 */
export async function createQuotation(
  quotationData: Omit<Quotation, 'id' | 'rowNumber' | 'displayId' | 'lastUpdated' | 'isDeleted' | 'deletedBy' | 'deletedDate' | 'deleteReason'>
): Promise<Quotation> {
  const id = generateUUID();
  const rowNumber = await getNextRowNumber('Quotation');
  const now = new Date().toISOString();
  const displayId = `QUO-${String(rowNumber).padStart(4, '0')}`;

  const rowData = [
    id, rowNumber, displayId, quotationData.leadId,
    quotationData.visitId || '', quotationData.quoteDate,
    quotationData.quoteAmount, quotationData.preparedBy,
    quotationData.validUntil || '', quotationData.status,
    quotationData.notes || '', quotationData.attachmentFileId || '',
    quotationData.deliveryStatus || '', quotationData.deliveryDate || '',
    now, false, '', '', '',
  ];

  await appendRowToSheet('Quotations', rowData);

  return {
    id, rowNumber, displayId,
    ...quotationData,
    lastUpdated: now,
    isDeleted: false, deletedBy: '', deletedDate: '', deleteReason: '',
  };
}

/**
 * Update an existing quotation
 */
export async function updateQuotation(id: string, updates: Partial<Quotation>): Promise<void> {
  const rowIndex = await findRowByUUID('Quotations', id);

  if (!rowIndex) {
    throw new Error('Quotation not found');
  }

  const rows = await fetchSheetData('Quotations');
  const currentRow = rows[rowIndex - 2];
  const now = new Date().toISOString();

  const rowData = [
    currentRow[0], currentRow[1], currentRow[2], currentRow[3],
    updates.visitId ?? currentRow[4],
    updates.quoteDate ?? currentRow[5],
    updates.quoteAmount ?? currentRow[6],
    updates.preparedBy ?? currentRow[7],
    updates.validUntil ?? currentRow[8],
    updates.status ?? currentRow[9],
    updates.notes ?? currentRow[10],
    updates.attachmentFileId ?? currentRow[11],
    updates.deliveryStatus ?? currentRow[12],
    updates.deliveryDate ?? currentRow[13],
    now,
    currentRow[15], currentRow[16], currentRow[17], currentRow[18],
  ];

  await updateRow('Quotations', rowIndex, rowData);
}

/**
 * Soft delete a quotation
 */
export async function deleteQuotation(id: string, userEmail: string): Promise<void> {
  const rowIndex = await findRowByUUID('Quotations', id);

  if (!rowIndex) {
    throw new Error('Quotation not found');
  }

  const rows = await fetchSheetData('Quotations');
  const currentRow = rows[rowIndex - 2];
  const now = new Date().toISOString();

  const rowData = [
    ...currentRow.slice(0, 15),
    true, userEmail, now, 'User deleted',
  ];

  await updateRow('Quotations', rowIndex, rowData);
}

// ============================================================================
// PAYMENTS API
// ============================================================================

/**
 * Parse a row into Payment object
 * Column mapping defined in PAYMENT_COLUMNS (types/index.ts)
 */
function parsePaymentRow(row: string[]): Payment {
  return {
    id: row[0] || '',
    rowNumber: parseInt(row[1]) || 0,
    displayId: row[2] || '',
    quoteId: row[3] || '',
    paymentDate: row[4] || '',
    paymentAmount: parseFloat(row[5]) || 0,
    paymentType: row[6] || '',
    paymentMethod: row[7] || '',
    transactionRef: row[8] || '',
    receivedBy: row[9] || '',
    notes: row[10] || '',
    isDeleted: row[11] === 'TRUE' || row[11] === 'true',
    deletedBy: row[12] || '',
    deletedDate: row[13] || '',
    deleteReason: row[14] || '',
  };
}

/**
 * Fetch payments using Google Sheets Query API
 */
export async function fetchPayments(
  limit: number = 100,
  offset: number = 0,
  quoteId?: string
): Promise<Payment[]> {
  const { IS_DELETED, QUOTE_ID, ROW_NUMBER } = PAYMENT_COLUMNS;
  let query = `SELECT * WHERE (${IS_DELETED} = false OR ${IS_DELETED} IS NULL)`;

  if (quoteId) {
    query += ` AND ${QUOTE_ID} = '${quoteId}'`;
  }

  query += ` ORDER BY ${ROW_NUMBER} DESC`;

  if (limit > 0) {
    query += ` LIMIT ${limit}`;
  }

  if (offset > 0) {
    query += ` OFFSET ${offset}`;
  }

  const rows = await querySheetData('Payments', query);
  return rows.map(parsePaymentRow);
}

/**
 * Fetch payments for a specific quotation
 */
export async function fetchPaymentsByQuoteId(quoteId: string): Promise<Payment[]> {
  return fetchPayments(0, 0, quoteId);
}

/**
 * Fetch a single payment by ID
 */
export async function fetchPaymentById(paymentId: string): Promise<Payment | null> {
  const { ID, IS_DELETED } = PAYMENT_COLUMNS;
  const query = `SELECT * WHERE ${ID} = '${paymentId}' AND (${IS_DELETED} = false OR ${IS_DELETED} IS NULL) LIMIT 1`;
  const rows = await querySheetData('Payments', query);
  return rows.length > 0 ? parsePaymentRow(rows[0]) : null;
}

/**
 * Create a new payment
 */
export async function createPayment(
  paymentData: Omit<Payment, 'id' | 'rowNumber' | 'displayId' | 'isDeleted' | 'deletedBy' | 'deletedDate' | 'deleteReason'>
): Promise<Payment> {
  const id = generateUUID();
  const rowNumber = await getNextRowNumber('Payment');
  const displayId = `PAY-${String(rowNumber).padStart(4, '0')}`;

  const rowData = [
    id, rowNumber, displayId, paymentData.quoteId,
    paymentData.paymentDate, paymentData.paymentAmount,
    paymentData.paymentType, paymentData.paymentMethod,
    paymentData.transactionRef || '', paymentData.receivedBy,
    paymentData.notes || '',
    false, '', '', '',
  ];

  await appendRowToSheet('Payments', rowData);

  return {
    id, rowNumber, displayId,
    ...paymentData,
    isDeleted: false, deletedBy: '', deletedDate: '', deleteReason: '',
  };
}

/**
 * Update an existing payment
 */
export async function updatePayment(id: string, updates: Partial<Payment>): Promise<void> {
  const rowIndex = await findRowByUUID('Payments', id);

  if (!rowIndex) {
    throw new Error('Payment not found');
  }

  const rows = await fetchSheetData('Payments');
  const currentRow = rows[rowIndex - 2];

  const rowData = [
    currentRow[0], currentRow[1], currentRow[2], currentRow[3],
    updates.paymentDate ?? currentRow[4],
    updates.paymentAmount ?? currentRow[5],
    updates.paymentType ?? currentRow[6],
    updates.paymentMethod ?? currentRow[7],
    updates.transactionRef ?? currentRow[8],
    updates.receivedBy ?? currentRow[9],
    updates.notes ?? currentRow[10],
    currentRow[11], currentRow[12], currentRow[13], currentRow[14],
  ];

  await updateRow('Payments', rowIndex, rowData);
}

/**
 * Soft delete a payment
 */
export async function deletePayment(id: string, userEmail: string): Promise<void> {
  const rowIndex = await findRowByUUID('Payments', id);

  if (!rowIndex) {
    throw new Error('Payment not found');
  }

  const rows = await fetchSheetData('Payments');
  const currentRow = rows[rowIndex - 2];
  const now = new Date().toISOString();

  const rowData = [
    ...currentRow.slice(0, 11),
    true, userEmail, now, 'User deleted',
  ];

  await updateRow('Payments', rowIndex, rowData);
}

/**
 * Search accepted quotations (for payment linking)
 * Only quotations with status "Accepted" can receive payments
 */
export async function searchAcceptedQuotations(
  searchTerm: string,
  limit: number = 100
): Promise<Quotation[]> {
  const { IS_DELETED, STATUS, DISPLAY_ID, ROW_NUMBER } = QUOTATION_COLUMNS;
  let query: string;

  if (searchTerm.trim()) {
    const term = searchTerm.toLowerCase();
    query = `SELECT * WHERE (${IS_DELETED} = false OR ${IS_DELETED} IS NULL) AND ${STATUS} = 'Accepted' AND (
      lower(${DISPLAY_ID}) CONTAINS '${term}'
    ) ORDER BY ${ROW_NUMBER} DESC`;
  } else {
    query = `SELECT * WHERE (${IS_DELETED} = false OR ${IS_DELETED} IS NULL) AND ${STATUS} = 'Accepted' ORDER BY ${ROW_NUMBER} DESC`;
  }

  if (limit > 0) {
    query += ` LIMIT ${limit}`;
  }

  const rows = await querySheetData('Quotations', query);
  return rows.map(parseQuotationRow);
}

/**
 * Fetch multiple quotations by their IDs
 */
export async function fetchQuotationsByIds(quoteIds: string[]): Promise<Quotation[]> {
  if (quoteIds.length === 0) return [];

  const { ID, IS_DELETED } = QUOTATION_COLUMNS;
  const idConditions = quoteIds.map(id => `${ID} = '${id}'`).join(' OR ');
  const query = `SELECT * WHERE (${idConditions}) AND (${IS_DELETED} = false OR ${IS_DELETED} IS NULL)`;
  const rows = await querySheetData('Quotations', query);

  return rows.map(parseQuotationRow);
}

// ============================================================================
// DASHBOARD STATS API
// ============================================================================

export interface DashboardStats {
  // Revenue
  totalRevenue: number;
  thisMonthRevenue: number;
  pendingAmount: number; // Accepted quotes - payments received
  collectionRate: number; // % of accepted quote value collected

  // Pipeline
  totalLeads: number;
  newLeads: number; // Status = 'New'
  quotationsSent: number; // Status = 'Sent'
  quotationsAccepted: number;
  conversionRate: number; // Accepted / Total Quotations %

  // Alerts
  expiringQuotes: Quotation[]; // Quotes expiring in 7 days
  upcomingVisits: FieldVisit[]; // Scheduled visits in next 3 days

  // Recent activity
  recentLeads: Lead[];
  recentPayments: Payment[];
}

/**
 * Fetch all dashboard statistics
 * Makes parallel calls for efficiency
 */
export async function fetchDashboardStats(): Promise<DashboardStats> {
  // Fetch all data in parallel
  const [leads, quotations, payments, visits] = await Promise.all([
    fetchAllLeadsForStats(),
    fetchAllQuotationsForStats(),
    fetchAllPaymentsForStats(),
    fetchUpcomingVisits(),
  ]);

  // Calculate date boundaries
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Revenue calculations
  const totalRevenue = payments.reduce((sum, p) => sum + p.paymentAmount, 0);

  const thisMonthPayments = payments.filter(p => {
    const paymentDate = new Date(p.paymentDate);
    return paymentDate >= startOfMonth;
  });
  const thisMonthRevenue = thisMonthPayments.reduce((sum, p) => sum + p.paymentAmount, 0);

  // Accepted quotations total value
  const acceptedQuotes = quotations.filter(q => q.status === 'Accepted');
  const totalAcceptedValue = acceptedQuotes.reduce((sum, q) => sum + q.quoteAmount, 0);

  // Pending amount = Accepted quote value - Total payments
  const pendingAmount = Math.max(0, totalAcceptedValue - totalRevenue);

  // Collection rate
  const collectionRate = totalAcceptedValue > 0
    ? Math.round((totalRevenue / totalAcceptedValue) * 100)
    : 0;

  // Pipeline stats
  const newLeads = leads.filter(l => l.status === 'New').length;
  const quotationsSent = quotations.filter(q => q.status === 'Sent').length;
  const quotationsAccepted = acceptedQuotes.length;
  const totalQuotations = quotations.length;
  const conversionRate = totalQuotations > 0
    ? Math.round((quotationsAccepted / totalQuotations) * 100)
    : 0;

  // Expiring quotes (valid until within 7 days, status = Sent)
  const expiringQuotes = quotations.filter(q => {
    if (q.status !== 'Sent') return false;
    const validUntil = new Date(q.validUntil);
    return validUntil >= now && validUntil <= sevenDaysFromNow;
  }).slice(0, 5);

  // Recent leads (last 5)
  const recentLeads = leads
    .sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime())
    .slice(0, 5);

  // Recent payments (last 5)
  const recentPayments = payments
    .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
    .slice(0, 5);

  return {
    totalRevenue,
    thisMonthRevenue,
    pendingAmount,
    collectionRate,
    totalLeads: leads.length,
    newLeads,
    quotationsSent,
    quotationsAccepted,
    conversionRate,
    expiringQuotes,
    upcomingVisits: visits,
    recentLeads,
    recentPayments,
  };
}

/**
 * Fetch all leads for stats (no pagination)
 */
async function fetchAllLeadsForStats(): Promise<Lead[]> {
  const { IS_DELETED, ROW_NUMBER } = LEAD_COLUMNS;
  const query = `SELECT * WHERE ${IS_DELETED} = false OR ${IS_DELETED} IS NULL ORDER BY ${ROW_NUMBER} DESC`;
  const rows = await querySheetData('Leads', query);
  return rows.map(parseLeadRow);
}

/**
 * Fetch all quotations for stats (no pagination)
 */
async function fetchAllQuotationsForStats(): Promise<Quotation[]> {
  const { IS_DELETED, ROW_NUMBER } = QUOTATION_COLUMNS;
  const query = `SELECT * WHERE ${IS_DELETED} = false OR ${IS_DELETED} IS NULL ORDER BY ${ROW_NUMBER} DESC`;
  const rows = await querySheetData('Quotations', query);
  return rows.map(parseQuotationRow);
}

/**
 * Fetch all payments for stats (no pagination)
 */
async function fetchAllPaymentsForStats(): Promise<Payment[]> {
  const { IS_DELETED, ROW_NUMBER } = PAYMENT_COLUMNS;
  const query = `SELECT * WHERE ${IS_DELETED} = false OR ${IS_DELETED} IS NULL ORDER BY ${ROW_NUMBER} DESC`;
  const rows = await querySheetData('Payments', query);
  return rows.map(parsePaymentRow);
}

/**
 * Fetch upcoming scheduled visits (next 3 days)
 */
async function fetchUpcomingVisits(): Promise<FieldVisit[]> {
  const { IS_DELETED, STATUS, SCHEDULED_DATE } = FIELD_VISIT_COLUMNS;
  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const query = `SELECT * WHERE (${IS_DELETED} = false OR ${IS_DELETED} IS NULL) AND ${STATUS} = 'Scheduled' ORDER BY ${SCHEDULED_DATE} ASC LIMIT 10`;
  const rows = await querySheetData('FieldVisits', query);
  const visits = rows.map(parseFieldVisitRow);

  // Filter to next 3 days
  return visits.filter(v => {
    const scheduledDate = new Date(v.scheduledDate);
    return scheduledDate >= now && scheduledDate <= threeDaysFromNow;
  }).slice(0, 5);
}
