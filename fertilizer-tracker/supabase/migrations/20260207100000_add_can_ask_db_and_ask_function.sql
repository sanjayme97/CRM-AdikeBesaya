-- Add can_ask_db flag to allowed_users for AI query feature access control
ALTER TABLE allowed_users
ADD COLUMN can_ask_db boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN allowed_users.can_ask_db IS 'Whether this user can access the Ask Database AI feature';

-- Function to execute read-only SQL queries (used by ask-database Edge Function)
CREATE OR REPLACE FUNCTION ask_database(query_text text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
  clean_query text;
BEGIN
  clean_query := trim(query_text);

  -- Must start with SELECT or WITH
  IF NOT (lower(clean_query) ~ '^(select|with)\s') THEN
    RAISE EXCEPTION 'Only SELECT queries are allowed';
  END IF;

  -- No semicolons (prevents multi-statement injection)
  IF position(';' in clean_query) > 0 THEN
    RAISE EXCEPTION 'Multiple statements not allowed';
  END IF;

  -- Execute and return as JSON array
  EXECUTE format(
    'SELECT COALESCE(json_agg(row_to_json(t)), ''[]''::json) FROM (%s) t',
    clean_query
  ) INTO result;

  RETURN result;
END;
$$;

-- Only allow service_role to call this function (Edge Functions use service role)
REVOKE EXECUTE ON FUNCTION ask_database(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION ask_database(text) FROM anon;
REVOKE EXECUTE ON FUNCTION ask_database(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION ask_database(text) TO service_role;
