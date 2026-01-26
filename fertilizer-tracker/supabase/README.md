# Supabase Database Migrations

This folder contains all database schema changes for the Fertilizer Tracker CRM.

## What Are Migrations?

Migrations are version-controlled database changes. Each file:
- Has a timestamp prefix (e.g., `20260125184350`)
- Contains SQL to create/modify database objects
- Is tracked so you know exactly what's in your database

## Current Migrations

1. **20260125190000_initial_schema.sql** - Complete database schema (all 6 tables, indexes, RLS policies)

## How to Use Migrations

### Adding a New Migration

When you need to change the database schema (add column, new table, etc.):

```bash
# Option 1: Using Supabase MCP (recommended during development)
# Claude can create migration via: mcp__supabase__apply_migration

# Option 2: Using Supabase CLI (for production)
npx supabase migration new add_column_to_leads
# Edit the generated file in supabase/migrations/
# Then apply: npx supabase db push
```

### Applying Migrations to New Environment

If a teammate or new environment needs the database:

```bash
# Install Supabase CLI
npm install supabase --save-dev

# Login to Supabase
npx supabase login

# Link to your project
npx supabase link --project-ref your-project-ref

# Apply all migrations
npx supabase db push
```

### Viewing Current Database State

```bash
# See what migrations are applied
npx supabase migration list

# Or use Claude with Supabase MCP:
# mcp__supabase__list_migrations
```

## Migration Naming Convention

Format: `YYYYMMDDHHMMSS_description.sql`

Examples:
- ✅ `20260125184350_create_users_table.sql`
- ✅ `20260126120000_add_email_verified_to_users.sql`
- ✅ `20260127093000_create_notifications_table.sql`
- ❌ `migration1.sql` (no timestamp)
- ❌ `users.sql` (not descriptive)

## Best Practices

1. **Never edit old migrations** - Always create new ones to modify schema
2. **Test locally first** - Apply migration in dev before production
3. **Keep migrations small** - One logical change per migration
4. **Add comments** - Explain WHY, not just WHAT
5. **Version control** - Commit migrations to git immediately

## Database Schema Overview

```
users (authentication)
  ├─→ leads (farmers/prospects)
  │    ├─→ field_visits (site visits)
  │    └─→ quotations (sales quotes)
  │         └─→ payments (transactions)
  └─→ lookups (master data)
```

## Key Features

- **UUIDv7** primary keys - Time-ordered for better performance
- **Auto-generated Display IDs** - `LEA-0001`, `VIS-0064`, etc.
- **Row Level Security (RLS)** - Fine-grained permissions per row
- **Soft Deletes** - Records marked as deleted, not removed
- **Audit Fields** - Track who created/deleted and when

## Emergency: Rollback a Migration

If you need to undo a migration:

```bash
# Create a new "down" migration that reverses the change
npx supabase migration new rollback_previous_change

# Example: If you added a column, write SQL to drop it
# ALTER TABLE leads DROP COLUMN new_column;
```

**Never delete migration files** - this breaks version control!

## Questions?

- Supabase Docs: https://supabase.com/docs/guides/cli/local-development
- Ask Claude with Supabase MCP tools for help!
