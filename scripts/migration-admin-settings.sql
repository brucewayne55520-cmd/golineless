-- Migration: Create admin_settings and device_tokens tables
-- Run this against your Neon database if the tables are missing

CREATE TABLE IF NOT EXISTS admin_settings (
  id SERIAL PRIMARY KEY,
  app_name TEXT NOT NULL DEFAULT 'Go LineLess',
  company_name TEXT NOT NULL DEFAULT 'IBNAY IFTRIBE PRIVATE LIMITED',
  support_phone TEXT NOT NULL DEFAULT '+91-9999999999',
  support_email TEXT NOT NULL DEFAULT 'support@golineless.com',
  whatsapp_number TEXT NOT NULL DEFAULT '+91-9999999999',
  runner_payout_percent NUMERIC(5,2) NOT NULL DEFAULT 70,
  urgency_surcharge NUMERIC(8,2) NOT NULL DEFAULT 50,
  cancellation_fee NUMERIC(8,2) NOT NULL DEFAULT 0,
  max_tasks_per_runner_per_day INTEGER NOT NULL DEFAULT 20,
  maintenance_mode BOOLEAN NOT NULL DEFAULT false,
  -- Phase 6: Revenue config
  free_waiting_minutes INTEGER NOT NULL DEFAULT 15,
  waiting_charge_per_minute NUMERIC(5,2) NOT NULL DEFAULT 2,
  priority_fee_amount NUMERIC(8,2) NOT NULL DEFAULT 49,
  emergency_fee_amount NUMERIC(8,2) NOT NULL DEFAULT 99,
  urgency_normal_multiplier NUMERIC(3,2) NOT NULL DEFAULT 1.0,
  urgency_urgent_multiplier NUMERIC(3,2) NOT NULL DEFAULT 1.25,
  urgency_emergency_multiplier NUMERIC(3,2) NOT NULL DEFAULT 1.5,
  -- Phase 7: GPS Validation
  gps_validation_radius INTEGER NOT NULL DEFAULT 250,
  -- Phase 7: Waiting Revenue V2 brackets
  waiting_bracket1_min INTEGER NOT NULL DEFAULT 30,
  waiting_bracket1_charge NUMERIC(8,2) NOT NULL DEFAULT 0,
  waiting_bracket2_min INTEGER NOT NULL DEFAULT 60,
  waiting_bracket2_charge NUMERIC(8,2) NOT NULL DEFAULT 30,
  waiting_bracket3_min INTEGER NOT NULL DEFAULT 120,
  waiting_bracket3_charge NUMERIC(8,2) NOT NULL DEFAULT 80,
  waiting_bracket4_charge NUMERIC(8,2) NOT NULL DEFAULT 150,
  -- Smart Dispatch config
  dispatch_initial_radius INTEGER NOT NULL DEFAULT 3,
  dispatch_expand_delay INTEGER NOT NULL DEFAULT 60,
  dispatch_max_radius INTEGER NOT NULL DEFAULT 20,
  -- Phase 9.3: Queue ETA multipliers
  queue_eta_multiplier_hospital NUMERIC(3,1) NOT NULL DEFAULT 5,
  queue_eta_multiplier_bank NUMERIC(3,1) NOT NULL DEFAULT 2,
  queue_eta_multiplier_govt NUMERIC(3,1) NOT NULL DEFAULT 8,
  queue_eta_multiplier_default NUMERIC(3,1) NOT NULL DEFAULT 3,
  -- Phase 9: Pilot Launch Mode
  pilot_mode BOOLEAN NOT NULL DEFAULT false,
  pilot_categories TEXT[] NOT NULL DEFAULT ARRAY['medicine','document','bank','govt_office','courier','senior_care'],
  -- UPI Configuration
  upi_id TEXT NOT NULL DEFAULT 'golineless@upi',
  upi_payee_name TEXT NOT NULL DEFAULT 'Go LineLess',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default settings row if none exists
INSERT INTO admin_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS device_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  runner_id INTEGER REFERENCES runners(id),
  token TEXT NOT NULL,
  platform TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
