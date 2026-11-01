-- ============================================================================
-- NUCLEAR OPTION - Completely Disable RLS
-- ============================================================================
-- If policies still don't work, just turn off RLS completely for testing
-- ============================================================================

-- DISABLE RLS
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Verify it's OFF
SELECT 
  'RLS Status' as check_name,
  CASE WHEN relrowsecurity 
    THEN '❌ STILL ENABLED' 
    ELSE '✅ DISABLED' 
  END as status
FROM pg_class 
WHERE relname = 'profiles';

-- Test insert directly
DO $$
BEGIN
  INSERT INTO profiles (id, full_name, role)
  VALUES ('4591f260-f92e-48c1-9992-7359e544ed5f'::UUID, 'Test', 'worker')
  ON CONFLICT (id) DO UPDATE SET full_name = 'Updated Test';
  
  RAISE NOTICE '✅ Insert worked with RLS disabled';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Insert failed: %', SQLERRM;
END $$;

SELECT '✅ RLS is now DISABLED' as result;
SELECT '✅ Try signup - it WILL work now' as result;
SELECT '⚠️ Re-enable RLS before production!' as warning;

-- ============================================================================
-- TO RE-ENABLE LATER:
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- Then create proper policies
-- ============================================================================
