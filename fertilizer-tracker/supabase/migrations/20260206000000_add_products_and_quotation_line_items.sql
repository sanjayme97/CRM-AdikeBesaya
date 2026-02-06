-- ============================================
-- PRODUCTS TABLE
-- ============================================
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT UNIQUE,
  name TEXT NOT NULL,
  name_kannada TEXT,
  description TEXT,
  unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
  unit TEXT NOT NULL DEFAULT 'unit',
  category TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for active products lookup
CREATE INDEX idx_products_active ON products(is_active, display_order);
CREATE INDEX idx_products_name ON products(name);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Everyone (authenticated) can read products
CREATE POLICY "products_select" ON products FOR SELECT
  TO authenticated
  USING (TRUE);

-- Only managers can insert/update/delete products
CREATE POLICY "products_insert" ON products FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE email = auth.jwt() ->> 'email' AND role = 'Manager')
  );

CREATE POLICY "products_update" ON products FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE email = auth.jwt() ->> 'email' AND role = 'Manager')
  );

CREATE POLICY "products_delete" ON products FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE email = auth.jwt() ->> 'email' AND role = 'Manager')
  );

-- ============================================
-- QUOTATION LINE ITEMS TABLE
-- ============================================
CREATE TABLE quotation_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,

  -- Store snapshot of product data at quote time (prices may change later)
  product_name TEXT NOT NULL,
  unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
  quantity NUMERIC(10, 2) NOT NULL CHECK (quantity > 0),
  subtotal NUMERIC(14, 2) GENERATED ALWAYS AS (unit_price * quantity) STORED,

  notes TEXT,
  display_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_quotation_line_items_quotation_id ON quotation_line_items(quotation_id);
CREATE INDEX idx_quotation_line_items_product_id ON quotation_line_items(product_id);

-- Enable RLS
ALTER TABLE quotation_line_items ENABLE ROW LEVEL SECURITY;

-- Read: anyone authenticated can read line items for non-deleted quotations
CREATE POLICY "quotation_line_items_select" ON quotation_line_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quotations q
      WHERE q.id = quotation_id AND q.is_deleted = FALSE
    )
  );

-- Insert: user must be able to modify the parent quotation
CREATE POLICY "quotation_line_items_insert" ON quotation_line_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quotations q
      WHERE q.id = quotation_id
      AND (
        q.prepared_by = auth.jwt() ->> 'email'
        OR EXISTS (SELECT 1 FROM users WHERE email = auth.jwt() ->> 'email' AND role = 'Manager')
      )
    )
  );

-- Update: same as insert
CREATE POLICY "quotation_line_items_update" ON quotation_line_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quotations q
      WHERE q.id = quotation_id
      AND (
        q.prepared_by = auth.jwt() ->> 'email'
        OR EXISTS (SELECT 1 FROM users WHERE email = auth.jwt() ->> 'email' AND role = 'Manager')
      )
    )
  );

-- Delete: same as insert
CREATE POLICY "quotation_line_items_delete" ON quotation_line_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quotations q
      WHERE q.id = quotation_id
      AND (
        q.prepared_by = auth.jwt() ->> 'email'
        OR EXISTS (SELECT 1 FROM users WHERE email = auth.jwt() ->> 'email' AND role = 'Manager')
      )
    )
  );

-- ============================================
-- TRIGGER: Update quotation amount when line items change
-- ============================================
CREATE OR REPLACE FUNCTION update_quotation_amount()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the parent quotation's quote_amount
  UPDATE quotations
  SET quote_amount = COALESCE(
    (SELECT SUM(subtotal) FROM quotation_line_items WHERE quotation_id = COALESCE(NEW.quotation_id, OLD.quotation_id)),
    0
  ),
  last_updated = NOW()
  WHERE id = COALESCE(NEW.quotation_id, OLD.quotation_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers for insert, update, delete
CREATE TRIGGER quotation_line_items_insert_trigger
  AFTER INSERT ON quotation_line_items
  FOR EACH ROW
  EXECUTE FUNCTION update_quotation_amount();

CREATE TRIGGER quotation_line_items_update_trigger
  AFTER UPDATE ON quotation_line_items
  FOR EACH ROW
  EXECUTE FUNCTION update_quotation_amount();

CREATE TRIGGER quotation_line_items_delete_trigger
  AFTER DELETE ON quotation_line_items
  FOR EACH ROW
  EXECUTE FUNCTION update_quotation_amount();
