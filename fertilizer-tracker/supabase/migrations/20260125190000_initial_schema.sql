-- ============================================================================
-- FERTILIZER TRACKER CRM - INITIAL DATABASE SCHEMA
-- ============================================================================

-- ----------------------------------------------------------------------------
-- USERS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  picture TEXT,
  role TEXT NOT NULL DEFAULT 'Field Agronomist' CHECK (role IN ('Field Agronomist', 'Sales Executive', 'Manager')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- LEADS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE leads (
  id UUID PRIMARY KEY,
  row_number INTEGER GENERATED ALWAYS AS IDENTITY,
  display_id TEXT GENERATED ALWAYS AS ('LEA-' || LPAD(row_number::TEXT, 4, '0')) STORED,

  -- Farmer information
  farmer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  whatsapp TEXT,

  -- Location
  village TEXT,
  taluk TEXT,
  district TEXT NOT NULL,

  -- Farm details
  farm_size_acres NUMERIC(10, 2) NOT NULL,
  crop_type TEXT NOT NULL,
  crop_age TEXT,
  num_plants INTEGER,
  irrigation_type TEXT,

  -- Lead metadata
  lead_source TEXT NOT NULL,
  lead_owner TEXT NOT NULL REFERENCES users(email) ON UPDATE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('New', 'Contacted', 'Qualified', 'Not Qualified')),
  remarks TEXT,

  -- Timestamps
  created_date TIMESTAMPTZ DEFAULT NOW(),
  last_updated TIMESTAMPTZ DEFAULT NOW(),

  -- Soft delete
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_by TEXT,
  deleted_date TIMESTAMPTZ,
  delete_reason TEXT
);

-- ----------------------------------------------------------------------------
-- FIELD VISITS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE field_visits (
  id UUID PRIMARY KEY,
  row_number INTEGER GENERATED ALWAYS AS IDENTITY,
  display_id TEXT GENERATED ALWAYS AS ('VIS-' || LPAD(row_number::TEXT, 4, '0')) STORED,

  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,

  scheduled_date TIMESTAMPTZ NOT NULL,
  actual_date TIMESTAMPTZ,

  visitor_id TEXT NOT NULL REFERENCES users(email) ON UPDATE CASCADE,
  visit_outcome TEXT,
  crop_condition TEXT,
  diagnosis_notes TEXT,
  follow_up_date TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('Scheduled', 'Completed', 'Cancelled')),

  visited_by TEXT[] DEFAULT '{}',

  quotation_requested BOOLEAN DEFAULT FALSE,
  assigned_to TEXT,
  attachment_file_id TEXT,

  created_by TEXT NOT NULL REFERENCES users(email) ON UPDATE CASCADE,
  created_date TIMESTAMPTZ DEFAULT NOW(),

  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_by TEXT,
  deleted_date TIMESTAMPTZ,
  delete_reason TEXT
);

-- ----------------------------------------------------------------------------
-- QUOTATIONS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE quotations (
  id UUID PRIMARY KEY,
  row_number INTEGER GENERATED ALWAYS AS IDENTITY,
  display_id TEXT GENERATED ALWAYS AS ('QUO-' || LPAD(row_number::TEXT, 4, '0')) STORED,

  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  visit_id UUID REFERENCES field_visits(id) ON DELETE SET NULL,

  quote_date TIMESTAMPTZ NOT NULL,
  quote_amount NUMERIC(12, 2) NOT NULL CHECK (quote_amount >= 0),
  prepared_by TEXT NOT NULL REFERENCES users(email) ON UPDATE CASCADE,
  valid_until TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('Draft', 'Sent', 'Accepted', 'Rejected')),
  notes TEXT,

  delivery_status TEXT CHECK (delivery_status IN ('Pending', 'Scheduled', 'Delivered', 'Partial')),
  delivery_date TIMESTAMPTZ,
  attachment_file_id TEXT,

  last_updated TIMESTAMPTZ DEFAULT NOW(),

  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_by TEXT,
  deleted_date TIMESTAMPTZ,
  delete_reason TEXT
);

-- ----------------------------------------------------------------------------
-- PAYMENTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE payments (
  id UUID PRIMARY KEY,
  row_number INTEGER GENERATED ALWAYS AS IDENTITY,
  display_id TEXT GENERATED ALWAYS AS ('PAY-' || LPAD(row_number::TEXT, 4, '0')) STORED,

  quote_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,

  payment_date TIMESTAMPTZ NOT NULL,
  payment_amount NUMERIC(12, 2) NOT NULL CHECK (payment_amount > 0),
  payment_type TEXT NOT NULL CHECK (payment_type IN ('Advance', 'Partial', 'Final')),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('Cash', 'UPI', 'Bank Transfer')),
  transaction_ref TEXT,
  received_by TEXT NOT NULL REFERENCES users(email) ON UPDATE CASCADE,
  notes TEXT,

  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_by TEXT,
  deleted_date TIMESTAMPTZ,
  delete_reason TEXT
);

-- ----------------------------------------------------------------------------
-- LOOKUPS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE lookups (
  id UUID PRIMARY KEY,
  category TEXT NOT NULL,
  value TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  parent_value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(category, value)
);

-- ============================================================================
-- INDEXES (Only essential ones for foreign keys)
-- ============================================================================

CREATE INDEX idx_leads_lead_owner ON leads(lead_owner);
CREATE INDEX idx_field_visits_lead_id ON field_visits(lead_id);
CREATE INDEX idx_field_visits_visitor_id ON field_visits(visitor_id);
CREATE INDEX idx_quotations_lead_id ON quotations(lead_id);
CREATE INDEX idx_quotations_visit_id ON quotations(visit_id);
CREATE INDEX idx_payments_quote_id ON payments(quote_id);

-- ============================================================================
-- TRIGGERS & FUNCTIONS
-- ============================================================================

-- Auto-update timestamp function
CREATE OR REPLACE FUNCTION update_last_updated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables that need it
CREATE TRIGGER leads_update_timestamp
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_last_updated();

CREATE TRIGGER quotations_update_timestamp
  BEFORE UPDATE ON quotations
  FOR EACH ROW
  EXECUTE FUNCTION update_last_updated();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lookups ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "users_read_all" ON users FOR SELECT USING (TRUE);
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (auth.jwt() ->> 'email' = email);

-- Leads policies
CREATE POLICY "leads_read" ON leads FOR SELECT USING (is_deleted = FALSE);
CREATE POLICY "leads_insert" ON leads FOR INSERT WITH CHECK (auth.jwt() ->> 'email' IS NOT NULL);
CREATE POLICY "leads_update" ON leads FOR UPDATE
  USING (
    lead_owner = auth.jwt() ->> 'email'
    OR EXISTS (SELECT 1 FROM users WHERE email = auth.jwt() ->> 'email' AND role = 'Manager')
  );

-- Field Visits policies
CREATE POLICY "field_visits_read" ON field_visits FOR SELECT USING (is_deleted = FALSE);
CREATE POLICY "field_visits_insert" ON field_visits FOR INSERT WITH CHECK (auth.jwt() ->> 'email' IS NOT NULL);
CREATE POLICY "field_visits_update" ON field_visits FOR UPDATE
  USING (
    created_by = auth.jwt() ->> 'email'
    OR visitor_id = auth.jwt() ->> 'email'
    OR auth.jwt() ->> 'email' = ANY(visited_by)
    OR EXISTS (SELECT 1 FROM users WHERE email = auth.jwt() ->> 'email' AND role = 'Manager')
  );

-- Quotations policies
CREATE POLICY "quotations_read" ON quotations FOR SELECT USING (is_deleted = FALSE);
CREATE POLICY "quotations_insert" ON quotations FOR INSERT WITH CHECK (auth.jwt() ->> 'email' IS NOT NULL);
CREATE POLICY "quotations_update" ON quotations FOR UPDATE
  USING (
    prepared_by = auth.jwt() ->> 'email'
    OR EXISTS (SELECT 1 FROM users WHERE email = auth.jwt() ->> 'email' AND role = 'Manager')
  );

-- Payments policies
CREATE POLICY "payments_read" ON payments FOR SELECT USING (is_deleted = FALSE);
CREATE POLICY "payments_insert" ON payments FOR INSERT WITH CHECK (auth.jwt() ->> 'email' IS NOT NULL);
CREATE POLICY "payments_update" ON payments FOR UPDATE
  USING (
    received_by = auth.jwt() ->> 'email'
    OR EXISTS (SELECT 1 FROM users WHERE email = auth.jwt() ->> 'email' AND role = 'Manager')
  );

-- Lookups policies
CREATE POLICY "lookups_read" ON lookups FOR SELECT USING (active = TRUE);
CREATE POLICY "lookups_modify" ON lookups FOR ALL
  USING (
    EXISTS (SELECT 1 FROM users WHERE email = auth.jwt() ->> 'email' AND role = 'Manager')
  );
