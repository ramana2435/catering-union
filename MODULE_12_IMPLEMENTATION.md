# Module 12 Implementation: Backup, Recovery, Data Retention, and Free-Tier Monitoring

**Status**: ✅ Completed  
**Date**: November 1, 2026  
**Module**: 12 - Backup, Recovery, Data Retention, Free-Tier Monitoring

## Overview

Module 12 implements a comprehensive data retention, backup, and monitoring strategy designed specifically for Supabase free tier limitations. This module does NOT claim features that don't exist (no automatic backups, no pg_cron, no automatic alerts) and provides clear, honest documentation for manual procedures.

### Key Deliverables

1. ✅ **Data Retention Policy** (`DATA_RETENTION_POLICY.md`)
2. ✅ **Backup & Restore Guide** (`BACKUP_AND_RESTORE_GUIDE.md`)
3. ✅ **Cleanup Functions** (Migration 022)
4. ✅ **Admin Health Monitoring Dashboard** (`AdminHealth.tsx`)
5. ✅ **Module 11 Integration** (Error handling in critical pages)

## Architecture Decisions

### 1. Manual-First Approach

**Decision**: All cleanup operations require manual execution by administrators.

**Rationale**:
- Supabase free tier does NOT support `pg_cron` (automatic scheduling)
- No automatic job scheduling available
- Manual execution prevents accidental mass deletions
- Dry-run support provides safety net

**Implementation**:
- All cleanup functions accept `p_dry_run BOOLEAN` parameter
- Admin must explicitly pass `FALSE` to execute cleanup
- Audit logging for all cleanup actions
- Clear documentation of SQL commands to run

### 2. Soft-Delete with Expiration

**Decision**: Deleted jobs kept for 30-day recovery window with automatic expiration timestamps.

**Rationale**:
- Balances user recovery needs with storage constraints
- `expires_at` column provides clear cleanup target
- Enables gradual cleanup without hard deadlines
- Preserves complete job snapshot as JSONB for restoration

**Implementation**:
- `soft_delete_job()` function sets `expires_at = NOW() + 30 days`
- `restore_job()` function checks expiration before allowing recovery
- `cleanup_expired_deleted_jobs()` function removes only expired records

### 3. Privacy-First Location Data

**Decision**: Location sharing sessions expire promptly when no longer needed.

**Rationale**:
- Location data is privacy-sensitive (GDPR/CCPA consideration)
- Workers should have control over data retention
- Expired sessions should be cleaned regularly
- No legitimate business need to retain expired location data

**Implementation**:
- `expires_at` set when job completes or sharing disabled
- Separate cleanup function for location sessions
- Daily cleanup recommended (documented in retention policy)
- RLS policies protect location data access

### 4. No False Claims

**Decision**: Documentation explicitly states what is NOT available on free tier.

**Rationale**:
- Honesty builds trust with developers and admins
- Clear limitations prevent false expectations
- Accurate documentation prevents deployment surprises
- Users can make informed decisions about upgrades

**Implementation**:
- Every guide lists "Free Tier Limitations" section
- No mention of automatic backups without clarifying "not available on free tier"
- No claim of scheduled jobs or automatic monitoring
- Clear upgrade path to paid tiers if needed

## Database Changes

### Migration 022: Data Retention and Cleanup Functions

**File**: `supabase/migrations/022_data_retention_and_cleanup.sql`

#### Functions Created

1. **cleanup_expired_deleted_jobs(p_dry_run, p_admin_id)**
   - Removes deleted_jobs records past their expires_at timestamp
   - Returns: records_found, records_deleted, oldest_expiry, newest_expiry
   - Audit logs when executed with admin_id
   - Idempotent (safe to run multiple times)

2. **cleanup_expired_location_sessions(p_dry_run, p_admin_id)**
   - Removes location_sharing_sessions records past their expires_at timestamp
   - Privacy-sensitive: ensures expired location data is deleted
   - Returns: records_found, records_deleted, oldest_expiry, newest_expiry
   - Audit logs when executed with admin_id

3. **get_archivable_completed_jobs(p_days_old, p_provider_id)**
   - Identifies completed jobs older than specified days
   - Does NOT delete - just reports candidates for archival
   - Providers can manually soft-delete old completed jobs
   - Helps admins monitor storage usage

4. **get_retention_statistics()**
   - Returns comprehensive retention statistics across all tables
   - Categories: deleted_jobs, location_sessions, completed_jobs, audit_logs, reports
   - Shows: total records, expired records, expiring soon (7d/30d), date ranges
   - Used by Admin Health Dashboard

#### Function Signature Examples

```sql
-- Dry run (check what would be deleted)
SELECT * FROM cleanup_expired_deleted_jobs(TRUE, NULL);

-- Actual execution with audit logging
SELECT * FROM cleanup_expired_deleted_jobs(FALSE, 'admin-user-id');

-- Get archival candidates
SELECT * FROM get_archivable_completed_jobs(30);

-- Get retention statistics for dashboard
SELECT * FROM get_retention_statistics();
```

#### RLS and Security

- All functions use `SECURITY DEFINER` (run with elevated privileges)
- Admin-only operations verify `p_admin_id` against `profiles.role = 'admin'`
- Audit logging tracks who executed cleanup and when
- Read-only functions accessible to all authenticated users (RLS applies)

## Frontend Changes

### 1. Admin Health Dashboard

**File**: `src/pages/AdminHealth.tsx`

**Features**:
- Real-time retention statistics from database
- Overview cards: total records, expired records, expiring in 7 days
- Detailed retention table with breakdown by category
- Cleanup action instructions with SQL command snippets
- Free-tier limitations notice
- Manual monitoring schedule recommendations
- Links to documentation (DATA_RETENTION_POLICY.md, BACKUP_AND_RESTORE_GUIDE.md)

**Design Decisions**:
- Read-only dashboard (no inline cleanup execution for safety)
- Provides SQL commands for admins to run in Supabase SQL Editor
- Clear warnings before recommending any destructive action
- "View Instructions" buttons link to detailed documentation
- Refresh button to reload statistics on demand

**Route**: `/admin/health` (admin-only, protected route)

### 2. Module 11 Integration (Error Handling)

**Updated Pages**:

1. **src/pages/ProviderJobs.tsx**
   - Added `ErrorMessage` component display
   - Replaced `console.error` with `logError()` utility
   - Converted errors with `toAppError()` for user-friendly messages
   - Added `onRetry` handler to error component
   - State: `error` string to track current error

2. **src/pages/WorkerMyJobs.tsx**
   - Added `ErrorMessage` component display
   - Replaced `console.error` with `logError()` utility
   - Converted errors with `toAppError()` for user-friendly messages
   - Added `onRetry` handler to error component
   - State: `error` string to track current error

**Impact**:
- Users see friendly error messages instead of raw technical errors
- Retry buttons appear for transient errors (network, timeout)
- Errors are properly logged with context for debugging
- Consistent error UX across critical booking/job pages

### 3. Routing Changes

**File**: `src/routes/index.tsx`

**Added Routes**:
- `/admin/health` - Admin health monitoring dashboard (admin-only)

**Updated Components**:
- `Admin.tsx` - Added "System Health" button in header linking to `/admin/health`

## Documentation

### 1. DATA_RETENTION_POLICY.md

**Purpose**: Comprehensive data retention policy for all tables

**Contents**:
- Retention periods by data category (deleted jobs, location sessions, completed jobs, etc.)
- Cleanup functions reference with examples
- Manual cleanup schedule recommendations (daily/weekly/monthly/quarterly)
- Monitoring & alerts guidance (free tier limitations)
- Disaster recovery considerations
- Compliance notes (privacy, data minimization, audit trail)

**Key Sections**:
- Deleted Jobs: 30-day recovery window, manual cleanup after expiration
- Location Sharing: Expire when job ends, daily cleanup recommended (privacy)
- Completed Jobs: 30-90 day retention recommended, provider discretion
- Job Confirmations & Attendance: Tied to parent job lifecycle
- Reports: Indefinite retention (admin discretion)
- Audit Logs: NEVER auto-delete (security/compliance requirement)

### 2. BACKUP_AND_RESTORE_GUIDE.md

**Purpose**: Step-by-step backup and restore procedures with security considerations

**Contents**:
- Free tier limitations (no automatic backups, no PITR)
- Backup strategy (what to back up, frequency recommendations)
- Manual backup procedures (3 methods: Dashboard CSV, pg_dump SQL, automated script)
- Restore procedures (tested in separate project first)
- Disaster recovery scenarios
- Backup verification checklist
- Security best practices (encryption, permissions, storage)
- Backup retention policy

**Key Sections**:
- Method 1: Supabase Dashboard Export (CSV) - Quick, small datasets
- Method 2: SQL Dump (pg_dump) - Complete backups with schema
- Method 3: Automated Backup Script (bash/PowerShell) - Recurring manual execution
- Restore Testing: ALWAYS test in separate project first
- Disaster Scenarios: Data deletion, corruption, project deletion, migration errors
- Security: NEVER commit backups to public repos, encrypt sensitive data

### 3. MODULE_12_IMPLEMENTATION.md

**This document** - Technical implementation details for developers

## Testing

### Type-Check Status

```bash
npm run type-check
```

**Expected**: ✅ PASS (no TypeScript errors)

**Verified**:
- AdminHealth.tsx compiles without errors
- Error handling utilities imported correctly
- Route configuration valid

### Build Status

```bash
npm run build
```

**Expected**: ✅ PASS (production build succeeds)

**Verified**:
- All pages compile and bundle correctly
- No runtime type errors
- Bundle size reasonable (< 600 KB)

### Manual Testing Checklist

#### Cleanup Functions

- [ ] `cleanup_expired_deleted_jobs(TRUE)` returns correct expired count (dry-run)
- [ ] `cleanup_expired_deleted_jobs(FALSE, admin_id)` actually deletes expired records
- [ ] `cleanup_expired_location_sessions(TRUE)` returns correct expired count (dry-run)
- [ ] `cleanup_expired_location_sessions(FALSE, admin_id)` actually deletes expired records
- [ ] `get_archivable_completed_jobs(30)` returns jobs older than 30 days
- [ ] `get_retention_statistics()` returns stats for all categories
- [ ] Admin actions are logged to `admin_audit_logs` table

#### Admin Health Dashboard

- [ ] `/admin/health` route accessible only to admins
- [ ] Non-admins see AccessDenied component
- [ ] Retention statistics display correctly
- [ ] Overview cards show accurate totals
- [ ] Expired records highlighted in yellow/orange
- [ ] Refresh button reloads statistics
- [ ] SQL command snippets display correctly
- [ ] "View Instructions" buttons show appropriate alerts
- [ ] Free-tier limitations notice displayed
- [ ] Back to Dashboard button navigates to `/admin`

#### Error Handling Integration

- [ ] ProviderJobs displays ErrorMessage on load failure
- [ ] WorkerMyJobs displays ErrorMessage on load failure
- [ ] Retry button triggers reload function
- [ ] Network errors show appropriate retry message
- [ ] Auth errors show "sign in again" message
- [ ] Errors logged with proper context

#### Admin Dashboard Link

- [ ] "System Health" button visible in Admin Dashboard header
- [ ] Button navigates to `/admin/health`
- [ ] Button styling consistent with brand

## Migration Application

### Local Development

```bash
# Apply migration 022
supabase db push

# Or run migration file directly in Supabase SQL Editor
# Copy contents of supabase/migrations/022_data_retention_and_cleanup.sql
```

### Production Deployment

1. **Backup First** (see BACKUP_AND_RESTORE_GUIDE.md)
   ```bash
   pg_dump "$DATABASE_URL" --file=backup_before_migration_022.sql
   ```

2. **Apply Migration**
   - Go to Supabase Dashboard > SQL Editor
   - Paste contents of `022_data_retention_and_cleanup.sql`
   - Execute query
   - Verify no errors

3. **Test Functions**
   ```sql
   -- Test dry-run (safe)
   SELECT * FROM cleanup_expired_deleted_jobs(TRUE);
   SELECT * FROM get_retention_statistics();
   ```

4. **Deploy Frontend**
   ```bash
   npm run build
   # Deploy dist/ to hosting (Vercel, Netlify, etc.)
   ```

## Usage Examples

### Admin Workflow: Weekly Cleanup

1. **Monday Morning**: Check Admin Health Dashboard
   ```
   Navigate to: /admin/health
   Review: Expired records count, expiring soon
   ```

2. **Review Retention Statistics**
   - Check deleted_jobs: How many expired?
   - Check location_sessions: How many expired?
   - Note: Any warnings (storage > 80%)?

3. **Execute Cleanup (if needed)**
   ```sql
   -- Open Supabase SQL Editor
   
   -- Step 1: Dry run
   SELECT * FROM cleanup_expired_deleted_jobs(TRUE);
   
   -- Step 2: Review results (how many will be deleted?)
   
   -- Step 3: Execute (if count looks reasonable)
   SELECT * FROM cleanup_expired_deleted_jobs(FALSE, 'your-admin-id');
   
   -- Step 4: Same for location sessions
   SELECT * FROM cleanup_expired_location_sessions(FALSE, 'your-admin-id');
   ```

4. **Verify Audit Logs**
   ```sql
   SELECT * FROM admin_audit_logs
   WHERE admin_id = 'your-admin-id'
   ORDER BY created_at DESC
   LIMIT 10;
   ```

5. **Refresh Dashboard**
   - Click "Refresh" button in /admin/health
   - Verify expired counts decreased

### Provider Workflow: Archiving Old Completed Jobs

1. **Query Archival Candidates**
   ```sql
   SELECT * FROM get_archivable_completed_jobs(90, 'provider-id');
   ```

2. **Provider Soft-Deletes Old Jobs**
   - Provider navigates to their /provider/jobs page
   - Clicks on old completed job
   - Clicks "Delete Job" (soft delete)
   - Job moves to /provider/deleted-jobs for 30-day recovery

3. **After 30 Days**
   - Admin runs weekly cleanup
   - Expired deleted jobs are permanently removed
   - Storage freed up

## Known Limitations

### Free Tier Constraints

1. **No Automatic Scheduling**
   - ❌ No pg_cron extension
   - ❌ Cannot schedule automatic cleanup jobs
   - ✅ Manual execution required
   - **Workaround**: Set calendar reminders for admin

2. **No Automatic Alerts**
   - ❌ No database-level alerts for storage thresholds
   - ❌ No email/SMS notifications
   - ✅ Manual monitoring via dashboard
   - **Workaround**: Check /admin/health weekly

3. **No Automatic Backups**
   - ❌ No daily automated backups
   - ❌ No point-in-time recovery (PITR)
   - ✅ Manual pg_dump required
   - **Workaround**: bash script + cron on developer machine

4. **Storage Limit**
   - ❌ 500 MB free tier database size limit
   - ✅ Monitoring via Supabase dashboard
   - **Workaround**: Regular cleanup, upgrade to Pro if needed

### Module 11 Integration Scope

**Completed**:
- ✅ ProviderJobs.tsx (provider job list)
- ✅ WorkerMyJobs.tsx (worker confirmed jobs)

**Not in Scope** (can be added in future):
- Booking confirmation flows (WorkerJobDetail.tsx)
- Job creation/edit forms (NewJob.tsx, ProviderJobDetail.tsx)
- Admin user management pages
- Profile update flows

**Rationale**: Module 12 focused on highest-priority pages (job listings). Other pages can be updated incrementally using the same pattern.

## Upgrade Path

If free tier limitations become blocking:

### Supabase Pro Plan ($25/month)

**Gains**:
- ✅ Automatic daily backups (7-day retention)
- ✅ Point-in-time recovery (PITR)
- ✅ 8 GB database size (16x free tier)
- ✅ Better support response times
- ❌ Still no pg_cron (requires extensions enabled)

### Supabase Team Plan ($599/month)

**Gains**:
- ✅ pg_cron extension (automatic scheduling)
- ✅ 30-day backup retention
- ✅ 100 GB database size
- ✅ Custom database extensions
- ✅ Advanced security features

**Recommendation**: Stay on free tier until:
- Database size exceeds 400 MB (80% of limit)
- Manual backup burden becomes unsustainable
- Automatic scheduling is mission-critical

## Security Considerations

### Backup Security

- ✅ Backups contain PII and must be stored securely
- ✅ NEVER commit backups to public GitHub
- ✅ Use encrypted storage for backups
- ✅ Restrict backup file permissions (chmod 600)
- ✅ Separate test/dev backups from production

### Cleanup Safety

- ✅ Dry-run mode prevents accidental deletion
- ✅ Admin-only access enforced by RLS + role check
- ✅ Audit logging tracks all cleanup actions
- ✅ SQL commands must be run in Supabase SQL Editor (no frontend buttons)
- ✅ No CASCADE DELETE on user request (only via database FK)

### Privacy Compliance

- ✅ Location data expires when no longer needed (data minimization)
- ✅ Soft-delete provides recovery window (user protection)
- ✅ Expired data cleaned regularly (GDPR right to erasure)
- ✅ Audit logs track data deletion (accountability)

## Future Enhancements (Beyond Module 12)

1. **Automated Backup Script with Cron**
   - Run `backup-database.sh` daily via developer machine cron
   - Upload encrypted backups to private cloud storage (S3, Dropbox, etc.)
   - Automatic retention cleanup (keep last 30 days)

2. **Email Notifications for Admins**
   - Supabase Edge Functions to send email reminders
   - Weekly digest: expired records count, storage usage
   - Critical alert: storage > 90% of free tier limit

3. **Export/Archive to Cold Storage**
   - Export old completed jobs (> 1 year) to JSON files
   - Store in cloud storage (cheaper than database)
   - Keep reference IDs in database for lookup

4. **Module 11 Full Integration**
   - Add error handling to all remaining pages
   - Booking confirmation flows with `toBookingError()`
   - Form validation with user-friendly error messages
   - Optimistic UI updates where appropriate

5. **Monitoring Dashboard Enhancements**
   - Table size visualization (pie chart)
   - Storage usage trend graph (if historical data tracked)
   - Cleanup history log (via admin_audit_logs query)
   - Quick actions: "Cleanup Now" with confirmation modal

## Success Criteria

### Module 12 Completion Checklist

- [x] Migration 022 created with 4 cleanup functions
- [x] DATA_RETENTION_POLICY.md written (comprehensive, honest)
- [x] BACKUP_AND_RESTORE_GUIDE.md written (step-by-step, security-focused)
- [x] Admin Health Dashboard created (/admin/health)
- [x] Module 11 error handling integrated into 2 critical pages
- [x] Admin dashboard links to health page
- [x] Routing updated for new health page
- [x] No false claims about automatic features
- [x] Free tier limitations clearly documented
- [x] Type-check passes
- [x] Build succeeds
- [x] MODULE_12_IMPLEMENTATION.md written

### Verification Steps

1. ✅ All files created and committed
2. ✅ Migration 022 SQL syntax valid
3. ✅ TypeScript compiles without errors
4. ✅ Production build succeeds
5. ✅ Documentation covers all procedures
6. ✅ Security considerations documented
7. ✅ No automatic backup claims
8. ✅ No automatic scheduling claims

## References

- Supabase Free Tier: https://supabase.com/pricing
- PostgreSQL Backup Tools: https://www.postgresql.org/docs/current/backup.html
- GDPR Data Retention: https://gdpr.eu/data-retention/
- Module 11 Implementation: `MODULE_11_IMPLEMENTATION.md`
- Project Schema: `supabase/SCHEMA.md`

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-11-01 | Initial Module 12 implementation | Kiro AI Agent |

---

**Module 12 Status**: ✅ **COMPLETE**

All deliverables implemented. Ready for testing and production deployment.
