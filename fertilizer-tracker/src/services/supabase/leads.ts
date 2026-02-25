import { supabase, SupabaseError } from './client';
import type { Lead } from '../../types';
import { v7 as uuidv7 } from 'uuid';

/**
 * Map database row (snake_case) to Lead type (camelCase)
 */
function mapLeadFromDB(row: any): Lead {
  return {
    id: row.id,
    rowNumber: row.row_number,
    displayId: row.display_id,
    createdDate: row.created_date,
    createdBy: row.created_by,
    farmerName: row.farmer_name,
    phone: row.phone,
    whatsapp: row.whatsapp || '',
    village: row.village || '',
    taluk: row.taluk || '',
    district: row.district,
    farmSizeAcres: parseFloat(row.farm_size_acres),
    cropType: row.crop_type,
    cropAge: row.crop_age || '',
    numPlants: row.num_plants || 0,
    irrigationType: row.irrigation_type || '',
    leadSource: row.lead_source,
    leadOwner: row.lead_owner,
    status: row.status,
    remarks: row.remarks || '',
    lastUpdated: row.last_updated,
    isDeleted: row.is_deleted,
    deletedBy: row.deleted_by || '',
    deletedDate: row.deleted_date || '',
    deleteReason: row.delete_reason || '',
  };
}

/**
 * Map Lead type (camelCase) to database row (snake_case)
 */
function mapLeadToDB(lead: Partial<Lead>): any {
  const mapped: any = {};

  if (lead.id) mapped.id = lead.id;
  if (lead.createdBy) mapped.created_by = lead.createdBy;
  if (lead.farmerName) mapped.farmer_name = lead.farmerName;
  if (lead.phone) mapped.phone = lead.phone;
  if (lead.whatsapp !== undefined) mapped.whatsapp = lead.whatsapp || null;
  if (lead.village !== undefined) mapped.village = lead.village || null;
  if (lead.taluk !== undefined) mapped.taluk = lead.taluk || null;
  if (lead.district) mapped.district = lead.district;
  if (lead.farmSizeAcres !== undefined) mapped.farm_size_acres = lead.farmSizeAcres;
  if (lead.cropType) mapped.crop_type = lead.cropType;
  if (lead.cropAge !== undefined) mapped.crop_age = lead.cropAge || null;
  if (lead.numPlants !== undefined) mapped.num_plants = lead.numPlants || null;
  if (lead.irrigationType !== undefined) mapped.irrigation_type = lead.irrigationType || null;
  if (lead.leadSource) mapped.lead_source = lead.leadSource;
  if (lead.leadOwner) mapped.lead_owner = lead.leadOwner;
  if (lead.status) mapped.status = lead.status;
  if (lead.remarks !== undefined) mapped.remarks = lead.remarks || null;

  return mapped;
}

/**
 * Fetch paginated leads (matches sheetsService API)
 */
export async function fetchLeads(
  limit: number = 50,
  offset: number = 0
): Promise<Lead[]> {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('is_deleted', false)
    .order('row_number', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new SupabaseError(error.message, error.code);

  return data.map(mapLeadFromDB);
}

/**
 * Fetch all leads (matches sheetsService API)
 */
export async function fetchAllLeads(): Promise<Lead[]> {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('is_deleted', false)
    .order('row_number', { ascending: false });

  if (error) throw new SupabaseError(error.message, error.code);

  return data.map(mapLeadFromDB);
}

/**
 * Create a new lead (matches sheetsService API)
 */
export async function createLead(
  leadData: Omit<Lead, 'id' | 'rowNumber' | 'displayId' | 'createdDate' | 'lastUpdated' | 'isDeleted' | 'deletedBy' | 'deletedDate' | 'deleteReason'>
): Promise<Lead> {
  const newLead = {
    id: uuidv7(), // UUIDv7 for time-ordered IDs
    ...mapLeadToDB(leadData),
  };

  const { data, error } = await supabase
    .from('leads')
    .insert([newLead])
    .select()
    .single();

  if (error) throw new SupabaseError(error.message, error.code);

  return mapLeadFromDB(data);
}

/**
 * Update an existing lead (matches sheetsService API)
 */
export async function updateLead(id: string, updates: Partial<Lead>): Promise<void> {
  const { error } = await supabase
    .from('leads')
    .update(mapLeadToDB(updates))
    .eq('id', id);

  if (error) throw new SupabaseError(error.message, error.code);
}

/**
 * Soft delete a lead (matches sheetsService API)
 * Only allows deletion if status is "New"
 */
export async function deleteLead(id: string, userEmail: string): Promise<void> {
  // First check if lead has "New" status
  const { data: lead, error: fetchError } = await supabase
    .from('leads')
    .select('status')
    .eq('id', id)
    .single();

  if (fetchError) throw new SupabaseError(fetchError.message, fetchError.code);

  if (!lead) {
    throw new SupabaseError('Lead not found');
  }

  if (lead.status !== 'New') {
    throw new SupabaseError('Can only delete leads with "New" status');
  }

  const { error } = await supabase
    .from('leads')
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
 * Fetch single lead by ID (matches sheetsService API)
 */
export async function fetchLeadById(leadId: string): Promise<Lead | null> {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .eq('is_deleted', false)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new SupabaseError(error.message, error.code);
  }

  return mapLeadFromDB(data);
}

/**
 * Fetch multiple leads by IDs (matches sheetsService API)
 */
export async function fetchLeadsByIds(leadIds: string[]): Promise<Lead[]> {
  if (leadIds.length === 0) return [];

  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .in('id', leadIds)
    .eq('is_deleted', false);

  if (error) throw new SupabaseError(error.message, error.code);

  return data.map(mapLeadFromDB);
}

/**
 * Search leads by name, phone, village, or district (matches sheetsService API)
 */
export async function searchLeads(
  searchTerm: string,
  limit: number = 100
): Promise<Lead[]> {
  if (!searchTerm.trim()) {
    return fetchLeads(limit, 0);
  }

  const term = searchTerm.toLowerCase();

  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('is_deleted', false)
    .neq('status', 'New') // Exclude "New" status leads
    .or(`farmer_name.ilike.%${term}%,phone.ilike.%${term}%,village.ilike.%${term}%,district.ilike.%${term}%,display_id.ilike.%${term}%`)
    .order('row_number', { ascending: false })
    .limit(limit);

  if (error) throw new SupabaseError(error.message, error.code);

  return data.map(mapLeadFromDB);
}
