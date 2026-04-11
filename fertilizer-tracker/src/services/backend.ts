/**
 * Backend Switcher
 *
 * Automatically switches between Google Sheets and Supabase
 * based on VITE_USE_SUPABASE environment variable.
 *
 * Usage in components:
 *   import { fetchLeads, createLead } from '../services/backend';
 *
 * Switch backends by changing .env:
 *   VITE_USE_SUPABASE=false  → Uses Google Sheets
 *   VITE_USE_SUPABASE=true   → Uses Supabase
 */

// Import both backends
import * as sheetsService from './sheetsService';
import * as supabaseService from './supabase/index';

const USE_SUPABASE = import.meta.env.VITE_USE_SUPABASE === 'true';

if (USE_SUPABASE) {
  console.log('🟢 Using Supabase backend');
} else {
  console.log('🔵 Using Google Sheets backend');
}

// Select the active backend
const backend = USE_SUPABASE ? supabaseService : sheetsService;

// Re-export all functions from the selected backend
export const {
  // Leads
  fetchLeads,
  fetchAllLeads,
  createLead,
  updateLead,
  deleteLead,
  fetchLeadById,
  fetchLeadsByIds,
  searchLeads,

  // Field Visits
  fetchFieldVisits,
  fetchVisitsByLeadId,
  fetchFieldVisitById,
  createFieldVisit,
  updateFieldVisit,
  deleteFieldVisit,

  // Quotations
  fetchQuotations,
  fetchQuotationsByLeadId,
  fetchQuotationById,
  fetchQuotationByVisitId,
  fetchDeliveredQuotations,
  createQuotation,
  updateQuotation,
  deleteQuotation,
  searchAcceptedQuotations,
  fetchQuotationsByIds,

  // Payments
  fetchPayments,
  fetchPaymentsByQuoteId,
  fetchPaymentById,
  createPayment,
  updatePayment,
  deletePayment,
  getPaymentTotalsByQuoteIds,

  // Lookups & Dashboard
  fetchLookups,
  fetchUsers,
  fetchDashboardStats,
} = backend;

// Re-export types
export type { DashboardStats } from '../types';

// Supabase-only features (no Google Sheets equivalent)
export {
  fetchAttendance,
  fetchAttendanceById,
  fetchTodayAttendance,
  createAttendance,
  updateAttendance,
  deleteAttendance,
  fetchAttendanceSummary,
  fetchIncentiveRate,
  updateIncentiveRate,
  fetchTodayAttendanceCount,
  fetchMonthlyWorkerReport,
  fetchAttendanceStops,
  createAttendanceStop,
  updateAttendanceStop,
  deleteAttendanceStop,
} from './supabase/index';
