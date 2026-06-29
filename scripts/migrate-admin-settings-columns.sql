-- ============================================================
-- Migration: Add missing admin_settings columns to Neon DB
-- Safe to run multiple times (uses EXCEPTION handling)
--
-- HOW TO USE:
--   1. Open Neon SQL Editor (console.neon.tech)
--   2. Paste this entire file
--   3. Click "Run"
--   4. Each block silently skips if column already exists
-- ============================================================

-- Phase 6: Revenue config columns
DO $$ BEGIN ALTER TABLE admin_settings ADD COLUMN free_waiting_minutes INTEGER NOT NULL DEFAULT 15; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE admin_settings ADD COLUMN waiting_charge_per_minute NUMERIC(5,2) NOT NULL DEFAULT 2; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE admin_settings ADD COLUMN priority_fee_amount NUMERIC(8,2) NOT NULL DEFAULT 49; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE admin_settings ADD COLUMN emergency_fee_amount NUMERIC(8,2) NOT NULL DEFAULT 99; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE admin_settings ADD COLUMN urgency_normal_multiplier NUMERIC(3,2) NOT NULL DEFAULT 1.0; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE admin_settings ADD COLUMN urgency_urgent_multiplier NUMERIC(3,2) NOT NULL DEFAULT 1.25; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE admin_settings ADD COLUMN urgency_emergency_multiplier NUMERIC(3,2) NOT NULL DEFAULT 1.5; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Phase 7: GPS Validation
DO $$ BEGIN ALTER TABLE admin_settings ADD COLUMN gps_validation_radius INTEGER NOT NULL DEFAULT 250; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Phase 7: Waiting Revenue V2 brackets
DO $$ BEGIN ALTER TABLE admin_settings ADD COLUMN waiting_bracket1_min INTEGER NOT NULL DEFAULT 30; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE admin_settings ADD COLUMN waiting_bracket1_charge NUMERIC(8,2) NOT NULL DEFAULT 0; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE admin_settings ADD COLUMN waiting_bracket2_min INTEGER NOT NULL DEFAULT 60; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE admin_settings ADD COLUMN waiting_bracket2_charge NUMERIC(8,2) NOT NULL DEFAULT 30; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE admin_settings ADD COLUMN waiting_bracket3_min INTEGER NOT NULL DEFAULT 120; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE admin_settings ADD COLUMN waiting_bracket3_charge NUMERIC(8,2) NOT NULL DEFAULT 80; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE admin_settings ADD COLUMN waiting_bracket4_charge NUMERIC(8,2) NOT NULL DEFAULT 150; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Smart Dispatch config
DO $$ BEGIN ALTER TABLE admin_settings ADD COLUMN dispatch_initial_radius INTEGER NOT NULL DEFAULT 3; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE admin_settings ADD COLUMN dispatch_expand_delay INTEGER NOT NULL DEFAULT 60; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE admin_settings ADD COLUMN dispatch_max_radius INTEGER NOT NULL DEFAULT 20; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Phase 9.3: Queue ETA multipliers
DO $$ BEGIN ALTER TABLE admin_settings ADD COLUMN queue_eta_multiplier_hospital NUMERIC(3,1) NOT NULL DEFAULT 5; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE admin_settings ADD COLUMN queue_eta_multiplier_bank NUMERIC(3,1) NOT NULL DEFAULT 2; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE admin_settings ADD COLUMN queue_eta_multiplier_govt NUMERIC(3,1) NOT NULL DEFAULT 8; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE admin_settings ADD COLUMN queue_eta_multiplier_default NUMERIC(3,1) NOT NULL DEFAULT 3; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Phase 9: Pilot Launch Mode
DO $$ BEGIN ALTER TABLE admin_settings ADD COLUMN pilot_mode BOOLEAN NOT NULL DEFAULT FALSE; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE admin_settings ADD COLUMN pilot_categories TEXT[] NOT NULL DEFAULT '{medicine,document,bank,govt_office,courier,senior_care}'; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- UPI Configuration
DO $$ BEGIN ALTER TABLE admin_settings ADD COLUMN upi_id TEXT NOT NULL DEFAULT 'golineless@upi'; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE admin_settings ADD COLUMN upi_payee_name TEXT NOT NULL DEFAULT 'Go LineLess'; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Specializations config
DO $$ BEGIN ALTER TABLE admin_settings ADD COLUMN available_specializations TEXT[] NOT NULL DEFAULT '{hospital,senior,bank,documentation,emergency,female}'; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- ============================================================
-- VERIFY: Run this after to confirm all columns exist
-- ============================================================
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'admin_settings'
ORDER BY ordinal_position;
