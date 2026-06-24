-- Migration: Offline Payments System Enhancement
-- Date: 2026-06-22
-- Items: #1, #6, #12, #24

-- Add payment_confirmed_by and payment_confirmed_at to tasks table (#1)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS payment_confirmed_by integer;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS payment_confirmed_at timestamp with time zone;

-- Add paid_amount to tasks table (#12)
-- Tracks how much has been paid (for partial payments)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS paid_amount numeric(8,2) NOT NULL DEFAULT 0;

-- Update payment_method default from 'online' to 'cash' for new tasks (#6)
-- Note: This only affects future inserts; existing rows keep their current value
ALTER TABLE tasks ALTER COLUMN payment_method SET DEFAULT 'cash';

-- Change runner_payouts.task_ids from text to integer[] (#24)
-- WARNING: Only run this if taskIds is currently text type
-- Check first: SELECT data_type FROM information_schema.columns WHERE table_name='runner_payouts' AND column_name='task_ids';
-- If data_type = 'text', run the conversion:
-- ALTER TABLE runner_payouts ALTER COLUMN task_ids TYPE integer[] USING string_to_array(task_ids, ',')::integer[];
-- If already integer[], no action needed.

-- Create payment_audit_log table (#14) — if not already created by drizzle
CREATE TABLE IF NOT EXISTS payment_audit_log (
  id serial PRIMARY KEY,
  task_id integer NOT NULL,
  previous_status text,
  new_status text,
  actor text,
  actor_type text,
  reason text,
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add UPI configuration to admin_settings
ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS upi_id text NOT NULL DEFAULT 'golineless@upi';
ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS upi_payee_name text NOT NULL DEFAULT 'Go LineLess';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_audit_log_task_id ON payment_audit_log(task_id);
CREATE INDEX IF NOT EXISTS idx_payment_audit_log_created_at ON payment_audit_log(created_at);
