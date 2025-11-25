-- Script to diagnose and fix migration 8 issue
-- Run this in your database to check the current state

-- 1. Check if the operation column already exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_name = 'managed_storage_usage' 
        AND column_name = 'operation'
    ) THEN 'Column EXISTS - migration 8 was already applied'
    ELSE 'Column MISSING - migration 8 needs to be applied'
  END as migration_status;

-- 2. Check what migrations are recorded in the database
SELECT 
  id,
  hash,
  created_at,
  CASE 
    WHEN hash = 'd023f665c2c50c62ec378be8101db54eec3e47907da8b05c32ed9d1a08c14f49' THEN 'This is the OLD hash from error'
    WHEN hash = '3e605e950a2a2650516d475aad9b37e3a1b5cd0aa5209a753b92741baf5c0818' THEN 'This is the CURRENT hash'
    ELSE 'Other hash'
  END as hash_status
FROM drizzle.__drizzle_migrations 
ORDER BY id;

-- 3. If the column exists but migration isn't recorded, you can manually insert it:
-- (Uncomment and adjust if needed)
/*
INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
VALUES ('3e605e950a2a2650516d475aad9b37e3a1b5cd0aa5209a753b92741baf5c0818', extract(epoch from now()) * 1000)
ON CONFLICT DO NOTHING;
*/

-- 4. If there's a duplicate record with id=7 that shouldn't be there:
-- (Uncomment and adjust if needed - BE CAREFUL!)
/*
-- First, check what record has id=7:
SELECT * FROM drizzle.__drizzle_migrations WHERE id = 7;

-- If it's the wrong migration, you might need to delete it:
-- DELETE FROM drizzle.__drizzle_migrations WHERE id = 7 AND hash = 'wrong_hash_here';
*/

