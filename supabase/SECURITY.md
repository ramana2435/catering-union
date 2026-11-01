# Security Documentation - Catering Union

## Overview

This document describes the Row Level Security (RLS) implementation for the Catering Union database. RLS ensures that users can only access and modify data they are authorized for, based on their role and ownership.

## Security Principles

1. **Deny by Default**: RLS is enabled on all tables. Without an explicit policy, no data is accessible.
2. **Role-Based Access Control (RBAC)**: Access is determined by user role (worker, provider, admin).
3. **Ownership Verification**: Users can only modify their own data unless explicitly authorized.
4. **Privacy Protection**: Sensitive data (location, audit logs) has stricter access controls.
5. **Immutability**: Critical records (audit logs) cannot be modified or deleted.
6. **Soft Deletes**: Deleted jobs are hidden from normal queries but preserved for recovery.

## Role Definitions

### Worker
- Regular catering workers who can view and confirm jobs
- Can manage own profile (limited), confirmations, attendance, and location sharing
- Cannot access administrative functions or other users' private data

### Provider
- Catering service providers who create and manage job postings
- Can manage own jobs, view confirmations and attendance for own jobs
- Can access location of workers confirmed for their jobs (during active sessions)

### Admin
- System administrators with elevated privileges
- Can view all data, manage reports, suspend accounts, access audit logs
- Cannot modify immutable audit trail
- Admin role cannot be self-assigned

## Role-Based Access Matrix

### Profiles Table

| Role | SELECT | INSERT | UPDATE | DELETE |
|------|--------|--------|--------|--------|
| Worker | ✓ Public info (all)<br>✓ Full info (own) | ✓ Own profile only<br>✗ Cannot assign admin role | ✓ Own profile only<br>✗ Cannot change role<br>✗ Cannot change account_status | ✗ Not allowed |
| Provider | ✓ Public info (all)<br>✓ Full info (own) | ✓ Own profile only<br>✗ Cannot assign admin role | ✓ Own profile only<br>✗ Cannot change role<br>✗ Cannot change account_status | ✗ Not allowed |
| Admin | ✓ All profiles<br>✓ All fields | ✓ Can create admin users | ✓ Any profile<br>✓ Can change role<br>✓ Can change account_status | ✗ Not allowed |

**Key Restrictions:**
- Users cannot self-assign admin role during signup
- Users cannot modify their own role or account_status
- Phone numbers and account_status are only visible to profile owner and admins
- Profiles are never deleted (use account_status = 'suspended' instead)

### Catering Jobs Table

| Role | SELECT | INSERT | UPDATE | DELETE |
|------|--------|--------|--------|--------|
| Worker | ✓ Open jobs (deleted_at IS NULL)<br>✓ Jobs confirmed by self | ✗ Cannot create jobs | ✗ Cannot update jobs | ✗ Cannot delete jobs |
| Provider | ✓ Open jobs<br>✓ Own jobs (all statuses) | ✓ Own jobs only<br>✓ provider_id = auth.uid() | ✓ Own jobs only<br>✗ Cannot change provider_id<br>✓ Can soft-delete (set deleted_at) | ✗ Hard delete not allowed |
| Admin | ✓ All jobs<br>✓ Including soft-deleted | ✓ Any jobs | ✓ Any jobs | ✓ Hard delete allowed |

**Key Restrictions:**
- Soft-deleted jobs (deleted_at IS NOT NULL) are hidden from normal SELECT queries
- Providers can only soft-delete own jobs
- Only admins can view soft-deleted jobs
- Confirmed workers can still view jobs they confirmed (for history)

### Job Confirmations Table

| Role | SELECT | INSERT | UPDATE | DELETE |
|------|--------|--------|--------|--------|
| Worker | ✓ Own confirmations | ✓ Confirm for self<br>✓ Job must be open<br>✓ Job must not be deleted | ✓ Own confirmations<br>✓ Cannot change worker_id or job_id | ✓ Own confirmations |
| Provider | ✓ Confirmations for own jobs | ✗ Cannot create confirmations | ✓ Confirmations for own jobs | ✓ Confirmations for own jobs |
| Admin | ✓ All confirmations | ✓ Any confirmations | ✓ Any confirmations | ✓ Any confirmations |

**Key Restrictions:**
- Workers can only confirm jobs for themselves (worker_id = auth.uid())
- Duplicate confirmations prevented by UNIQUE constraint
- Workers cannot confirm for deleted or non-open jobs

### Worker Attendance Table

| Role | SELECT | INSERT | UPDATE | DELETE |
|------|--------|--------|--------|--------|
| Worker | ✓ Own attendance | ✓ Own attendance<br>✓ Limited status values<br>✓ Must be confirmed for job | ✓ Own attendance<br>✓ Limited status values only | ✗ Cannot delete |
| Provider | ✓ Attendance for own jobs | ✓ For confirmed workers<br>✓ In own jobs | ✓ Attendance for own jobs<br>✓ Can mark present/absent | ✓ Attendance for own jobs |
| Admin | ✓ All attendance | ✓ Any attendance | ✓ Any attendance | ✓ Any attendance |

**Key Restrictions:**
- Workers can only set status: 'getting_ready', 'on_the_way', 'arrived'
- Providers can set any status including 'present', 'absent'
- marked_by field tracks who made the change

### Location Sharing Sessions Table (STRICT PRIVACY)

| Role | SELECT | INSERT | UPDATE | DELETE |
|------|--------|--------|--------|--------|
| Worker | ✓ Own sessions | ✓ Own sessions<br>✓ Must be confirmed for job | ✓ Own sessions<br>✓ Can toggle sharing_enabled<br>✓ Update coordinates | ✓ Own sessions |
| Provider | ✓ Sessions for confirmed workers in own jobs<br>✗ ONLY if expires_at > NOW() | ✗ Cannot create sessions | ✗ Cannot update sessions | ✗ Cannot delete sessions |
| Admin | ✓ All sessions | ✓ Any sessions (support purposes) | ✓ Any sessions | ✓ Any sessions |

**Key Restrictions:**
- Location sharing is VOLUNTARY - workers must explicitly create session
- Providers can ONLY view location during active sessions (expires_at > NOW())
- Expired sessions are automatically hidden via SELECT policy
- Workers can stop sharing by deleting session or setting sharing_enabled = false
- No cascading deletes - if job deleted, location sessions remain but are inaccessible

**Privacy Guarantees:**
1. Workers control when sharing starts and stops
2. Location is only visible to provider of specific job (not all providers)
3. Only confirmed workers for a job can share location
4. Expired sessions are immediately inaccessible
5. Unrelated users never have access

### Deleted Jobs Table

| Role | SELECT | INSERT | UPDATE | DELETE |
|------|--------|--------|--------|--------|
| Worker | ✗ No access | ✗ No access | ✗ No access | ✗ No access |
| Provider | ✓ Own deleted jobs only | ✓ Via soft_delete_job() function<br>✓ deleted_by = auth.uid() | ✗ Cannot update | ✗ Cannot delete |
| Admin | ✓ All deleted jobs | ✓ Any deleted jobs | ✓ Any deleted jobs<br>✓ Can adjust expiration | ✓ Can cleanup |

**Key Restrictions:**
- Workers cannot access deleted_jobs table at all
- Providers can only see jobs they deleted
- Inserts are typically via soft_delete_job() SECURITY DEFINER function
- job_snapshot JSONB column preserves complete original job data

### Reports Table

| Role | SELECT | INSERT | UPDATE | DELETE |
|------|--------|--------|--------|--------|
| Worker | ✓ Own submitted reports | ✓ Can submit reports<br>✓ reporter_id = auth.uid()<br>✓ Job must exist | ✗ Cannot update | ✗ Cannot delete |
| Provider | ✓ Own submitted reports | ✓ Can submit reports | ✗ Cannot update | ✗ Cannot delete |
| Admin | ✓ All reports | ✓ Can submit reports | ✓ Any reports<br>✓ Can change status | ✓ Any reports |

**Key Restrictions:**
- Users can view status updates on their own reports
- Only admins can change report status ('reviewed', 'resolved', 'dismissed')
- Users cannot delete their own reports (prevents abuse)

### Admin Audit Logs Table (IMMUTABLE)

| Role | SELECT | INSERT | UPDATE | DELETE |
|------|--------|--------|--------|--------|
| Worker | ✗ No access | ✗ No access | ✗ No policy | ✗ No policy |
| Provider | ✗ No access | ✗ No access | ✗ No policy | ✗ No policy |
| Admin | ✓ All audit logs | ✓ Via log_admin_action() function<br>✓ admin_id = auth.uid() | ✗ NO UPDATE POLICY | ✗ NO DELETE POLICY |

**Key Restrictions:**
- NO UPDATE POLICY exists - audit logs are immutable
- NO DELETE POLICY exists - audit logs are permanent
- Even admins cannot modify or delete audit trail
- Foreign key uses ON DELETE SET NULL to preserve logs even if admin deleted
- Use log_admin_action() function for consistent audit logging

**Immutability Rationale:**
- Ensures complete accountability
- Prevents tampering even if admin account compromised
- Critical for compliance and forensic investigations

## Policy Design Patterns

### 1. Ownership Check Pattern
```sql
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid())
```
Ensures users can only access and modify their own records.

### 2. Role-Based Pattern
```sql
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
)
```
Grants access based on user role stored in profiles table.

### 3. Soft Delete Filter Pattern
```sql
USING (deleted_at IS NULL)
```
Hides soft-deleted records from normal queries while preserving data.

### 4. Expiration Check Pattern
```sql
USING (expires_at > NOW())
```
Automatically hides expired records (location sessions).

### 5. Immutable Field Pattern
```sql
WITH CHECK (NEW.role = OLD.role AND NEW.account_status = OLD.account_status)
```
Prevents modification of critical fields.

### 6. Admin Bypass Pattern
```sql
-- User policy with restrictions
CREATE POLICY "table_operation_user" ...

-- Separate admin policy with full access
CREATE POLICY "table_operation_admin" FOR ALL ...
USING (role = 'admin') WITH CHECK (role = 'admin');
```
Allows admins to bypass normal restrictions.

## Security Testing

### Running Security Tests

1. Apply all migrations (001-019)
2. Create test users via Supabase Auth Dashboard
3. Run tests in `supabase/tests/security_tests.sql`
4. Record results in `supabase/tests/SECURITY_TEST_REPORT.md`

### Test Coverage

Security tests cover:
- ✅ Authenticated user access (should work)
- ✅ Unauthorized access (should fail)
- ✅ Cross-user access (should fail)
- ✅ Admin access (should work)
- ✅ Expired session access (should fail)
- ✅ Immutable field updates (should fail)
- ✅ Self-admin assignment (should fail)
- ✅ Soft-deleted job visibility (should be hidden)

### Test Execution Method

```sql
-- Set session user to simulate authenticated user
SET LOCAL request.jwt.claims TO '{"sub": "USER_UUID", "role": "authenticated"}';

-- Run operation
SELECT * FROM profiles WHERE id = 'USER_UUID';

-- Verify expected behavior (success or failure)
```

## Common Security Scenarios

### Scenario 1: Worker Confirmation Flow
1. Worker views open jobs (✓ allowed - status = 'open' and deleted_at IS NULL)
2. Worker confirms job (✓ allowed - worker_id = auth.uid())
3. Worker views confirmation (✓ allowed - own confirmation)
4. Provider views confirmation (✓ allowed - own job)

### Scenario 2: Location Sharing
1. Worker creates location session (✓ allowed - confirmed for job)
2. Worker updates coordinates (✓ allowed - own session)
3. Provider views location (✓ allowed - confirmed worker, not expired)
4. Session expires (✗ provider can no longer view)
5. Worker deletes session (✓ allowed - voluntary opt-out)

### Scenario 3: Job Management
1. Provider creates job (✓ allowed - provider_id = auth.uid())
2. Workers view job (✓ allowed - status = 'open')
3. Provider soft-deletes job (✓ allowed - own job)
4. Workers no longer see job (✗ deleted_at IS NOT NULL)
5. Admin views deleted job (✓ allowed - admin policy)

### Scenario 4: Admin Actions
1. Admin suspends user (✓ allowed - can change account_status)
2. Action logged to audit_logs (✓ via log_admin_action())
3. Admin tries to modify audit log (✗ NO UPDATE POLICY)
4. Admin tries to delete audit log (✗ NO DELETE POLICY)

## Security Best Practices

### Application Layer
1. **Never use service role key in frontend** - always use anon key with RLS
2. **Validate inputs** - RLS protects data access, not input validation
3. **Handle permission errors gracefully** - inform users when access denied
4. **Use TypeScript types** - generated from schema for type safety
5. **Test with different roles** - verify UI shows only authorized features

### Database Layer
1. **Never disable RLS** - even temporarily for debugging
2. **Test policies thoroughly** - run security_tests.sql before deployment
3. **Use SECURITY DEFINER carefully** - only for trusted functions, set search_path
4. **Audit admin actions** - always log via log_admin_action()
5. **Monitor for suspicious patterns** - multiple failed access attempts

### Deployment
1. **Apply migrations in order** - schema first (001-011), then RLS (012-019)
2. **Verify RLS enabled** - check `SELECT tablename, rowsecurity FROM pg_tables`
3. **Test as each role** - create test users and run security_tests.sql
4. **Document exceptions** - any deviations from RLS patterns must be justified
5. **Regular security reviews** - audit policies when requirements change

## Troubleshooting

### Problem: User cannot access data they should see

**Diagnosis:**
```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- Check user's role
SELECT role FROM profiles WHERE id = auth.uid();

-- Check if policy exists
SELECT * FROM pg_policies WHERE tablename = 'your_table';
```

**Solutions:**
- Verify user role is correct
- Check policy USING clause logic
- Ensure user is authenticated (not anonymous)

### Problem: User can access data they shouldn't

**Diagnosis:**
```sql
-- Review policies for table
SELECT * FROM pg_policies WHERE tablename = 'your_table';

-- Check for policy conflicts
-- Multiple policies with same operation are OR'd together
```

**Solutions:**
- Review all policies for table (they are OR'd)
- Tighten USING clauses
- Add additional checks for ownership

### Problem: Location sharing not working

**Common issues:**
- expires_at is in the past (hidden by policy)
- Worker not confirmed for job (INSERT policy blocks)
- sharing_enabled = false (application should respect)

### Problem: Admin cannot modify audit logs

**This is correct behavior:**
- Audit logs are intentionally immutable
- No UPDATE or DELETE policies exist
- Use INSERT only via log_admin_action()

## Migration Path

When adding new tables or modifying RLS:

1. **Create migration file** with sequential number
2. **Enable RLS** on new tables
3. **Create policies** following patterns above
4. **Add tests** to security_tests.sql
5. **Update this document** with new table policies
6. **Test thoroughly** before deploying

## Compliance Notes

### GDPR / Data Privacy
- Users can view their own data (RIGHT TO ACCESS)
- Location sharing is voluntary (CONSENT)
- Providers can delete jobs (RIGHT TO ERASURE - via soft delete)
- Audit logs track who accessed what (ACCOUNTABILITY)

### Data Retention
- Soft-deleted jobs in deleted_jobs table have expires_at for cleanup
- Location sessions have expires_at for automatic expiration
- Audit logs are permanent (cannot be deleted)

## Support and Contact

For security concerns or questions:
1. Review this document and security_tests.sql
2. Check Supabase RLS documentation
3. Test with security_tests.sql
4. Contact system administrator

---

**Document Version:** 1.0  
**Last Updated:** 2024  
**Migration Files:** 012-019  
**Test Coverage:** 50+ test cases
