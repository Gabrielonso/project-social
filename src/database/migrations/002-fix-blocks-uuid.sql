-- Run if search still fails with "character varying = uuid".
-- Converts blocks FK columns when migration 001 did not run or was partial.

SELECT table_name, column_name, udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'blocks'
  AND column_name IN ('blocker_id', 'blocked_id');

ALTER TABLE blocks
  ALTER COLUMN blocker_id TYPE uuid USING NULLIF(trim(blocker_id::text), '')::uuid,
  ALTER COLUMN blocked_id TYPE uuid USING NULLIF(trim(blocked_id::text), '')::uuid;
