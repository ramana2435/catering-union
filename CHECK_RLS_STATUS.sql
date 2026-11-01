-- Quick check: Is RLS disabled on all tables?

SELECT 
  tablename,
  CASE WHEN relrowsecurity THEN '❌ STILL ENABLED' ELSE '✅ DISABLED' END as rls_status
FROM pg_tables t
JOIN pg_class c ON t.tablename = c.relname
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
