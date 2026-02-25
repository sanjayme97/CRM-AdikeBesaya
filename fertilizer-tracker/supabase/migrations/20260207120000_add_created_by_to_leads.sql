-- ============================================================================
-- Add created_by field to leads table
-- ============================================================================

-- Add created_by column to leads table with default to lead_owner for existing records
ALTER TABLE leads
ADD COLUMN created_by TEXT;

-- Set default expression for new records (will be overridden by application)
ALTER TABLE leads
ALTER COLUMN created_by SET DEFAULT (SELECT email FROM users LIMIT 1);

-- Add foreign key constraint
ALTER TABLE leads
ADD CONSTRAINT leads_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(email) ON UPDATE CASCADE;

-- Add composite index for queries filtering by lead_owner and created_by together
CREATE INDEX idx_leads_owner_creator ON leads(lead_owner, created_by);

