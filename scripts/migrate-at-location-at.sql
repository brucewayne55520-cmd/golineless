-- Migration: Add dedicated at_location_at timestamp column to tasks table
-- This separates the at_location timestamp from reachedTaskLocationAt
-- so both events are tracked independently.

ALTER TABLE tasks ADD COLUMN at_location_at TIMESTAMPTZ;
