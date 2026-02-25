import { supabase, SupabaseError } from './client';
import type { Product } from '../../types';
import { v7 as uuidv7 } from 'uuid';

/**
 * Map database row (snake_case) to Product type (camelCase)
 */
function mapProductFromDB(row: any): Product {
  return {
    id: row.id,
    sku: row.sku || '',
    name: row.name,
    nameKannada: row.name_kannada || '',
    description: row.description || '',
    dosage: row.dosage || '',
    unitPrice: parseFloat(row.unit_price),
    unit: row.unit,
    category: row.category || '',
    isActive: row.is_active,
    displayOrder: row.display_order || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Map Product type (camelCase) to database row (snake_case)
 */
function mapProductToDB(product: Partial<Product>): any {
  const mapped: any = {};

  if (product.sku !== undefined) mapped.sku = product.sku || null;
  if (product.name) mapped.name = product.name;
  if (product.nameKannada !== undefined) mapped.name_kannada = product.nameKannada || null;
  if (product.description !== undefined) mapped.description = product.description || null;
  if (product.dosage !== undefined) mapped.dosage = product.dosage || null;
  if (product.unitPrice !== undefined) mapped.unit_price = product.unitPrice;
  if (product.unit) mapped.unit = product.unit;
  if (product.category !== undefined) mapped.category = product.category || null;
  if (product.isActive !== undefined) mapped.is_active = product.isActive;
  if (product.displayOrder !== undefined) mapped.display_order = product.displayOrder;

  return mapped;
}

/**
 * Fetch products, optionally only active ones
 */
export async function fetchProducts(activeOnly: boolean = false): Promise<Product[]> {
  let query = supabase
    .from('products')
    .select('*')
    .order('display_order', { ascending: true })
    .order('name', { ascending: true });

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) throw new SupabaseError(error.message, error.code);

  return data.map(mapProductFromDB);
}

/**
 * Fetch single product by ID
 */
export async function fetchProductById(id: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new SupabaseError(error.message, error.code);
  }

  return mapProductFromDB(data);
}

/**
 * Create a new product
 */
export async function createProduct(
  productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Product> {
  const newProduct = {
    id: uuidv7(),
    ...mapProductToDB(productData),
  };

  const { data, error } = await supabase
    .from('products')
    .insert([newProduct])
    .select()
    .single();

  if (error) throw new SupabaseError(error.message, error.code);

  return mapProductFromDB(data);
}

/**
 * Update an existing product
 */
export async function updateProduct(id: string, updates: Partial<Product>): Promise<void> {
  const { error } = await supabase
    .from('products')
    .update(mapProductToDB(updates))
    .eq('id', id);

  if (error) throw new SupabaseError(error.message, error.code);
}

/**
 * Deactivate a product (soft delete - sets is_active to false)
 * Hard delete is not possible due to FK ON DELETE RESTRICT from quotation_line_items
 */
export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase
    .from('products')
    .update({ is_active: false })
    .eq('id', id);

  if (error) throw new SupabaseError(error.message, error.code);
}
