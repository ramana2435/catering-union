-- Migration 010: Enable Row Level Security (RLS) on all tables
-- This migration enables the RLS framework but does NOT create any policies
-- Policies will be created in FEAT-002 (separate feature for security policies)

-- Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Enable RLS on catering_jobs table
ALTER TABLE catering_jobs ENABLE ROW LEVEL SECURITY;

-- Enable RLS on job_confirmations table
ALTER TABLE job_confirmations ENABLE ROW LEVEL SECURITY;

-- Enable RLS on worker_attendance table
ALTER TABLE worker_attendance ENABLE ROW LEVEL SECURITY;

-- Enable RLS on location_sharing_sessions table
ALTER TABLE location_sharing_sessions ENABLE ROW LEVEL SECURITY;

-- Enable RLS on deleted_jobs table
ALTER TABLE deleted_jobs ENABLE ROW LEVEL SECURITY;

-- Enable RLS on reports table
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Enable RLS on admin_audit_logs table
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Add comments
COMMENT ON TABLE profiles IS 'RLS ENABLED. Policies defined in separate migration (FEAT-002).';
COMMENT ON TABLE catering_jobs IS 'RLS ENABLED. Policies defined in separate migration (FEAT-002).';
COMMENT ON TABLE job_confirmations IS 'RLS ENABLED. Policies defined in separate migration (FEAT-002).';
COMMENT ON TABLE worker_attendance IS 'RLS ENABLED. Policies defined in separate migration (FEAT-002).';
COMMENT ON TABLE location_sharing_sessions IS 'RLS ENABLED. Policies defined in separate migration (FEAT-002).';
COMMENT ON TABLE deleted_jobs IS 'RLS ENABLED. Policies defined in separate migration (FEAT-002).';
COMMENT ON TABLE reports IS 'RLS ENABLED. Policies defined in separate migration (FEAT-002).';
COMMENT ON TABLE admin_audit_logs IS 'RLS ENABLED. Policies defined in separate migration (FEAT-002).';
