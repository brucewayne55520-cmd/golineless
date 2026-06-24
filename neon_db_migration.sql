-- ============================================
-- Go LineLess — Safe Database Migration
-- Run this in Neon SQL Editor to add missing
-- columns without recreating existing tables.
-- Uses IF NOT EXISTS so safe to run multiple times.
-- ============================================

-- ── users ──
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_hash" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "city" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "area" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "language" text DEFAULT 'en' NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;

-- ── runners ──
ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "password_hash" text;
ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "city" text;
ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "area" text;
ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "avatar" text;
ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "gender" text;
ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "kyc_rejection_reason" text;
ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "total_tasks" integer DEFAULT 0 NOT NULL;
ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "total_earnings" numeric(10, 2);
ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "current_lat" numeric(10, 8);
ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "current_lng" numeric(11, 8);
ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "full_name" text;
ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "aadhaar_number" text;
ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "aadhaar_front" text;
ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "aadhaar_back" text;
ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "selfie" text;
ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "bank_account" text;
ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "bank_ifsc" text;
ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "bank_account_holder" text;
ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "emergency_contact_name" text;
ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "emergency_contact_phone" text;
ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "emergency_contact_relation" text;
ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "onboarding_step" integer DEFAULT 0 NOT NULL;
ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "onboarding_completed" boolean DEFAULT false NOT NULL;
ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "dispatch_allowed" boolean DEFAULT false NOT NULL;
ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "gps_status" text;
ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "gps_checked_at" timestamp with time zone;
ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "trust_score" integer DEFAULT 50 NOT NULL;
ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "trust_badge" text DEFAULT 'improving' NOT NULL;
ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "tasks_accepted" integer DEFAULT 0 NOT NULL;
ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "tasks_completed" integer DEFAULT 0 NOT NULL;
ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "tasks_cancelled" integer DEFAULT 0 NOT NULL;
ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "average_rating" numeric(3, 2);
ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "average_response_time" numeric(8, 2);
ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "late_arrivals" integer DEFAULT 0 NOT NULL;
ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "on_time_arrivals" integer DEFAULT 0 NOT NULL;
ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "repeat_clients" integer DEFAULT 0 NOT NULL;
ALTER TABLE "runners" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;

-- ── tasks ──
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "description" text NOT NULL DEFAULT '';
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "urgency" text DEFAULT 'normal' NOT NULL;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "location_name" text;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "location_area" text;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "location_city" text;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "location_lat" numeric(10, 8);
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "location_lng" numeric(11, 8);
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "distance_band" text;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "scheduled_at" timestamp with time zone;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "base_price" numeric(8, 2) DEFAULT '0' NOT NULL;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "distance_charge" numeric(8, 2) DEFAULT '0' NOT NULL;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "urgency_charge" numeric(8, 2) DEFAULT '0' NOT NULL;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "price" numeric(8, 2) DEFAULT '0' NOT NULL;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "runner_earning" numeric(8, 2) DEFAULT '0' NOT NULL;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "platform_fee" numeric(8, 2) DEFAULT '0' NOT NULL;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "payment_method" text DEFAULT 'online' NOT NULL;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "payment_status" text DEFAULT 'pending' NOT NULL;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "coupon_code" text;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "discount_amount" numeric(8, 2) DEFAULT '0' NOT NULL;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "otp_verified" boolean DEFAULT false NOT NULL;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "senior_involved" boolean DEFAULT false NOT NULL;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "special_instructions" text;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "proof_photos" text[] DEFAULT '{}' NOT NULL;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "cancel_reason" text;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "internal_notes" text;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "completed_at" timestamp with time zone;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "pickup_required" boolean DEFAULT false NOT NULL;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "pickup_address" text;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "pickup_area" text;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "pickup_lat" numeric(10, 8);
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "pickup_lng" numeric(11, 8);
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "task_lat" numeric(10, 8);
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "task_lng" numeric(11, 8);
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "from_area" text;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "to_area" text;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "estimated_duration_minutes" integer;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "accepted_at" timestamp with time zone;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "started_at" timestamp with time zone;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "reached_pickup_at" timestamp with time zone;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "reached_task_location_at" timestamp with time zone;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "task_timeline" text[] DEFAULT '{}' NOT NULL;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "priority_level" text DEFAULT 'normal' NOT NULL;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "priority_fee" numeric(8, 2) DEFAULT '0' NOT NULL;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "waiting_charge_amount" numeric(8, 2) DEFAULT '0' NOT NULL;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "waiting_earnings" numeric(8, 2) DEFAULT '0' NOT NULL;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "bonus_earnings" numeric(8, 2) DEFAULT '0' NOT NULL;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "invoice_number" text;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "waiting_started_at" timestamp with time zone;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "waiting_ended_at" timestamp with time zone;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "total_waiting_minutes" integer;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "queue_type" text;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "token_number" text;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "current_token" text;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "counter_number" text;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "family_contact_name" text;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "family_contact_phone" text;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "family_tracking_token" text;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "family_token_expires_at" timestamp with time zone;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "gps_verified" boolean;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "gps_distance_from_task" integer;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "otp_attempts" integer DEFAULT 0 NOT NULL;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "otp_expires_at" timestamp with time zone;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "otp_locked_until" timestamp with time zone;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "fraud_flags" text[] DEFAULT '{}' NOT NULL;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "expected_token_number" text;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "queue_gap" integer;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "estimated_wait_minutes" integer;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "queue_progress_percent" integer;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "queue_notes" text;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "dispatch_attempts" integer DEFAULT 0 NOT NULL;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "dispatch_radius_used" integer DEFAULT 0 NOT NULL;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "dispatch_notified_count" integer DEFAULT 0 NOT NULL;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "time_to_acceptance" integer;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "active_runner_id" integer;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;

-- ── notifications ──
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "user_id" integer;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "runner_id" integer;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "task_id" integer;

-- ── reviews ──
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "user_id" integer;
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "runner_id" integer;
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "feedback" text;
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "issue_report" text;
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone;

-- ── subscription_plans ──
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "badge" text;
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "is_popular" boolean DEFAULT false NOT NULL;
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "features" text[] DEFAULT '{}' NOT NULL;

-- ── subscriptions ──
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "plan_name" text;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "billing_cycle" text DEFAULT 'monthly' NOT NULL;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "tasks_per_month" integer;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "tasks_used" integer DEFAULT 0 NOT NULL;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "start_date" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "end_date" timestamp with time zone;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "amount" numeric(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;

-- ── admin_settings ──
ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "app_name" text DEFAULT 'Go LineLess' NOT NULL;
ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "company_name" text DEFAULT 'IBNAY IFTRIBE PRIVATE LIMITED' NOT NULL;
ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "support_phone" text DEFAULT '+91-9999999999' NOT NULL;
ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "support_email" text DEFAULT 'support@golineless.com' NOT NULL;
ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "whatsapp_number" text DEFAULT '+91-9999999999' NOT NULL;
ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "runner_payout_percent" numeric(5, 2) DEFAULT '70' NOT NULL;
ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "urgency_surcharge" numeric(8, 2) DEFAULT '50' NOT NULL;
ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "cancellation_fee" numeric(8, 2) DEFAULT '0' NOT NULL;
ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "max_tasks_per_runner_per_day" integer DEFAULT 20 NOT NULL;
ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "maintenance_mode" boolean DEFAULT false NOT NULL;
ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "free_waiting_minutes" integer DEFAULT 15 NOT NULL;
ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "waiting_charge_per_minute" numeric(5, 2) DEFAULT '2' NOT NULL;
ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "priority_fee_amount" numeric(8, 2) DEFAULT '49' NOT NULL;
ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "emergency_fee_amount" numeric(8, 2) DEFAULT '99' NOT NULL;
ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "urgency_normal_multiplier" numeric(3, 2) DEFAULT '1.0' NOT NULL;
ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "urgency_urgent_multiplier" numeric(3, 2) DEFAULT '1.25' NOT NULL;
ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "urgency_emergency_multiplier" numeric(3, 2) DEFAULT '1.5' NOT NULL;
ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "gps_validation_radius" integer DEFAULT 250 NOT NULL;
ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "waiting_bracket1_min" integer DEFAULT 30 NOT NULL;
ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "waiting_bracket1_charge" numeric(8, 2) DEFAULT '0' NOT NULL;
ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "waiting_bracket2_min" integer DEFAULT 60 NOT NULL;
ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "waiting_bracket2_charge" numeric(8, 2) DEFAULT '30' NOT NULL;
ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "waiting_bracket3_min" integer DEFAULT 120 NOT NULL;
ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "waiting_bracket3_charge" numeric(8, 2) DEFAULT '80' NOT NULL;
ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "waiting_bracket4_charge" numeric(8, 2) DEFAULT '150' NOT NULL;
ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "dispatch_initial_radius" integer DEFAULT 3 NOT NULL;
ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "dispatch_expand_delay" integer DEFAULT 60 NOT NULL;
ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "dispatch_max_radius" integer DEFAULT 20 NOT NULL;
ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "queue_eta_multiplier_hospital" numeric(3, 1) DEFAULT '5' NOT NULL;
ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "queue_eta_multiplier_bank" numeric(3, 1) DEFAULT '2' NOT NULL;
ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "queue_eta_multiplier_govt" numeric(3, 1) DEFAULT '8' NOT NULL;
ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "queue_eta_multiplier_default" numeric(3, 1) DEFAULT '3' NOT NULL;
ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "pilot_mode" boolean DEFAULT false NOT NULL;
ALTER TABLE "admin_settings" ADD COLUMN IF NOT EXISTS "pilot_categories" text[] DEFAULT '{\"medicine\",\"document\",\"bank\",\"govt_office\",\"courier\",\"senior_care\"}' NOT NULL;

-- ── device_tokens ──
ALTER TABLE "device_tokens" ADD COLUMN IF NOT EXISTS "user_id" integer;
ALTER TABLE "device_tokens" ADD COLUMN IF NOT EXISTS "runner_id" integer;
ALTER TABLE "device_tokens" ADD COLUMN IF NOT EXISTS "platform" text;
ALTER TABLE "device_tokens" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;

-- ── runner_locations ──
ALTER TABLE "runner_locations" ADD COLUMN IF NOT EXISTS "heading" numeric(5, 2) DEFAULT '0';
ALTER TABLE "runner_locations" ADD COLUMN IF NOT EXISTS "speed" numeric(5, 2) DEFAULT '0';

-- ── recruitments ──
ALTER TABLE "recruitments" ADD COLUMN IF NOT EXISTS "vehicle_type" text DEFAULT 'bicycle' NOT NULL;
ALTER TABLE "recruitments" ADD COLUMN IF NOT EXISTS "languages" text[] DEFAULT '{\"hindi\"}' NOT NULL;
ALTER TABLE "recruitments" ADD COLUMN IF NOT EXISTS "availability" text DEFAULT 'full_time' NOT NULL;
ALTER TABLE "recruitments" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "recruitments" ADD COLUMN IF NOT EXISTS "interview_date" timestamp with time zone;
ALTER TABLE "recruitments" ADD COLUMN IF NOT EXISTS "documents_submitted_at" timestamp with time zone;
ALTER TABLE "recruitments" ADD COLUMN IF NOT EXISTS "training_completed_at" timestamp with time zone;
ALTER TABLE "recruitments" ADD COLUMN IF NOT EXISTS "training_score" integer;
ALTER TABLE "recruitments" ADD COLUMN IF NOT EXISTS "activated_at" timestamp with time zone;
ALTER TABLE "recruitments" ADD COLUMN IF NOT EXISTS "runner_id" integer;
ALTER TABLE "recruitments" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;

-- ── runner_training ──
ALTER TABLE "runner_training" ADD COLUMN IF NOT EXISTS "completed_at" timestamp with time zone;

-- ── quality_reviews ──
ALTER TABLE "quality_reviews" ADD COLUMN IF NOT EXISTS "customer_rating" integer;
ALTER TABLE "quality_reviews" ADD COLUMN IF NOT EXISTS "customer_feedback" text;
ALTER TABLE "quality_reviews" ADD COLUMN IF NOT EXISTS "comrade_feedback" text;
ALTER TABLE "quality_reviews" ADD COLUMN IF NOT EXISTS "task_quality_score" integer;
ALTER TABLE "quality_reviews" ADD COLUMN IF NOT EXISTS "sla_grade" text;
ALTER TABLE "quality_reviews" ADD COLUMN IF NOT EXISTS "acceptance_time_seconds" integer;
ALTER TABLE "quality_reviews" ADD COLUMN IF NOT EXISTS "arrival_time_minutes" integer;
ALTER TABLE "quality_reviews" ADD COLUMN IF NOT EXISTS "completion_time_minutes" integer;
ALTER TABLE "quality_reviews" ADD COLUMN IF NOT EXISTS "reviewed_at" timestamp with time zone;

-- ── incidents ──
ALTER TABLE "incidents" ADD COLUMN IF NOT EXISTS "task_id" integer;
ALTER TABLE "incidents" ADD COLUMN IF NOT EXISTS "runner_id" integer;
ALTER TABLE "incidents" ADD COLUMN IF NOT EXISTS "user_id" integer;
ALTER TABLE "incidents" ADD COLUMN IF NOT EXISTS "severity" text DEFAULT 'medium' NOT NULL;
ALTER TABLE "incidents" ADD COLUMN IF NOT EXISTS "assigned_admin" text;
ALTER TABLE "incidents" ADD COLUMN IF NOT EXISTS "resolution" text;
ALTER TABLE "incidents" ADD COLUMN IF NOT EXISTS "resolved_at" timestamp with time zone;
ALTER TABLE "incidents" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;

-- ── support_tickets ──
ALTER TABLE "support_tickets" ADD COLUMN IF NOT EXISTS "task_id" integer;
ALTER TABLE "support_tickets" ADD COLUMN IF NOT EXISTS "user_id" integer;
ALTER TABLE "support_tickets" ADD COLUMN IF NOT EXISTS "runner_id" integer;
ALTER TABLE "support_tickets" ADD COLUMN IF NOT EXISTS "category" text DEFAULT 'general' NOT NULL;
ALTER TABLE "support_tickets" ADD COLUMN IF NOT EXISTS "priority" text DEFAULT 'normal' NOT NULL;
ALTER TABLE "support_tickets" ADD COLUMN IF NOT EXISTS "assigned_admin" text;
ALTER TABLE "support_tickets" ADD COLUMN IF NOT EXISTS "resolution" text;
ALTER TABLE "support_tickets" ADD COLUMN IF NOT EXISTS "refund_amount" integer;
ALTER TABLE "support_tickets" ADD COLUMN IF NOT EXISTS "resolution_time_minutes" integer;
ALTER TABLE "support_tickets" ADD COLUMN IF NOT EXISTS "resolved_at" timestamp with time zone;
ALTER TABLE "support_tickets" ADD COLUMN IF NOT EXISTS "closed_at" timestamp with time zone;
ALTER TABLE "support_tickets" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;

-- ============================================
-- Indexes (IF NOT EXISTS)
-- ============================================
CREATE INDEX IF NOT EXISTS "idx_tasks_user_id" ON "tasks" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "idx_tasks_runner_id" ON "tasks" USING btree ("runner_id");
CREATE INDEX IF NOT EXISTS "idx_tasks_status" ON "tasks" USING btree ("status");
CREATE INDEX IF NOT EXISTS "idx_tasks_created_at" ON "tasks" USING btree ("created_at");

-- ============================================
-- Seed Data (safe upsert — skips if exists)
-- ============================================
INSERT INTO "subscription_plans" ("id", "name", "price_monthly", "price_yearly", "tasks_per_month", "badge", "is_popular", "features")
VALUES
('silver', 'Silver Plan', '499', '4990', 4, 'Starter', false, ARRAY['4 tasks per month', 'Hospital & bank queues', 'Priority support', 'GPS tracked runners', 'WhatsApp updates']),
('gold', 'Gold Plan', '899', '8990', 8, 'Most Popular', true, ARRAY['8 tasks per month', 'All categories', 'Emergency runner available', 'Dedicated runner preference', 'Photo proof on completion', 'WhatsApp & phone support']),
('platinum', 'Platinum Plan', '1499', '14990', null, 'Best for NRIs', false, ARRAY['Unlimited tasks', 'Dedicated runner assigned', '24/7 emergency support', 'Senior companion visits', 'Medicine delivery included', 'Monthly wellness call', 'Caregiver notes & reports'])
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "admin_settings" DEFAULT VALUES
ON CONFLICT DO NOTHING;

-- ============================================
-- Runner Payouts — Settlement tracking
-- ============================================
CREATE TABLE IF NOT EXISTS "runner_payouts" (
  "id" serial PRIMARY KEY,
  "runner_id" integer NOT NULL REFERENCES "runners"("id"),
  "amount" numeric(10, 2) NOT NULL,
  "task_count" integer DEFAULT 0 NOT NULL,
  "task_ids" text DEFAULT '' NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "settled_by" text,
  "settled_at" timestamp with time zone,
  "reference" text,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- ============================================
-- Done! Your DB schema is now up to date.
-- ============================================
