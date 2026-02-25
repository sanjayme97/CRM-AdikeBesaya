-- ============================================================================
-- USER MANAGEMENT - Quick Reference SQL
-- ============================================================================
-- Copy and paste these queries into Supabase SQL Editor to manage users
-- Replace email addresses and values as needed

-- ----------------------------------------------------------------------------
-- VIEW ALL USERS
-- ----------------------------------------------------------------------------

-- View all allowed users (active and inactive)
SELECT
  email,
  role,
  is_active,
  invited_by,
  invited_at,
  notes
FROM allowed_users
ORDER BY invited_at DESC;

-- View only active users
SELECT
  email,
  role,
  invited_at,
  notes
FROM allowed_users
WHERE is_active = TRUE
ORDER BY role, email;

-- View users by role
SELECT
  role,
  COUNT(*) as user_count,
  STRING_AGG(email, ', ' ORDER BY email) as users
FROM allowed_users
WHERE is_active = TRUE
GROUP BY role
ORDER BY role;

-- ----------------------------------------------------------------------------
-- ADD USERS
-- ----------------------------------------------------------------------------

-- Add a single user
INSERT INTO allowed_users (email, role, notes)
VALUES ('newuser@example.com', 'Field Agronomist', 'New team member');

-- Add multiple users at once
INSERT INTO allowed_users (email, role, notes) VALUES
  ('manager@example.com', 'Manager', 'System administrator'),
  ('sales1@example.com', 'Sales Executive', 'Sales team'),
  ('sales2@example.com', 'Sales Executive', 'Sales team'),
  ('agronomist1@example.com', 'Field Agronomist', 'Field staff'),
  ('agronomist2@example.com', 'Field Agronomist', 'Field staff');

-- Add user with specific invited_by
INSERT INTO allowed_users (email, role, invited_by, notes)
VALUES ('newuser@example.com', 'Field Agronomist', 'manager@example.com', 'Hired in Jan 2026');

-- ----------------------------------------------------------------------------
-- UPDATE USERS
-- ----------------------------------------------------------------------------

-- Change user's role
UPDATE allowed_users
SET role = 'Manager', notes = 'Promoted to Manager'
WHERE email = 'user@example.com';

-- Update notes only
UPDATE allowed_users
SET notes = 'Updated description'
WHERE email = 'user@example.com';

-- Deactivate user (soft delete)
UPDATE allowed_users
SET is_active = FALSE, notes = 'Deactivated on 2026-01-28'
WHERE email = 'user@example.com';

-- Reactivate user
UPDATE allowed_users
SET is_active = TRUE, notes = 'Reactivated on 2026-01-28'
WHERE email = 'user@example.com';

-- ----------------------------------------------------------------------------
-- REMOVE USERS
-- ----------------------------------------------------------------------------

-- Soft delete (recommended - keeps history)
UPDATE allowed_users
SET is_active = FALSE
WHERE email = 'user@example.com';

-- Hard delete (permanent - use with caution!)
DELETE FROM allowed_users
WHERE email = 'user@example.com';

-- Delete multiple users
DELETE FROM allowed_users
WHERE email IN ('user1@example.com', 'user2@example.com');

-- Delete all inactive users (cleanup)
DELETE FROM allowed_users
WHERE is_active = FALSE;

-- ----------------------------------------------------------------------------
-- SEARCH & FILTER
-- ----------------------------------------------------------------------------

-- Find user by email (partial match)
SELECT * FROM allowed_users
WHERE email ILIKE '%example%';

-- Find users by role
SELECT * FROM allowed_users
WHERE role = 'Manager' AND is_active = TRUE;

-- Find users added by a specific person
SELECT * FROM allowed_users
WHERE invited_by = 'manager@example.com';

-- Find recently added users (last 7 days)
SELECT * FROM allowed_users
WHERE invited_at > NOW() - INTERVAL '7 days'
ORDER BY invited_at DESC;

-- Find users with no notes
SELECT * FROM allowed_users
WHERE notes IS NULL OR notes = '';

-- ----------------------------------------------------------------------------
-- BULK OPERATIONS
-- ----------------------------------------------------------------------------

-- Promote all Sales Executives to Managers (be careful!)
UPDATE allowed_users
SET role = 'Manager'
WHERE role = 'Sales Executive' AND is_active = TRUE;

-- Deactivate all users except managers
UPDATE allowed_users
SET is_active = FALSE
WHERE role != 'Manager';

-- Add note to all Field Agronomists
UPDATE allowed_users
SET notes = COALESCE(notes || ' | ', '') || 'Field staff'
WHERE role = 'Field Agronomist';

-- ----------------------------------------------------------------------------
-- VALIDATION & AUDIT
-- ----------------------------------------------------------------------------

-- Count users by role
SELECT
  role,
  COUNT(*) FILTER (WHERE is_active = TRUE) as active_count,
  COUNT(*) FILTER (WHERE is_active = FALSE) as inactive_count,
  COUNT(*) as total_count
FROM allowed_users
GROUP BY role
ORDER BY role;

-- Check for duplicate emails (should return 0 rows)
SELECT email, COUNT(*) as count
FROM allowed_users
GROUP BY email
HAVING COUNT(*) > 1;

-- Find users in allowlist but not in users table (haven't signed in yet)
SELECT au.email, au.role, au.invited_at
FROM allowed_users au
LEFT JOIN users u ON au.email = u.email
WHERE au.is_active = TRUE AND u.email IS NULL
ORDER BY au.invited_at;

-- Find users in users table but not in allowlist (shouldn't happen with trigger)
SELECT u.email, u.role, u.created_at
FROM users u
LEFT JOIN allowed_users au ON u.email = au.email
WHERE au.email IS NULL;

-- Check who added the most users
SELECT
  invited_by,
  COUNT(*) as users_added
FROM allowed_users
WHERE invited_by IS NOT NULL
GROUP BY invited_by
ORDER BY users_added DESC;

-- ----------------------------------------------------------------------------
-- TESTING
-- ----------------------------------------------------------------------------

-- Check if a specific email is allowed
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM allowed_users
      WHERE email = 'test@example.com' AND is_active = TRUE
    )
    THEN 'ALLOWED'
    ELSE 'DENIED'
  END as access_status;

-- Test the validation function (don't actually run this, it's for reference)
-- SELECT validate_user_on_signup();

-- View trigger status
SELECT
  tgname as trigger_name,
  tgenabled as enabled,
  tgtype as type
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';

-- ----------------------------------------------------------------------------
-- EMERGENCY: Disable/Enable Access Control
-- ----------------------------------------------------------------------------

-- DISABLE access control (allows anyone to sign in)
-- WARNING: Only use in emergencies!
-- ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created;

-- RE-ENABLE access control
-- ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;

-- ----------------------------------------------------------------------------
-- EXPORT DATA
-- ----------------------------------------------------------------------------

-- Export as CSV-ready format (copy results and save as CSV)
SELECT
  email,
  role,
  is_active,
  TO_CHAR(invited_at, 'YYYY-MM-DD') as invited_date,
  notes
FROM allowed_users
ORDER BY email;

-- Export active users only
SELECT email, role
FROM allowed_users
WHERE is_active = TRUE
ORDER BY role, email;
