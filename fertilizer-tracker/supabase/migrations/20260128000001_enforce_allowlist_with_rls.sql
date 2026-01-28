-- ============================================================================
-- ENFORCE ALLOWLIST WITH RLS POLICIES
-- ============================================================================
-- This migration updates all RLS policies to check the allowed_users table
-- Users not in allowed_users will have ZERO access to any data

-- ----------------------------------------------------------------------------
-- HELPER FUNCTION: Check if user is allowed
-- ----------------------------------------------------------------------------
-- This function checks if the current user's email is in allowed_users
CREATE OR REPLACE FUNCTION is_user_allowed()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM allowed_users
    WHERE email = auth.jwt() ->> 'email'
    AND is_active = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ----------------------------------------------------------------------------
-- UPDATE RLS POLICIES FOR ALL TABLES
-- ----------------------------------------------------------------------------

-- Drop all existing policies
DROP POLICY IF EXISTS "users_read_all" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "leads_read" ON leads;
DROP POLICY IF EXISTS "leads_insert" ON leads;
DROP POLICY IF EXISTS "leads_update" ON leads;
DROP POLICY IF EXISTS "field_visits_read" ON field_visits;
DROP POLICY IF EXISTS "field_visits_insert" ON field_visits;
DROP POLICY IF EXISTS "field_visits_update" ON field_visits;
DROP POLICY IF EXISTS "quotations_read" ON quotations;
DROP POLICY IF EXISTS "quotations_insert" ON quotations;
DROP POLICY IF EXISTS "quotations_update" ON quotations;
DROP POLICY IF EXISTS "payments_read" ON payments;
DROP POLICY IF EXISTS "payments_insert" ON payments;
DROP POLICY IF EXISTS "payments_update" ON payments;
DROP POLICY IF EXISTS "lookups_read" ON lookups;
DROP POLICY IF EXISTS "lookups_modify" ON lookups;

-- NEW POLICIES: All require user to be in allowed_users

-- Users policies
CREATE POLICY "users_read_all" ON users FOR SELECT
  USING (is_user_allowed());

CREATE POLICY "users_update_own" ON users FOR UPDATE
  USING (is_user_allowed() AND auth.jwt() ->> 'email' = email);

CREATE POLICY "users_insert_allowed" ON users FOR INSERT
  WITH CHECK (is_user_allowed());

-- Leads policies
CREATE POLICY "leads_read" ON leads FOR SELECT
  USING (is_user_allowed() AND is_deleted = FALSE);

CREATE POLICY "leads_insert" ON leads FOR INSERT
  WITH CHECK (is_user_allowed());

CREATE POLICY "leads_update" ON leads FOR UPDATE
  USING (
    is_user_allowed() AND (
      lead_owner = auth.jwt() ->> 'email'
      OR EXISTS (SELECT 1 FROM users WHERE email = auth.jwt() ->> 'email' AND role = 'Manager')
    )
  );

CREATE POLICY "leads_delete" ON leads FOR DELETE
  USING (
    is_user_allowed() AND (
      lead_owner = auth.jwt() ->> 'email'
      OR EXISTS (SELECT 1 FROM users WHERE email = auth.jwt() ->> 'email' AND role = 'Manager')
    )
  );

-- Field Visits policies
CREATE POLICY "field_visits_read" ON field_visits FOR SELECT
  USING (is_user_allowed() AND is_deleted = FALSE);

CREATE POLICY "field_visits_insert" ON field_visits FOR INSERT
  WITH CHECK (is_user_allowed());

CREATE POLICY "field_visits_update" ON field_visits FOR UPDATE
  USING (
    is_user_allowed() AND (
      created_by = auth.jwt() ->> 'email'
      OR visitor_id = auth.jwt() ->> 'email'
      OR auth.jwt() ->> 'email' = ANY(visited_by)
      OR EXISTS (SELECT 1 FROM users WHERE email = auth.jwt() ->> 'email' AND role = 'Manager')
    )
  );

CREATE POLICY "field_visits_delete" ON field_visits FOR DELETE
  USING (
    is_user_allowed() AND (
      created_by = auth.jwt() ->> 'email'
      OR EXISTS (SELECT 1 FROM users WHERE email = auth.jwt() ->> 'email' AND role = 'Manager')
    )
  );

-- Quotations policies
CREATE POLICY "quotations_read" ON quotations FOR SELECT
  USING (is_user_allowed() AND is_deleted = FALSE);

CREATE POLICY "quotations_insert" ON quotations FOR INSERT
  WITH CHECK (is_user_allowed());

CREATE POLICY "quotations_update" ON quotations FOR UPDATE
  USING (
    is_user_allowed() AND (
      prepared_by = auth.jwt() ->> 'email'
      OR EXISTS (SELECT 1 FROM users WHERE email = auth.jwt() ->> 'email' AND role = 'Manager')
    )
  );

CREATE POLICY "quotations_delete" ON quotations FOR DELETE
  USING (
    is_user_allowed() AND (
      prepared_by = auth.jwt() ->> 'email'
      OR EXISTS (SELECT 1 FROM users WHERE email = auth.jwt() ->> 'email' AND role = 'Manager')
    )
  );

-- Payments policies
CREATE POLICY "payments_read" ON payments FOR SELECT
  USING (is_user_allowed() AND is_deleted = FALSE);

CREATE POLICY "payments_insert" ON payments FOR INSERT
  WITH CHECK (is_user_allowed());

CREATE POLICY "payments_update" ON payments FOR UPDATE
  USING (
    is_user_allowed() AND (
      received_by = auth.jwt() ->> 'email'
      OR EXISTS (SELECT 1 FROM users WHERE email = auth.jwt() ->> 'email' AND role = 'Manager')
    )
  );

CREATE POLICY "payments_delete" ON payments FOR DELETE
  USING (
    is_user_allowed() AND (
      received_by = auth.jwt() ->> 'email'
      OR EXISTS (SELECT 1 FROM users WHERE email = auth.jwt() ->> 'email' AND role = 'Manager')
    )
  );

-- Lookups policies
CREATE POLICY "lookups_read" ON lookups FOR SELECT
  USING (is_user_allowed() AND active = TRUE);

CREATE POLICY "lookups_modify" ON lookups FOR ALL
  USING (
    is_user_allowed() AND
    EXISTS (SELECT 1 FROM users WHERE email = auth.jwt() ->> 'email' AND role = 'Manager')
  );
