-- ============================================================================
-- DISABLE RLS ON ALL TABLES - Complete Testing Mode
-- ============================================================================
-- This disables RLS on all application tables so you can test everything
-- ⚠️ FOR LOCAL TESTING ONLY - Re-enable before production!
-- ============================================================================

-- Disable RLS on all main tables
ALTER TABLE IF EXISTS profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS catering_jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS job_confirmations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS worker_attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS location_sharing_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS deleted_jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS admin_audit_logs DISABLE ROW LEVEL SECURITY;

-- Verify all tables have RLS disabled
SELECT 
  tablename,
  (SELECT CASE WHEN relrowsecurity THEN '❌ ENABLED' ELSE '✅ DISABLED' END 
   FROM pg_class WHERE relname = tablename) as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
  'profiles', 
  'catering_jobs', 
  'job_confirmations',
  'worker_attendance',
  'location_sharing_sessions',
  'deleted_jobs',
  'reports',
  'admin_audit_logs'
)
ORDER BY tablename;

-- Summary
SELECT '============================================' as info;
SELECT '✅ ALL RLS DISABLED' as status;
SELECT '✅ You can now:' as info;
SELECT '   - Sign up' as action;
SELECT '   - Create profiles' as action;
SELECT '   - Post jobs' as action;
SELECT '   - Confirm jobs' as action;
SELECT '   - Use all features' as action;
SELECT '⚠️  Remember: Re-enable RLS before production!' as warning;
SELECT '============================================' as info;

-- ============================================================================
-- TO RE-ENABLE ALL RLS LATER (before production):
-- 
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE catering_jobs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE job_confirmations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE worker_attendance ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE location_sharing_sessions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE deleted_jobs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;
-- 
-- Then create proper RLS policies for each table
-- ============================================================================
