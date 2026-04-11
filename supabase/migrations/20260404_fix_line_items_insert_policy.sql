-- Fix: Add Admin role to quotation_line_items INSERT policy (was only Manager)
DROP POLICY IF EXISTS "quotation_line_items_insert" ON quotation_line_items;

CREATE POLICY "quotation_line_items_insert" ON quotation_line_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM quotations q
    WHERE q.id = quotation_line_items.quotation_id
    AND (
      q.prepared_by = (auth.jwt() ->> 'email')
      OR EXISTS (
        SELECT 1 FROM users
        WHERE users.email = (auth.jwt() ->> 'email')
        AND users.role IN ('Manager', 'Admin')
      )
    )
  )
);
