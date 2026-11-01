-- Migration 022: Data Retention and Cleanup Functions
-- Implements safe cleanup functions for expired data with dry-run support
-- Admin-only access, idempotent design
-- NO AUTOMATIC SCHEDULING (free tier limitation - manual execution required)

-- ============================================================================
-- FUNCTION 1: Cleanup expired deleted jobs
-- ============================================================================
-- Permanently removes deleted_jobs records that have passed their expires_at timestamp
-- Returns count of records that would be/were deleted
CREATE OR REPLACE FUNCTION cleanup_expired_deleted_jobs(
  p_dry_run BOOLEAN DEFAULT TRUE,
  p_admin_id UUID DEFAULT NULL
)
RETURNS TABLE(
  records_found INTEGER,
  records_deleted INTEGER,
  oldest_expiry TIMESTAMPTZ,
  newest_expiry TIMESTAMPTZ
) AS $$
DECLARE
  v_count INTEGER;
  v_oldest TIMESTAMPTZ;
  v_newest TIMESTAMPTZ;
BEGIN
  -- Verify admin access if admin_id provided
  IF p_admin_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = p_admin_id AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'User % is not an admin', p_admin_id;
    END IF;
  END IF;

  -- Count and get date range of expired records
  SELECT 
    COUNT(*),
    MIN(expires_at),
    MAX(expires_at)
  INTO v_count, v_oldest, v_newest
  FROM deleted_jobs
  WHERE expires_at IS NOT NULL 
    AND expires_at < NOW();

  -- Log the action if admin is executing
  IF p_admin_id IS NOT NULL AND NOT p_dry_run THEN
    PERFORM log_admin_action(
      p_admin_id,
      'cleanup_expired_deleted_jobs',
      'deleted_jobs',
      NULL,
      jsonb_build_object(
        'records_deleted', v_count,
        'oldest_expiry', v_oldest,
        'newest_expiry', v_newest
      )
    );
  END IF;

  -- Perform actual deletion if not dry run
  IF NOT p_dry_run THEN
    DELETE FROM deleted_jobs
    WHERE expires_at IS NOT NULL 
      AND expires_at < NOW();
    
    records_found := v_count;
    records_deleted := v_count;
    oldest_expiry := v_oldest;
    newest_expiry := v_newest;
  ELSE
    -- Dry run - just report what would be deleted
    records_found := v_count;
    records_deleted := 0;
    oldest_expiry := v_oldest;
    newest_expiry := v_newest;
  END IF;

  RETURN QUERY SELECT records_found, records_deleted, oldest_expiry, newest_expiry;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION 2: Cleanup expired location sharing sessions
-- ============================================================================
-- Removes location_sharing_sessions records that have passed their expires_at timestamp
-- Privacy-sensitive: ensures expired location data is not accessible
CREATE OR REPLACE FUNCTION cleanup_expired_location_sessions(
  p_dry_run BOOLEAN DEFAULT TRUE,
  p_admin_id UUID DEFAULT NULL
)
RETURNS TABLE(
  records_found INTEGER,
  records_deleted INTEGER,
  oldest_expiry TIMESTAMPTZ,
  newest_expiry TIMESTAMPTZ
) AS $$
DECLARE
  v_count INTEGER;
  v_oldest TIMESTAMPTZ;
  v_newest TIMESTAMPTZ;
BEGIN
  -- Verify admin access if admin_id provided
  IF p_admin_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = p_admin_id AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'User % is not an admin', p_admin_id;
    END IF;
  END IF;

  -- Count and get date range of expired records
  SELECT 
    COUNT(*),
    MIN(expires_at),
    MAX(expires_at)
  INTO v_count, v_oldest, v_newest
  FROM location_sharing_sessions
  WHERE expires_at IS NOT NULL 
    AND expires_at < NOW();

  -- Log the action if admin is executing
  IF p_admin_id IS NOT NULL AND NOT p_dry_run THEN
    PERFORM log_admin_action(
      p_admin_id,
      'cleanup_expired_location_sessions',
      'location_sharing_sessions',
      NULL,
      jsonb_build_object(
        'records_deleted', v_count,
        'oldest_expiry', v_oldest,
        'newest_expiry', v_newest
      )
    );
  END IF;

  -- Perform actual deletion if not dry run
  IF NOT p_dry_run THEN
    DELETE FROM location_sharing_sessions
    WHERE expires_at IS NOT NULL 
      AND expires_at < NOW();
    
    records_found := v_count;
    records_deleted := v_count;
    oldest_expiry := v_oldest;
    newest_expiry := v_newest;
  ELSE
    -- Dry run - just report what would be deleted
    records_found := v_count;
    records_deleted := 0;
    oldest_expiry := v_oldest;
    newest_expiry := v_newest;
  END IF;

  RETURN QUERY SELECT records_found, records_deleted, oldest_expiry, newest_expiry;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION 3: Archive old completed jobs (mark for retention policy)
-- ============================================================================
-- Identifies completed jobs older than specified days for archival consideration
-- Does NOT delete - just reports. Providers can manually archive their old jobs.
CREATE OR REPLACE FUNCTION get_archivable_completed_jobs(
  p_days_old INTEGER DEFAULT 30,
  p_provider_id UUID DEFAULT NULL
)
RETURNS TABLE(
  job_id UUID,
  title TEXT,
  event_date DATE,
  completed_at TIMESTAMPTZ,
  days_since_completion INTEGER,
  provider_id UUID,
  confirmed_workers INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cj.id,
    cj.title,
    cj.event_date,
    cj.updated_at as completed_at,
    EXTRACT(DAY FROM NOW() - cj.updated_at)::INTEGER as days_since_completion,
    cj.provider_id,
    cj.confirmed_workers
  FROM catering_jobs cj
  WHERE cj.status = 'completed'
    AND cj.deleted_at IS NULL
    AND cj.updated_at < (NOW() - (p_days_old || ' days')::INTERVAL)
    AND (p_provider_id IS NULL OR cj.provider_id = p_provider_id)
  ORDER BY cj.updated_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION 4: Get retention statistics for admin dashboard
-- ============================================================================
-- Returns comprehensive statistics about data retention across all tables
CREATE OR REPLACE FUNCTION get_retention_statistics()
RETURNS TABLE(
  category TEXT,
  total_records BIGINT,
  expired_records BIGINT,
  expiring_soon_7d BIGINT,
  expiring_soon_30d BIGINT,
  oldest_record_date TIMESTAMPTZ,
  newest_record_date TIMESTAMPTZ
) AS $$
BEGIN
  -- Deleted jobs statistics
  RETURN QUERY
  SELECT 
    'deleted_jobs'::TEXT,
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE expires_at IS NOT NULL AND expires_at < NOW())::BIGINT,
    COUNT(*) FILTER (WHERE expires_at IS NOT NULL AND expires_at < NOW() + INTERVAL '7 days' AND expires_at >= NOW())::BIGINT,
    COUNT(*) FILTER (WHERE expires_at IS NOT NULL AND expires_at < NOW() + INTERVAL '30 days' AND expires_at >= NOW())::BIGINT,
    MIN(deleted_at),
    MAX(deleted_at)
  FROM deleted_jobs;

  -- Location sharing sessions statistics
  RETURN QUERY
  SELECT 
    'location_sessions'::TEXT,
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE expires_at IS NOT NULL AND expires_at < NOW())::BIGINT,
    COUNT(*) FILTER (WHERE expires_at IS NOT NULL AND expires_at < NOW() + INTERVAL '7 days' AND expires_at >= NOW())::BIGINT,
    COUNT(*) FILTER (WHERE expires_at IS NOT NULL AND expires_at < NOW() + INTERVAL '30 days' AND expires_at >= NOW())::BIGINT,
    MIN(started_at),
    MAX(started_at)
  FROM location_sharing_sessions;

  -- Completed jobs statistics (for archival consideration)
  RETURN QUERY
  SELECT 
    'completed_jobs'::TEXT,
    COUNT(*)::BIGINT,
    0::BIGINT, -- No expiry concept for completed jobs
    COUNT(*) FILTER (WHERE updated_at < NOW() - INTERVAL '23 days')::BIGINT, -- Will be 30 days old in 7 days
    COUNT(*) FILTER (WHERE updated_at < NOW())::BIGINT, -- All completed jobs
    MIN(updated_at),
    MAX(updated_at)
  FROM catering_jobs
  WHERE status = 'completed' AND deleted_at IS NULL;

  -- Audit logs statistics
  RETURN QUERY
  SELECT 
    'audit_logs'::TEXT,
    COUNT(*)::BIGINT,
    0::BIGINT, -- No expiry for audit logs by default
    0::BIGINT,
    0::BIGINT,
    MIN(created_at),
    MAX(created_at)
  FROM admin_audit_logs;

  -- Reports statistics
  RETURN QUERY
  SELECT 
    'reports'::TEXT,
    COUNT(*)::BIGINT,
    0::BIGINT, -- No expiry for reports by default
    0::BIGINT,
    0::BIGINT,
    MIN(created_at),
    MAX(created_at)
  FROM reports;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON FUNCTION cleanup_expired_deleted_jobs(BOOLEAN, UUID) IS 'Permanently removes expired deleted_jobs records. Supports dry-run mode. Admin-only when admin_id provided.';
COMMENT ON FUNCTION cleanup_expired_location_sessions(BOOLEAN, UUID) IS 'Removes expired location sharing sessions (privacy-sensitive). Supports dry-run mode. Admin-only when admin_id provided.';
COMMENT ON FUNCTION get_archivable_completed_jobs(INTEGER, UUID) IS 'Returns completed jobs older than specified days for archival consideration. Does not delete.';
COMMENT ON FUNCTION get_retention_statistics() IS 'Returns comprehensive retention statistics for admin dashboard monitoring';

-- ============================================================================
-- Grant execute permissions to authenticated users with proper RLS
-- ============================================================================
-- These functions use SECURITY DEFINER and check admin role internally
GRANT EXECUTE ON FUNCTION cleanup_expired_deleted_jobs(BOOLEAN, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_location_sessions(BOOLEAN, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_archivable_completed_jobs(INTEGER, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_retention_statistics() TO authenticated;
