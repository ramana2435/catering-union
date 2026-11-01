-- ============================================================================
-- DISABLE RLS FOR TESTING (Temporary - FOR DEVELOPMENT ONLY!)
-- ============================================================================
-- ⚠️ WARNING: This removes all security!
-- ⚠️ Only use for local testing
-- ⚠️ Re-enable RLS before production
-- ============================================================================

-- Disable RLS on profiles table
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Verify it's disabled
SELECT 
  'RLS Status' as check_name,
  CASE WHEN relrowsecurity 
    THEN '❌ Still ENABLED (something went wrong)' 
    ELSE '✅ DISABLED (testing mode)' 
  END as status
FROM pg_class 
WHERE relname = 'profiles';

-- Show warning
SELECT '⚠️  WARNING: RLS IS DISABLED!' as warning;
SELECT '⚠️  Anyone can read/write all profiles!' as warning;
SELECT '⚠️  Use only for testing!' as warning;
SELECT '✅  Now try signup in your app' as next_step;

-- ============================================================================
-- To RE-ENABLE RLS later (before production):
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- Then run FINAL_FIX_422_ERROR.sql to create policies
-- ============================================================================
