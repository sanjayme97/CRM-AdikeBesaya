-- ============================================================================
-- USER ACCESS CONTROL - Email Allowlist
-- ============================================================================
-- This migration creates the allowed_users table to maintain an email allowlist
-- Only users in this table will be able to access the system

-- ----------------------------------------------------------------------------
-- ALLOWED USERS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE allowed_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'Field Agronomist' CHECK (role IN ('Field Agronomist', 'Sales Executive', 'Manager')),
  invited_by TEXT,
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE
);

-- Enable RLS on allowed_users (only managers can modify)
ALTER TABLE allowed_users ENABLE ROW LEVEL SECURITY;

-- Anyone can check if they're allowed (needed for auth flow)
CREATE POLICY "allowed_users_read" ON allowed_users FOR SELECT USING (TRUE);

-- Only managers can modify the allowlist
CREATE POLICY "allowed_users_modify" ON allowed_users FOR ALL
  USING (
    EXISTS (SELECT 1 FROM users WHERE email = auth.jwt() ->> 'email' AND role = 'Manager')
  );

-- Index for fast email lookups
CREATE INDEX idx_allowed_users_email ON allowed_users(email);
CREATE INDEX idx_allowed_users_active ON allowed_users(is_active) WHERE is_active = TRUE;

-- ----------------------------------------------------------------------------
-- HELPER FUNCTION: Add allowed user
-- ----------------------------------------------------------------------------
-- Convenience function to add users to the allowlist

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
  -- Get current user's email
  v_current_user := auth.jwt() ->> 'email';

  -- Check if current user is a manager
  IF NOT EXISTS (SELECT 1 FROM users WHERE email = v_current_user AND role = 'Manager') THEN
    RAISE EXCEPTION 'Only managers can add users to the allowlist';
  END IF;

  -- Insert the allowed user
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

-- ----------------------------------------------------------------------------
-- HELPER FUNCTION: Remove allowed user
-- ----------------------------------------------------------------------------
-- Soft-delete by marking user as inactive

CREATE OR REPLACE FUNCTION remove_allowed_user(p_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_user TEXT;
BEGIN
  -- Get current user's email
  v_current_user := auth.jwt() ->> 'email';

  -- Check if current user is a manager
  IF NOT EXISTS (SELECT 1 FROM users WHERE email = v_current_user AND role = 'Manager') THEN
    RAISE EXCEPTION 'Only managers can remove users from the allowlist';
  END IF;

  -- Mark as inactive
  UPDATE allowed_users
  SET is_active = FALSE
  WHERE email = p_email;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- INITIAL DATA: Add your first admin/manager
-- ============================================================================
-- IMPORTANT: Add at least one email so you can access the system

INSERT INTO allowed_users (email, role, notes) VALUES
  ('hashincludesan@gmail.com', 'Manager', 'System administrator'),
  ('sanshizme@gmai.com', 'Manager', 'System administrator');
