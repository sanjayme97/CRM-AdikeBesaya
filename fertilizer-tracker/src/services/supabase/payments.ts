import { supabase, SupabaseError } from './client';
import type { Payment } from '../../types';
import { v7 as uuidv7 } from 'uuid';

/**
 * Map database row (snake_case) to Payment type (camelCase)
 */
function mapPaymentFromDB(row: any): Payment {
  return {
    id: row.id,
    rowNumber: row.row_number,
    displayId: row.display_id,
    quoteId: row.quote_id,
    paymentDate: row.payment_date,
    paymentAmount: parseFloat(row.payment_amount),
    paymentType: row.payment_type,
    paymentMethod: row.payment_method,
    transactionRef: row.transaction_ref || '',
    receivedBy: row.received_by,
    notes: row.notes || '',
    isDeleted: row.is_deleted,
    deletedBy: row.deleted_by || '',
    deletedDate: row.deleted_date || '',
    deleteReason: row.delete_reason || '',
  };
}

/**
 * Map Payment type (camelCase) to database row (snake_case)
 */
function mapPaymentToDB(payment: Partial<Payment>): any {
  const mapped: any = {};

  if (payment.id) mapped.id = payment.id;
  if (payment.quoteId) mapped.quote_id = payment.quoteId;
  if (payment.paymentDate) mapped.payment_date = payment.paymentDate;
  if (payment.paymentAmount !== undefined) mapped.payment_amount = payment.paymentAmount;
  if (payment.paymentType) mapped.payment_type = payment.paymentType;
  if (payment.paymentMethod) mapped.payment_method = payment.paymentMethod;
  if (payment.transactionRef !== undefined) mapped.transaction_ref = payment.transactionRef || null;
  if (payment.receivedBy) mapped.received_by = payment.receivedBy;
  if (payment.notes !== undefined) mapped.notes = payment.notes || null;

  return mapped;
}

/**
 * Fetch paginated payments (matches sheetsService API)
 */
export async function fetchPayments(
  limit: number = 50,
  offset: number = 0,
  quoteId?: string
): Promise<Payment[]> {
  let query = supabase
    .from('payments')
    .select('*')
    .eq('is_deleted', false)
    .order('row_number', { ascending: false });

  if (quoteId) {
    query = query.eq('quote_id', quoteId);
  }

  const { data, error } = await query.range(offset, offset + limit - 1);

  if (error) throw new SupabaseError(error.message, error.code);

  return data.map(mapPaymentFromDB);
}

/**
 * Fetch payments for a specific quotation (matches sheetsService API)
 */
export async function fetchPaymentsByQuoteId(quoteId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('quote_id', quoteId)
    .eq('is_deleted', false)
    .order('payment_date', { ascending: false });

  if (error) throw new SupabaseError(error.message, error.code);

  return data.map(mapPaymentFromDB);
}

/**
 * Fetch single payment by ID (matches sheetsService API)
 */
export async function fetchPaymentById(paymentId: string): Promise<Payment | null> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .eq('is_deleted', false)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new SupabaseError(error.message, error.code);
  }

  return mapPaymentFromDB(data);
}

/**
 * Create a new payment (matches sheetsService API)
 */
export async function createPayment(
  paymentData: Omit<Payment, 'id' | 'rowNumber' | 'displayId' | 'isDeleted' | 'deletedBy' | 'deletedDate' | 'deleteReason'>
): Promise<Payment> {
  const newPayment = {
    id: uuidv7(),
    ...mapPaymentToDB(paymentData),
  };

  const { data, error } = await supabase
    .from('payments')
    .insert([newPayment])
    .select()
    .single();

  if (error) throw new SupabaseError(error.message, error.code);

  return mapPaymentFromDB(data);
}

/**
 * Update an existing payment (matches sheetsService API)
 */
export async function updatePayment(id: string, updates: Partial<Payment>): Promise<void> {
  const { error } = await supabase
    .from('payments')
    .update(mapPaymentToDB(updates))
    .eq('id', id);

  if (error) throw new SupabaseError(error.message, error.code);
}

/**
 * Soft delete a payment (matches sheetsService API)
 */
export async function deletePayment(id: string, userEmail: string): Promise<void> {
  const { error } = await supabase
    .from('payments')
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
 * Get payment totals for multiple quotations (matches sheetsService API)
 * Returns Map<quoteId, totalAmount>
 */
export async function getPaymentTotalsByQuoteIds(quoteIds: string[]): Promise<Map<string, number>> {
  if (quoteIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from('payments')
    .select('quote_id, payment_amount')
    .in('quote_id', quoteIds)
    .eq('is_deleted', false);

  if (error) throw new SupabaseError(error.message, error.code);

  const totals = new Map<string, number>();

  for (const payment of data) {
    const quoteId = payment.quote_id;
    const amount = parseFloat(payment.payment_amount);
    totals.set(quoteId, (totals.get(quoteId) || 0) + amount);
  }

  return totals;
}
