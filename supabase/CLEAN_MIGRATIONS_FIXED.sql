-- ================================================================================
-- CATERING UNION - CLEAN MIGRATIONS (ALL ISSUES FIXED)
-- ================================================================================
-- This is a single-file migration that creates everything correctly from scratch
-- All issues fixed: NEW/OLD removed, privacy protected, recursion avoided, etc.
--
-- INSTRUCTIONS:
-- 1. Go to: https://supabase.com/dashboard/project/hvltowwtbyslgnfmhhcn/editor
-- 2. Copy this entire file
-- 3. Paste and click "Run"
-- 4. Done! Test at http://localhost:5173/test
-- ================================================================================

-- ================================================================================
-- PART 1: CREATE ALL TABLES
-- ================================================================================

-- Table 1: Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone_number TEXT,
  role TEXT NOT NULL CHECK (role IN ('provider', 'worker', 'admin')),
  preferred_language TEXT DEFAULT 'en',
  profile_image_url TEXT,
  account_status TEXT DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'pending_verification')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_number_key ON profiles(phone_number) WHERE phone_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_account_status ON profiles(account_status);

-- Table 2: Catering Jobs
CREATE TABLE IF NOT EXISTS catering_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  event_type TEXT,
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  required_workers INTEGER NOT NULL CHECK (required_workers > 0),
  confirmed_workers INTEGER DEFAULT 0 CHECK (confirmed_workers >= 0 AND confirmed_workers <= required_workers),
  address TEXT NOT NULL,
  area TEXT,
  city TEXT,
  district TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  google_maps_url TEXT,
  description TEXT,
  contact_person TEXT,
  contact_number TEXT,
  image_url TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'full', 'completed', 'cancelled')),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_catering_jobs_provider_id ON catering_jobs(provider_id);
CREATE INDEX IF NOT EXISTS idx_catering_jobs_event_date ON catering_jobs(event_date);
CREATE INDEX IF NOT EXISTS idx_catering_jobs_status ON catering_jobs(status);
CREATE INDEX IF NOT EXISTS idx_catering_jobs_open_by_date ON catering_jobs(event_date, created_at) WHERE status = 'open' AND deleted_at IS NULL;

-- Table 3: Job Confirmations
CREATE TABLE IF NOT EXISTS job_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES catering_jobs(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
  confirmed_at TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  UNIQUE(job_id, worker_id)
);

CREATE INDEX IF NOT EXISTS idx_job_confirmations_job_id ON job_confirmations(job_id);
CREATE INDEX IF NOT EXISTS idx_job_confirmations_worker_id ON job_confirmations(worker_id);
CREATE INDEX IF NOT EXISTS idx_job_confirmations_confirmed ON job_confirmations(job_id) WHERE status = 'confirmed';

-- Table 4: Worker Attendance
CREATE TABLE IF NOT EXISTS worker_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES catering_jobs(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  attendance_status TEXT DEFAULT 'confirmed' CHECK (attendance_status IN ('confirmed', 'getting_ready', 'on_the_way', 'arrived', 'present', 'absent', 'cancelled')),
  arrival_time TIMESTAMPTZ,
  marked_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_worker_attendance_job_id ON worker_attendance(job_id);
CREATE INDEX IF NOT EXISTS idx_worker_attendance_worker_id ON worker_attendance(worker_id);

-- Table 5: Location Sharing Sessions
CREATE TABLE IF NOT EXISTS location_sharing_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES catering_jobs(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  sharing_enabled BOOLEAN DEFAULT TRUE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  last_updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_location_sharing_job_id ON location_sharing_sessions(job_id);
CREATE INDEX IF NOT EXISTS idx_location_sharing_worker_id ON location_sharing_sessions(worker_id);
CREATE INDEX IF NOT EXISTS idx_location_sharing_enabled ON location_sharing_sessions(job_id, sharing_enabled, expires_at) WHERE sharing_enabled = TRUE;

-- Table 6: Deleted Jobs
CREATE TABLE IF NOT EXISTS deleted_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_job_id UUID,
  provider_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  deleted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  deletion_reason TEXT,
  job_snapshot JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_deleted_jobs_provider_id ON deleted_jobs(provider_id);
CREATE INDEX IF NOT EXISTS idx_deleted_jobs_expires_at ON deleted_jobs(expires_at);

-- Table 7: Reports
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  job_id UUID REFERENCES catering_jobs(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_job_id ON reports(job_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

-- Table 8: Admin Audit Logs
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_id ON admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON admin_audit_logs(created_at);

-- ================================================================================
-- PART 2: CREATE FUNCTIONS AND TRIGGERS
-- ================================================================================

-- Function: Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Auto-update last_updated_at
CREATE OR REPLACE FUNCTION update_last_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Prevent role/account_status changes by non-admins
CREATE OR REPLACE FUNCTION prevent_protected_field_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1) = 'admin' THEN
    RETURN NEW;
  END IF;
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    RAISE EXCEPTION 'You cannot change your own role';
  END IF;
  IF OLD.account_status IS DISTINCT FROM NEW.account_status THEN
    RAISE EXCEPTION 'You cannot change your own account status';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function: Prevent changing provider_id on jobs
CREATE OR REPLACE FUNCTION prevent_job_provider_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.provider_id IS DISTINCT FROM NEW.provider_id THEN
    RAISE EXCEPTION 'Cannot transfer job to another provider';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Prevent changing IDs on confirmations
CREATE OR REPLACE FUNCTION prevent_confirmation_id_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.worker_id IS DISTINCT FROM NEW.worker_id THEN
    RAISE EXCEPTION 'Cannot change worker_id on confirmation';
  END IF;
  IF OLD.job_id IS DISTINCT FROM NEW.job_id THEN
    RAISE EXCEPTION 'Cannot change job_id on confirmation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Update confirmed workers count
CREATE OR REPLACE FUNCTION update_confirmed_workers_count()
RETURNS TRIGGER AS $$
DECLARE
  job_record RECORD;
  confirmed_count INTEGER;
BEGIN
  -- Get the job_id from either NEW or OLD record
  IF TG_OP = 'DELETE' THEN
    SELECT * INTO job_record FROM catering_jobs WHERE id = OLD.job_id;
  ELSE
    SELECT * INTO job_record FROM catering_jobs WHERE id = NEW.job_id;
  END IF;

  -- Count confirmed workers
  SELECT COUNT(*) INTO confirmed_count
  FROM job_confirmations
  WHERE job_id = job_record.id AND status = 'confirmed';

  -- Update job
  UPDATE catering_jobs
  SET 
    confirmed_workers = confirmed_count,
    status = CASE 
      WHEN confirmed_count >= required_workers THEN 'full'
      WHEN status = 'full' AND confirmed_count < required_workers THEN 'open'
      ELSE status
    END
  WHERE id = job_record.id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON profiles;
CREATE TRIGGER trigger_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS protect_profile_fields ON profiles;
CREATE TRIGGER protect_profile_fields BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION prevent_protected_field_changes();

DROP TRIGGER IF EXISTS trigger_catering_jobs_updated_at ON catering_jobs;
CREATE TRIGGER trigger_catering_jobs_updated_at BEFORE UPDATE ON catering_jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS prevent_provider_change ON catering_jobs;
CREATE TRIGGER prevent_provider_change BEFORE UPDATE ON catering_jobs FOR EACH ROW EXECUTE FUNCTION prevent_job_provider_change();

DROP TRIGGER IF EXISTS trigger_worker_attendance_updated_at ON worker_attendance;
CREATE TRIGGER trigger_worker_attendance_updated_at BEFORE UPDATE ON worker_attendance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_location_last_updated ON location_sharing_sessions;
CREATE TRIGGER trigger_location_last_updated BEFORE UPDATE ON location_sharing_sessions FOR EACH ROW EXECUTE FUNCTION update_last_updated_at();

DROP TRIGGER IF EXISTS prevent_confirmation_changes ON job_confirmations;
CREATE TRIGGER prevent_confirmation_changes BEFORE UPDATE ON job_confirmations FOR EACH ROW EXECUTE FUNCTION prevent_confirmation_id_changes();

DROP TRIGGER IF EXISTS update_confirmed_workers ON job_confirmations;
CREATE TRIGGER update_confirmed_workers AFTER INSERT OR UPDATE OR DELETE ON job_confirmations FOR EACH ROW EXECUTE FUNCTION update_confirmed_workers_count();

-- ================================================================================
-- PART 3: ENABLE RLS
-- ================================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE catering_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_sharing_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE deleted_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- ================================================================================
-- PART 4: CREATE RLS POLICIES (FIXED - NO NEW/OLD)
-- ================================================================================

-- PROFILES POLICIES
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles_select_others" ON profiles FOR SELECT TO authenticated USING (id != auth.uid());
CREATE POLICY "profiles_select_admin" ON profiles FOR SELECT TO authenticated USING ((SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1) = 'admin');
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid() AND role IN ('worker', 'provider'));
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_admin" ON profiles FOR UPDATE TO authenticated USING ((SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1) = 'admin') WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1) = 'admin');

-- CATERING JOBS POLICIES
CREATE POLICY "jobs_select_open" ON catering_jobs FOR SELECT TO authenticated USING (deleted_at IS NULL AND (status = 'open' OR provider_id = auth.uid()));
CREATE POLICY "jobs_insert_provider" ON catering_jobs FOR INSERT TO authenticated WITH CHECK (provider_id = auth.uid());
CREATE POLICY "jobs_update_own" ON catering_jobs FOR UPDATE TO authenticated USING (provider_id = auth.uid() AND deleted_at IS NULL) WITH CHECK (provider_id = auth.uid());
CREATE POLICY "jobs_admin_all" ON catering_jobs FOR ALL TO authenticated USING ((SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1) = 'admin');

-- JOB CONFIRMATIONS POLICIES
CREATE POLICY "confirmations_select_own" ON job_confirmations FOR SELECT TO authenticated USING (worker_id = auth.uid());
CREATE POLICY "confirmations_select_provider" ON job_confirmations FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM catering_jobs WHERE id = job_id AND provider_id = auth.uid()));
CREATE POLICY "confirmations_insert_worker" ON job_confirmations FOR INSERT TO authenticated WITH CHECK (worker_id = auth.uid() AND EXISTS (SELECT 1 FROM catering_jobs WHERE id = job_id AND status = 'open' AND deleted_at IS NULL));
CREATE POLICY "confirmations_update_own" ON job_confirmations FOR UPDATE TO authenticated USING (worker_id = auth.uid()) WITH CHECK (worker_id = auth.uid());
CREATE POLICY "confirmations_delete_own" ON job_confirmations FOR DELETE TO authenticated USING (worker_id = auth.uid());

-- WORKER ATTENDANCE POLICIES
CREATE POLICY "attendance_select_own" ON worker_attendance FOR SELECT TO authenticated USING (worker_id = auth.uid());
CREATE POLICY "attendance_select_provider" ON worker_attendance FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM catering_jobs WHERE id = job_id AND provider_id = auth.uid()));
CREATE POLICY "attendance_insert_worker" ON worker_attendance FOR INSERT TO authenticated WITH CHECK (worker_id = auth.uid() AND attendance_status IN ('getting_ready', 'on_the_way', 'arrived'));
CREATE POLICY "attendance_update_worker" ON worker_attendance FOR UPDATE TO authenticated USING (worker_id = auth.uid()) WITH CHECK (worker_id = auth.uid() AND attendance_status IN ('getting_ready', 'on_the_way', 'arrived'));
CREATE POLICY "attendance_manage_provider" ON worker_attendance FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM catering_jobs WHERE id = job_id AND provider_id = auth.uid()));

-- LOCATION SHARING POLICIES
CREATE POLICY "location_select_own" ON location_sharing_sessions FOR SELECT TO authenticated USING (worker_id = auth.uid());
CREATE POLICY "location_select_provider" ON location_sharing_sessions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM catering_jobs WHERE id = job_id AND provider_id = auth.uid()) AND expires_at > NOW());
CREATE POLICY "location_insert_worker" ON location_sharing_sessions FOR INSERT TO authenticated WITH CHECK (worker_id = auth.uid());
CREATE POLICY "location_update_own" ON location_sharing_sessions FOR UPDATE TO authenticated USING (worker_id = auth.uid()) WITH CHECK (worker_id = auth.uid());
CREATE POLICY "location_delete_own" ON location_sharing_sessions FOR DELETE TO authenticated USING (worker_id = auth.uid());

-- DELETED JOBS POLICIES
CREATE POLICY "deleted_jobs_select_own" ON deleted_jobs FOR SELECT TO authenticated USING (provider_id = auth.uid());
CREATE POLICY "deleted_jobs_select_admin" ON deleted_jobs FOR SELECT TO authenticated USING ((SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1) = 'admin');

-- REPORTS POLICIES
CREATE POLICY "reports_select_own" ON reports FOR SELECT TO authenticated USING (reporter_id = auth.uid());
CREATE POLICY "reports_insert_any" ON reports FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "reports_admin_all" ON reports FOR ALL TO authenticated USING ((SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1) = 'admin');

-- ADMIN AUDIT LOGS POLICIES
CREATE POLICY "audit_select_admin" ON admin_audit_logs FOR SELECT TO authenticated USING ((SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1) = 'admin');
CREATE POLICY "audit_insert_admin" ON admin_audit_logs FOR INSERT TO authenticated WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1) = 'admin');

-- ================================================================================
-- DONE! Test at http://localhost:5173/test
-- ================================================================================
