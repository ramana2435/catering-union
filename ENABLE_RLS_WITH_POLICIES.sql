-- ============================================================================
-- ENABLE RLS WITH PROPER POLICIES FOR PRODUCTION
-- ============================================================================
-- WARNING: This will enable RLS on all tables. Only run after local testing!
-- Current Status: RLS is DISABLED on all tables for local testing
-- Before Production: Run this script to enable proper security
-- ============================================================================

-- ============================================================================
-- 1. PROFILES TABLE
-- ============================================================================

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Users can insert their own profile (for signup)
CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Admins can update any profile
CREATE POLICY "Admins can update any profile"
ON profiles FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- ============================================================================
-- 2. CATERING_JOBS TABLE
-- ============================================================================

-- Enable RLS
ALTER TABLE catering_jobs ENABLE ROW LEVEL SECURITY;

-- Anyone can view non-deleted jobs
CREATE POLICY "Anyone can view active jobs"
ON catering_jobs FOR SELECT
USING (deleted_at IS NULL);

-- Providers can insert jobs
CREATE POLICY "Providers can create jobs"
ON catering_jobs FOR INSERT
WITH CHECK (
  auth.uid() = provider_id AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'provider'
  )
);

-- Providers can update their own jobs
CREATE POLICY "Providers can update own jobs"
ON catering_jobs FOR UPDATE
USING (auth.uid() = provider_id)
WITH CHECK (auth.uid() = provider_id);

-- Admins can view all jobs (including deleted)
CREATE POLICY "Admins can view all jobs"
ON catering_jobs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Admins can update any job
CREATE POLICY "Admins can update any job"
ON catering_jobs FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- ============================================================================
-- 3. JOB_CONFIRMATIONS TABLE
-- ============================================================================

-- Enable RLS
ALTER TABLE job_confirmations ENABLE ROW LEVEL SECURITY;

-- Workers can view their own confirmations
CREATE POLICY "Workers can view own confirmations"
ON job_confirmations FOR SELECT
USING (auth.uid() = worker_id);

-- Workers can create confirmations
CREATE POLICY "Workers can create confirmations"
ON job_confirmations FOR INSERT
WITH CHECK (
  auth.uid() = worker_id AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'worker'
  )
);

-- Workers can update their own confirmations
CREATE POLICY "Workers can update own confirmations"
ON job_confirmations FOR UPDATE
USING (auth.uid() = worker_id)
WITH CHECK (auth.uid() = worker_id);

-- Providers can view confirmations for their jobs
CREATE POLICY "Providers can view confirmations for own jobs"
ON job_confirmations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM catering_jobs
    WHERE catering_jobs.id = job_confirmations.job_id
    AND catering_jobs.provider_id = auth.uid()
  )
);

-- Providers can update confirmations for their jobs
CREATE POLICY "Providers can update confirmations for own jobs"
ON job_confirmations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM catering_jobs
    WHERE catering_jobs.id = job_confirmations.job_id
    AND catering_jobs.provider_id = auth.uid()
  )
);

-- Admins can view all confirmations
CREATE POLICY "Admins can view all confirmations"
ON job_confirmations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- ============================================================================
-- 4. WORKER_ATTENDANCE TABLE
-- ============================================================================

-- Enable RLS
ALTER TABLE worker_attendance ENABLE ROW LEVEL SECURITY;

-- Workers can view their own attendance
CREATE POLICY "Workers can view own attendance"
ON worker_attendance FOR SELECT
USING (auth.uid() = worker_id);

-- Workers can update their own attendance
CREATE POLICY "Workers can update own attendance"
ON worker_attendance FOR UPDATE
USING (auth.uid() = worker_id)
WITH CHECK (auth.uid() = worker_id);

-- Providers can view attendance for their jobs
CREATE POLICY "Providers can view attendance for own jobs"
ON worker_attendance FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM catering_jobs
    WHERE catering_jobs.id = worker_attendance.job_id
    AND catering_jobs.provider_id = auth.uid()
  )
);

-- Providers can insert/update attendance for their jobs
CREATE POLICY "Providers can manage attendance for own jobs"
ON worker_attendance FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM catering_jobs
    WHERE catering_jobs.id = worker_attendance.job_id
    AND catering_jobs.provider_id = auth.uid()
  )
);

-- Admins can view all attendance
CREATE POLICY "Admins can view all attendance"
ON worker_attendance FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- ============================================================================
-- 5. LOCATION_SHARING_SESSIONS TABLE
-- ============================================================================

-- Enable RLS
ALTER TABLE location_sharing_sessions ENABLE ROW LEVEL SECURITY;

-- Workers can create and view their own location sessions
CREATE POLICY "Workers can manage own location sessions"
ON location_sharing_sessions FOR ALL
USING (auth.uid() = worker_id)
WITH CHECK (auth.uid() = worker_id);

-- Providers can view location sessions for their jobs
CREATE POLICY "Providers can view location sessions for own jobs"
ON location_sharing_sessions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM catering_jobs
    WHERE catering_jobs.id = location_sharing_sessions.job_id
    AND catering_jobs.provider_id = auth.uid()
  )
);

-- ============================================================================
-- 6. DELETED_JOBS TABLE
-- ============================================================================

-- Enable RLS
ALTER TABLE deleted_jobs ENABLE ROW LEVEL SECURITY;

-- Admins can view all deleted jobs
CREATE POLICY "Admins can view deleted jobs"
ON deleted_jobs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- ============================================================================
-- 7. REPORTS TABLE
-- ============================================================================

-- Enable RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Users can create reports
CREATE POLICY "Users can create reports"
ON reports FOR INSERT
WITH CHECK (auth.uid() = reporter_id);

-- Users can view their own reports
CREATE POLICY "Users can view own reports"
ON reports FOR SELECT
USING (auth.uid() = reporter_id);

-- Admins can view all reports
CREATE POLICY "Admins can view all reports"
ON reports FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Admins can update report status
CREATE POLICY "Admins can update reports"
ON reports FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- ============================================================================
-- 8. ADMIN_AUDIT_LOGS TABLE
-- ============================================================================

-- Enable RLS
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins can insert logs
CREATE POLICY "Admins can create audit logs"
ON admin_audit_logs FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Admins can view all logs
CREATE POLICY "Admins can view audit logs"
ON admin_audit_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================

SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
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
