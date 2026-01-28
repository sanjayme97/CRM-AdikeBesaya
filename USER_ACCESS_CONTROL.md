# User Access Control - Email Allowlist

## Overview

The Fertilizer Tracker now uses an **email allowlist** to restrict who can sign in via Google OAuth. Only users whose email is pre-authorized in the `allowed_users` table can access the system.

When an unauthorized user tries to sign in, they will see an error message:
> "Access denied. Your email is not authorized to access this system. Please contact your manager."

## How It Works

1. **User tries to sign in** with Google OAuth
2. **Database trigger validates** their email against the `allowed_users` table
3. **If authorized**: User is allowed in and their profile is created/updated in the `users` table
4. **If not authorized**: Sign-in is blocked with an error message

---

## Setup Instructions

### Step 1: Deploy the Migration

First, apply the access control migration to your Supabase database:

```bash
cd fertilizer-tracker
supabase db push
```

Or manually run the migration in **Supabase Dashboard** → **SQL Editor**:
- Open `supabase/migrations/20260128000000_user_access_control.sql`
- Copy the contents
- Paste into SQL Editor and click "Run"

### Step 2: Add Your First Admin User

**IMPORTANT**: Before testing, add at least one admin user (yourself) to the allowlist, otherwise you won't be able to sign in!

Open the migration file and uncomment/modify this line:

```sql
INSERT INTO allowed_users (email, role, notes)
VALUES ('your-email@example.com', 'Manager', 'Initial admin user');
```

Replace `'your-email@example.com'` with your actual email address, then run the migration.

Or add via SQL Editor:

```sql
INSERT INTO allowed_users (email, role, notes)
VALUES ('your-email@gmail.com', 'Manager', 'System administrator');
```

---

## Managing Users

### Method 1: Using SQL Editor (Recommended)

Go to **Supabase Dashboard** → **SQL Editor** and run queries:

#### Add a Single User

```sql
INSERT INTO allowed_users (email, role, notes)
VALUES ('newuser@example.com', 'Field Agronomist', 'New team member');
```

#### Add Multiple Users at Once

```sql
INSERT INTO allowed_users (email, role, notes) VALUES
  ('manager@example.com', 'Manager', 'Sales manager'),
  ('sales1@example.com', 'Sales Executive', 'Sales team'),
  ('agronomist1@example.com', 'Field Agronomist', 'Field staff'),
  ('agronomist2@example.com', 'Field Agronomist', 'Field staff');
```

#### View All Allowed Users

```sql
SELECT email, role, is_active, invited_at, notes
FROM allowed_users
ORDER BY invited_at DESC;
```

#### Remove a User (Soft Delete)

```sql
UPDATE allowed_users
SET is_active = FALSE
WHERE email = 'user@example.com';
```

#### Reactivate a User

```sql
UPDATE allowed_users
SET is_active = TRUE
WHERE email = 'user@example.com';
```

#### Permanently Delete a User

```sql
DELETE FROM allowed_users
WHERE email = 'user@example.com';
```

---

### Method 2: Using Helper Functions

The migration includes helper functions that you can call (only managers can use these):

#### Add User (from authenticated session)

```sql
SELECT add_allowed_user(
  'newuser@example.com',
  'Field Agronomist',
  'Added by manager'
);
```

#### Remove User

```sql
SELECT remove_allowed_user('user@example.com');
```

---

### Method 3: Using Table Editor

Go to **Supabase Dashboard** → **Table Editor** → **allowed_users**:

1. Click **"Insert row"**
2. Fill in:
   - **email**: User's email address
   - **role**: Select from dropdown (Field Agronomist, Sales Executive, Manager)
   - **notes**: Optional description
   - **is_active**: TRUE
3. Click **"Save"**

---

## Roles Available

| Role | Description |
|------|-------------|
| **Manager** | Full access, can manage users, modify all records |
| **Sales Executive** | Can manage quotations and payments |
| **Field Agronomist** | Can create leads and field visits |

---

## Testing Access Control

### Test Authorized User

1. Add your email to `allowed_users` table
2. Go to your app login page
3. Click "Sign in with Google"
4. You should be able to sign in successfully

### Test Unauthorized User

1. Try signing in with an email NOT in `allowed_users`
2. You should see an error: "Access denied. Your email is not authorized..."
3. The user will NOT be able to access the system

---

## Troubleshooting

### Issue: "Access denied" even though I'm in the allowlist

**Solution 1**: Check if your email is active

```sql
SELECT * FROM allowed_users WHERE email = 'your-email@example.com';
```

Make sure `is_active = TRUE`.

**Solution 2**: Check for typos

- Email addresses are case-insensitive but must match exactly
- Check for extra spaces or characters

**Solution 3**: Re-add your email

```sql
DELETE FROM allowed_users WHERE email = 'your-email@example.com';

INSERT INTO allowed_users (email, role, notes)
VALUES ('your-email@example.com', 'Manager', 'Re-added');
```

### Issue: Trigger not firing

Check if the trigger exists:

```sql
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

If missing, re-run the migration.

### Issue: Need to allow all users temporarily

Disable the trigger (NOT recommended for production):

```sql
ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created;
```

Re-enable it:

```sql
ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;
```

---

## Security Best Practices

1. **Only add trusted users** - Each email you add can access all data in the system
2. **Use Manager role sparingly** - Managers have full access
3. **Regularly audit the allowlist** - Remove users who no longer need access
4. **Use notes field** - Document why each user was added
5. **Monitor failed sign-ins** - Check Supabase logs for unauthorized attempts

---

## Bulk Import Users

If you have a CSV/Excel file with emails, you can bulk import:

### Step 1: Prepare CSV

Create `users.csv`:

```csv
email,role,notes
user1@example.com,Field Agronomist,Team member 1
user2@example.com,Sales Executive,Sales team
user3@example.com,Manager,Department head
```

### Step 2: Import via Supabase Dashboard

1. Go to **Table Editor** → **allowed_users**
2. Click **"..."** → **"Import data from CSV"**
3. Upload your CSV file
4. Map columns correctly
5. Click **"Import"**

Or use SQL:

```sql
COPY allowed_users (email, role, notes)
FROM '/path/to/users.csv'
WITH (FORMAT csv, HEADER true);
```

---

## Migration Rollback

If you need to remove access control and allow anyone to sign in:

```sql
-- Drop the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the function
DROP FUNCTION IF EXISTS validate_user_on_signup();

-- Optionally drop the table (this deletes all allowlist data!)
-- DROP TABLE IF EXISTS allowed_users CASCADE;
```

**Warning**: This will allow ANYONE with a Google account to sign in!

---

## Future Enhancements

Possible improvements to consider:

1. **Admin UI**: Build a user management page in the app (Manager-only)
2. **Email Invitations**: Send invite links that pre-add users to allowlist
3. **Domain-based Access**: Allow entire domains (e.g., @yourcompany.com)
4. **Approval Workflow**: Users request access, managers approve
5. **Expiring Access**: Add expiration dates for temporary access

---

## Support

If you have issues with user access control:

1. Check Supabase logs: **Dashboard** → **Logs** → **Auth Logs**
2. Verify trigger is active: `SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';`
3. Check allowed_users table: `SELECT * FROM allowed_users;`
4. Test with SQL Editor before using the app

---

**Last Updated**: 2026-01-28
