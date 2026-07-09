-- ============================================================
-- Migration: Add missing columns/indexes from Drizzle schema
-- Generated: 2026-07-09
-- Source of Truth: lib/db/src/schema/*.ts
--
-- These columns/indexes exist in the Drizzle ORM schema but
-- are missing from NEON_DB_COMPLETE.sql. All statements use
-- IF NOT EXISTS / EXCEPTION blocks for safe re-runs.
-- ============================================================


-- ============================================================
-- 1. USERS — Add email verification columns
-- Source: lib/db/src/schema/users.ts
-- ============================================================
DO $$ BEGIN
  ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE users ADD COLUMN email_verification_token TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE users ADD COLUMN email_verification_expires_at TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;


-- ============================================================
-- 2. RUNNERS — Add email verification columns
-- Source: lib/db/src/schema/runners.ts
-- ============================================================
DO $$ BEGIN
  ALTER TABLE runners ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE runners ADD COLUMN email_verification_token TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE runners ADD COLUMN email_verification_expires_at TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;


-- ============================================================
-- 3. ADMIN_SETTINGS — Add auto_create_accounts, pilot_zones,
--    active_coupons columns
-- Source: lib/db/src/schema/admin-settings.ts
-- ============================================================
DO $$ BEGIN
  ALTER TABLE admin_settings ADD COLUMN auto_create_accounts BOOLEAN NOT NULL DEFAULT TRUE;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE admin_settings ADD COLUMN pilot_zones TEXT[] NOT NULL DEFAULT '{Juhapura,Sarkhej,Prahladnagar,Makarba,Paldi,Vasna,Jamalpur,Kalupur}';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE admin_settings ADD COLUMN active_coupons TEXT[] NOT NULL DEFAULT '{GOLINELESS10}';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;


-- ============================================================
-- 4. REVIEWS — Add unique composite index on (task_id, user_id)
-- Source: lib/db/src/schema/reviews.ts (uniqueIndex)
-- Note: Individual idx_reviews_task_id and idx_reviews_user_id
--       already exist. This adds the UNIQUE constraint.
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_task_user
  ON reviews(task_id, user_id);


-- ============================================================
-- DONE — 9 columns + 1 index added
--
-- Summary of changes:
--   users:              +3 columns (email_verified, email_verification_token, email_verification_expires_at)
--   runners:            +3 columns (email_verified, email_verification_token, email_verification_expires_at)
--   admin_settings:     +3 columns (auto_create_accounts, pilot_zones, active_coupons)
--   reviews:            +1 unique index (task_id, user_id)
-- ============================================================
