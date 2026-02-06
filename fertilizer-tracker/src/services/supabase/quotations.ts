import { supabase, SupabaseError } from './client';
import type { Quotation } from '../../types';
import { v7 as uuidv7 } from 'uuid';

/**
 * Map database row (snake_case) to Quotation type (camelCase)
 */
function mapQuotationFromDB(row: any): Quotation {
  return {
    id: row.id,
    rowNumber: row.row_number,
    displayId: row.display_id,
    leadId: row.lead_id,
    visitId: row.visit_id || '',
    quoteDate: row.quote_date,
    quoteAmount: parseFloat(row.quote_amount),
    preparedBy: row.prepared_by,
    validUntil: row.valid_until || '',
    status: row.status,
    notes: row.notes || '',
    usageInstructions: row.usage_instructions || '',
    attachmentFileId: row.attachment_file_id || '',
    deliveryStatus: row.delivery_status || '',
    deliveryDate: row.delivery_date || '',
    lastUpdated: row.last_updated,
    isDeleted: row.is_deleted,
    deletedBy: row.deleted_by || '',
    deletedDate: row.deleted_date || '',
    deleteReason: row.delete_reason || '',
  };
}

/**
 * Map Quotation type (camelCase) to database row (snake_case)
 */
function mapQuotationToDB(quote: Partial<Quotation>): any {
  const mapped: any = {};

  if (quote.id) mapped.id = quote.id;
  if (quote.leadId) mapped.lead_id = quote.leadId;
  if (quote.visitId !== undefined) mapped.visit_id = quote.visitId || null;
  if (quote.quoteDate) mapped.quote_date = quote.quoteDate;
  if (quote.quoteAmount !== undefined) mapped.quote_amount = quote.quoteAmount;
  if (quote.preparedBy) mapped.prepared_by = quote.preparedBy;
  if (quote.validUntil !== undefined) mapped.valid_until = quote.validUntil || null;
  if (quote.status) mapped.status = quote.status;
  if (quote.notes !== undefined) mapped.notes = quote.notes || null;
  if (quote.usageInstructions !== undefined) mapped.usage_instructions = quote.usageInstructions || null;
  if (quote.attachmentFileId !== undefined) mapped.attachment_file_id = quote.attachmentFileId || null;
  if (quote.deliveryStatus !== undefined) mapped.delivery_status = quote.deliveryStatus || null;
  if (quote.deliveryDate !== undefined) mapped.delivery_date = quote.deliveryDate || null;

  return mapped;
}

/**
 * Count quotations (server-side, no row data transferred)
 */
export async function countQuotations(preparedBy?: string): Promise<number> {
  let query = supabase
    .from('quotations')
    .select('*', { count: 'exact', head: true })
    .eq('is_deleted', false);

  if (preparedBy) {
    query = query.eq('prepared_by', preparedBy);
  }

  const { count, error } = await query;

  if (error) throw new SupabaseError(error.message, error.code);

  return count || 0;
}

/**
 * Fetch paginated quotations (matches sheetsService API)
 */
export async function fetchQuotations(
  limit: number = 50,
  offset: number = 0,
  leadId?: string,
  preparedBy?: string
): Promise<Quotation[]> {
  let query = supabase
    .from('quotations')
    .select('*')
    .eq('is_deleted', false)
    .order('row_number', { ascending: false });

  if (leadId) {
    query = query.eq('lead_id', leadId);
  }

  if (preparedBy) {
    query = query.eq('prepared_by', preparedBy);
  }

  if (limit > 0) {
    query = query.range(offset, offset + limit - 1);
  }

  const { data, error } = await query;

  if (error) throw new SupabaseError(error.message, error.code);

  return data.map(mapQuotationFromDB);
}

/**
 * Fetch quotations for a specific lead (matches sheetsService API)
 */
export async function fetchQuotationsByLeadId(leadId: string): Promise<Quotation[]> {
  const { data, error } = await supabase
    .from('quotations')
    .select('*')
    .eq('lead_id', leadId)
    .eq('is_deleted', false)
    .order('quote_date', { ascending: false });

  if (error) throw new SupabaseError(error.message, error.code);

  return data.map(mapQuotationFromDB);
}

/**
 * Fetch single quotation by ID (matches sheetsService API)
 */
export async function fetchQuotationById(quotationId: string): Promise<Quotation | null> {
  const { data, error } = await supabase
    .from('quotations')
    .select('*')
    .eq('id', quotationId)
    .eq('is_deleted', false)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new SupabaseError(error.message, error.code);
  }

  return mapQuotationFromDB(data);
}

/**
 * Fetch quotation for a specific visit (matches sheetsService API)
 */
export async function fetchQuotationByVisitId(visitId: string): Promise<Quotation | null> {
  const { data, error } = await supabase
    .from('quotations')
    .select('*')
    .eq('visit_id', visitId)
    .eq('is_deleted', false)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new SupabaseError(error.message, error.code);
  }

  return mapQuotationFromDB(data);
}

/**
 * Fetch quotations with Delivered status (matches sheetsService API)
 */
export async function fetchDeliveredQuotations(): Promise<Quotation[]> {
  const { data, error } = await supabase
    .from('quotations')
    .select('*')
    .eq('is_deleted', false)
    .eq('delivery_status', 'Delivered')
    .order('delivery_date', { ascending: false });

  if (error) throw new SupabaseError(error.message, error.code);

  return data.map(mapQuotationFromDB);
}

/**
 * Create a new quotation (matches sheetsService API)
 */
export async function createQuotation(
  quoteData: Omit<Quotation, 'id' | 'rowNumber' | 'displayId' | 'lastUpdated' | 'isDeleted' | 'deletedBy' | 'deletedDate' | 'deleteReason'>
): Promise<Quotation> {
  const newQuote = {
    id: uuidv7(),
    ...mapQuotationToDB(quoteData),
  };

  const { data, error } = await supabase
    .from('quotations')
    .insert([newQuote])
    .select()
    .single();

  if (error) throw new SupabaseError(error.message, error.code);

  return mapQuotationFromDB(data);
}

/**
 * Update an existing quotation (matches sheetsService API)
 */
export async function updateQuotation(id: string, updates: Partial<Quotation>): Promise<void> {
  const { error } = await supabase
    .from('quotations')
    .update(mapQuotationToDB(updates))
    .eq('id', id);

  if (error) throw new SupabaseError(error.message, error.code);
}

/**
 * Soft delete a quotation (matches sheetsService API)
 */
export async function deleteQuotation(id: string, userEmail: string): Promise<void> {
  const { error } = await supabase
    .from('quotations')
    .update({
      is_deleted: true,
      deleted_by: userEmail,
      deleted_date: new Date().toISOString(),
      delete_reason: 'User deleted',
    })
    .eq('id', id);

  if (error) throw new SupabaseError(error.message, error.code);
}

/**
 * Search accepted quotations (matches sheetsService API)
 */
export async function searchAcceptedQuotations(
  searchTerm: string,
  limit: number = 100
): Promise<Quotation[]> {
  if (!searchTerm.trim()) {
    return fetchQuotations(limit, 0);
  }

  const term = searchTerm.toLowerCase();

  const { data, error } = await supabase
    .from('quotations')
    .select('*')
    .eq('is_deleted', false)
    .eq('status', 'Accepted')
    .or(`display_id.ilike.%${term}%`)
    .order('quote_date', { ascending: false })
    .limit(limit);

  if (error) throw new SupabaseError(error.message, error.code);

  return data.map(mapQuotationFromDB);
}

/**
 * Fetch multiple quotations by IDs (matches sheetsService API)
 */
export async function fetchQuotationsByIds(quoteIds: string[]): Promise<Quotation[]> {
  if (quoteIds.length === 0) return [];

  const { data, error } = await supabase
    .from('quotations')
    .select('*')
    .in('id', quoteIds)
    .eq('is_deleted', false);

  if (error) throw new SupabaseError(error.message, error.code);

  return data.map(mapQuotationFromDB);
}
