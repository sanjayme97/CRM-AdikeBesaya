import { supabase, SupabaseError } from './client';

export interface AllowedUser {
  id: string;
  email: string;
  role: string;
  invitedBy: string | null;
  invitedAt: string;
  notes: string | null;
  isActive: boolean;
}

function mapFromDB(row: any): AllowedUser {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    invitedBy: row.invited_by,
    invitedAt: row.invited_at,
    notes: row.notes,
    isActive: row.is_active,
  };
}

/**
 * Fetch all allowed users (Manager only via RLS)
 */
export async function fetchAllowedUsers(): Promise<AllowedUser[]> {
  const { data, error } = await supabase
    .from('allowed_users')
    .select('*')
    .order('invited_at', { ascending: false });

  if (error) throw new SupabaseError(error.message, error.code);
  return data.map(mapFromDB);
}

/**
 * Add a new allowed user (uses SECURITY DEFINER function — Manager only)
 */
export async function addAllowedUser(
  email: string,
  role: string,
  notes?: string
): Promise<void> {
  const { error } = await supabase.rpc('add_allowed_user', {
    p_email: email.toLowerCase().trim(),
    p_role: role,
    p_notes: notes || null,
  });

  if (error) throw new SupabaseError(error.message, error.code);
}

/**
 * Update an allowed user's role or notes
 */
export async function updateAllowedUser(
  id: string,
  updates: { role?: string; notes?: string; isActive?: boolean }
): Promise<void> {
  const mapped: any = {};
  if (updates.role !== undefined) mapped.role = updates.role;
  if (updates.notes !== undefined) mapped.notes = updates.notes;
  if (updates.isActive !== undefined) mapped.is_active = updates.isActive;

  const { error } = await supabase
    .from('allowed_users')
    .update(mapped)
    .eq('id', id);

  if (error) throw new SupabaseError(error.message, error.code);

  // Also sync role to users table if role changed
  if (updates.role !== undefined) {
    // Get the email for this allowed_user
    const { data } = await supabase
      .from('allowed_users')
      .select('email')
      .eq('id', id)
      .single();

    if (data) {
      await supabase
        .from('users')
        .update({ role: updates.role })
        .eq('email', data.email);
    }
  }
}

/**
 * Deactivate a user (soft delete via SECURITY DEFINER function)
 */
export async function deactivateAllowedUser(email: string): Promise<void> {
  const { error } = await supabase.rpc('remove_allowed_user', {
    p_email: email,
  });

  if (error) throw new SupabaseError(error.message, error.code);
}

/**
 * Reactivate a previously deactivated user
 */
export async function reactivateAllowedUser(id: string): Promise<void> {
  const { error } = await supabase
    .from('allowed_users')
    .update({ is_active: true })
    .eq('id', id);

  if (error) throw new SupabaseError(error.message, error.code);
}
