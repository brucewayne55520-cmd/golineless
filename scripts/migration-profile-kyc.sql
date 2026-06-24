-- Migration: Add unique IDs, user KYC fields, and device_tokens
-- Run this against your Neon database

-- 1. Add unique_id to users table (format: GLU-XXXX-XXXX)
ALTER TABLE users ADD COLUMN IF NOT EXISTS unique_id TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS aadhaar_number TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS aadhaar_front TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS aadhaar_back TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_status TEXT NOT NULL DEFAULT 'none';
ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pincode TEXT;

-- 2. Add unique_id to runners table (format: GLR-XXXX-XXXX)
ALTER TABLE runners ADD COLUMN IF NOT EXISTS unique_id TEXT UNIQUE;

-- 3. Generate unique IDs for existing users (GLU-XXXX-XXXX format)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM users WHERE unique_id IS NULL LOOP
    UPDATE users SET unique_id = 'GLU-' || LPAD(r.id::TEXT, 4, '0') || '-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 4))
    WHERE id = r.id;
  END LOOP;
END $$;

-- 4. Generate unique IDs for existing runners (GLR-XXXX-XXXX format)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM runners WHERE unique_id IS NULL LOOP
    UPDATE runners SET unique_id = 'GLR-' || LPAD(r.id::TEXT, 4, '0') || '-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 4))
    WHERE id = r.id;
  END LOOP;
END $$;

-- 5. Create device_tokens table (for push notifications)
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
