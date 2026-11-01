-- ============================================================================
-- DIAGNOSTIC SCRIPT
-- Run this to see what's wrong with your database setup
-- ============================================================================

-- CHECK 1: Does profiles table exist?
SELECT 
  '1. Table Existence' as check_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles')
    THEN '✅ profiles table EXISTS'
    ELSE '❌ profiles table DOES NOT EXIST - Run COMPLETE_FIX_ALL_ISSUES.sql'
  END as result;

-- CHECK 2: What columns does profiles table have?
SELECT 
  '2. Table Structure' as check_name,
  string_agg(column_name, ', ' ORDER BY ordinal_position) as result
FROM information_schema.columns 
WHERE table_name = 'profiles';

-- CHECK 3: Is RLS enabled?
SELECT 
  '3. RLS Status' as check_name,
  CASE 
    WHEN (SELECT relrowsecurity FROM pg_class WHERE relname = 'profiles')
    THEN '✅ RLS is ENABLED'
    ELSE '❌ RLS is DISABLED - Run COMPLETE_FIX_ALL_ISSUES.sql'
  END as result;

-- CHECK 4: How many policies exist?
SELECT 
  '4. Policy Count' as check_name,
  COALESCE(COUNT(*)::text, '0') || ' policies' as result
FROM pg_policies 
WHERE tablename = 'profiles';

-- CHECK 5: List all policies
SELECT 
  '5. Policy Details' as check_name,
  policyname || ' (' || cmd || ')' as result
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;

-- CHECK 6: Does is_admin function exist?
SELECT 
  '6. Helper Function' as check_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin')
    THEN '✅ is_admin() function EXISTS'
    ELSE '❌ is_admin() function DOES NOT EXIST'
  END as result;

-- CHECK 7: Are there any profiles in the table?
SELECT 
  '7. Existing Data' as check_name,
  COALESCE(COUNT(*)::text, '0') || ' profiles in database' as result
FROM profiles;

-- CHECK 8: Check if INSERT policy allows worker/provider roles
SELECT 
  '8. INSERT Policy Check' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'profiles' 
      AND cmd = 'INSERT'
      AND with_check::text LIKE '%worker%'
    )
    THEN '✅ INSERT policy allows worker/provider'
    ELSE '❌ INSERT policy missing or incorrect'
  END as result;

-- ============================================================================
-- INTERPRETATION OF RESULTS
-- ============================================================================
-- 
-- If you see:
-- ❌ profiles table DOES NOT EXIST
--    → Run COMPLETE_FIX_ALL_ISSUES.sql
--
-- ❌ RLS is DISABLED
--    → Run COMPLETE_FIX_ALL_ISSUES.sql
--
-- 0 policies
--    → Run COMPLETE_FIX_ALL_ISSUES.sql
--
-- ❌ INSERT policy missing or incorrect
--    → Run COMPLETE_FIX_ALL_ISSUES.sql
--
-- If all checks show ✅ but signup still fails:
--    → Check browser console for specific error
--    → Make sure email confirmation is disabled in Supabase settings
--    → Try with a completely new email address
-- ============================================================================
