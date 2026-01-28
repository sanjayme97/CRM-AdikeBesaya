-- ============================================================================
-- FIX RLS UPDATE POLICIES
-- ============================================================================
-- This migration fixes the RLS policies that were blocking UPDATE operations.
--
-- Problems with previous policies:
-- 1. UPDATE policies had no WITH CHECK clause - PostgreSQL used USING clause
--    to validate NEW rows, causing "new row violates policy" errors
-- 2. Manager check used 'users' table instead of 'allowed_users' table
--
-- Solution: Simplify policies - if user is in allowed_users, they can
-- read and update any record. This is appropriate for a small team CRM.

-- ----------------------------------------------------------------------------
-- DROP AND RECREATE POLICIES FOR LEADS
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS leads_read ON leads;
DROP POLICY IF EXISTS leads_update ON leads;

CREATE POLICY leads_read ON leads FOR SELECT
  USING (is_user_allowed());

CREATE POLICY leads_update ON leads FOR UPDATE
  USING (is_user_allowed())
  WITH CHECK (is_user_allowed());

-- ----------------------------------------------------------------------------
-- DROP AND RECREATE POLICIES FOR FIELD_VISITS
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS field_visits_read ON field_visits;
DROP POLICY IF EXISTS field_visits_update ON field_visits;

CREATE POLICY field_visits_read ON field_visits FOR SELECT
  USING (is_user_allowed());

CREATE POLICY field_visits_update ON field_visits FOR UPDATE
  USING (is_user_allowed())
  WITH CHECK (is_user_allowed());

-- ----------------------------------------------------------------------------
-- DROP AND RECREATE POLICIES FOR QUOTATIONS
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS quotations_read ON quotations;
DROP POLICY IF EXISTS quotations_update ON quotations;

CREATE POLICY quotations_read ON quotations FOR SELECT
  USING (is_user_allowed());

CREATE POLICY quotations_update ON quotations FOR UPDATE
  USING (is_user_allowed())
  WITH CHECK (is_user_allowed());

-- ----------------------------------------------------------------------------
-- DROP AND RECREATE POLICIES FOR PAYMENTS
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS payments_read ON payments;
DROP POLICY IF EXISTS payments_update ON payments;

CREATE POLICY payments_read ON payments FOR SELECT
  USING (is_user_allowed());

CREATE POLICY payments_update ON payments FOR UPDATE
  USING (is_user_allowed())
  WITH CHECK (is_user_allowed());

-- ----------------------------------------------------------------------------
-- NOTE: INSERT and DELETE policies remain unchanged
-- - INSERT: WITH CHECK (is_user_allowed())
-- - DELETE: ownership check OR Manager (for hard deletes, rarely used)
--
-- Soft deletes use UPDATE, which is now fixed above.
-- ----------------------------------------------------------------------------
