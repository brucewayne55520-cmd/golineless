-- ============================================================
-- FIX: Add missing columns to admin_settings table
-- Run this in Neon SQL Editor if you see query errors
-- Safe to re-run: all use ADD COLUMN IF NOT EXISTS
-- ============================================================

DO $$ BEGIN ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "app_name" text DEFAULT 'Go LineLess' NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "company_name" text DEFAULT 'IBNAY IFTRIBE PRIVATE LIMITED' NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "support_phone" text DEFAULT '+91-9999999999' NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "support_email" text DEFAULT 'support@golineless.com' NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "whatsapp_number" text DEFAULT '+91-9999999999' NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "runner_payout_percent" numeric(5, 2) DEFAULT '70' NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "urgency_surcharge" numeric(8, 2) DEFAULT '50' NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "cancellation_fee" numeric(8, 2) DEFAULT '0' NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "max_tasks_per_runner_per_day" integer DEFAULT 20 NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "maintenance_mode" boolean DEFAULT false NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "free_waiting_minutes" integer DEFAULT 15 NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "waiting_charge_per_minute" numeric(5, 2) DEFAULT '2' NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "priority_fee_amount" numeric(8, 2) DEFAULT '49' NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "emergency_fee_amount" numeric(8, 2) DEFAULT '99' NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "urgency_normal_multiplier" numeric(3, 2) DEFAULT '1.0' NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "urgency_urgent_multiplier" numeric(3, 2) DEFAULT '1.25' NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "urgency_emergency_multiplier" numeric(3, 2) DEFAULT '1.5' NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "gps_validation_radius" integer DEFAULT 250 NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "waiting_bracket1_min" integer DEFAULT 30 NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "waiting_bracket1_charge" numeric(8, 2) DEFAULT '0' NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "waiting_bracket2_min" integer DEFAULT 60 NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "waiting_bracket2_charge" numeric(8, 2) DEFAULT '30' NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "waiting_bracket3_min" integer DEFAULT 120 NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "waiting_bracket3_charge" numeric(8, 2) DEFAULT '80' NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "waiting_bracket4_charge" numeric(8, 2) DEFAULT '150' NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "dispatch_initial_radius" integer DEFAULT 3 NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "dispatch_expand_delay" integer DEFAULT 60 NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "dispatch_max_radius" integer DEFAULT 20 NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "queue_eta_multiplier_hospital" numeric(3, 1) DEFAULT '5' NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "queue_eta_multiplier_bank" numeric(3, 1) DEFAULT '2' NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "queue_eta_multiplier_govt" numeric(3, 1) DEFAULT '8' NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "queue_eta_multiplier_default" numeric(3, 1) DEFAULT '3' NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "pilot_mode" boolean DEFAULT false NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "pilot_categories" text[] DEFAULT '{medicine,document,bank,govt_office,courier,senior_care}' NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "upi_id" text DEFAULT 'golineless@upi' NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "upi_payee_name" text DEFAULT 'Go LineLess' NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Insert a settings row if none exists
INSERT INTO "admin_settings" DEFAULT VALUES
ON CONFLICT DO NOTHING;

-- Verify: run this after to check all columns exist
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'admin_settings'
ORDER BY ordinal_position;
