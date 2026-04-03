/**
 * Supabase Service - Main Export
 * Re-exports all functions to match sheetsService API
 */

// Re-export error class
export { SupabaseError as AuthError } from './client';

// Re-export all entity services
export * from './leads';
export * from './fieldVisits';
export * from './quotations';
export * from './payments';
export * from './lookups';
export * from './products';
export * from './lineItems';
export * from './attendance';
export * from './attendanceStops';
