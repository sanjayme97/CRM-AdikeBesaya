import { supabase, SupabaseError } from './client';
import type { AttendanceStop } from '../../types';
import { v7 as uuidv7 } from 'uuid';

/**
 * Map database row (snake_case) to AttendanceStop type (camelCase)
 */
function mapStopFromDB(row: any): AttendanceStop {
  return {
    id: row.id,
    attendanceId: row.attendance_id,
    stopOrder: row.stop_order,
    stopTime: row.stop_time,
    latitude: row.latitude,
    longitude: row.longitude,
    address: row.address || '',
    kmFromPrevious: parseFloat(row.km_from_previous) || 0,
    isManualKm: row.is_manual_km || false,
    createdAt: row.created_at,
  };
}

/**
 * Map AttendanceStop type (camelCase) to database row (snake_case)
 */
function mapStopToDB(stop: Partial<AttendanceStop>): any {
  const mapped: any = {};

  if (stop.id) mapped.id = stop.id;
  if (stop.attendanceId) mapped.attendance_id = stop.attendanceId;
  if (stop.stopOrder !== undefined) mapped.stop_order = stop.stopOrder;
  if (stop.stopTime) mapped.stop_time = stop.stopTime;
  if (stop.latitude !== undefined) mapped.latitude = stop.latitude;
  if (stop.longitude !== undefined) mapped.longitude = stop.longitude;
  if (stop.address !== undefined) mapped.address = stop.address || null;
  if (stop.kmFromPrevious !== undefined) mapped.km_from_previous = stop.kmFromPrevious;
  if (stop.isManualKm !== undefined) mapped.is_manual_km = stop.isManualKm;

  return mapped;
}

/**
 * Fetch all stops for an attendance record, ordered by stop_order
 */
export async function fetchAttendanceStops(attendanceId: string): Promise<AttendanceStop[]> {
  const { data, error } = await supabase
    .from('attendance_stops')
    .select('*')
    .eq('attendance_id', attendanceId)
    .order('stop_order', { ascending: true });

  if (error) throw new SupabaseError(error.message, error.code);

  return data.map(mapStopFromDB);
}

/**
 * Create a new attendance stop
 */
export async function createAttendanceStop(
  stopData: Omit<AttendanceStop, 'id' | 'createdAt'>
): Promise<AttendanceStop> {
  const newStop = {
    id: uuidv7(),
    ...mapStopToDB(stopData),
  };

  const { data, error } = await supabase
    .from('attendance_stops')
    .insert([newStop])
    .select()
    .single();

  if (error) throw new SupabaseError(error.message, error.code);

  return mapStopFromDB(data);
}

/**
 * Update an attendance stop (e.g., manual km override)
 */
export async function updateAttendanceStop(id: string, updates: Partial<AttendanceStop>): Promise<void> {
  const { error } = await supabase
    .from('attendance_stops')
    .update(mapStopToDB(updates))
    .eq('id', id);

  if (error) throw new SupabaseError(error.message, error.code);
}

/**
 * Delete an attendance stop
 */
export async function deleteAttendanceStop(id: string): Promise<void> {
  const { error } = await supabase
    .from('attendance_stops')
    .delete()
    .eq('id', id);

  if (error) throw new SupabaseError(error.message, error.code);
}
