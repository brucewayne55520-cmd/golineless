-- ============================================================
-- Fix: Add missing columns to runners table
-- The TypeScript schema has these columns but the initial Drizzle
-- migration didn't include them.  The users table had them added
-- manually, but the runners table was missed.
--
-- Run this in the Neon SQL Console:
--   https://console.neon.tech → your project → SQL Editor
-- ============================================================

-- Critical: enables email+password login for runners
ALTER TABLE runners ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Additional TypeScript schema columns that are missing from the DB
ALTER TABLE runners ADD COLUMN IF NOT EXISTS unique_id TEXT;
ALTER TABLE runners ADD COLUMN IF NOT EXISTS specializations TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE runners ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;

-- Missing indexes (were defined in NEON_DB_COMPLETE.sql but not in the migration)
CREATE INDEX IF NOT EXISTS idx_runners_phone ON runners(phone);
CREATE INDEX IF NOT EXISTS idx_runners_kyc_status ON runners(kyc_status);
CREATE INDEX IF NOT EXISTS idx_runners_is_online ON runners(is_online);
CREATE INDEX IF NOT EXISTS idx_runners_city ON runners(city);
CREATE INDEX IF NOT EXISTS idx_runners_dispatch_allowed ON runners(dispatch_allowed);
CREATE INDEX IF NOT EXISTS idx_runners_trust_score ON runners(trust_score);

-- ============================================================
-- Verify the fix:
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'runners' AND column_name = 'password_hash';
-- Should return 1 row.
-- ============================================================
