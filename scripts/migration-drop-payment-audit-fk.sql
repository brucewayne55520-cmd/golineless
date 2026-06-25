-- ============================================================
-- MIGRATION: Drop payment_audit_log FK constraint on task_id
-- 
-- WHY: KYC/admin audit entries legitimately use task_id = NULL,
--       but the FK constraint requires a valid tasks.id.
--       This also cleans up any historical rows with task_id = 0
--       (which don't exist in the tasks table).
--
-- SAFE TO RE-RUN: Uses IF EXISTS / EXCEPTION blocks.
-- ============================================================

-- Step 1: Clean up any rows with task_id = 0 (invalid FK value)
DELETE FROM "payment_audit_log" WHERE "task_id" = 0;

-- Step 2: Drop the FK constraint (if it exists)
DO $$ BEGIN
  ALTER TABLE "payment_audit_log" DROP CONSTRAINT IF EXISTS "payment_audit_log_task_id_tasks_id_fk";
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- Step 3: Verify the constraint is gone
SELECT conname, contype
FROM pg_constraint
WHERE conrelid = 'payment_audit_log'::regclass AND contype = 'f';
-- Should return 0 rows after running this migration

-- DONE: payment_audit_log.task_id is now a nullable integer with no FK constraint.
-- KYC/admin audit entries can safely use task_id = NULL.
