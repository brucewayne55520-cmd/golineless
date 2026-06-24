-- ============================================================
-- Go LineLess — Neon SQL Migration
-- Covers: Phase 1 (Security), Phase 2 (Admin UX), Phase 3 (Notifications)
-- Generated: 2026-06-24
-- Safe to re-run: All statements use IF NOT EXISTS / ON CONFLICT
-- ============================================================

-- ============================================================
-- PHASE 1: SECURITY HARDENING
-- ============================================================

-- S1: Aadhaar fields exist but content will now be encrypted (AES-256-GCM)
-- No schema change needed — code handles encryption transparently.
-- IMPORTANT: Set ENCRYPTION_KEY env var on Render before deploying!
--   Generate with: openssl rand -hex 32

-- S2: Aadhaar photos now uploaded to B2 instead of base64 in DB
-- No schema change needed — code handles upload transparently.
-- Existing base64 data will still decrypt and display correctly.
-- NEW submissions will store B2 URLs (small strings) instead of base64.

-- S3: Phone OTP verification — no schema change needed.
-- Uses existing OTP fields (otp, otp_expires_at) + Twilio Verify.

-- S4: KYC enforcement for senior care — no schema change needed.
-- Code checks kycStatus at booking time.

-- S5: Session expiry — no schema change needed.
-- Sessions table already has expires_at; cron purges expired rows.

-- ============================================================
-- PHASE 2: ADMIN UX IMPROVEMENTS
-- ============================================================

-- A1: KYC review pagination — no schema change needed (client-side).

-- A3: KycBadge component — no schema change needed (frontend only).

-- A4: KYC metrics widget — no schema change needed (frontend queries existing data).

-- A5: KYC document expiry tracking — no schema change needed.
-- Uses existing updated_at timestamp to flag pending > 7 days.

-- A6: Admin audit log viewer — no schema change needed.
-- Uses existing payment_audit_log table.

-- ============================================================
-- PHASE 3: USER & COMRADE UX
-- ============================================================

-- U1: Notifications center — no schema change needed.
-- Uses existing notifications table.

-- U2: Runner KYC resubmission — no schema change needed.
-- Code handles rejection reason display and resubmit flow.

-- ============================================================
-- PHASE 6: FRONTEND POLISH
-- ============================================================

-- F1: SEO (JSON-LD, sitemap, meta tags) — frontend only.
-- F3: ErrorBoundary — frontend only.

-- ============================================================
-- ENVIRONMENT VARIABLES REQUIRED
-- ============================================================
-- Run these commands to set up missing env vars on Render:
--
-- 1. ENCRYPTION_KEY (REQUIRED for Aadhaar encryption):
--    openssl rand -hex 32
--    Then set: ENCRYPTION_KEY=<output>
--
-- 2. B2 storage (optional — falls back to base64 if not set):
--    B2_KEY_ID=<your-backblaze-key-id>
--    B2_APPLICATION_KEY=<your-backblaze-app-key>
--    B2_BUCKET_NAME=golineless-uploads
--    B2_ENDPOINT=https://s3.us-west-004.backblazeb2.com
--
-- 3. Verify these are already set:
--    DATABASE_URL, ADMIN_TOKEN, TWILIO_ACCOUNT_SID,
--    TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID,
--    BREVO_API_KEY, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================
-- Run these to verify the migration was successful:

-- Check users table has KYC fields:
SELECT column_name FROM information_schema.columns
WHERE table_name = 'users' AND column_name IN (
  'kyc_status', 'aadhaar_number', 'aadhaar_front', 'aadhaar_back',
  'unique_id', 'emergency_contact'
)
ORDER BY column_name;

-- Check runners table has all required fields:
SELECT column_name FROM information_schema.columns
WHERE table_name = 'runners' AND column_name IN (
  'kyc_status', 'kyc_rejection_reason', 'unique_id',
  'trust_score', 'dispatch_allowed', 'onboarding_step',
  'bank_account', 'bank_ifsc', 'selfie'
)
ORDER BY column_name;

-- Check notifications table exists:
SELECT EXISTS (
  SELECT FROM information_schema.tables WHERE table_name = 'notifications'
) AS notifications_exists;

-- Check payment_audit_log table exists:
SELECT EXISTS (
  SELECT FROM information_schema.tables WHERE table_name = 'payment_audit_log'
) AS payment_audit_log_exists;

-- Count pending KYC submissions > 7 days old:
SELECT
  (SELECT COUNT(*) FROM users WHERE kyc_status = 'pending'
    AND updated_at < NOW() - INTERVAL '7 days') AS stale_users,
  (SELECT COUNT(*) FROM runners WHERE kyc_status = 'pending'
    AND updated_at < NOW() - INTERVAL '7 days') AS stale_runners;

-- ============================================================
-- MIGRATION COMPLETE
-- No schema changes required — all features use existing columns.
-- Deploy the updated code to Render after setting ENCRYPTION_KEY.
-- ============================================================
