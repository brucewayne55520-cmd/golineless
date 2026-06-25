-- Migration: Add specializations column to runners table
-- This column stores an array of specialization keys (e.g., "hospital", "senior", "bank")
-- Run this in Neon SQL Editor before deploying the runner profile specializations feature.

-- 1. Add specializations column (text array, defaults to empty array)
ALTER TABLE runners ADD COLUMN IF NOT EXISTS specializations text[] DEFAULT '{}';

-- 2. Verify the column exists
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'runners' AND column_name = 'specializations';

-- Expected output:
--  column_name     | data_type | column_default
-- -----------------+-----------+----------------
--  specializations | text[]    | '{}'
