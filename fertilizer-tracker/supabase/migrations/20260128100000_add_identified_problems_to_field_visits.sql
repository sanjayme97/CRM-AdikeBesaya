-- ============================================================================
-- Add identified_problems column to field_visits table
-- ============================================================================
-- This column stores an array of identified crop problems/diseases
-- Selected from a predefined list of 20 problems (English labels)
-- Each problem has both English and Kannada labels in the UI

ALTER TABLE field_visits
ADD COLUMN identified_problems TEXT[] DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN field_visits.identified_problems IS 'Array of identified crop problems/diseases (e.g., ["Physiological Disorder", "Potash Deficiency"]). See CROP_PROBLEMS constant in types/index.ts for full list.';
