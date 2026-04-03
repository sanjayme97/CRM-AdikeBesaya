import { supabase, SupabaseError } from './client';
import type { Attendance, AttendanceFilters, AttendanceSummary } from '../../types';
import { v7 as uuidv7 } from 'uuid';

/**
 * Map database row (snake_case) to Attendance type (camelCase)
 */
function mapAttendanceFromDB(row: any): Attendance {
  return {
    id: row.id,
    rowNumber: row.row_number,
    displayId: row.display_id,
    userEmail: row.user_email,
    attendanceDate: row.attendance_date,
    checkInTime: row.check_in_time,
    checkInLat: row.check_in_lat,
    checkInLng: row.check_in_lng,
    checkInAddress: row.check_in_address || '',
    checkOutTime: row.check_out_time || null,
    checkOutLat: row.check_out_lat,
    checkOutLng: row.check_out_lng,
    checkOutAddress: row.check_out_address || '',
    kmTraveled: parseFloat(row.km_traveled) || 0,
    travelNotes: row.travel_notes || '',
    incentiveRate: row.incentive_rate ? parseFloat(row.incentive_rate) : null,
    incentiveAmount: row.incentive_amount ? parseFloat(row.incentive_amount) : null,
    status: row.status,
    createdAt: row.created_at,
    lastUpdated: row.last_updated,
    isDeleted: row.is_deleted,
    deletedBy: row.deleted_by || '',
    deletedDate: row.deleted_date || '',
    deleteReason: row.delete_reason || '',
  };
}

/**
 * Map Attendance type (camelCase) to database row (snake_case)
 */
function mapAttendanceToDB(attendance: Partial<Attendance>): any {
  const mapped: any = {};

  if (attendance.id) mapped.id = attendance.id;
  if (attendance.userEmail) mapped.user_email = attendance.userEmail;
  if (attendance.attendanceDate) mapped.attendance_date = attendance.attendanceDate;
  if (attendance.checkInTime) mapped.check_in_time = attendance.checkInTime;
  if (attendance.checkInLat !== undefined) mapped.check_in_lat = attendance.checkInLat;
  if (attendance.checkInLng !== undefined) mapped.check_in_lng = attendance.checkInLng;
  if (attendance.checkInAddress !== undefined) mapped.check_in_address = attendance.checkInAddress || null;
  if (attendance.checkOutTime !== undefined) mapped.check_out_time = attendance.checkOutTime;
  if (attendance.checkOutLat !== undefined) mapped.check_out_lat = attendance.checkOutLat;
  if (attendance.checkOutLng !== undefined) mapped.check_out_lng = attendance.checkOutLng;
  if (attendance.checkOutAddress !== undefined) mapped.check_out_address = attendance.checkOutAddress || null;
  if (attendance.kmTraveled !== undefined) mapped.km_traveled = attendance.kmTraveled;
  if (attendance.travelNotes !== undefined) mapped.travel_notes = attendance.travelNotes || null;
  if (attendance.incentiveRate !== undefined) mapped.incentive_rate = attendance.incentiveRate;
  if (attendance.status) mapped.status = attendance.status;

  return mapped;
}

/**
 * Fetch paginated attendance records
 */
export async function fetchAttendance(
  limit: number = 50,
  offset: number = 0,
  filters?: AttendanceFilters
): Promise<Attendance[]> {
  let query = supabase
    .from('attendance')
    .select('*')
    .eq('is_deleted', false)
    .order('attendance_date', { ascending: false });

  if (filters?.userEmail) {
    query = query.eq('user_email', filters.userEmail);
  }
  if (filters?.dateFrom) {
    query = query.gte('attendance_date', filters.dateFrom);
  }
  if (filters?.dateTo) {
    query = query.lte('attendance_date', filters.dateTo);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query.range(offset, offset + limit - 1);

  if (error) throw new SupabaseError(error.message, error.code);

  return data.map(mapAttendanceFromDB);
}

/**
 * Fetch single attendance by ID
 */
export async function fetchAttendanceById(id: string): Promise<Attendance | null> {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('id', id)
    .eq('is_deleted', false)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new SupabaseError(error.message, error.code);
  }

  return mapAttendanceFromDB(data);
}

/**
 * Fetch today's attendance for a specific user
 */
export async function fetchTodayAttendance(userEmail: string): Promise<Attendance | null> {
  const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local timezone

  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('user_email', userEmail)
    .eq('attendance_date', today)
    .eq('is_deleted', false)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new SupabaseError(error.message, error.code);
  }

  return mapAttendanceFromDB(data);
}

/**
 * Create a new attendance record (check-in)
 */
export async function createAttendance(
  attendanceData: Omit<Attendance, 'id' | 'rowNumber' | 'displayId' | 'incentiveAmount' | 'createdAt' | 'lastUpdated' | 'isDeleted' | 'deletedBy' | 'deletedDate' | 'deleteReason'>
): Promise<Attendance> {
  const newAttendance = {
    id: uuidv7(),
    ...mapAttendanceToDB(attendanceData),
  };

  const { data, error } = await supabase
    .from('attendance')
    .insert([newAttendance])
    .select()
    .single();

  if (error) throw new SupabaseError(error.message, error.code);

  return mapAttendanceFromDB(data);
}

/**
 * Update an existing attendance record (check-out, edit)
 */
export async function updateAttendance(id: string, updates: Partial<Attendance>): Promise<void> {
  const mapped = mapAttendanceToDB(updates);
  mapped.last_updated = new Date().toISOString();

  const { error } = await supabase
    .from('attendance')
    .update(mapped)
    .eq('id', id);

  if (error) throw new SupabaseError(error.message, error.code);
}

/**
 * Soft delete an attendance record
 */
export async function deleteAttendance(id: string, userEmail: string): Promise<void> {
  const { error } = await supabase
    .from('attendance')
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
 * Fetch attendance summary for a user within a date range
 */
export async function fetchAttendanceSummary(
  userEmail?: string,
  dateFrom?: string,
  dateTo?: string
): Promise<AttendanceSummary> {
  let query = supabase
    .from('attendance')
    .select('km_traveled, incentive_amount')
    .eq('is_deleted', false)
    .eq('status', 'checked-out');

  if (userEmail) {
    query = query.eq('user_email', userEmail);
  }
  if (dateFrom) {
    query = query.gte('attendance_date', dateFrom);
  }
  if (dateTo) {
    query = query.lte('attendance_date', dateTo);
  }

  const { data, error } = await query;

  if (error) throw new SupabaseError(error.message, error.code);

  const totalDays = data.length;
  const totalKm = data.reduce((sum, row) => sum + (parseFloat(row.km_traveled) || 0), 0);
  const totalIncentive = data.reduce((sum, row) => sum + (parseFloat(row.incentive_amount) || 0), 0);

  return {
    totalDays,
    totalKm: Math.round(totalKm * 100) / 100,
    totalIncentive: Math.round(totalIncentive * 100) / 100,
    averageKmPerDay: totalDays > 0 ? Math.round((totalKm / totalDays) * 100) / 100 : 0,
  };
}

/**
 * Fetch the current incentive rate per km
 */
export async function fetchIncentiveRate(): Promise<number> {
  const { data, error } = await supabase
    .from('attendance_config')
    .select('config_value')
    .eq('config_key', 'incentive_rate_per_km')
    .single();

  if (error) {
    if (error.code === 'PGRST116') return 3.0; // Default if not found
    throw new SupabaseError(error.message, error.code);
  }

  return parseFloat(data.config_value) || 3.0;
}

/**
 * Update the incentive rate per km (Admin only)
 */
export async function updateIncentiveRate(rate: number, updatedBy: string): Promise<void> {
  const { error } = await supabase
    .from('attendance_config')
    .update({
      config_value: rate.toString(),
      updated_by: updatedBy,
      updated_at: new Date().toISOString(),
    })
    .eq('config_key', 'incentive_rate_per_km');

  if (error) throw new SupabaseError(error.message, error.code);
}

/**
 * Count today's checked-in workers (for dashboard)
 */
export async function fetchTodayAttendanceCount(): Promise<{ checkedIn: number; checkedOut: number }> {
  const today = new Date().toLocaleDateString('en-CA');

  const { data, error } = await supabase
    .from('attendance')
    .select('status')
    .eq('attendance_date', today)
    .eq('is_deleted', false);

  if (error) throw new SupabaseError(error.message, error.code);

  return {
    checkedIn: data.filter(r => r.status === 'checked-in').length,
    checkedOut: data.filter(r => r.status === 'checked-out').length,
  };
}
