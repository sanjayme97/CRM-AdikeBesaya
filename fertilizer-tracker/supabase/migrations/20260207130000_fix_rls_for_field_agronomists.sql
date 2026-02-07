-- ============================================================================
-- Fix RLS policies so Field Agronomists only see their own data
-- ============================================================================

-- Step 1: Create helper function for role lookup (cleaner policies, evaluated once)
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE email = auth.jwt()->>'email';
$$;

-- ============================================================================
-- LEADS TABLE
-- ============================================================================

-- Drop existing broad policy
DROP POLICY IF EXISTS "leads_read" ON leads;

-- Recreate for non-Field-Agronomists (unchanged behavior for Manager/Sales Executive)
CREATE POLICY "leads_read"
ON leads FOR SELECT
USING (
  is_user_allowed()
  AND get_user_role() != 'Field Agronomist'
);

-- Field Agronomist: only sees leads they created or own
CREATE POLICY "leads_read_field_agronomist"
ON leads FOR SELECT
USING (
  is_user_allowed()
  AND get_user_role() = 'Field Agronomist'
  AND (
    created_by = auth.jwt()->>'email'
    OR lead_owner = auth.jwt()->>'email'
  )
);

-- ============================================================================
-- FIELD VISITS TABLE
-- ============================================================================

-- Drop existing broad policy
DROP POLICY IF EXISTS "field_visits_read" ON field_visits;

-- Drop old ineffective FA policy (created in 20260207120000, was OR'd with broad policy)
DROP POLICY IF EXISTS "Field Agronomist can view their field visits or lead-owned visi" ON field_visits;

-- Recreate for non-Field-Agronomists (unchanged behavior for Manager/Sales Executive)
CREATE POLICY "field_visits_read"
ON field_visits FOR SELECT
USING (
  is_user_allowed()
  AND get_user_role() != 'Field Agronomist'
);

-- Field Agronomist: only sees visits they created OR for leads they can access
CREATE POLICY "field_visits_read_field_agronomist"
ON field_visits FOR SELECT
USING (
  is_user_allowed()
  AND get_user_role() = 'Field Agronomist'
  AND (
    created_by = auth.jwt()->>'email'
    OR lead_id IN (
      SELECT id FROM leads
      WHERE created_by = auth.jwt()->>'email'
        OR lead_owner = auth.jwt()->>'email'
    )
  )
);
