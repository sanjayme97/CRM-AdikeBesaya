-- ============================================================================
-- ADD ADMIN ROLE
-- ============================================================================
-- Adds 'Admin' as a new role above Manager.
-- Admin has all Manager permissions + User Management (allowed_users CRUD).
-- Manager loses the ability to modify allowed_users.

-- ----------------------------------------------------------------------------
-- 1. UPDATE CHECK CONSTRAINTS to include 'Admin'
-- ----------------------------------------------------------------------------
-- Drop all CHECK constraints on these tables, then re-add with Admin.

DO $$
DECLARE
  r RECORD;
BEGIN
  -- Drop all check constraints on users table
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.users'::regclass AND contype = 'c'
  LOOP
    EXECUTE format('ALTER TABLE users DROP CONSTRAINT %I', r.conname);
  END LOOP;

  -- Drop all check constraints on allowed_users table
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.allowed_users'::regclass AND contype = 'c'
  LOOP
    EXECUTE format('ALTER TABLE allowed_users DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

-- Re-add with Admin included
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('Field Agronomist', 'Sales Executive', 'Manager', 'Admin'));

ALTER TABLE allowed_users ADD CONSTRAINT allowed_users_role_check
  CHECK (role IN ('Field Agronomist', 'Sales Executive', 'Manager', 'Admin'));

-- ----------------------------------------------------------------------------
-- 2. UPDATE RLS POLICIES on allowed_users
-- ----------------------------------------------------------------------------
-- Only Admin (not Manager) can modify the allowlist

DROP POLICY IF EXISTS "allowed_users_modify" ON allowed_users;
CREATE POLICY "allowed_users_modify" ON allowed_users FOR ALL
  USING (
    EXISTS (SELECT 1 FROM users WHERE email = auth.jwt() ->> 'email' AND role = 'Admin')
  );

-- ----------------------------------------------------------------------------
-- 3. UPDATE RLS POLICIES on data tables
-- ----------------------------------------------------------------------------
-- Everywhere that checks role = 'Manager' must also allow 'Admin'

-- LEADS: Manager/Admin override policies
DROP POLICY IF EXISTS "leads_update" ON leads;
CREATE POLICY "leads_update" ON leads FOR UPDATE
  USING (
    is_user_allowed()
    AND (
      lead_owner = auth.jwt() ->> 'email'
      OR created_by = auth.jwt() ->> 'email'
      OR EXISTS (SELECT 1 FROM users WHERE email = auth.jwt() ->> 'email' AND role IN ('Manager', 'Admin'))
    )
  );

DROP POLICY IF EXISTS "leads_delete" ON leads;
CREATE POLICY "leads_delete" ON leads FOR DELETE
  USING (
    is_user_allowed()
    AND (
      lead_owner = auth.jwt() ->> 'email'
      OR EXISTS (SELECT 1 FROM users WHERE email = auth.jwt() ->> 'email' AND role IN ('Manager', 'Admin'))
    )
  );

-- FIELD VISITS: Manager/Admin override policies
-- NOTE: visited_by is TEXT[] (array), so use ANY() for comparison
DROP POLICY IF EXISTS "field_visits_update" ON field_visits;
CREATE POLICY "field_visits_update" ON field_visits FOR UPDATE
  USING (
    is_user_allowed()
    AND (
      created_by = auth.jwt() ->> 'email'
      OR visitor_id = auth.jwt() ->> 'email'
      OR auth.jwt() ->> 'email' = ANY(visited_by)
      OR EXISTS (SELECT 1 FROM users WHERE email = auth.jwt() ->> 'email' AND role IN ('Manager', 'Admin'))
    )
  );

DROP POLICY IF EXISTS "field_visits_delete" ON field_visits;
CREATE POLICY "field_visits_delete" ON field_visits FOR DELETE
  USING (
    is_user_allowed()
    AND (
      created_by = auth.jwt() ->> 'email'
      OR EXISTS (SELECT 1 FROM users WHERE email = auth.jwt() ->> 'email' AND role IN ('Manager', 'Admin'))
    )
  );

-- QUOTATIONS: Manager/Admin override policies
DROP POLICY IF EXISTS "quotations_update" ON quotations;
CREATE POLICY "quotations_update" ON quotations FOR UPDATE
  USING (
    is_user_allowed()
    AND (
      prepared_by = auth.jwt() ->> 'email'
      OR EXISTS (SELECT 1 FROM users WHERE email = auth.jwt() ->> 'email' AND role IN ('Manager', 'Admin'))
    )
  );

DROP POLICY IF EXISTS "quotations_delete" ON quotations;
CREATE POLICY "quotations_delete" ON quotations FOR DELETE
  USING (
    is_user_allowed()
    AND (
      prepared_by = auth.jwt() ->> 'email'
      OR EXISTS (SELECT 1 FROM users WHERE email = auth.jwt() ->> 'email' AND role IN ('Manager', 'Admin'))
    )
  );

-- PAYMENTS: Manager/Admin override policies
DROP POLICY IF EXISTS "payments_update" ON payments;
CREATE POLICY "payments_update" ON payments FOR UPDATE
  USING (
    is_user_allowed()
    AND (
      received_by = auth.jwt() ->> 'email'
      OR EXISTS (SELECT 1 FROM users WHERE email = auth.jwt() ->> 'email' AND role IN ('Manager', 'Admin'))
    )
  );

DROP POLICY IF EXISTS "payments_delete" ON payments;
CREATE POLICY "payments_delete" ON payments FOR DELETE
  USING (
    is_user_allowed()
    AND (
      received_by = auth.jwt() ->> 'email'
      OR EXISTS (SELECT 1 FROM users WHERE email = auth.jwt() ->> 'email' AND role IN ('Manager', 'Admin'))
    )
  );

-- PRODUCTS: Manager/Admin can manage
DROP POLICY IF EXISTS "products_insert" ON products;
CREATE POLICY "products_insert" ON products FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE email = auth.jwt() ->> 'email' AND role IN ('Manager', 'Admin'))
  );

DROP POLICY IF EXISTS "products_update" ON products;
CREATE POLICY "products_update" ON products FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM users WHERE email = auth.jwt() ->> 'email' AND role IN ('Manager', 'Admin'))
  );

DROP POLICY IF EXISTS "products_delete" ON products;
CREATE POLICY "products_delete" ON products FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM users WHERE email = auth.jwt() ->> 'email' AND role IN ('Manager', 'Admin'))
  );

-- QUOTATION LINE ITEMS: Manager/Admin override
DROP POLICY IF EXISTS "quotation_line_items_update" ON quotation_line_items;
CREATE POLICY "quotation_line_items_update" ON quotation_line_items FOR UPDATE
  USING (
    is_user_allowed()
    AND (
      EXISTS (
        SELECT 1 FROM quotations q
        WHERE q.id = quotation_line_items.quotation_id
        AND (q.prepared_by = auth.jwt() ->> 'email'
             OR EXISTS (SELECT 1 FROM users WHERE email = auth.jwt() ->> 'email' AND role IN ('Manager', 'Admin')))
      )
    )
  );

DROP POLICY IF EXISTS "quotation_line_items_delete" ON quotation_line_items;
CREATE POLICY "quotation_line_items_delete" ON quotation_line_items FOR DELETE
  USING (
    is_user_allowed()
    AND (
      EXISTS (
        SELECT 1 FROM quotations q
        WHERE q.id = quotation_line_items.quotation_id
        AND (q.prepared_by = auth.jwt() ->> 'email'
             OR EXISTS (SELECT 1 FROM users WHERE email = auth.jwt() ->> 'email' AND role IN ('Manager', 'Admin')))
      )
    )
  );

-- LOOKUPS: Manager/Admin can manage
DROP POLICY IF EXISTS "lookups_manage" ON lookups;
CREATE POLICY "lookups_manage" ON lookups FOR ALL
  USING (
    EXISTS (SELECT 1 FROM users WHERE email = auth.jwt() ->> 'email' AND role IN ('Manager', 'Admin'))
  );

-- ----------------------------------------------------------------------------
-- 4. UPDATE HELPER FUNCTIONS to allow Admin
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION add_allowed_user(
  p_email TEXT,
  p_role TEXT DEFAULT 'Field Agronomist',
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_current_user TEXT;
BEGIN
  v_current_user := auth.jwt() ->> 'email';

  IF NOT EXISTS (SELECT 1 FROM users WHERE email = v_current_user AND role = 'Admin') THEN
    RAISE EXCEPTION 'Only admins can add users to the allowlist';
  END IF;

  INSERT INTO allowed_users (email, role, invited_by, notes)
  VALUES (p_email, p_role, v_current_user, p_notes)
  ON CONFLICT (email) DO UPDATE SET
    is_active = TRUE,
    role = EXCLUDED.role,
    invited_by = EXCLUDED.invited_by,
    invited_at = NOW(),
    notes = EXCLUDED.notes
  RETURNING id INTO v_user_id;

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION remove_allowed_user(p_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_user TEXT;
BEGIN
  v_current_user := auth.jwt() ->> 'email';

  IF NOT EXISTS (SELECT 1 FROM users WHERE email = v_current_user AND role = 'Admin') THEN
    RAISE EXCEPTION 'Only admins can remove users from the allowlist';
  END IF;

  UPDATE allowed_users
  SET is_active = FALSE
  WHERE email = p_email;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 5. PROMOTE EXISTING ADMIN USERS
-- ----------------------------------------------------------------------------
-- Update the system administrators to Admin role

UPDATE allowed_users SET role = 'Admin' WHERE email = 'hashincludesan@gmail.com';
UPDATE users SET role = 'Admin' WHERE email = 'hashincludesan@gmail.com';

