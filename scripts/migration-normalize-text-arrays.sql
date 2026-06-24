-- ============================================================
-- Migration: Normalize text().array() columns into proper tables
-- Items #27, #28, #29
-- ============================================================
-- Run with: psql $DATABASE_URL -f migration-normalize-text-arrays.sql
-- Idempotent: uses IF NOT EXISTS / ON CONFLICT

-- ============================================================
-- #27: proof_photos table (replaces tasks.proof_photos text array)
-- ============================================================
CREATE TABLE IF NOT EXISTS proof_photos (
  id          SERIAL PRIMARY KEY,
  task_id     INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  image_url   TEXT NOT NULL,
  proof_type  TEXT NOT NULL DEFAULT 'proof',
  lat         NUMERIC(10, 8),
  lng         NUMERIC(11, 8),
  address     TEXT,
  risk_score  INTEGER DEFAULT 0,
  verified    BOOLEAN DEFAULT FALSE,
  watermark   TEXT,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proof_photos_task_id ON proof_photos(task_id);
CREATE INDEX IF NOT EXISTS idx_proof_photos_risk_score ON proof_photos(risk_score) WHERE risk_score > 50;

-- Migrate existing data (one-time, skip if already done)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'proof_photos'
      AND udt_name = '_text'
  ) AND NOT EXISTS (
    SELECT 1 FROM proof_photos LIMIT 1
  ) THEN
    INSERT INTO proof_photos (task_id, image_url, proof_type, created_at)
    SELECT
      t.id,
      (p)::jsonb->>'imageUrl',
      COALESCE((p)::jsonb->>'proofType', 'proof'),
      t.created_at
    FROM tasks t
    CROSS JOIN unnest(t.proof_photos) AS p
    WHERE p IS NOT NULL AND p != '';
  END IF;
END $$;

-- ============================================================
-- #28: task_timeline_events table (replaces tasks.task_timeline text array)
-- ============================================================
CREATE TABLE IF NOT EXISTS task_timeline_events (
  id          SERIAL PRIMARY KEY,
  task_id     INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL,
  description TEXT,
  actor       TEXT,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_timeline_events_task_id ON task_timeline_events(task_id);
CREATE INDEX IF NOT EXISTS idx_task_timeline_events_type ON task_timeline_events(event_type);

-- Migrate existing data
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'task_timeline'
      AND udt_name = '_text'
  ) AND NOT EXISTS (
    SELECT 1 FROM task_timeline_events LIMIT 1
  ) THEN
    INSERT INTO task_timeline_events (task_id, event_type, description, created_at)
    SELECT
      t.id,
      COALESCE((entry)::jsonb->>'event', 'unknown'),
      COALESCE((entry)::jsonb->>'description', (entry)::jsonb->>'message', ''),
      t.created_at
    FROM tasks t
    CROSS JOIN unnest(t.task_timeline) AS entry
    WHERE entry IS NOT NULL AND entry != '';
  END IF;
END $$;

-- ============================================================
-- #29: fraud_flags table (replaces tasks.fraud_flags text array)
-- ============================================================
CREATE TABLE IF NOT EXISTS fraud_flags (
  id          SERIAL PRIMARY KEY,
  task_id     INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  runner_id   INTEGER,
  flag_type   TEXT NOT NULL,
  reason      TEXT,
  severity    TEXT NOT NULL DEFAULT 'low',
  risk_score  INTEGER DEFAULT 0,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fraud_flags_task_id ON fraud_flags(task_id);
CREATE INDEX IF NOT EXISTS idx_fraud_flags_severity ON fraud_flags(severity) WHERE severity = 'high';
CREATE INDEX IF NOT EXISTS idx_fraud_flags_runner_id ON fraud_flags(runner_id);

-- Migrate existing data
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'fraud_flags'
      AND udt_name = '_text'
  ) AND NOT EXISTS (
    SELECT 1 FROM fraud_flags LIMIT 1
  ) THEN
    INSERT INTO fraud_flags (task_id, flag_type, reason, severity, created_at)
    SELECT
      t.id,
      COALESCE((flag)::jsonb->>'type', (flag)::jsonb->>'reason', 'unknown'),
      COALESCE((flag)::jsonb->>'reason', (flag)::jsonb->>'type', ''),
      COALESCE((flag)::jsonb->>'severity', 'low'),
      t.created_at
    FROM tasks t
    CROSS JOIN unnest(t.fraud_flags) AS flag
    WHERE flag IS NOT NULL AND flag != '';
  END IF;
END $$;

-- ============================================================
-- After migration, the old text array columns can be dropped:
-- ALTER TABLE tasks DROP COLUMN IF EXISTS proof_photos;
-- ALTER TABLE tasks DROP COLUMN IF EXISTS task_timeline;
-- ALTER TABLE tasks DROP COLUMN IF EXISTS fraud_flags;
-- (Only run after all code has been updated to use the new tables)
-- ============================================================
