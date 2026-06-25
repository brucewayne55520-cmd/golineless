-- ============================================================
-- Go LineLess — FINAL Database Setup (PostgreSQL / Neon)
-- Generated: 2026-06-24
-- Source of Truth: lib/db/src/schema/*.ts (Drizzle ORM)
-- Total Tables: 29 | Indexes: 40+ | Foreign Keys: 40+
--
-- SAFE TO RE-RUN: Uses IF NOT EXISTS throughout.
-- Import this file in the Neon SQL Editor to set up your database.
-- ============================================================

-- ============================================================
-- 1. USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS "users" (
  "id"                        serial PRIMARY KEY NOT NULL,
  "name"                      text,
  "phone"                     text UNIQUE,
  "email"                     text UNIQUE,
  "google_id"                 text UNIQUE,
  "password_hash"             text,
  "city"                      text,
  "area"                      text,
  "avatar"                    text,
  "language"                  text DEFAULT 'en' NOT NULL,
  "unique_id"                 text UNIQUE,
  "kyc_status"                text DEFAULT 'none' NOT NULL,
  "aadhaar_number"            text,
  "aadhaar_front"             text,
  "aadhaar_back"              text,
  "id_document_url"           text,
  "emergency_contact"         text,
  "otp"                       text,
  "otp_expires_at"            timestamp with time zone,
  "password_reset_token"      text,
  "password_reset_expires_at" timestamp with time zone,
  "created_at"                timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at"                timestamp with time zone DEFAULT now() NOT NULL
);

-- Add missing columns if table already exists (safe re-run)
DO $$ BEGIN ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "unique_id" text UNIQUE; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "kyc_status" text DEFAULT 'none' NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "aadhaar_number" text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "aadhaar_front" text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "aadhaar_back" text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "id_document_url" text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emergency_contact" text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_hash" text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "city" text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "area" text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar" text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "language" text DEFAULT 'en' NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;


-- ============================================================
-- 2. USER SESSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS "user_sessions" (
  "id"         serial PRIMARY KEY NOT NULL,
  "user_id"    integer NOT NULL,
  "token"      text NOT NULL UNIQUE,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);


-- ============================================================
-- 3. ADMINS
-- ============================================================
CREATE TABLE IF NOT EXISTS "admins" (
  "id"             serial PRIMARY KEY NOT NULL,
  "username"       text NOT NULL UNIQUE,
  "password_hash"  text NOT NULL,
  "name"           text,
  "role"           text DEFAULT 'admin' NOT NULL,
  "is_active"      boolean DEFAULT true NOT NULL,
  "last_login_at"  timestamp with time zone,
  "created_at"     timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at"     timestamp with time zone DEFAULT now() NOT NULL
);


-- ============================================================
-- 4. ADMIN SESSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS "admin_sessions" (
  "id"         serial PRIMARY KEY NOT NULL,
  "admin_id"   integer NOT NULL,
  "token"      text NOT NULL UNIQUE,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);


-- ============================================================
-- 5. RUNNERS
-- ============================================================
CREATE TABLE IF NOT EXISTS "runners" (
  "id"                        serial PRIMARY KEY NOT NULL,
  "name"                      text,
  "phone"                     text UNIQUE,
  "email"                     text UNIQUE,
  "password_hash"             text,
  "city"                      text,
  "area"                      text,
  "avatar"                    text,
  "gender"                    text,
  "unique_id"                 text,
  "kyc_status"                text DEFAULT 'pending' NOT NULL,
  "kyc_rejection_reason"      text,
  "is_online"                 boolean DEFAULT false NOT NULL,
  "rating"                    numeric(3, 2),
  "total_tasks"               integer DEFAULT 0 NOT NULL,
  "total_earnings"            numeric(10, 2),
  "current_lat"               numeric(10, 8),
  "current_lng"               numeric(11, 8),
  "full_name"                 text,
  "aadhaar_number"            text,
  "aadhaar_front"             text,
  "aadhaar_back"              text,
  "selfie"                    text,
  "bank_account"              text,
  "bank_ifsc"                 text,
  "bank_account_holder"       text,
  "emergency_contact_name"    text,
  "emergency_contact_phone"   text,
  "emergency_contact_relation" text,
  "otp"                       text,
  "otp_expires_at"            timestamp with time zone,
  "password_reset_token"      text,
  "password_reset_expires_at" timestamp with time zone,
  "onboarding_step"           integer DEFAULT 0 NOT NULL,
  "onboarding_completed"      boolean DEFAULT false NOT NULL,
  "dispatch_allowed"          boolean DEFAULT false NOT NULL,
  "gps_status"                text,
  "gps_checked_at"            timestamp with time zone,
  "trust_score"               integer DEFAULT 50 NOT NULL,
  "trust_badge"               text DEFAULT 'improving' NOT NULL,
  "tasks_accepted"            integer DEFAULT 0 NOT NULL,
  "tasks_completed"           integer DEFAULT 0 NOT NULL,
  "tasks_cancelled"           integer DEFAULT 0 NOT NULL,
  "average_rating"            numeric(3, 2),
  "average_response_time"     numeric(8, 2),
  "late_arrivals"             integer DEFAULT 0 NOT NULL,
  "on_time_arrivals"          integer DEFAULT 0 NOT NULL,
  "repeat_clients"            integer DEFAULT 0 NOT NULL,
  "created_at"                timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at"                timestamp with time zone DEFAULT now() NOT NULL
);

-- Add missing columns if table already exists
DO $$ BEGIN ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "unique_id" text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "password_hash" text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "gender" text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "full_name" text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "aadhaar_number" text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "aadhaar_front" text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "aadhaar_back" text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "selfie" text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "bank_account" text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "bank_ifsc" text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "bank_account_holder" text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "emergency_contact_name" text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "emergency_contact_phone" text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "emergency_contact_relation" text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "password_reset_token" text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "password_reset_expires_at" timestamp with time zone; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "kyc_rejection_reason" text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "total_tasks" integer DEFAULT 0 NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "total_earnings" numeric(10, 2); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "current_lat" numeric(10, 8); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "current_lng" numeric(11, 8); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "onboarding_step" integer DEFAULT 0 NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "onboarding_completed" boolean DEFAULT false NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "dispatch_allowed" boolean DEFAULT false NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "gps_status" text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "gps_checked_at" timestamp with time zone; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "trust_score" integer DEFAULT 50 NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "trust_badge" text DEFAULT 'improving' NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "tasks_accepted" integer DEFAULT 0 NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "tasks_completed" integer DEFAULT 0 NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "tasks_cancelled" integer DEFAULT 0 NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "average_rating" numeric(3, 2); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "average_response_time" numeric(8, 2); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "late_arrivals" integer DEFAULT 0 NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "on_time_arrivals" integer DEFAULT 0 NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "repeat_clients" integer DEFAULT 0 NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;


-- ============================================================
-- 6. RUNNER SESSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS "runner_sessions" (
  "id"         serial PRIMARY KEY NOT NULL,
  "runner_id"  integer NOT NULL,
  "token"      text NOT NULL UNIQUE,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);


-- ============================================================
-- 7. TASKS
-- ============================================================
CREATE TABLE IF NOT EXISTS "tasks" (
  "id"                         serial PRIMARY KEY NOT NULL,
  "user_id"                    integer NOT NULL,
  "runner_id"                  integer,
  "category"                   text NOT NULL,
  "description"                text NOT NULL DEFAULT '',
  "status"                     text DEFAULT 'pending' NOT NULL,
  "urgency"                    text DEFAULT 'normal' NOT NULL,
  "location_name"              text,
  "location_area"              text,
  "location_city"              text,
  "location_lat"               numeric(10, 8),
  "location_lng"               numeric(11, 8),
  "distance_band"              text,
  "scheduled_at"               timestamp with time zone,
  "base_price"                 numeric(8, 2) DEFAULT '0' NOT NULL,
  "distance_charge"            numeric(8, 2) DEFAULT '0' NOT NULL,
  "urgency_charge"             numeric(8, 2) DEFAULT '0' NOT NULL,
  "price"                      numeric(8, 2) DEFAULT '0' NOT NULL,
  "runner_earning"             numeric(8, 2) DEFAULT '0' NOT NULL,
  "platform_fee"               numeric(8, 2) DEFAULT '0' NOT NULL,
  "payment_method"             text DEFAULT 'cash' NOT NULL,
  "payment_status"             text DEFAULT 'pending' NOT NULL,
  "payment_confirmed_by"       integer,
  "payment_confirmed_at"       timestamp with time zone,
  "paid_amount"                numeric(8, 2) DEFAULT '0' NOT NULL,
  "coupon_code"                text,
  "discount_amount"            numeric(8, 2) DEFAULT '0' NOT NULL,
  "otp"                        text,
  "otp_verified"               boolean DEFAULT false NOT NULL,
  "senior_involved"            boolean DEFAULT false NOT NULL,
  "special_instructions"       text,
  "proof_photos"               text[] DEFAULT '{}' NOT NULL,
  "cancel_reason"              text,
  "internal_notes"             text,
  "completed_at"               timestamp with time zone,
  "pickup_required"            boolean DEFAULT false NOT NULL,
  "pickup_address"             text,
  "pickup_area"                text,
  "pickup_lat"                 numeric(10, 8),
  "pickup_lng"                 numeric(11, 8),
  "task_lat"                   numeric(10, 8),
  "task_lng"                   numeric(11, 8),
  "from_area"                  text,
  "to_area"                    text,
  "estimated_duration_minutes" integer,
  "accepted_at"                timestamp with time zone,
  "started_at"                 timestamp with time zone,
  "reached_pickup_at"          timestamp with time zone,
  "reached_task_location_at"   timestamp with time zone,
  "task_timeline"              text[] DEFAULT '{}' NOT NULL,
  "priority_level"             text DEFAULT 'normal' NOT NULL,
  "priority_fee"               numeric(8, 2) DEFAULT '0' NOT NULL,
  "waiting_charge_amount"      numeric(8, 2) DEFAULT '0' NOT NULL,
  "waiting_earnings"           numeric(8, 2) DEFAULT '0' NOT NULL,
  "bonus_earnings"             numeric(8, 2) DEFAULT '0' NOT NULL,
  "invoice_number"             text,
  "waiting_started_at"         timestamp with time zone,
  "waiting_ended_at"           timestamp with time zone,
  "total_waiting_minutes"      integer,
  "queue_type"                 text,
  "token_number"               text,
  "current_token"              text,
  "counter_number"             text,
  "expected_token_number"      text,
  "queue_gap"                  integer,
  "estimated_wait_minutes"     integer,
  "queue_progress_percent"     integer,
  "queue_notes"                text,
  "family_contact_name"        text,
  "family_contact_phone"       text,
  "family_tracking_token"      text,
  "family_token_expires_at"    timestamp with time zone,
  "gps_verified"               boolean,
  "gps_distance_from_task"     integer,
  "otp_attempts"               integer DEFAULT 0 NOT NULL,
  "otp_expires_at"             timestamp with time zone,
  "otp_locked_until"           timestamp with time zone,
  "fraud_flags"                text[] DEFAULT '{}' NOT NULL,
  "dispatch_attempts"          integer DEFAULT 0 NOT NULL,
  "dispatch_radius_used"       integer DEFAULT 0 NOT NULL,
  "dispatch_notified_count"    integer DEFAULT 0 NOT NULL,
  "time_to_acceptance"         integer,
  "active_runner_id"           integer,
  "created_at"                 timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at"                 timestamp with time zone DEFAULT now() NOT NULL
);

-- Add missing columns if table already exists
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "description" text NOT NULL DEFAULT ''; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "urgency" text DEFAULT 'normal' NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "location_name" text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "location_area" text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "location_city" text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "location_lat" numeric(10, 8); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "location_lng" numeric(11, 8); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "distance_band" text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "scheduled_at" timestamp with time zone; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "base_price" numeric(8, 2) DEFAULT '0' NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "distance_charge" numeric(8, 2) DEFAULT '0' NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "urgency_charge" numeric(8, 2) DEFAULT '0' NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "price" numeric(8, 2) DEFAULT '0' NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "runner_earning" numeric(8, 2) DEFAULT '0' NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "platform_fee" numeric(8, 2) DEFAULT '0' NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "payment_method" text DEFAULT 'cash' NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "payment_status" text DEFAULT 'pending' NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "payment_confirmed_by" integer; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "payment_confirmed_at" timestamp with time zone; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "paid_amount" numeric(8, 2) DEFAULT '0' NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "coupon_code" text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "discount_amount" numeric(8, 2) DEFAULT '0' NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "otp" text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "otp_verified" boolean DEFAULT false NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "senior_involved" boolean DEFAULT false NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "special_instructions" text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "proof_photos" text[] DEFAULT '{}' NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "cancel_reason" text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "internal_notes" text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "completed_at" timestamp with time zone; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "pickup_required" boolean DEFAULT false NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "pickup_address" text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "pickup_area" text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "pickup_lat" numeric(10, 8); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "pickup_lng" numeric(11, 8); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "task_lat" numeric(10, 8); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "task_lng" numeric(11, 8); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "from_area" text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "to_area" text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "estimated_duration_minutes" integer; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "accepted_at" timestamp with time zone; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "started_at" timestamp with time zone; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "reached_pickup_at" timestamp with time zone; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "reached_task_location_at" timestamp with time zone; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "task_timeline" text[] DEFAULT '{}' NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "priority_level" text DEFAULT 'normal' NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "priority_fee" numeric(8, 2) DEFAULT '0' NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "waiting_charge_amount" numeric(8, 2) DEFAULT '0' NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "waiting_earnings" numeric(8, 2) DEFAULT '0' NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "bonus_earnings" numeric(8, 2) DEFAULT '0' NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "invoice_number" text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "waiting_started_at" timestamp with time zone; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "waiting_ended_at" timestamp with time zone; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "total_waiting_minutes" integer; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "queue_type" text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "token_number" text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "current_token" text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "counter_number" text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "expected_token_number" text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "queue_gap" integer; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "estimated_wait_minutes" integer; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "queue_progress_percent" integer; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "queue_notes" text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "family_contact_name" text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "family_contact_phone" text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "family_tracking_token" text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "family_token_expires_at" timestamp with time zone; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "gps_verified" boolean; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "gps_distance_from_task" integer; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "otp_attempts" integer DEFAULT 0 NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "otp_expires_at" timestamp with time zone; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "otp_locked_until" timestamp with time zone; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "fraud_flags" text[] DEFAULT '{}' NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "dispatch_attempts" integer DEFAULT 0 NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "dispatch_radius_used" integer DEFAULT 0 NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "dispatch_notified_count" integer DEFAULT 0 NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "time_to_acceptance" integer; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "active_runner_id" integer; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Indexes for tasks
CREATE INDEX IF NOT EXISTS "idx_tasks_user_id"              ON "tasks" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "idx_tasks_runner_id"            ON "tasks" USING btree ("runner_id");
CREATE INDEX IF NOT EXISTS "idx_tasks_status"               ON "tasks" USING btree ("status");
CREATE INDEX IF NOT EXISTS "idx_tasks_created_at"           ON "tasks" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "idx_tasks_status_runner"        ON "tasks" USING btree ("status", "runner_id");
CREATE INDEX IF NOT EXISTS "idx_tasks_status_category"      ON "tasks" USING btree ("status", "category");
CREATE INDEX IF NOT EXISTS "idx_tasks_user_status"          ON "tasks" USING btree ("user_id", "status");
CREATE INDEX IF NOT EXISTS "idx_tasks_runner_status"        ON "tasks" USING btree ("runner_id", "status");
CREATE INDEX IF NOT EXISTS "idx_tasks_completed_at"         ON "tasks" USING btree ("completed_at");
CREATE INDEX IF NOT EXISTS "idx_tasks_payment_method_status" ON "tasks" USING btree ("payment_method", "payment_status");


-- ============================================================
-- 8. NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS "notifications" (
  "id"         serial PRIMARY KEY NOT NULL,
  "user_id"    integer,
  "runner_id"  integer,
  "type"       text NOT NULL,
  "title"      text NOT NULL,
  "message"    text NOT NULL,
  "is_read"    boolean DEFAULT false NOT NULL,
  "task_id"    integer,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "user_id" integer; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "runner_id" integer; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "task_id" integer; EXCEPTION WHEN duplicate_column THEN NULL; END $$;


-- ============================================================
-- 9. REVIEWS
-- ============================================================
CREATE TABLE IF NOT EXISTS "reviews" (
  "id"          serial PRIMARY KEY NOT NULL,
  "task_id"     integer NOT NULL,
  "user_id"     integer,
  "runner_id"   integer,
  "rating"      integer NOT NULL,
  "review"      text,
  "feedback"    text,
  "issue_report" text,
  "created_at"  timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at"  timestamp with time zone
);

DO $$ BEGIN ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "user_id" integer; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "runner_id" integer; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "feedback" text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "issue_report" text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone; EXCEPTION WHEN duplicate_column THEN NULL; END $$;


-- ============================================================
-- 10. SUBSCRIPTION PLANS
-- ============================================================
CREATE TABLE IF NOT EXISTS "subscription_plans" (
  "id"               text PRIMARY KEY NOT NULL,
  "name"             text NOT NULL,
  "price_monthly"    numeric(10, 2) NOT NULL,
  "price_yearly"     numeric(10, 2) NOT NULL,
  "tasks_per_month"  integer,
  "features"         text[] DEFAULT '{}' NOT NULL,
  "badge"            text,
  "is_popular"       boolean DEFAULT false NOT NULL,
  "is_active"        boolean DEFAULT true NOT NULL,
  "created_at"       timestamp with time zone DEFAULT now() NOT NULL
);


-- ============================================================
-- 11. SUBSCRIPTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS "subscriptions" (
  "id"             serial PRIMARY KEY NOT NULL,
  "user_id"        integer NOT NULL,
  "plan_id"        text NOT NULL,
  "plan_name"      text NOT NULL,
  "billing_cycle"  text DEFAULT 'monthly' NOT NULL,
  "status"         text DEFAULT 'active' NOT NULL,
  "tasks_per_month" integer,
  "tasks_used"     integer DEFAULT 0 NOT NULL,
  "start_date"     timestamp with time zone DEFAULT now() NOT NULL,
  "end_date"       timestamp with time zone,
  "amount"         numeric(10, 2) NOT NULL DEFAULT 0,
  "created_at"     timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at"     timestamp with time zone DEFAULT now() NOT NULL
);


-- ============================================================
-- 12. ADMIN SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS "admin_settings" (
  "id"                       serial PRIMARY KEY NOT NULL,
  "app_name"                 text DEFAULT 'Go LineLess' NOT NULL,
  "company_name"             text DEFAULT 'IBNAY IFTRIBE PRIVATE LIMITED' NOT NULL,
  "support_phone"            text DEFAULT '+91-9999999999' NOT NULL,
  "support_email"            text DEFAULT 'support@golineless.com' NOT NULL,
  "whatsapp_number"          text DEFAULT '+91-9999999999' NOT NULL,
  "runner_payout_percent"    numeric(5, 2) DEFAULT '70' NOT NULL,
  "urgency_surcharge"        numeric(8, 2) DEFAULT '50' NOT NULL,
  "cancellation_fee"         numeric(8, 2) DEFAULT '0' NOT NULL,
  "max_tasks_per_runner_per_day" integer DEFAULT 20 NOT NULL,
  "maintenance_mode"         boolean DEFAULT false NOT NULL,
  "free_waiting_minutes"     integer DEFAULT 15 NOT NULL,
  "waiting_charge_per_minute" numeric(5, 2) DEFAULT '2' NOT NULL,
  "priority_fee_amount"      numeric(8, 2) DEFAULT '49' NOT NULL,
  "emergency_fee_amount"     numeric(8, 2) DEFAULT '99' NOT NULL,
  "urgency_normal_multiplier"   numeric(3, 2) DEFAULT '1.0' NOT NULL,
  "urgency_urgent_multiplier"   numeric(3, 2) DEFAULT '1.25' NOT NULL,
  "urgency_emergency_multiplier" numeric(3, 2) DEFAULT '1.5' NOT NULL,
  "gps_validation_radius"    integer DEFAULT 250 NOT NULL,
  "waiting_bracket1_min"     integer DEFAULT 30 NOT NULL,
  "waiting_bracket1_charge"  numeric(8, 2) DEFAULT '0' NOT NULL,
  "waiting_bracket2_min"     integer DEFAULT 60 NOT NULL,
  "waiting_bracket2_charge"  numeric(8, 2) DEFAULT '30' NOT NULL,
  "waiting_bracket3_min"     integer DEFAULT 120 NOT NULL,
  "waiting_bracket3_charge"  numeric(8, 2) DEFAULT '80' NOT NULL,
  "waiting_bracket4_charge"  numeric(8, 2) DEFAULT '150' NOT NULL,
  "dispatch_initial_radius"  integer DEFAULT 3 NOT NULL,
  "dispatch_expand_delay"    integer DEFAULT 60 NOT NULL,
  "dispatch_max_radius"      integer DEFAULT 20 NOT NULL,
  "queue_eta_multiplier_hospital" numeric(3, 1) DEFAULT '5' NOT NULL,
  "queue_eta_multiplier_bank"     numeric(3, 1) DEFAULT '2' NOT NULL,
  "queue_eta_multiplier_govt"     numeric(3, 1) DEFAULT '8' NOT NULL,
  "queue_eta_multiplier_default"  numeric(3, 1) DEFAULT '3' NOT NULL,
  "pilot_mode"               boolean DEFAULT false NOT NULL,
  "pilot_categories"         text[] DEFAULT '{medicine,document,bank,govt_office,courier,senior_care}' NOT NULL,
  "upi_id"                   text DEFAULT 'golineless@upi' NOT NULL,
  "upi_payee_name"           text DEFAULT 'Go LineLess' NOT NULL,
  "updated_at"               timestamp with time zone DEFAULT now() NOT NULL
);


-- ============================================================
-- 13. DEVICE TOKENS
-- ============================================================
CREATE TABLE IF NOT EXISTS "device_tokens" (
  "id"         serial PRIMARY KEY NOT NULL,
  "user_id"    integer,
  "runner_id"  integer,
  "token"      text NOT NULL,
  "platform"   text,
  "is_active"  boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);


-- ============================================================
-- 14. RUNNER LOCATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS "runner_locations" (
  "id"          serial PRIMARY KEY NOT NULL,
  "runner_id"   integer NOT NULL,
  "task_id"     integer,
  "lat"         numeric(10, 8) NOT NULL,
  "lng"         numeric(11, 8) NOT NULL,
  "heading"     numeric(5, 2) DEFAULT '0',
  "speed"       numeric(5, 2) DEFAULT '0',
  "recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);


-- ============================================================
-- 15. RECRUITMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS "recruitments" (
  "id"                    serial PRIMARY KEY NOT NULL,
  "name"                  text NOT NULL,
  "phone"                 text NOT NULL,
  "area"                  text NOT NULL,
  "vehicle_type"          text DEFAULT 'bicycle' NOT NULL,
  "languages"             text[] DEFAULT '{hindi}' NOT NULL,
  "availability"          text DEFAULT 'full_time' NOT NULL,
  "stage"                 text DEFAULT 'applied' NOT NULL,
  "notes"                 text,
  "interview_date"        timestamp with time zone,
  "documents_submitted_at" timestamp with time zone,
  "training_completed_at" timestamp with time zone,
  "training_score"        integer,
  "activated_at"          timestamp with time zone,
  "runner_id"             integer,
  "created_at"            timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at"            timestamp with time zone DEFAULT now() NOT NULL
);


-- ============================================================
-- 16. TRAINING MODULES
-- ============================================================
CREATE TABLE IF NOT EXISTS "training_modules" (
  "id"           serial PRIMARY KEY NOT NULL,
  "topic"        text NOT NULL,
  "description"  text,
  "order"        integer DEFAULT 0 NOT NULL,
  "is_required"  boolean DEFAULT true NOT NULL,
  "created_at"   timestamp with time zone DEFAULT now() NOT NULL
);


-- ============================================================
-- 17. RUNNER TRAINING
-- ============================================================
CREATE TABLE IF NOT EXISTS "runner_training" (
  "id"           serial PRIMARY KEY NOT NULL,
  "runner_id"    integer NOT NULL,
  "module_id"    integer NOT NULL,
  "completed"    boolean DEFAULT false NOT NULL,
  "score"        integer,
  "completed_at" timestamp with time zone,
  "created_at"   timestamp with time zone DEFAULT now() NOT NULL
);


-- ============================================================
-- 18. QUALITY REVIEWS
-- ============================================================
CREATE TABLE IF NOT EXISTS "quality_reviews" (
  "id"                       serial PRIMARY KEY NOT NULL,
  "task_id"                  integer NOT NULL,
  "runner_id"                integer NOT NULL,
  "customer_rating"          integer,
  "customer_feedback"        text,
  "comrade_feedback"         text,
  "task_quality_score"       integer,
  "sla_grade"                text,
  "acceptance_time_seconds"  integer,
  "arrival_time_minutes"     integer,
  "completion_time_minutes"  integer,
  "reviewed_at"              timestamp with time zone,
  "created_at"               timestamp with time zone DEFAULT now() NOT NULL
);


-- ============================================================
-- 19. INCIDENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS "incidents" (
  "id"             serial PRIMARY KEY NOT NULL,
  "type"           text NOT NULL,
  "task_id"        integer,
  "runner_id"      integer,
  "user_id"        integer,
  "title"          text NOT NULL,
  "description"    text NOT NULL,
  "severity"       text DEFAULT 'medium' NOT NULL,
  "status"         text DEFAULT 'open' NOT NULL,
  "assigned_admin" text,
  "resolution"     text,
  "resolved_at"    timestamp with time zone,
  "created_at"     timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at"     timestamp with time zone DEFAULT now() NOT NULL
);


-- ============================================================
-- 20. SUPPORT TICKETS
-- ============================================================
CREATE TABLE IF NOT EXISTS "support_tickets" (
  "id"                    serial PRIMARY KEY NOT NULL,
  "ticket_id"             text NOT NULL,
  "task_id"               integer,
  "user_id"               integer,
  "runner_id"             integer,
  "subject"               text NOT NULL,
  "description"           text NOT NULL,
  "category"              text DEFAULT 'general' NOT NULL,
  "status"                text DEFAULT 'open' NOT NULL,
  "priority"              text DEFAULT 'normal' NOT NULL,
  "assigned_admin"        text,
  "resolution"            text,
  "refund_amount"         integer,
  "resolution_time_minutes" integer,
  "resolved_at"           timestamp with time zone,
  "closed_at"             timestamp with time zone,
  "created_at"            timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at"            timestamp with time zone DEFAULT now() NOT NULL
);


-- ============================================================
-- 21. FRAUD FLAGS
-- ============================================================
CREATE TABLE IF NOT EXISTS "fraud_flags" (
  "id"               serial PRIMARY KEY NOT NULL,
  "task_id"          integer NOT NULL,
  "runner_id"        integer,
  "type"             text NOT NULL,
  "from_status"      text,
  "to_status"        text,
  "reason"           text,
  "distance_meters"  double precision,
  "max_allowed"      double precision,
  "proof_type"       text,
  "duplicate_count"  integer,
  "metadata"         jsonb,
  "created_at"       timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_fraud_flag_task_id"    ON "fraud_flags" USING btree ("task_id");
CREATE INDEX IF NOT EXISTS "idx_fraud_flag_runner_id"  ON "fraud_flags" USING btree ("runner_id");
CREATE INDEX IF NOT EXISTS "idx_fraud_flag_type"       ON "fraud_flags" USING btree ("type");
CREATE INDEX IF NOT EXISTS "idx_fraud_flag_created_at" ON "fraud_flags" USING btree ("created_at");


-- ============================================================
-- 22. PROOF PHOTOS
-- ============================================================
CREATE TABLE IF NOT EXISTS "proof_photos" (
  "id"            serial PRIMARY KEY NOT NULL,
  "task_id"       integer NOT NULL,
  "runner_id"     integer,
  "proof_type"    text DEFAULT 'general' NOT NULL,
  "image_url"     text NOT NULL,
  "lat"           double precision,
  "lng"           double precision,
  "address"       text,
  "task_status"   text,
  "uploaded_by"   text,
  "gps_verified"  boolean DEFAULT false NOT NULL,
  "created_at"    timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_proof_photo_task_id"       ON "proof_photos" USING btree ("task_id");
CREATE INDEX IF NOT EXISTS "idx_proof_photo_runner_id"     ON "proof_photos" USING btree ("runner_id");
CREATE INDEX IF NOT EXISTS "idx_proof_photo_type"          ON "proof_photos" USING btree ("proof_type");
CREATE INDEX IF NOT EXISTS "idx_proof_photo_created_at"    ON "proof_photos" USING btree ("created_at");


-- ============================================================
-- 23. TASK TIMELINE EVENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS "task_timeline_events" (
  "id"               serial PRIMARY KEY NOT NULL,
  "task_id"          integer NOT NULL,
  "status"           text NOT NULL,
  "label"            text NOT NULL,
  "event_timestamp"  timestamp with time zone NOT NULL,
  "metadata"         jsonb,
  "created_at"       timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_timeline_task_id"         ON "task_timeline_events" USING btree ("task_id");
CREATE INDEX IF NOT EXISTS "idx_timeline_status"          ON "task_timeline_events" USING btree ("status");
CREATE INDEX IF NOT EXISTS "idx_timeline_event_timestamp" ON "task_timeline_events" USING btree ("event_timestamp");


-- ============================================================
-- 24. RUNNER PAYOUTS
-- ============================================================
CREATE TABLE IF NOT EXISTS "runner_payouts" (
  "id"          serial PRIMARY KEY NOT NULL,
  "runner_id"   integer NOT NULL,
  "amount"      numeric(10, 2) NOT NULL,
  "task_count"  integer DEFAULT 0 NOT NULL,
  "task_ids"    integer[] DEFAULT '{}' NOT NULL,
  "status"      text DEFAULT 'pending' NOT NULL,
  "settled_by"  text,
  "settled_at"  timestamp with time zone,
  "reference"   text,
  "notes"       text,
  "created_at"  timestamp with time zone DEFAULT now() NOT NULL
);

-- Fix task_ids column type if it was created as text (from older migration)
DO $$ BEGIN ALTER TABLE "runner_payouts" ALTER COLUMN "task_ids" TYPE integer[] USING string_to_array("task_ids", ',')::integer[]; EXCEPTION WHEN others THEN NULL; END $$;


-- ============================================================
-- 25. PAYMENT AUDIT LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS "payment_audit_log" (
  "id"              serial PRIMARY KEY NOT NULL,
  "task_id"         integer,
  "previous_status" text,
  "new_status"      text,
  "actor"           text,
  "actor_type"      text,
  "reason"          text,
  "metadata"        jsonb,
  "created_at"      timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_payaudit_task_id"    ON "payment_audit_log" USING btree ("task_id");
CREATE INDEX IF NOT EXISTS "idx_payaudit_created_at" ON "payment_audit_log" USING btree ("created_at");


-- ============================================================
-- 26. VERIFICATION SESSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS "verification_sessions" (
  "id"              serial PRIMARY KEY NOT NULL,
  "user_id"         integer,
  "task_id"         integer,
  "challenge_id"    text NOT NULL UNIQUE,
  "challenge_code"  text NOT NULL,
  "status"          text DEFAULT 'active' NOT NULL,
  "gps_lat"         double precision,
  "gps_lng"         double precision,
  "gps_accuracy"    double precision,
  "ip_address"      text,
  "ip_geolocation"  jsonb,
  "created_at"      timestamp with time zone DEFAULT now() NOT NULL,
  "expires_at"      timestamp with time zone,
  "completed_at"    timestamp with time zone
);

CREATE INDEX IF NOT EXISTS "idx_vsession_user_id"      ON "verification_sessions" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "idx_vsession_task_id"      ON "verification_sessions" USING btree ("task_id");
CREATE INDEX IF NOT EXISTS "idx_vsession_status"       ON "verification_sessions" USING btree ("status");
CREATE INDEX IF NOT EXISTS "idx_vsession_challenge_id" ON "verification_sessions" USING btree ("challenge_id");


-- ============================================================
-- 27. PHOTO UPLOADS
-- ============================================================
CREATE TABLE IF NOT EXISTS "photo_uploads" (
  "id"                   serial PRIMARY KEY NOT NULL,
  "session_id"           integer,
  "task_id"              integer,
  "user_id"              integer,
  "runner_id"            integer,
  "original_hash"        text NOT NULL,
  "watermark_hash"       text,
  "file_url"             text NOT NULL,
  "original_file_url"    text,
  "file_size"            integer,
  "mime_type"            text,
  "gps_lat"              double precision,
  "gps_lng"              double precision,
  "gps_accuracy"         double precision,
  "device_info"          jsonb,
  "exif_data"            jsonb,
  "ip_address"           text,
  "server_timestamp"     timestamp with time zone NOT NULL,
  "proof_type"           text,
  "risk_score"           integer DEFAULT 0 NOT NULL,
  "risk_factors"         jsonb,
  "is_duplicate"         boolean DEFAULT false NOT NULL,
  "duplicate_of_id"      integer,
  "verification_id"      text NOT NULL,
  "challenge_code"       text NOT NULL,
  "watermark_applied"    boolean DEFAULT false NOT NULL,
  "status"               text DEFAULT 'uploaded' NOT NULL,
  "review_note"          text,
  "created_at"           timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_photo_session_id"      ON "photo_uploads" USING btree ("session_id");
CREATE INDEX IF NOT EXISTS "idx_photo_task_id"         ON "photo_uploads" USING btree ("task_id");
CREATE INDEX IF NOT EXISTS "idx_photo_runner_id"       ON "photo_uploads" USING btree ("runner_id");
CREATE INDEX IF NOT EXISTS "idx_photo_original_hash"   ON "photo_uploads" USING btree ("original_hash");
CREATE INDEX IF NOT EXISTS "idx_photo_verification_id" ON "photo_uploads" USING btree ("verification_id");
CREATE INDEX IF NOT EXISTS "idx_photo_status"          ON "photo_uploads" USING btree ("status");
CREATE INDEX IF NOT EXISTS "idx_photo_created_at"      ON "photo_uploads" USING btree ("created_at");


-- ============================================================
-- 28. VERIFICATION AUDIT LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS "verification_audit_logs" (
  "id"            serial PRIMARY KEY NOT NULL,
  "session_id"    integer,
  "photo_id"      integer,
  "task_id"       integer,
  "user_id"       integer,
  "runner_id"     integer,
  "action"        text NOT NULL,
  "risk_score"    integer,
  "risk_factors"  jsonb,
  "metadata"      jsonb,
  "ip_address"    text,
  "created_at"    timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_vaudit_session_id"   ON "verification_audit_logs" USING btree ("session_id");
CREATE INDEX IF NOT EXISTS "idx_vaudit_photo_id"     ON "verification_audit_logs" USING btree ("photo_id");
CREATE INDEX IF NOT EXISTS "idx_vaudit_action"       ON "verification_audit_logs" USING btree ("action");
CREATE INDEX IF NOT EXISTS "idx_vaudit_created_at"   ON "verification_audit_logs" USING btree ("created_at");


-- ============================================================
-- 29. VERIFICATION HASHES
-- ============================================================
CREATE TABLE IF NOT EXISTS "verification_hashes" (
  "id"               serial PRIMARY KEY NOT NULL,
  "original_hash"    text NOT NULL UNIQUE,
  "photo_id"         integer,
  "first_seen_at"    timestamp with time zone DEFAULT now() NOT NULL,
  "occurrence_count" integer DEFAULT 1 NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_vhash_original_hash" ON "verification_hashes" USING btree ("original_hash");


-- ============================================================
-- FOREIGN KEY CONSTRAINTS (safe — IF NOT EXISTS via DO blocks)
-- ============================================================

-- User sessions
DO $$ BEGIN ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id"); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Admin sessions
DO $$ BEGIN ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "admins"("id"); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Runner sessions
DO $$ BEGIN ALTER TABLE "runner_sessions" ADD CONSTRAINT "runner_sessions_runner_id_runners_id_fk" FOREIGN KEY ("runner_id") REFERENCES "runners"("id"); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tasks → Users & Runners
DO $$ BEGIN ALTER TABLE "tasks" ADD CONSTRAINT "tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id"); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tasks" ADD CONSTRAINT "tasks_runner_id_runners_id_fk" FOREIGN KEY ("runner_id") REFERENCES "runners"("id"); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Notifications
DO $$ BEGIN ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id"); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "notifications" ADD CONSTRAINT "notifications_runner_id_runners_id_fk" FOREIGN KEY ("runner_id") REFERENCES "runners"("id"); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "notifications" ADD CONSTRAINT "notifications_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "tasks"("id"); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Reviews
DO $$ BEGIN ALTER TABLE "reviews" ADD CONSTRAINT "reviews_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "tasks"("id"); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id"); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "reviews" ADD CONSTRAINT "reviews_runner_id_runners_id_fk" FOREIGN KEY ("runner_id") REFERENCES "runners"("id"); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Subscriptions
DO $$ BEGIN ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id"); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id"); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Device tokens
DO $$ BEGIN ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id"); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_runner_id_runners_id_fk" FOREIGN KEY ("runner_id") REFERENCES "runners"("id"); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Runner locations
DO $$ BEGIN ALTER TABLE "runner_locations" ADD CONSTRAINT "runner_locations_runner_id_runners_id_fk" FOREIGN KEY ("runner_id") REFERENCES "runners"("id"); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "runner_locations" ADD CONSTRAINT "runner_locations_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "tasks"("id"); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Runner training
DO $$ BEGIN ALTER TABLE "runner_training" ADD CONSTRAINT "runner_training_module_id_training_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "training_modules"("id"); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Quality reviews
DO $$ BEGIN ALTER TABLE "quality_reviews" ADD CONSTRAINT "quality_reviews_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "tasks"("id"); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "quality_reviews" ADD CONSTRAINT "quality_reviews_runner_id_runners_id_fk" FOREIGN KEY ("runner_id") REFERENCES "runners"("id"); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Incidents
DO $$ BEGIN ALTER TABLE "incidents" ADD CONSTRAINT "incidents_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "tasks"("id"); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "incidents" ADD CONSTRAINT "incidents_runner_id_runners_id_fk" FOREIGN KEY ("runner_id") REFERENCES "runners"("id"); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "incidents" ADD CONSTRAINT "incidents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id"); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Support tickets
DO $$ BEGIN ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "tasks"("id"); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Fraud flags
DO $$ BEGIN ALTER TABLE "fraud_flags" ADD CONSTRAINT "fraud_flags_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "tasks"("id"); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "fraud_flags" ADD CONSTRAINT "fraud_flags_runner_id_runners_id_fk" FOREIGN KEY ("runner_id") REFERENCES "runners"("id"); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Proof photos
DO $$ BEGIN ALTER TABLE "proof_photos" ADD CONSTRAINT "proof_photos_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "tasks"("id"); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "proof_photos" ADD CONSTRAINT "proof_photos_runner_id_runners_id_fk" FOREIGN KEY ("runner_id") REFERENCES "runners"("id"); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Task timeline events
DO $$ BEGIN ALTER TABLE "task_timeline_events" ADD CONSTRAINT "task_timeline_events_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "tasks"("id"); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Runner payouts
DO $$ BEGIN ALTER TABLE "runner_payouts" ADD CONSTRAINT "runner_payouts_runner_id_runners_id_fk" FOREIGN KEY ("runner_id") REFERENCES "runners"("id"); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Payment audit log (no FK on task_id — KYC/admin audit entries use null task_id)
-- DO NOT add a FK constraint here: payment_audit_log.task_id is intentionally nullable

-- Verification sessions
DO $$ BEGIN ALTER TABLE "verification_sessions" ADD CONSTRAINT "verification_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id"); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "verification_sessions" ADD CONSTRAINT "verification_sessions_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "tasks"("id"); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Photo uploads
DO $$ BEGIN ALTER TABLE "photo_uploads" ADD CONSTRAINT "photo_uploads_session_id_verification_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "verification_sessions"("id"); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "photo_uploads" ADD CONSTRAINT "photo_uploads_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "tasks"("id"); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "photo_uploads" ADD CONSTRAINT "photo_uploads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id"); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "photo_uploads" ADD CONSTRAINT "photo_uploads_runner_id_runners_id_fk" FOREIGN KEY ("runner_id") REFERENCES "runners"("id"); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Verification audit logs
DO $$ BEGIN ALTER TABLE "verification_audit_logs" ADD CONSTRAINT "verification_audit_logs_session_id_verification_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "verification_sessions"("id"); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "verification_audit_logs" ADD CONSTRAINT "verification_audit_logs_photo_id_photo_uploads_id_fk" FOREIGN KEY ("photo_id") REFERENCES "photo_uploads"("id"); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Verification hashes
DO $$ BEGIN ALTER TABLE "verification_hashes" ADD CONSTRAINT "verification_hashes_photo_id_photo_uploads_id_fk" FOREIGN KEY ("photo_id") REFERENCES "photo_uploads"("id"); EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================
-- SEED DATA
-- ============================================================

-- Subscription plans (safe upsert)
INSERT INTO "subscription_plans" ("id", "name", "price_monthly", "price_yearly", "tasks_per_month", "badge", "is_popular", "features")
VALUES
  ('silver',   'Silver Plan',   '499',  '4990',  4,  'Starter',       false, ARRAY['4 tasks per month', 'Hospital & bank queues', 'Priority support', 'GPS tracked runners', 'WhatsApp updates']),
  ('gold',     'Gold Plan',     '899',  '8990',  8,  'Most Popular',  true,  ARRAY['8 tasks per month', 'All categories', 'Emergency runner available', 'Dedicated runner preference', 'Photo proof on completion', 'WhatsApp & phone support']),
  ('platinum', 'Platinum Plan', '1499', '14990', NULL, 'Best for NRIs', false, ARRAY['Unlimited tasks', 'Dedicated runner assigned', '24/7 emergency support', 'Senior companion visits', 'Medicine delivery included', 'Monthly wellness call', 'Caregiver notes & reports'])
ON CONFLICT ("id") DO NOTHING;

-- Default admin settings row
INSERT INTO "admin_settings" DEFAULT VALUES
ON CONFLICT DO NOTHING;


-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Check all 29 tables exist:
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' ORDER BY table_name;

-- Check users table has KYC fields:
SELECT column_name FROM information_schema.columns
WHERE table_name = 'users' AND column_name IN (
  'kyc_status', 'aadhaar_number', 'aadhaar_front', 'aadhaar_back',
  'unique_id', 'emergency_contact', 'id_document_url'
) ORDER BY column_name;

-- Check runners table has trust/dispatch fields:
SELECT column_name FROM information_schema.columns
WHERE table_name = 'runners' AND column_name IN (
  'unique_id', 'trust_score', 'dispatch_allowed', 'onboarding_step',
  'bank_account', 'bank_ifsc', 'selfie', 'kyc_rejection_reason'
) ORDER BY column_name;

-- Check subscription plans seeded:
SELECT id, name, price_monthly, badge FROM subscription_plans;

-- Check admin settings seeded:
SELECT id, app_name, company_name, upi_id FROM admin_settings;


-- ============================================================
-- DATABASE SETUP COMPLETE
-- 29 tables | 40+ indexes | 40+ foreign keys | 4 seed rows
-- All columns match lib/db/src/schema/*.ts (Drizzle ORM)
-- Safe to re-run: all statements use IF NOT EXISTS
-- ============================================================
