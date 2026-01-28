import { supabase, SupabaseError } from './client';
import type { LookupData, TalukWithDistrict } from '../../types';

/**
 * Fetch all lookup values organized by category (matches sheetsService API)
 */
export async function fetchLookups(): Promise<LookupData> {
  const { data, error } = await supabase
    .from('lookups')
    .select('*')
    .eq('active', true)
    .order('display_order');

  if (error) throw new SupabaseError(error.message, error.code);

  // Organize lookups by category
  const districts: string[] = [];
  const taluks: TalukWithDistrict[] = [];
  const cropTypes: string[] = [];
  const leadSources: string[] = [];
  const leadStatuses: string[] = [];
  const irrigationTypes: string[] = [];
  const visitOutcomes: string[] = [];
  const visitStatuses: string[] = [];
  const cropConditions: string[] = [];
  const quotationStatuses: string[] = [];
  const deliveryStatuses: string[] = [];
  const paymentTypes: string[] = [];
  const paymentMethods: string[] = [];

  for (const row of data) {
    switch (row.category) {
      case 'District':
        districts.push(row.value);
        break;
      case 'Taluk':
        taluks.push({
          taluk: row.value,
          district: row.parent_value || '',
        });
        break;
      case 'CropType':
        cropTypes.push(row.value);
        break;
      case 'LeadSource':
        leadSources.push(row.value);
        break;
      case 'LeadStatus':
        leadStatuses.push(row.value);
        break;
      case 'IrrigationType':
        irrigationTypes.push(row.value);
        break;
      case 'VisitOutcome':
        visitOutcomes.push(row.value);
        break;
      case 'VisitStatus':
        visitStatuses.push(row.value);
        break;
      case 'CropCondition':
        cropConditions.push(row.value);
        break;
      case 'QuotationStatus':
        quotationStatuses.push(row.value);
        break;
      case 'DeliveryStatus':
        deliveryStatuses.push(row.value);
        break;
      case 'PaymentType':
        paymentTypes.push(row.value);
        break;
      case 'PaymentMethod':
        paymentMethods.push(row.value);
        break;
    }
  }

  return {
    districts,
    taluks,
    cropTypes,
    leadSources,
    leadStatuses,
    irrigationTypes,
    visitOutcomes,
    visitStatuses,
    cropConditions,
    quotationStatuses,
    deliveryStatuses,
    paymentTypes,
    paymentMethods,
  };
}

/**
 * Fetch all users (matches sheetsService API)
 */
export async function fetchUsers(): Promise<Array<{ email: string; name: string; role: string }>> {
  const { data, error } = await supabase
    .from('users')
    .select('email, name, role')
    .order('name');

  if (error) throw new SupabaseError(error.message, error.code);

  return data;
}

/**
 * Fetch dashboard statistics (matches sheetsService API)
 */
export async function fetchDashboardStats(): Promise<any> {
  // Fetch all data in parallel
  const [
    { data: leads, error: leadsError },
    { data: quotations, error: quotationsError },
    { data: payments, error: paymentsError },
    { data: visits, error: visitsError }
  ] = await Promise.all([
    supabase.from('leads').select('*').eq('is_deleted', false),
    supabase.from('quotations').select('*').eq('is_deleted', false),
    supabase.from('payments').select('*').eq('is_deleted', false),
    supabase.from('field_visits').select('*').eq('is_deleted', false).eq('status', 'Scheduled').order('scheduled_date', { ascending: true }).limit(10)
  ]);

  if (leadsError) throw new SupabaseError(leadsError.message, leadsError.code);
  if (quotationsError) throw new SupabaseError(quotationsError.message, quotationsError.code);
  if (paymentsError) throw new SupabaseError(paymentsError.message, paymentsError.code);
  if (visitsError) throw new SupabaseError(visitsError.message, visitsError.code);

  // Calculate date boundaries
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  // Map database rows to proper types (snake_case to camelCase)
  const mappedPayments = payments.map(p => ({
    id: p.id,
    displayId: p.display_id,
    quoteId: p.quote_id,
    paymentAmount: parseFloat(p.payment_amount),
    paymentDate: p.payment_date,
    paymentMethod: p.payment_method,
    paymentType: p.payment_type,
  }));

  const mappedQuotations = quotations.map(q => ({
    id: q.id,
    displayId: q.display_id,
    leadId: q.lead_id,
    quoteAmount: parseFloat(q.quote_amount),
    validUntil: q.valid_until,
    status: q.status,
  }));

  const mappedLeads = leads.map(l => ({
    id: l.id,
    displayId: l.display_id,
    farmerName: l.farmer_name,
    createdDate: l.created_date,
    district: l.district,
    status: l.status,
  }));

  const mappedVisits = visits.map(v => ({
    id: v.id,
    displayId: v.display_id,
    leadId: v.lead_id,
    scheduledDate: v.scheduled_date,
  }));

  // Revenue calculations
  const totalRevenue = mappedPayments.reduce((sum, p) => sum + p.paymentAmount, 0);

  const thisMonthPayments = mappedPayments.filter(p => {
    const paymentDate = new Date(p.paymentDate);
    return paymentDate >= startOfMonth;
  });
  const thisMonthRevenue = thisMonthPayments.reduce((sum, p) => sum + p.paymentAmount, 0);

  // Accepted quotations total value
  const acceptedQuotes = mappedQuotations.filter(q => q.status === 'Accepted');
  const totalAcceptedValue = acceptedQuotes.reduce((sum, q) => sum + q.quoteAmount, 0);

  // Pending amount = Accepted quote value - Total payments
  const pendingAmount = Math.max(0, totalAcceptedValue - totalRevenue);

  // Collection rate
  const collectionRate = totalAcceptedValue > 0
    ? Math.round((totalRevenue / totalAcceptedValue) * 100)
    : 0;

  // Pipeline stats
  const newLeads = mappedLeads.filter(l => l.status === 'New').length;
  const quotationsSent = mappedQuotations.filter(q => q.status === 'Sent').length;
  const quotationsAccepted = acceptedQuotes.length;
  const totalQuotations = mappedQuotations.length;
  const conversionRate = totalQuotations > 0
    ? Math.round((quotationsAccepted / totalQuotations) * 100)
    : 0;

  // Expiring quotes (valid until within 7 days, status = Sent)
  const expiringQuotes = mappedQuotations.filter(q => {
    if (q.status !== 'Sent' || !q.validUntil) return false;
    const validUntil = new Date(q.validUntil);
    return validUntil >= now && validUntil <= sevenDaysFromNow;
  }).slice(0, 5);

  // Upcoming visits (next 3 days)
  const upcomingVisits = mappedVisits.filter(v => {
    const scheduledDate = new Date(v.scheduledDate);
    return scheduledDate >= now && scheduledDate <= threeDaysFromNow;
  }).slice(0, 5);

  // Recent leads (last 5)
  const recentLeads = [...mappedLeads]
    .sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime())
    .slice(0, 5);

  // Recent payments (last 5)
  const recentPayments = [...mappedPayments]
    .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
    .slice(0, 5);

  return {
    totalRevenue,
    thisMonthRevenue,
    pendingAmount,
    collectionRate,
    totalLeads: mappedLeads.length,
    newLeads,
    quotationsSent,
    quotationsAccepted,
    conversionRate,
    expiringQuotes,
    upcomingVisits,
    recentLeads,
    recentPayments,
  };
}
