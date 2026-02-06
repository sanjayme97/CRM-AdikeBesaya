import { supabase, SupabaseError } from './client';
import type { QuotationLineItem } from '../../types';
import { v7 as uuidv7 } from 'uuid';

/**
 * Map database row (snake_case) to QuotationLineItem type (camelCase)
 */
function mapLineItemFromDB(row: any): QuotationLineItem {
  return {
    id: row.id,
    quotationId: row.quotation_id,
    productId: row.product_id,
    productName: row.product_name,
    unitPrice: parseFloat(row.unit_price),
    quantity: parseFloat(row.quantity),
    subtotal: parseFloat(row.subtotal),
    notes: row.notes || '',
    displayOrder: row.display_order || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Fetch all line items for a quotation
 */
export async function fetchLineItemsByQuotationId(quotationId: string): Promise<QuotationLineItem[]> {
  const { data, error } = await supabase
    .from('quotation_line_items')
    .select('*')
    .eq('quotation_id', quotationId)
    .order('display_order', { ascending: true });

  if (error) throw new SupabaseError(error.message, error.code);

  return data.map(mapLineItemFromDB);
}

/**
 * Save all line items for a quotation (batch: delete existing + insert new)
 * The DB trigger update_quotation_amount() auto-updates quotations.quote_amount
 */
export async function saveLineItemsForQuotation(
  quotationId: string,
  items: Array<{
    productId: string;
    productName: string;
    unitPrice: number;
    quantity: number;
    notes?: string;
    displayOrder: number;
  }>
): Promise<QuotationLineItem[]> {
  // 1. Delete all existing line items for this quotation
  const { error: deleteError } = await supabase
    .from('quotation_line_items')
    .delete()
    .eq('quotation_id', quotationId);

  if (deleteError) throw new SupabaseError(deleteError.message, deleteError.code);

  // 2. If no items to insert, return empty (trigger already updated amount to 0)
  if (items.length === 0) return [];

  // 3. Insert all new items
  const newItems = items.map((item) => ({
    id: uuidv7(),
    quotation_id: quotationId,
    product_id: item.productId,
    product_name: item.productName,
    unit_price: item.unitPrice,
    quantity: item.quantity,
    notes: item.notes || null,
    display_order: item.displayOrder,
  }));

  const { data, error: insertError } = await supabase
    .from('quotation_line_items')
    .insert(newItems)
    .select();

  if (insertError) throw new SupabaseError(insertError.message, insertError.code);

  return data.map(mapLineItemFromDB);
}

/**
 * Delete a single line item
 */
export async function deleteLineItem(id: string): Promise<void> {
  const { error } = await supabase
    .from('quotation_line_items')
    .delete()
    .eq('id', id);

  if (error) throw new SupabaseError(error.message, error.code);
}
