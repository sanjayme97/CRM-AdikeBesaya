import { supabase, SupabaseError } from './client';
import type { FieldVisit } from '../../types';
import { v7 as uuidv7 } from 'uuid';

/**
 * Map database row (snake_case) to FieldVisit type (camelCase)
 */
function mapFieldVisitFromDB(row: any): FieldVisit {
  return {
    id: row.id,
    rowNumber: row.row_number,
    displayId: row.display_id,
    leadId: row.lead_id,
    scheduledDate: row.scheduled_date,
    actualDate: row.actual_date || '',
    visitorId: row.visitor_id,
    visitOutcome: row.visit_outcome || '',
    cropCondition: row.crop_condition || '',
    identifiedProblems: row.identified_problems || [],
    diagnosisNotes: row.diagnosis_notes || '',
    followUpDate: row.follow_up_date || '',
    status: row.status,
    visitedBy: row.visited_by || [],
    quotationRequested: row.quotation_requested || false,
    assignedTo: row.assigned_to || '',
    attachmentFileId: row.attachment_file_id || '',
    createdBy: row.created_by,
    createdDate: row.created_date,
    isDeleted: row.is_deleted,
    deletedBy: row.deleted_by || '',
    deletedDate: row.deleted_date || '',
    deleteReason: row.delete_reason || '',
  };
}

/**
 * Map FieldVisit type (camelCase) to database row (snake_case)
 */
function mapFieldVisitToDB(visit: Partial<FieldVisit>): any {
  const mapped: any = {};

  if (visit.id) mapped.id = visit.id;
  if (visit.leadId) mapped.lead_id = visit.leadId;
  if (visit.scheduledDate) mapped.scheduled_date = visit.scheduledDate;
  if (visit.actualDate !== undefined) mapped.actual_date = visit.actualDate || null;
  if (visit.visitorId) mapped.visitor_id = visit.visitorId;
  if (visit.visitOutcome !== undefined) mapped.visit_outcome = visit.visitOutcome || null;
  if (visit.cropCondition !== undefined) mapped.crop_condition = visit.cropCondition || null;
  if (visit.identifiedProblems !== undefined) mapped.identified_problems = visit.identifiedProblems;
  if (visit.diagnosisNotes !== undefined) mapped.diagnosis_notes = visit.diagnosisNotes || null;
  if (visit.followUpDate !== undefined) mapped.follow_up_date = visit.followUpDate || null;
  if (visit.status) mapped.status = visit.status;
  if (visit.visitedBy !== undefined) mapped.visited_by = visit.visitedBy;
  if (visit.quotationRequested !== undefined) mapped.quotation_requested = visit.quotationRequested;
  if (visit.assignedTo !== undefined) mapped.assigned_to = visit.assignedTo || null;
  if (visit.attachmentFileId !== undefined) mapped.attachment_file_id = visit.attachmentFileId || null;
  if (visit.createdBy) mapped.created_by = visit.createdBy;

  return mapped;
}

/**
 * Fetch paginated field visits (matches sheetsService API)
 */
export async function fetchFieldVisits(
  limit: number = 50,
  offset: number = 0,
  leadId?: string,
  filters?: { leadIds?: string[]; statuses?: string[]; hasFollowUp?: boolean }
): Promise<FieldVisit[]> {
  let query = supabase
    .from('field_visits')
    .select('*')
    .eq('is_deleted', false)
    .order('row_number', { ascending: false });

  if (leadId) {
    query = query.eq('lead_id', leadId);
  }
  if (filters?.leadIds && filters.leadIds.length > 0) {
    query = query.in('lead_id', filters.leadIds);
  }
  if (filters?.statuses && filters.statuses.length > 0) {
    query = query.in('status', filters.statuses);
  }

  const { data, error } = await query.range(offset, offset + limit - 1);

  if (error) throw new SupabaseError(error.message, error.code);

  let results = data.map(mapFieldVisitFromDB);

  // Client-side filter for follow-up outcome
  if (filters?.hasFollowUp) {
    results = results.filter(v =>
      v.visitOutcome && v.visitOutcome.toLowerCase().includes('follow')
    );
  }

  return results;
}

/**
 * Fetch visits for a specific lead (matches sheetsService API)
 */
export async function fetchVisitsByLeadId(leadId: string): Promise<FieldVisit[]> {
  const { data, error } = await supabase
    .from('field_visits')
    .select('*')
    .eq('lead_id', leadId)
    .eq('is_deleted', false)
    .order('scheduled_date', { ascending: false });

  if (error) throw new SupabaseError(error.message, error.code);

  return data.map(mapFieldVisitFromDB);
}

/**
 * Fetch single field visit by ID (matches sheetsService API)
 */
export async function fetchFieldVisitById(visitId: string): Promise<FieldVisit | null> {
  const { data, error } = await supabase
    .from('field_visits')
    .select('*')
    .eq('id', visitId)
    .eq('is_deleted', false)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new SupabaseError(error.message, error.code);
  }

  return mapFieldVisitFromDB(data);
}

/**
 * Create a new field visit (matches sheetsService API)
 */
export async function createFieldVisit(
  visitData: Omit<FieldVisit, 'id' | 'rowNumber' | 'displayId' | 'createdDate' | 'isDeleted' | 'deletedBy' | 'deletedDate' | 'deleteReason'>
): Promise<FieldVisit> {
  const newVisit = {
    id: uuidv7(),
    ...mapFieldVisitToDB(visitData),
  };

  const { data, error } = await supabase
    .from('field_visits')
    .insert([newVisit])
    .select()
    .single();

  if (error) throw new SupabaseError(error.message, error.code);

  return mapFieldVisitFromDB(data);
}

/**
 * Update an existing field visit (matches sheetsService API)
 */
export async function updateFieldVisit(id: string, updates: Partial<FieldVisit>): Promise<void> {
  const { error } = await supabase
    .from('field_visits')
    .update(mapFieldVisitToDB(updates))
    .eq('id', id);

  if (error) throw new SupabaseError(error.message, error.code);
}

/**
 * Soft delete a field visit (matches sheetsService API)
 */
export async function deleteFieldVisit(id: string, userEmail: string): Promise<void> {
  const { error } = await supabase
    .from('field_visits')
    .update({
      is_deleted: true,
      deleted_by: userEmail,
      deleted_date: new Date().toISOString(),
      delete_reason: 'User deleted',
    })
    .eq('id', id);

  if (error) throw new SupabaseError(error.message, error.code);
}
