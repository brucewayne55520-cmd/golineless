-- ============================================================
-- Migration: Photo Verification System
-- Creates anti-fraud photo verification tables
-- ============================================================

-- 1. Verification Sessions
CREATE TABLE IF NOT EXISTS verification_sessions (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER REFERENCES users(id),
  task_id         INTEGER REFERENCES tasks(id),
  challenge_id    TEXT UNIQUE NOT NULL,
  challenge_code  TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'active',
  gps_lat         DOUBLE PRECISION,
  gps_lng         DOUBLE PRECISION,
  gps_accuracy    DOUBLE PRECISION,
  ip_address      TEXT,
  ip_geolocation  JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_vsession_user_id ON verification_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_vsession_task_id ON verification_sessions(task_id);
CREATE INDEX IF NOT EXISTS idx_vsession_status ON verification_sessions(status);
CREATE INDEX IF NOT EXISTS idx_vsession_challenge_id ON verification_sessions(challenge_id);

-- 2. Photo Uploads
CREATE TABLE IF NOT EXISTS photo_uploads (
  id                SERIAL PRIMARY KEY,
  session_id        INTEGER REFERENCES verification_sessions(id),
  task_id           INTEGER REFERENCES tasks(id),
  user_id           INTEGER REFERENCES users(id),
  runner_id         INTEGER REFERENCES runners(id),
  original_hash     TEXT NOT NULL,
  watermark_hash    TEXT,
  file_url          TEXT NOT NULL,
  original_file_url TEXT,
  file_size         INTEGER,
  mime_type         TEXT,
  gps_lat           DOUBLE PRECISION,
  gps_lng           DOUBLE PRECISION,
  gps_accuracy      DOUBLE PRECISION,
  device_info       JSONB,
  exif_data         JSONB,
  ip_address        TEXT,
  server_timestamp  TIMESTAMPTZ NOT NULL,
  proof_type        TEXT,
  risk_score        INTEGER NOT NULL DEFAULT 0,
  risk_factors      JSONB,
  is_duplicate      BOOLEAN NOT NULL DEFAULT false,
  duplicate_of_id   INTEGER,
  verification_id   TEXT NOT NULL,
  challenge_code    TEXT NOT NULL,
  watermark_applied BOOLEAN NOT NULL DEFAULT false,
  status            TEXT NOT NULL DEFAULT 'uploaded',
  review_note       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_photo_session_id ON photo_uploads(session_id);
CREATE INDEX IF NOT EXISTS idx_photo_task_id ON photo_uploads(task_id);
CREATE INDEX IF NOT EXISTS idx_photo_runner_id ON photo_uploads(runner_id);
CREATE INDEX IF NOT EXISTS idx_photo_original_hash ON photo_uploads(original_hash);
CREATE INDEX IF NOT EXISTS idx_photo_verification_id ON photo_uploads(verification_id);
CREATE INDEX IF NOT EXISTS idx_photo_status ON photo_uploads(status);
CREATE INDEX IF NOT EXISTS idx_photo_created_at ON photo_uploads(created_at);

-- 3. Verification Audit Logs
CREATE TABLE IF NOT EXISTS verification_audit_logs (
  id              SERIAL PRIMARY KEY,
  session_id      INTEGER REFERENCES verification_sessions(id),
  photo_id        INTEGER REFERENCES photo_uploads(id),
  task_id         INTEGER,
  user_id         INTEGER,
  runner_id       INTEGER,
  action          TEXT NOT NULL,
  risk_score      INTEGER,
  risk_factors    JSONB,
  metadata        JSONB,
  ip_address      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vaudit_session_id ON verification_audit_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_vaudit_photo_id ON verification_audit_logs(photo_id);
CREATE INDEX IF NOT EXISTS idx_vaudit_action ON verification_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_vaudit_created_at ON verification_audit_logs(created_at);

-- 4. Verification Hashes (dedup index)
CREATE TABLE IF NOT EXISTS verification_hashes (
  id                SERIAL PRIMARY KEY,
  original_hash     TEXT UNIQUE NOT NULL,
  photo_id          INTEGER REFERENCES photo_uploads(id),
  first_seen_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  occurrence_count  INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_vhash_original_hash ON verification_hashes(original_hash);
