# Data Retention Policy

## Overview

This document defines the data retention policies for the Catering Union application. All retention periods and cleanup procedures are designed to balance operational needs, user privacy, regulatory compliance, and free-tier database storage limitations.

**IMPORTANT**: This application runs on Supabase free tier which does NOT support automatic scheduled jobs (`pg_cron`). All cleanup operations must be executed manually by administrators.

## Retention Periods by Data Category

### 1. Deleted Jobs (Soft Delete Recovery System)

**Table**: `deleted_jobs`  
**Default Retention**: 30 days from deletion date  
**Purpose**: Allow providers to recover accidentally deleted jobs

#### Policy Details
- When a job is soft-deleted, it moves to `deleted_jobs` table with complete snapshot
- `expires_at` timestamp is set to deletion_date + 30 days
- After expiration, the deleted job record becomes eligible for permanent removal
- Expired records do NOT auto-delete (manual cleanup required)

#### Recovery Window
- **0-30 days**: Full recovery available via restore function
- **After 30 days**: Record expired, permanent deletion recommended
- **After permanent deletion**: No recovery possible

#### Cleanup Procedure
```sql
-- Dry run (check what would be deleted)
SELECT * FROM cleanup_expired_deleted_jobs(TRUE, '<admin_user_id>');

-- Actual deletion (requires admin user ID)
SELECT * FROM cleanup_expired_deleted_jobs(FALSE, '<admin_user_id>');
```

### 2. Location Sharing Sessions

**Table**: `location_sharing_sessions`  
**Default Retention**: Expires when job ends or sharing is disabled  
**Purpose**: Privacy-sensitive temporary location data

#### Policy Details
- Location sessions expire when:
  - Job status changes to 'completed' or 'cancelled'
  - Worker disables sharing
  - Manual expiration by worker or provider
- `expires_at` is set when sharing ends
- Expired sessions should be cleaned up promptly (privacy requirement)

#### Privacy Considerations
- Location data is sensitive and must not be retained unnecessarily
- Expired sessions should be cleaned regularly (daily recommended)
- Workers can request immediate deletion of their location history

#### Cleanup Procedure
```sql
-- Dry run
SELECT * FROM cleanup_expired_location_sessions(TRUE, '<admin_user_id>');

-- Actual deletion
SELECT * FROM cleanup_expired_location_sessions(FALSE, '<admin_user_id>');
```

### 3. Completed Jobs

**Table**: `catering_jobs` (status = 'completed')  
**Recommended Retention**: 30-90 days after completion  
**Purpose**: Historical record, analytics, dispute resolution

#### Policy Details
- Completed jobs remain in `catering_jobs` table indefinitely by default
- No automatic deletion or archival (manual provider action)
- Providers can soft-delete old completed jobs to clean up their listings
- Admin can view archival candidates using helper function

#### Archival Recommendations
- **30 days**: Minimum retention for recent history
- **90 days**: Recommended for dispute resolution window
- **Beyond 90 days**: Provider discretion, consider soft-delete for storage optimization

#### Query Archival Candidates
```sql
-- Get jobs completed more than 30 days ago
SELECT * FROM get_archivable_completed_jobs(30);

-- Get jobs for specific provider
SELECT * FROM get_archivable_completed_jobs(30, '<provider_id>');
```

### 4. Job Confirmations & Attendance Records

**Table**: `job_confirmations`, `worker_attendance`  
**Retention**: Tied to parent job lifecycle  
**Purpose**: Worker participation history, payment records

#### Policy Details
- CASCADE DELETE: When job is permanently deleted, confirmations/attendance are deleted
- NOT deleted when job is soft-deleted (preserved for recovery)
- Retained as long as the parent job exists
- No independent expiration policy

#### Recommendations
- Keep as long as payment/dispute records require
- Consider anonymization for long-term analytics (beyond scope of this module)

### 5. Reports

**Table**: `reports`  
**Default Retention**: Indefinite (admin discretion)  
**Purpose**: Problem tracking, admin investigation, dispute evidence

#### Policy Details
- No automatic expiration
- Admin can manually delete resolved reports
- Consider retention based on:
  - Report status (resolved reports older than 90 days)
  - Report severity (keep high-severity longer)
  - Legal/compliance requirements

#### Manual Cleanup
```sql
-- Example: Delete resolved reports older than 90 days
DELETE FROM reports
WHERE status = 'resolved'
  AND created_at < NOW() - INTERVAL '90 days';
```

### 6. Admin Audit Logs

**Table**: `admin_audit_logs`  
**Default Retention**: Indefinite (compliance/security requirement)  
**Purpose**: Security audit trail, accountability, compliance

#### Policy Details
- NEVER auto-delete audit logs (security best practice)
- Keep indefinitely or per legal/compliance requirements
- Consider archival to cold storage after 1-2 years (not implemented)
- Export critical logs for external backup before any cleanup

#### Long-term Strategy
- Audit logs grow over time
- Monitor table size in free-tier dashboard
- If storage becomes issue: export to JSON and soft-delete oldest records
- DO NOT delete recent logs (minimum 1 year retention recommended)

## Cleanup Functions Reference

### Function 1: cleanup_expired_deleted_jobs

**Purpose**: Permanently remove expired deleted job records  
**Signature**: `cleanup_expired_deleted_jobs(p_dry_run BOOLEAN, p_admin_id UUID)`  
**Returns**: Record count, date range of deletions  
**Access**: Admin-only (verified via `p_admin_id`)

**Parameters**:
- `p_dry_run`: `TRUE` = report only, `FALSE` = actual delete
- `p_admin_id`: UUID of admin executing cleanup (required for audit log)

**Example Usage**:
```sql
-- 1. Check what will be deleted (safe, no changes)
SELECT * FROM cleanup_expired_deleted_jobs(TRUE, NULL);

-- 2. Review dry run results

-- 3. Execute cleanup with admin audit
SELECT * FROM cleanup_expired_deleted_jobs(FALSE, 'your-admin-user-id');
```

### Function 2: cleanup_expired_location_sessions

**Purpose**: Remove expired location sharing sessions (privacy)  
**Signature**: `cleanup_expired_location_sessions(p_dry_run BOOLEAN, p_admin_id UUID)`  
**Returns**: Record count, date range of deletions  
**Access**: Admin-only (verified via `p_admin_id`)

**Parameters**:
- `p_dry_run`: `TRUE` = report only, `FALSE` = actual delete
- `p_admin_id`: UUID of admin executing cleanup (required for audit log)

**Example Usage**:
```sql
-- Daily privacy cleanup
SELECT * FROM cleanup_expired_location_sessions(FALSE, 'your-admin-user-id');
```

### Function 3: get_archivable_completed_jobs

**Purpose**: Identify old completed jobs for archival consideration  
**Signature**: `get_archivable_completed_jobs(p_days_old INTEGER, p_provider_id UUID)`  
**Returns**: List of jobs with completion dates and age  
**Access**: Anyone (filtered by RLS - providers see own jobs, admins see all)

**Parameters**:
- `p_days_old`: Minimum age in days (default 30)
- `p_provider_id`: Optional provider filter (NULL = all providers)

**Example Usage**:
```sql
-- Find jobs completed more than 30 days ago
SELECT * FROM get_archivable_completed_jobs(30);

-- Find jobs completed more than 90 days ago for specific provider
SELECT * FROM get_archivable_completed_jobs(90, 'provider-uuid');
```

### Function 4: get_retention_statistics

**Purpose**: Admin dashboard monitoring of retention across all tables  
**Signature**: `get_retention_statistics()`  
**Returns**: Statistics per category (total, expired, expiring soon)  
**Access**: Anyone (admin dashboard uses this for monitoring)

**Example Usage**:
```sql
-- Get comprehensive retention overview
SELECT * FROM get_retention_statistics();
```

## Manual Cleanup Schedule (Recommended)

Since automatic scheduling is not available on free tier, establish a manual cleanup routine:

### Daily (Privacy-Critical)
- Cleanup expired location sessions
  ```sql
  SELECT * FROM cleanup_expired_location_sessions(FALSE, 'admin-id');
  ```

### Weekly
- Check retention statistics dashboard
- Review and cleanup expired deleted jobs
  ```sql
  SELECT * FROM get_retention_statistics();
  SELECT * FROM cleanup_expired_deleted_jobs(FALSE, 'admin-id');
  ```

### Monthly
- Review archivable completed jobs (30+ days old)
- Notify providers of old completed jobs they may want to archive
- Review audit log growth and export if needed
- Check Supabase dashboard for storage usage trends

### Quarterly
- Export audit logs for external backup
- Review retention policy effectiveness
- Update retention periods if needed based on actual usage

## Monitoring & Alerts

### Free Tier Limitations
- ❌ No automatic database alerts
- ❌ No pg_cron for scheduled jobs
- ❌ No built-in storage quota warnings
- ✅ Manual monitoring via Supabase dashboard
- ✅ SQL queries for retention statistics

### What to Monitor

1. **Database Size** (Supabase Dashboard > Database > Disk usage)
   - Free tier limit: 500 MB
   - Warning threshold: > 400 MB (80%)
   - Critical threshold: > 450 MB (90%)

2. **Table Sizes** (SQL query)
   ```sql
   SELECT 
     schemaname,
     tablename,
     pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
   FROM pg_tables
   WHERE schemaname = 'public'
   ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
   ```

3. **Expired Records** (retention statistics function)
   ```sql
   SELECT * FROM get_retention_statistics();
   ```

4. **Audit Log Growth**
   ```sql
   SELECT 
     COUNT(*) as total_logs,
     COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as logs_last_30d,
     MIN(created_at) as oldest_log,
     MAX(created_at) as newest_log
   FROM admin_audit_logs;
   ```

## Disaster Recovery Considerations

### What This Policy Does NOT Cover
- ❌ Automatic backups (see BACKUP_AND_RESTORE_GUIDE.md)
- ❌ Point-in-time recovery (free tier limitation)
- ❌ Automatic failover (free tier limitation)
- ❌ Replication (free tier limitation)

### What IS Covered
- ✅ Soft-delete recovery (30-day window)
- ✅ Manual export/import procedures
- ✅ Data retention guidelines
- ✅ Privacy-compliant cleanup

## Compliance Notes

### Privacy (GDPR/CCPA Considerations)
- Location data is privacy-sensitive and expired promptly
- Users (workers/providers) can request data deletion
- Audit logs track who deleted what and when
- Right to erasure: Admin must manually purge user data on request

### Data Minimization
- Location sessions expire when no longer needed
- Soft-deleted jobs auto-expire after recovery window
- Completed jobs retained only as long as operationally necessary

### Audit Trail
- All admin cleanup actions are logged to `admin_audit_logs`
- Logs include: who, what, when, and how many records affected
- Audit logs themselves are retained indefinitely (security requirement)

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-11-01 | Initial retention policy for Module 12 | Kiro AI Agent |

## References

- Migration 022: Data Retention and Cleanup Functions
- BACKUP_AND_RESTORE_GUIDE.md: Backup procedures
- MODULE_12_IMPLEMENTATION.md: Implementation details
- Supabase Free Tier Limits: https://supabase.com/pricing
