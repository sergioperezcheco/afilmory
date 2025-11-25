-- Fix for migration 8 conflict
-- This script checks the current state and provides fixes

-- Step 1: Check current state
DO $$
DECLARE
  column_exists BOOLEAN;
  migration_exists BOOLEAN;
  max_id INTEGER;
  current_hash TEXT := '3e605e950a2a2650516d475aad9b37e3a1b5cd0aa5209a753b92741baf5c0818';
  old_hash TEXT := 'd023f665c2c50c62ec378be8101db54eec3e47907da8b05c32ed9d1a08c14f49';
BEGIN
  -- Check if column exists
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'managed_storage_usage' 
      AND column_name = 'operation'
  ) INTO column_exists;
  
  -- Check if migration with current hash exists
  SELECT EXISTS (
    SELECT 1 
    FROM drizzle.__drizzle_migrations 
    WHERE hash = current_hash
  ) INTO migration_exists;
  
  -- Get max id
  SELECT COALESCE(MAX(id), 0) FROM drizzle.__drizzle_migrations INTO max_id;
  
  RAISE NOTICE 'Column exists: %', column_exists;
  RAISE NOTICE 'Migration with current hash exists: %', migration_exists;
  RAISE NOTICE 'Max migration id: %', max_id;
  
  -- If column exists but migration isn't recorded, insert it
  IF column_exists AND NOT migration_exists THEN
    INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
    VALUES (current_hash, extract(epoch from now()) * 1000)
    ON CONFLICT DO NOTHING;
    RAISE NOTICE 'Inserted migration record for current hash';
  END IF;
  
  -- Fix sequence if it's behind
  IF max_id > 0 THEN
    PERFORM setval(pg_get_serial_sequence('drizzle.__drizzle_migrations', 'id'), max_id, true);
    RAISE NOTICE 'Reset sequence to max_id: %', max_id;
  END IF;
  
  -- If there's a record with the old hash, warn
  IF EXISTS (SELECT 1 FROM drizzle.__drizzle_migrations WHERE hash = old_hash) THEN
    RAISE NOTICE 'WARNING: Found migration with old hash. You may need to update or delete it manually.';
  END IF;
END $$;

-- Step 2: Show current migration state
SELECT 
  id,
  hash,
  created_at,
  CASE 
    WHEN hash = 'd023f665c2c50c62ec378be8101db54eec3e47907da8b05c32ed9d1a08c14f49' THEN 'OLD HASH (from error)'
    WHEN hash = '3e605e950a2a2650516d475aad9b37e3a1b5cd0aa5209a753b92741baf5c0818' THEN 'CURRENT HASH'
    ELSE 'OTHER'
  END as status
FROM drizzle.__drizzle_migrations 
ORDER BY id;

