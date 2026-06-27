-- ============================================================
-- Go LineLess — Complete Database Schema (Production-Ready)
-- PostgreSQL / Neon Serverless
-- Generated: 2026-06-27
-- Source of Truth: lib/db/src/schema/*.ts (Drizzle ORM)
-- Total Tables: 29 | Total Indexes: 50+
--
-- HOW TO USE:
--   1. Open Neon SQL Editor (console.neon.tech)
--   2. Paste this entire file
--   3. Click "Run"
--   4. Tables are created with IF NOT EXISTS so re-runs are safe
-- ============================================================


-- ============================================================
-- CLEAN SLATE (optional — uncomment to drop everything first)
-- ⚠️  THIS WILL DELETE ALL DATA
-- ============================================================
/*
DROP TABLE IF EXISTS verification_hashes CASCADE;
DROP TABLE IF EXISTS verification_audit_logs CASCADE;
DROP TABLE IF EXISTS photo_uploads CASCADE;
DROP TABLE IF EXISTS verification_sessions CASCADE;
DROP TABLE IF EXISTS payment_audit_log CASCADE;
DROP TABLE IF EXISTS runner_payouts CASCADE;
DROP TABLE IF EXISTS task_timeline_events CASCADE;
DROP TABLE IF EXISTS proof_photos CASCADE;
DROP TABLE IF EXISTS fraud_flags CASCADE;
DROP TABLE IF EXISTS support_tickets CASCADE;
DROP TABLE IF EXISTS incidents CASCADE;
DROP TABLE IF EXISTS quality_reviews CASCADE;
DROP TABLE IF EXISTS runner_training CASCADE;
DROP TABLE IF EXISTS training_modules CASCADE;
DROP TABLE IF EXISTS recruitments CASCADE;
DROP TABLE IF EXISTS runner_locations CASCADE;
DROP TABLE IF EXISTS device_tokens CASCADE;
DROP TABLE IF EXISTS admin_settings CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS subscription_plans CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS runner_sessions CASCADE;
DROP TABLE IF EXISTS runners CASCADE;
DROP TABLE IF EXISTS admin_sessions CASCADE;
DROP TABLE IF EXISTS admins CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
*/


-- ============================================================
-- 1. USERS
-- Core customer accounts. Auth via OTP, Google OAuth, or
-- email+password (password_hash).
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT,
  phone TEXT UNIQUE,
  email TEXT UNIQUE,
  google_id TEXT UNIQUE,
  password_hash TEXT,
  city TEXT,
  area TEXT,
  avatar TEXT,
  language TEXT NOT NULL DEFAULT 'en',
  unique_id TEXT UNIQUE,
  kyc_status TEXT NOT NULL DEFAULT 'none',
  aadhaar_number TEXT,
  aadhaar_front TEXT,
  aadhaar_back TEXT,
  id_document_url TEXT,
  emergency_contact TEXT,
  otp TEXT,
  otp_expires_at TIMESTAMPTZ,
  password_reset_token TEXT,
  password_reset_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 2. USER SESSIONS
-- Login sessions for users. Each row = one active session.
-- ============================================================
CREATE TABLE IF NOT EXISTS user_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);


-- ============================================================
-- 3. RUNNERS (Comrades)
-- Delivery partner accounts. Includes KYC fields,
-- onboarding progress, trust score, and bank details.
-- ============================================================
CREATE TABLE IF NOT EXISTS runners (
  id SERIAL PRIMARY KEY,
  name TEXT,
  phone TEXT UNIQUE,
  email TEXT UNIQUE,
  password_hash TEXT,
  city TEXT,
  area TEXT,
  avatar TEXT,
  gender TEXT,
  unique_id TEXT,
  kyc_status TEXT NOT NULL DEFAULT 'pending',
  kyc_rejection_reason TEXT,
  is_online BOOLEAN NOT NULL DEFAULT FALSE,
  rating NUMERIC(3, 2),
  total_tasks INTEGER NOT NULL DEFAULT 0,
  total_earnings NUMERIC(10, 2),
  current_lat NUMERIC(10, 8),
  current_lng NUMERIC(11, 8),
  full_name TEXT,
  aadhaar_number TEXT,
  aadhaar_front TEXT,
  aadhaar_back TEXT,
  selfie TEXT,
  bank_account TEXT,
  bank_ifsc TEXT,
  bank_account_holder TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relation TEXT,
  otp TEXT,
  otp_expires_at TIMESTAMPTZ,
  password_reset_token TEXT,
  password_reset_expires_at TIMESTAMPTZ,
  onboarding_step INTEGER NOT NULL DEFAULT 0,
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  dispatch_allowed BOOLEAN NOT NULL DEFAULT FALSE,
  gps_status TEXT,
  gps_checked_at TIMESTAMPTZ,
  trust_score INTEGER NOT NULL DEFAULT 50,
  trust_badge TEXT NOT NULL DEFAULT 'improving',
  tasks_accepted INTEGER NOT NULL DEFAULT 0,
  tasks_completed INTEGER NOT NULL DEFAULT 0,
  tasks_cancelled INTEGER NOT NULL DEFAULT 0,
  average_rating NUMERIC(3, 2),
  average_response_time NUMERIC(8, 2),
  late_arrivals INTEGER NOT NULL DEFAULT 0,
  on_time_arrivals INTEGER NOT NULL DEFAULT 0,
  repeat_clients INTEGER NOT NULL DEFAULT 0,
  specializations TEXT[] NOT NULL DEFAULT '{}',
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_runners_phone ON runners(phone);
CREATE INDEX IF NOT EXISTS idx_runners_kyc_status ON runners(kyc_status);
CREATE INDEX IF NOT EXISTS idx_runners_is_online ON runners(is_online);
CREATE INDEX IF NOT EXISTS idx_runners_city ON runners(city);
CREATE INDEX IF NOT EXISTS idx_runners_dispatch_allowed ON runners(dispatch_allowed);
CREATE INDEX IF NOT EXISTS idx_runners_trust_score ON runners(trust_score);


-- ============================================================
-- 4. RUNNER SESSIONS
-- Login sessions for runner accounts.
-- ============================================================
CREATE TABLE IF NOT EXISTS runner_sessions (
  id SERIAL PRIMARY KEY,
  runner_id INTEGER NOT NULL REFERENCES runners(id),
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_runner_sessions_runner_id ON runner_sessions(runner_id);
CREATE INDEX IF NOT EXISTS idx_runner_sessions_token ON runner_sessions(token);
CREATE INDEX IF NOT EXISTS idx_runner_sessions_expires_at ON runner_sessions(expires_at);


-- ============================================================
-- 5. ADMINS
-- Platform admin accounts with role-based access.
-- Roles: "superadmin" | "admin" | "support" | "ops"
-- ============================================================
CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'admin',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 6. ADMIN SESSIONS
-- Login sessions for admin users.
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_sessions (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER NOT NULL REFERENCES admins(id),
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin_id ON admin_sessions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(token);


-- ============================================================
-- 7. TASKS
-- Central table. Each row = one service request booked by a
-- customer and fulfilled by a comrade.
-- ============================================================
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  runner_id INTEGER REFERENCES runners(id),
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  urgency TEXT NOT NULL DEFAULT 'normal',
  location_name TEXT,
  location_area TEXT,
  location_city TEXT,
  location_lat NUMERIC(10, 8),
  location_lng NUMERIC(11, 8),
  distance_band TEXT,
  scheduled_at TIMESTAMPTZ,
  base_price NUMERIC(8, 2) NOT NULL DEFAULT '0',
  distance_charge NUMERIC(8, 2) NOT NULL DEFAULT '0',
  urgency_charge NUMERIC(8, 2) NOT NULL DEFAULT '0',
  price NUMERIC(8, 2) NOT NULL DEFAULT '0',
  runner_earning NUMERIC(8, 2) NOT NULL DEFAULT '0',
  platform_fee NUMERIC(8, 2) NOT NULL DEFAULT '0',
  payment_method TEXT NOT NULL DEFAULT 'cash',
  payment_status TEXT NOT NULL DEFAULT 'pending',
  payment_confirmed_by INTEGER,
  payment_confirmed_at TIMESTAMPTZ,
  paid_amount NUMERIC(8, 2) NOT NULL DEFAULT '0',
  coupon_code TEXT,
  discount_amount NUMERIC(8, 2) NOT NULL DEFAULT '0',
  otp TEXT,
  otp_verified BOOLEAN NOT NULL DEFAULT FALSE,
  senior_involved BOOLEAN NOT NULL DEFAULT FALSE,
  special_instructions TEXT,
  proof_photos TEXT[] NOT NULL DEFAULT '{}',
  cancel_reason TEXT,
  internal_notes TEXT,
  completed_at TIMESTAMPTZ,
  pickup_required BOOLEAN NOT NULL DEFAULT FALSE,
  pickup_address TEXT,
  pickup_area TEXT,
  pickup_lat NUMERIC(10, 8),
  pickup_lng NUMERIC(11, 8),
  task_lat NUMERIC(10, 8),
  task_lng NUMERIC(11, 8),
  from_area TEXT,
  to_area TEXT,
  estimated_duration_minutes INTEGER,
  accepted_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  reached_pickup_at TIMESTAMPTZ,
  reached_task_location_at TIMESTAMPTZ,
  task_timeline TEXT[] NOT NULL DEFAULT '{}',
  priority_level TEXT NOT NULL DEFAULT 'normal',
  priority_fee NUMERIC(8, 2) NOT NULL DEFAULT '0',
  waiting_charge_amount NUMERIC(8, 2) NOT NULL DEFAULT '0',
  waiting_earnings NUMERIC(8, 2) NOT NULL DEFAULT '0',
  bonus_earnings NUMERIC(8, 2) NOT NULL DEFAULT '0',
  invoice_number TEXT,
  waiting_started_at TIMESTAMPTZ,
  waiting_ended_at TIMESTAMPTZ,
  total_waiting_minutes INTEGER,
  queue_type TEXT,
  token_number TEXT,
  current_token TEXT,
  counter_number TEXT,
  family_contact_name TEXT,
  family_contact_phone TEXT,
  family_tracking_token TEXT,
  family_token_expires_at TIMESTAMPTZ,
  gps_verified BOOLEAN,
  gps_distance_from_task INTEGER,
  otp_attempts INTEGER NOT NULL DEFAULT 0,
  otp_expires_at TIMESTAMPTZ,
  otp_locked_until TIMESTAMPTZ,
  fraud_flags TEXT[] NOT NULL DEFAULT '{}',
  expected_token_number TEXT,
  queue_gap INTEGER,
  estimated_wait_minutes INTEGER,
  queue_progress_percent INTEGER,
  queue_notes TEXT,
  dispatch_attempts INTEGER NOT NULL DEFAULT 0,
  dispatch_radius_used INTEGER NOT NULL DEFAULT 0,
  dispatch_notified_count INTEGER NOT NULL DEFAULT 0,
  time_to_acceptance INTEGER,
  active_runner_id INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tasks indexes (Drizzle-defined)
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_runner_id ON tasks(runner_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_status_runner ON tasks(status, runner_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status_category ON tasks(status, category);
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_runner_status ON tasks(runner_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_completed_at ON tasks(completed_at);
CREATE INDEX IF NOT EXISTS idx_tasks_payment_method_status ON tasks(payment_method, payment_status);

-- Tasks indexes (additional performance)
CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category);
CREATE INDEX IF NOT EXISTS idx_tasks_urgency ON tasks(urgency);
CREATE INDEX IF NOT EXISTS idx_tasks_active_runner_id ON tasks(active_runner_id);
CREATE INDEX IF NOT EXISTS idx_tasks_location_city_area ON tasks(location_city, location_area);


-- ============================================================
-- 8. NOTIFICATIONS
-- In-app notifications for users and runners.
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  runner_id INTEGER REFERENCES runners(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  task_id INTEGER REFERENCES tasks(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_runner_read ON notifications(runner_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_runner_id ON notifications(runner_id);
CREATE INDEX IF NOT EXISTS idx_notifications_task_id ON notifications(task_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);


-- ============================================================
-- 9. REVIEWS
-- Post-task ratings and feedback from customers.
-- ============================================================
CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id),
  user_id INTEGER REFERENCES users(id),
  runner_id INTEGER REFERENCES runners(id),
  rating INTEGER NOT NULL,
  review TEXT,
  feedback TEXT,
  issue_report TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Reviews indexes (performance)
CREATE INDEX IF NOT EXISTS idx_reviews_task_id ON reviews(task_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_runner_id ON reviews(runner_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);


-- ============================================================
-- 10. RUNNER LOCATIONS
-- GPS tracking points for active runners.
-- ============================================================
CREATE TABLE IF NOT EXISTS runner_locations (
  id SERIAL PRIMARY KEY,
  runner_id INTEGER NOT NULL REFERENCES runners(id),
  task_id INTEGER REFERENCES tasks(id),
  lat NUMERIC(10, 8) NOT NULL,
  lng NUMERIC(11, 8) NOT NULL,
  heading NUMERIC(5, 2) DEFAULT '0',
  speed NUMERIC(5, 2) DEFAULT '0',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Runner locations indexes (performance)
CREATE INDEX IF NOT EXISTS idx_runner_locations_runner_id ON runner_locations(runner_id);
CREATE INDEX IF NOT EXISTS idx_runner_locations_task_id ON runner_locations(task_id);
CREATE INDEX IF NOT EXISTS idx_runner_locations_recorded_at ON runner_locations(recorded_at);
CREATE INDEX IF NOT EXISTS idx_runner_locations_runner_recorded ON runner_locations(runner_id, recorded_at DESC);


-- ============================================================
-- 11. ADMIN SETTINGS
-- Global platform configuration (singleton row).
-- Controls pricing, dispatch, waiting fees, GPS, pilot mode.
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_settings (
  id SERIAL PRIMARY KEY,
  app_name TEXT NOT NULL DEFAULT 'Go LineLess',
  company_name TEXT NOT NULL DEFAULT 'IBNAY IFTRIBE PRIVATE LIMITED',
  support_phone TEXT NOT NULL DEFAULT '+91-9999999999',
  support_email TEXT NOT NULL DEFAULT 'support@golineless.com',
  whatsapp_number TEXT NOT NULL DEFAULT '+91-9999999999',
  runner_payout_percent NUMERIC(5, 2) NOT NULL DEFAULT '70',
  urgency_surcharge NUMERIC(8, 2) NOT NULL DEFAULT '50',
  cancellation_fee NUMERIC(8, 2) NOT NULL DEFAULT '0',
  max_tasks_per_runner_per_day INTEGER NOT NULL DEFAULT 20,
  maintenance_mode BOOLEAN NOT NULL DEFAULT FALSE,
  free_waiting_minutes INTEGER NOT NULL DEFAULT 15,
  waiting_charge_per_minute NUMERIC(5, 2) NOT NULL DEFAULT '2',
  priority_fee_amount NUMERIC(8, 2) NOT NULL DEFAULT '49',
  emergency_fee_amount NUMERIC(8, 2) NOT NULL DEFAULT '99',
  urgency_normal_multiplier NUMERIC(3, 2) NOT NULL DEFAULT '1.0',
  urgency_urgent_multiplier NUMERIC(3, 2) NOT NULL DEFAULT '1.25',
  urgency_emergency_multiplier NUMERIC(3, 2) NOT NULL DEFAULT '1.5',
  gps_validation_radius INTEGER NOT NULL DEFAULT 250,
  waiting_bracket1_min INTEGER NOT NULL DEFAULT 30,
  waiting_bracket1_charge NUMERIC(8, 2) NOT NULL DEFAULT '0',
  waiting_bracket2_min INTEGER NOT NULL DEFAULT 60,
  waiting_bracket2_charge NUMERIC(8, 2) NOT NULL DEFAULT '30',
  waiting_bracket3_min INTEGER NOT NULL DEFAULT 120,
  waiting_bracket3_charge NUMERIC(8, 2) NOT NULL DEFAULT '80',
  waiting_bracket4_charge NUMERIC(8, 2) NOT NULL DEFAULT '150',
  dispatch_initial_radius INTEGER NOT NULL DEFAULT 3,
  dispatch_expand_delay INTEGER NOT NULL DEFAULT 60,
  dispatch_max_radius INTEGER NOT NULL DEFAULT 20,
  queue_eta_multiplier_hospital NUMERIC(3, 1) NOT NULL DEFAULT '5',
  queue_eta_multiplier_bank NUMERIC(3, 1) NOT NULL DEFAULT '2',
  queue_eta_multiplier_govt NUMERIC(3, 1) NOT NULL DEFAULT '8',
  queue_eta_multiplier_default NUMERIC(3, 1) NOT NULL DEFAULT '3',
  pilot_mode BOOLEAN NOT NULL DEFAULT FALSE,
  pilot_categories TEXT[] NOT NULL DEFAULT '{medicine,document,bank,govt_office,courier,senior_care}',
  upi_id TEXT NOT NULL DEFAULT 'golineless@upi',
  upi_payee_name TEXT NOT NULL DEFAULT 'Go LineLess',
  available_specializations TEXT[] NOT NULL DEFAULT '{hospital,senior,bank,documentation,emergency,female}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 12. DEVICE TOKENS
-- Push notification device tokens (FCM integration).
-- ============================================================
CREATE TABLE IF NOT EXISTS device_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  runner_id INTEGER REFERENCES runners(id),
  token TEXT NOT NULL,
  platform TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_device_tokens_user_id ON device_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_device_tokens_runner_id ON device_tokens(runner_id);
CREATE INDEX IF NOT EXISTS idx_device_tokens_token ON device_tokens(token);
CREATE INDEX IF NOT EXISTS idx_device_tokens_active ON device_tokens(is_active);


-- ============================================================
-- 13. SUBSCRIPTION PLANS
-- Predefined subscription tiers (Silver, Gold, Platinum).
-- ============================================================
CREATE TABLE IF NOT EXISTS subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price_monthly NUMERIC(10, 2) NOT NULL,
  price_yearly NUMERIC(10, 2) NOT NULL,
  tasks_per_month INTEGER,
  features TEXT[] NOT NULL DEFAULT '{}',
  badge TEXT,
  is_popular BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 14. SUBSCRIPTIONS
-- Active customer subscriptions. Links user to plan.
-- ============================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  plan_id TEXT NOT NULL REFERENCES subscription_plans(id),
  plan_name TEXT NOT NULL,
  billing_cycle TEXT NOT NULL DEFAULT 'monthly',
  status TEXT NOT NULL DEFAULT 'active',
  tasks_per_month INTEGER,
  tasks_used INTEGER NOT NULL DEFAULT 0,
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date TIMESTAMPTZ,
  amount NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Subscriptions indexes (performance)
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_end_date ON subscriptions(end_date);


-- ============================================================
-- 15. PAYMENT AUDIT LOG
-- Complete audit trail for all payment state changes.
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_audit_log (
  id SERIAL PRIMARY KEY,
  task_id INTEGER,
  previous_status TEXT,
  new_status TEXT,
  actor TEXT,
  actor_type TEXT,
  reason TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payaudit_task_id ON payment_audit_log(task_id);
CREATE INDEX IF NOT EXISTS idx_payaudit_created_at ON payment_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_payaudit_new_status ON payment_audit_log(new_status);
CREATE INDEX IF NOT EXISTS idx_payaudit_actor_type ON payment_audit_log(actor_type);


-- ============================================================
-- 16. RUNNER PAYOUTS
-- Batch payout records for settled runner earnings.
-- ============================================================
CREATE TABLE IF NOT EXISTS runner_payouts (
  id SERIAL PRIMARY KEY,
  runner_id INTEGER NOT NULL REFERENCES runners(id),
  amount NUMERIC(10, 2) NOT NULL,
  task_count INTEGER NOT NULL DEFAULT 0,
  task_ids INTEGER[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  settled_by TEXT,
  settled_at TIMESTAMPTZ,
  reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Payouts indexes (performance)
CREATE INDEX IF NOT EXISTS idx_payouts_runner_id ON runner_payouts(runner_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON runner_payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_runner_status ON runner_payouts(runner_id, status);
CREATE INDEX IF NOT EXISTS idx_payouts_created_at ON runner_payouts(created_at);


-- ============================================================
-- 17. PROOF PHOTOS (normalized)
-- Individual photo records extracted from tasks.proof_photos array.
-- Each row = one proof photo uploaded by a runner.
-- ============================================================
CREATE TABLE IF NOT EXISTS proof_photos (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id),
  runner_id INTEGER REFERENCES runners(id),
  proof_type TEXT NOT NULL DEFAULT 'general',
  image_url TEXT NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  address TEXT,
  task_status TEXT,
  uploaded_by TEXT,
  gps_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proof_photo_task_id ON proof_photos(task_id);
CREATE INDEX IF NOT EXISTS idx_proof_photo_runner_id ON proof_photos(runner_id);
CREATE INDEX IF NOT EXISTS idx_proof_photo_type ON proof_photos(proof_type);
CREATE INDEX IF NOT EXISTS idx_proof_photo_created_at ON proof_photos(created_at);
CREATE INDEX IF NOT EXISTS idx_proof_photo_task_type ON proof_photos(task_id, proof_type);


-- ============================================================
-- 18. TASK TIMELINE EVENTS (normalized)
-- Individual event records extracted from tasks.task_timeline array.
-- Each row = one timeline event (status change, proof upload, etc.).
-- ============================================================
CREATE TABLE IF NOT EXISTS task_timeline_events (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id),
  status TEXT NOT NULL,
  label TEXT NOT NULL,
  event_timestamp TIMESTAMPTZ NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_timeline_task_id ON task_timeline_events(task_id);
CREATE INDEX IF NOT EXISTS idx_timeline_status ON task_timeline_events(status);
CREATE INDEX IF NOT EXISTS idx_timeline_event_timestamp ON task_timeline_events(event_timestamp);
CREATE INDEX IF NOT EXISTS idx_timeline_task_status ON task_timeline_events(task_id, status);


-- ============================================================
-- 19. FRAUD FLAGS (normalized)
-- Individual fraud/risk records for audit and analysis.
-- ============================================================
CREATE TABLE IF NOT EXISTS fraud_flags (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id),
  runner_id INTEGER REFERENCES runners(id),
  type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  reason TEXT,
  distance_meters DOUBLE PRECISION,
  max_allowed DOUBLE PRECISION,
  proof_type TEXT,
  duplicate_count INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fraud_flag_task_id ON fraud_flags(task_id);
CREATE INDEX IF NOT EXISTS idx_fraud_flag_runner_id ON fraud_flags(runner_id);
CREATE INDEX IF NOT EXISTS idx_fraud_flag_type ON fraud_flags(type);
CREATE INDEX IF NOT EXISTS idx_fraud_flag_created_at ON fraud_flags(created_at);
CREATE INDEX IF NOT EXISTS idx_fraud_flag_runner_type ON fraud_flags(runner_id, type);


-- ============================================================
-- 20. INCIDENTS
-- Platform incidents (complaints, misconduct, failures).
-- ============================================================
CREATE TABLE IF NOT EXISTS incidents (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL,
  task_id INTEGER REFERENCES tasks(id),
  runner_id INTEGER REFERENCES runners(id),
  user_id INTEGER REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  assigned_admin TEXT,
  resolution TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Incidents indexes (performance)
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_type ON incidents(type);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents(created_at);
CREATE INDEX IF NOT EXISTS idx_incidents_status_severity ON incidents(status, severity);
CREATE INDEX IF NOT EXISTS idx_incidents_task_id ON incidents(task_id);
CREATE INDEX IF NOT EXISTS idx_incidents_runner_id ON incidents(runner_id);
CREATE INDEX IF NOT EXISTS idx_incidents_user_id ON incidents(user_id);


-- ============================================================
-- 21. SUPPORT TICKETS
-- Customer support ticket tracking.
-- ============================================================
CREATE TABLE IF NOT EXISTS support_tickets (
  id SERIAL PRIMARY KEY,
  ticket_id TEXT NOT NULL,
  task_id INTEGER REFERENCES tasks(id),
  user_id INTEGER,
  runner_id INTEGER,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'normal',
  assigned_admin TEXT,
  resolution TEXT,
  refund_amount INTEGER,
  resolution_time_minutes INTEGER,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Support tickets indexes (performance)
CREATE INDEX IF NOT EXISTS idx_support_ticket_id ON support_tickets(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_priority ON support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_category ON support_tickets(category);
CREATE INDEX IF NOT EXISTS idx_support_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_runner_id ON support_tickets(runner_id);
CREATE INDEX IF NOT EXISTS idx_support_task_id ON support_tickets(task_id);
CREATE INDEX IF NOT EXISTS idx_support_status_priority ON support_tickets(status, priority);
CREATE INDEX IF NOT EXISTS idx_support_created_at ON support_tickets(created_at);


-- ============================================================
-- 22. QUALITY REVIEWS
-- Automated quality scoring for completed tasks.
-- ============================================================
CREATE TABLE IF NOT EXISTS quality_reviews (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id),
  runner_id INTEGER NOT NULL REFERENCES runners(id),
  customer_rating INTEGER,
  customer_feedback TEXT,
  comrade_feedback TEXT,
  task_quality_score INTEGER,
  sla_grade TEXT,
  acceptance_time_seconds INTEGER,
  arrival_time_minutes INTEGER,
  completion_time_minutes INTEGER,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Quality reviews indexes (performance)
CREATE INDEX IF NOT EXISTS idx_qr_task_id ON quality_reviews(task_id);
CREATE INDEX IF NOT EXISTS idx_qr_runner_id ON quality_reviews(runner_id);
CREATE INDEX IF NOT EXISTS idx_qr_sla_grade ON quality_reviews(sla_grade);
CREATE INDEX IF NOT EXISTS idx_qr_created_at ON quality_reviews(created_at);


-- ============================================================
-- 23. RECRUITMENTS
-- Comrade recruitment pipeline tracking.
-- ============================================================
CREATE TABLE IF NOT EXISTS recruitments (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  area TEXT NOT NULL,
  vehicle_type TEXT NOT NULL DEFAULT 'bicycle',
  languages TEXT[] NOT NULL DEFAULT '{hindi}',
  availability TEXT NOT NULL DEFAULT 'full_time',
  stage TEXT NOT NULL DEFAULT 'applied',
  notes TEXT,
  interview_date TIMESTAMPTZ,
  documents_submitted_at TIMESTAMPTZ,
  training_completed_at TIMESTAMPTZ,
  training_score INTEGER,
  activated_at TIMESTAMPTZ,
  runner_id INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Recruitments indexes (performance)
CREATE INDEX IF NOT EXISTS idx_recruit_stage ON recruitments(stage);
CREATE INDEX IF NOT EXISTS idx_recruit_area ON recruitments(area);
CREATE INDEX IF NOT EXISTS idx_recruit_phone ON recruitments(phone);
CREATE INDEX IF NOT EXISTS idx_recruit_created_at ON recruitments(created_at);


-- ============================================================
-- 24. TRAINING MODULES
-- Training curriculum for comrade onboarding.
-- ============================================================
CREATE TABLE IF NOT EXISTS training_modules (
  id SERIAL PRIMARY KEY,
  topic TEXT NOT NULL,
  description TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 25. RUNNER TRAINING
-- Tracks which training modules each runner has completed.
-- ============================================================
CREATE TABLE IF NOT EXISTS runner_training (
  id SERIAL PRIMARY KEY,
  runner_id INTEGER NOT NULL REFERENCES runners(id),
  module_id INTEGER NOT NULL REFERENCES training_modules(id),
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  score INTEGER,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Runner training indexes (performance)
CREATE INDEX IF NOT EXISTS idx_rt_runner_id ON runner_training(runner_id);
CREATE INDEX IF NOT EXISTS idx_rt_module_id ON runner_training(module_id);
CREATE INDEX IF NOT EXISTS idx_rt_runner_module ON runner_training(runner_id, module_id);
CREATE INDEX IF NOT EXISTS idx_rt_completed ON runner_training(completed);


-- ============================================================
-- 26. VERIFICATION SESSIONS
-- Active challenge sessions for photo capture verification.
-- ============================================================
CREATE TABLE IF NOT EXISTS verification_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  task_id INTEGER REFERENCES tasks(id),
  challenge_id TEXT NOT NULL UNIQUE,
  challenge_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  gps_lat DOUBLE PRECISION,
  gps_lng DOUBLE PRECISION,
  gps_accuracy DOUBLE PRECISION,
  ip_address TEXT,
  ip_geolocation JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_vsession_user_id ON verification_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_vsession_task_id ON verification_sessions(task_id);
CREATE INDEX IF NOT EXISTS idx_vsession_status ON verification_sessions(status);
CREATE INDEX IF NOT EXISTS idx_vsession_challenge_id ON verification_sessions(challenge_id);
CREATE INDEX IF NOT EXISTS idx_vsession_created_at ON verification_sessions(created_at);


-- ============================================================
-- 27. PHOTO UPLOADS (verification)
-- Individual photo records with full metadata for fraud detection.
-- ============================================================
CREATE TABLE IF NOT EXISTS photo_uploads (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES verification_sessions(id),
  task_id INTEGER REFERENCES tasks(id),
  user_id INTEGER REFERENCES users(id),
  runner_id INTEGER REFERENCES runners(id),
  original_hash TEXT NOT NULL,
  watermark_hash TEXT,
  file_url TEXT NOT NULL,
  original_file_url TEXT,
  file_size INTEGER,
  mime_type TEXT,
  gps_lat DOUBLE PRECISION,
  gps_lng DOUBLE PRECISION,
  gps_accuracy DOUBLE PRECISION,
  device_info JSONB,
  exif_data JSONB,
  ip_address TEXT,
  server_timestamp TIMESTAMPTZ NOT NULL,
  proof_type TEXT,
  risk_score INTEGER NOT NULL DEFAULT 0,
  risk_factors JSONB,
  is_duplicate BOOLEAN NOT NULL DEFAULT FALSE,
  duplicate_of_id INTEGER,
  verification_id TEXT NOT NULL,
  challenge_code TEXT NOT NULL,
  watermark_applied BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'uploaded',
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_photo_session_id ON photo_uploads(session_id);
CREATE INDEX IF NOT EXISTS idx_photo_task_id ON photo_uploads(task_id);
CREATE INDEX IF NOT EXISTS idx_photo_runner_id ON photo_uploads(runner_id);
CREATE INDEX IF NOT EXISTS idx_photo_original_hash ON photo_uploads(original_hash);
CREATE INDEX IF NOT EXISTS idx_photo_verification_id ON photo_uploads(verification_id);
CREATE INDEX IF NOT EXISTS idx_photo_status ON photo_uploads(status);
CREATE INDEX IF NOT EXISTS idx_photo_created_at ON photo_uploads(created_at);
CREATE INDEX IF NOT EXISTS idx_photo_risk_score ON photo_uploads(risk_score);
CREATE INDEX IF NOT EXISTS idx_photo_status_risk ON photo_uploads(status, risk_score);


-- ============================================================
-- 28. VERIFICATION AUDIT LOGS
-- Complete audit trail for all verification events.
-- ============================================================
CREATE TABLE IF NOT EXISTS verification_audit_logs (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES verification_sessions(id),
  photo_id INTEGER REFERENCES photo_uploads(id),
  task_id INTEGER,
  user_id INTEGER,
  runner_id INTEGER,
  action TEXT NOT NULL,
  risk_score INTEGER,
  risk_factors JSONB,
  metadata JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vaudit_session_id ON verification_audit_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_vaudit_photo_id ON verification_audit_logs(photo_id);
CREATE INDEX IF NOT EXISTS idx_vaudit_action ON verification_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_vaudit_created_at ON verification_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_vaudit_runner_id ON verification_audit_logs(runner_id);


-- ============================================================
-- 29. VERIFICATION HASHES
-- Deduplication index for original images.
-- ============================================================
CREATE TABLE IF NOT EXISTS verification_hashes (
  id SERIAL PRIMARY KEY,
  original_hash TEXT NOT NULL UNIQUE,
  photo_id INTEGER REFERENCES photo_uploads(id),
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  occurrence_count INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_vhash_original_hash ON verification_hashes(original_hash);
CREATE INDEX IF NOT EXISTS idx_vhash_occurrence ON verification_hashes(occurrence_count);


-- ============================================================
-- SEED DATA: Default admin account
-- ============================================================
INSERT INTO admins (username, password_hash, name, role, is_active)
VALUES ('admin', 'scrypt:32768:8:1$placeholder$hash', 'Super Admin', 'superadmin', TRUE)
ON CONFLICT (username) DO NOTHING;

-- ============================================================
-- SEED DATA: Default admin settings row
-- ============================================================
INSERT INTO admin_settings (app_name, company_name, pilot_mode)
VALUES ('Go LineLess', 'IBNAY IFTRIBE PRIVATE LIMITED', TRUE)
ON CONFLICT DO NOTHING;

-- ============================================================
-- SEED DATA: Subscription plans
-- ============================================================
INSERT INTO subscription_plans (id, name, price_monthly, price_yearly, tasks_per_month, features, badge, is_popular, is_active)
VALUES
  ('basic-care', 'Basic Care', 499, 4999, 4, ARRAY['4 tasks/month', 'Hospital companion', 'Medicine pickup'], NULL, FALSE, TRUE),
  ('plus-care', 'Plus Care', 999, 9999, 8, ARRAY['8 tasks/month', 'Bank & document help', 'Family updates'], 'Popular', TRUE, TRUE),
  ('premium-care', 'Premium Care', 1999, 19999, NULL, ARRAY['Unlimited tasks', 'Priority runner', '24/7 support'], 'Premium', FALSE, TRUE)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SEED DATA: Training modules
-- ============================================================
INSERT INTO training_modules (topic, description, "order", is_required)
VALUES
  ('Platform Overview', 'Introduction to Go LineLess app, values, and service standards', 1, TRUE),
  ('Task Acceptance Rules', 'How to accept, manage, and complete tasks correctly', 2, TRUE),
  ('Photo Proof Rules', 'Requirements for GPS-tagged, watermarked proof photos', 3, TRUE),
  ('GPS Rules', 'Location tracking, GPS validation, and distance verification', 4, TRUE),
  ('Waiting Rules', 'Queue management, waiting charges, and timer usage', 5, TRUE),
  ('Cancellation Rules', 'When and how tasks can be cancelled, penalties', 6, TRUE),
  ('Emergency Escalation', 'SOS procedures, escalation to admin, safety protocols', 7, TRUE),
  ('Payment Handling', 'Cash collection, confirmation, dispute resolution', 8, TRUE),
  ('Customer Service', 'Communication standards, professionalism, complaint handling', 9, TRUE),
  ('KYC Compliance', 'Identity verification requirements and document standards', 10, TRUE)
ON CONFLICT DO NOTHING;

-- ============================================================
-- SEED DATA: Default runner specializations
-- ============================================================
UPDATE admin_settings
SET available_specializations = ARRAY['hospital', 'senior', 'bank', 'documentation', 'emergency', 'female']
WHERE id = 1;

-- ============================================================
-- DONE — 29 tables created with 50+ indexes and all constraints
-- ============================================================
