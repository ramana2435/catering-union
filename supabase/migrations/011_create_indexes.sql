-- Migration 011: Create performance indexes
-- Optimizes common query patterns for the application
-- Many basic indexes were already created in table creation migrations
-- This migration adds additional composite and specialized indexes

-- ============================================================================
-- Profiles indexes (basic indexes already in migration 001)
-- ============================================================================
-- Already created in 001: idx_profiles_role, idx_profiles_account_status

-- ============================================================================
-- Catering jobs indexes
-- ============================================================================
-- Already created in 002: idx_catering_jobs_provider_status, idx_catering_jobs_event_date, idx_catering_jobs_status

-- Additional index for open jobs by date (common query pattern)
CREATE INDEX IF NOT EXISTS idx_catering_jobs_open_by_date 
  ON catering_jobs(event_date, created_at) 
  WHERE status = 'open' AND deleted_at IS NULL;

-- Index for provider's active jobs
CREATE INDEX IF NOT EXISTS idx_catering_jobs_provider_active 
  ON catering_jobs(provider_id, event_date) 
  WHERE deleted_at IS NULL;

-- ============================================================================
-- Job confirmations indexes
-- ============================================================================
-- Already created in 003: idx_job_confirmations_job_id, idx_job_confirmations_worker_id
-- idx_job_confirmations_job_status, idx_job_confirmations_worker_status

-- Additional index for counting confirmed workers (used by trigger)
CREATE INDEX IF NOT EXISTS idx_job_confirmations_confirmed 
  ON job_confirmations(job_id) 
  WHERE status = 'confirmed';

-- ============================================================================
-- Worker attendance indexes
-- ============================================================================
-- Already created in 004: idx_worker_attendance_job_worker, idx_worker_attendance_status

-- Additional index for job attendance overview
CREATE INDEX IF NOT EXISTS idx_worker_attendance_job_status 
  ON worker_attendance(job_id, attendance_status);

-- ============================================================================
-- Location sharing sessions indexes
-- ============================================================================
-- Already created in 005: idx_location_sessions_job_worker, idx_location_sessions_worker, idx_location_sessions_active

-- Additional index for active sharing sessions
CREATE INDEX IF NOT EXISTS idx_location_sessions_enabled 
  ON location_sharing_sessions(job_id, sharing_enabled) 
  WHERE sharing_enabled = TRUE AND (expires_at IS NULL OR expires_at > NOW());

-- ============================================================================
-- Deleted jobs indexes
-- ============================================================================
-- Already created in 006: idx_deleted_jobs_original_id, idx_deleted_jobs_provider, idx_deleted_jobs_expires_at

-- Additional index for non-expired deleted jobs
CREATE INDEX IF NOT EXISTS idx_deleted_jobs_recoverable 
  ON deleted_jobs(provider_id, deleted_at) 
  WHERE expires_at IS NULL OR expires_at > NOW();

-- ============================================================================
-- Reports indexes
-- ============================================================================
-- Already created in 007: idx_reports_job_id, idx_reports_reporter, idx_reports_status_created

-- Additional index for pending reports (admin queue)
CREATE INDEX IF NOT EXISTS idx_reports_pending 
  ON reports(created_at DESC) 
  WHERE status = 'pending';

-- ============================================================================
-- Admin audit logs indexes
-- ============================================================================
-- Already created in 008: idx_admin_audit_logs_admin_created, idx_admin_audit_logs_target, idx_admin_audit_logs_created

-- Additional index for recent admin actions
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_recent 
  ON admin_audit_logs(created_at DESC);

-- Additional index for actions by type
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action 
  ON admin_audit_logs(action, created_at DESC);

-- ============================================================================
-- Summary of all indexes created across migrations
-- ============================================================================
-- Total indexes: 20+ (including those from earlier migrations)
-- 
-- Profiles: 2 indexes
-- Catering Jobs: 5 indexes
-- Job Confirmations: 5 indexes
-- Worker Attendance: 3 indexes
-- Location Sharing: 4 indexes
-- Deleted Jobs: 3 indexes
-- Reports: 3 indexes
-- Admin Audit Logs: 4 indexes
-- 
-- All indexes use IF NOT EXISTS for idempotency
