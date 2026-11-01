# Database Migration Verification Checklist

This document provides SQL queries to verify each migration was applied successfully to your production Supabase database.

## How to Use

1. Go to your Supabase Dashboard SQL Editor
2. Run each verification query after applying the corresponding migration
3. ✅ = Verify the query returns expected results
4. ❌ = If query fails or returns unexpected results, migration may have failed

---

## Migration 001: Create profiles table

**Verification Query:**
```sql
-- Check profiles table exists
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'profiles';

-- Check profiles table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'profiles';

-- Expected columns: id, full_name, phone_number, role, preferred_language, 
-- profile_image_url, account_status, created_at, updated_at
```

**Expected Result**: Table `profiles` exists with 9 columns

---

## Migration 002: Create catering_jobs table

**Verification Query:**
```sql
-- Check catering_jobs table exists
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'catering_jobs';

-- Check structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'catering_jobs';

-- Expected columns: id, provider_id, title, description, event_date, event_time,
-- duration_hours, location_address, location_coordinates, workers_needed,
-- workers_confirmed, hourly_rate, special_requirements, status, created_at, updated_at
```

**Expected Result**: Table `catering_jobs` exists with 16 columns

---

## Migration 002: Atomic worker confirmation function

**Verification Query:**
```sql
-- Check function exists
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'confirm_worker_for_job';

-- Test function signature (don't execute, just check)
SELECT prosrc FROM pg_proc WHERE proname = 'confirm_worker_for_job';
```

**Expected Result**: Function `confirm_worker_for_job` exists and accepts `p_job_id UUID, p_worker_id UUID`

---

## Migration 003: Create job_confirmations table

**Verification Query:**
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'job_confirmations';

-- Check unique constraint
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_schema = 'public' 
AND table_name = 'job_confirmations' 
AND constraint_type = 'UNIQUE';
```

**Expected Result**: Table exists with unique constraint on `(job_id, worker_id)`

---

## Migration 003: Restore job function

**Verification Query:**
```sql
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' AND routine_name = 'restore_deleted_job';
```

**Expected Result**: Function `restore_deleted_job` exists

---

## Migration 004: Create worker_attendance table

**Verification Query:**
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'worker_attendance';

-- Check columns include location fields
SELECT column_name FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'worker_attendance' 
AND column_name IN ('check_in_location', 'check_out_location');
```

**Expected Result**: Table exists with location tracking fields

---

## Migration 005: Create location_sharing_sessions table

**Verification Query:**
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'location_sharing_sessions';

-- Check it has expiry field
SELECT column_name FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'location_sharing_sessions' 
AND column_name = 'expires_at';
```

**Expected Result**: Table exists with `expires_at` column for privacy

---

## Migration 006: Create deleted_jobs table

**Verification Query:**
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'deleted_jobs';

-- Check it stores original job data
SELECT column_name FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'deleted_jobs' 
AND column_name = 'original_job_data';
```

**Expected Result**: Table exists with `original_job_data` JSONB column

---

## Migration 007: Create reports table

**Verification Query:**
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'reports';

-- Check report types
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'reports' 
AND column_name = 'report_type';
```

**Expected Result**: Table exists with `report_type` column

---

## Migration 008: Create admin_audit_logs table

**Verification Query:**
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'admin_audit_logs';

-- Verify immutable (no UPDATE/DELETE triggers or policies should allow modification)
SELECT column_name FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'admin_audit_logs';
```

**Expected Result**: Table exists (immutability verified via RLS policies later)

---

## Migration 009: Create functions and triggers

**Verification Query:**
```sql
-- Check soft_delete_job function
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'soft_delete_job';

-- Check update timestamp trigger function
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'update_updated_at_column';

-- Check triggers are attached to tables
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND trigger_name LIKE '%update_updated_at%';
```

**Expected Result**: Functions exist, triggers attached to relevant tables

---

## Migration 010: Enable RLS

**Verification Query:**
```sql
-- Check RLS is enabled on all tables
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
  'profiles', 'catering_jobs', 'job_confirmations', 
  'worker_attendance', 'location_sharing_sessions', 
  'deleted_jobs', 'reports', 'admin_audit_logs'
);
```

**Expected Result**: All 8 tables have `rowsecurity = true`

---

## Migration 011: Create indexes

**Verification Query:**
```sql
-- List all indexes on your tables
SELECT 
  tablename, 
  indexname, 
  indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN (
  'profiles', 'catering_jobs', 'job_confirmations', 
  'worker_attendance', 'location_sharing_sessions'
)
ORDER BY tablename, indexname;
```

**Expected Result**: Multiple indexes exist for performance (e.g., on `provider_id`, `worker_id`, `event_date`, etc.)

---

## Migration 012: RLS Policies - Profiles (FIXED version)

**Verification Query:**
```sql
-- Check profile policies exist
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'profiles';
```

**Expected Result**: 5 policies exist:
1. `profiles_select_own` (SELECT)
2. `profiles_insert_own` (INSERT)
3. `profiles_update_own` (UPDATE)
4. `profiles_delete_own` (DELETE)
5. `admin_all_access_profiles` (ALL - for admins)

---

## Migration 013: RLS Policies - Catering Jobs

**Verification Query:**
```sql
SELECT policyname, cmd FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'catering_jobs';
```

**Expected Result**: 7 policies (provider CRUD, worker read, admin all)

---

## Migration 014: RLS Policies - Job Confirmations

**Verification Query:**
```sql
SELECT policyname, cmd FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'job_confirmations';
```

**Expected Result**: 8 policies (worker/provider read, worker insert/delete, provider read/update, admin all)

---

## Migration 015: RLS Policies - Worker Attendance

**Verification Query:**
```sql
SELECT policyname, cmd FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'worker_attendance';
```

**Expected Result**: 8 policies (worker own records, provider for their jobs, admin all)

---

## Migration 016: RLS Policies - Location Sharing

**Verification Query:**
```sql
SELECT policyname, cmd FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'location_sharing_sessions';
```

**Expected Result**: 6 policies (worker CRUD own, provider read for their jobs, admin read)

**Critical Privacy Check:**
```sql
-- Verify expired sessions are NOT accessible
-- This should return 0 rows if RLS is working correctly
SET ROLE anon;
SELECT * FROM location_sharing_sessions WHERE expires_at < NOW();
RESET ROLE;
```

---

## Migration 017: RLS Policies - Deleted Jobs

**Verification Query:**
```sql
SELECT policyname, cmd FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'deleted_jobs';
```

**Expected Result**: 5 policies (provider read own, admin read/insert/update/delete)

---

## Migration 018: RLS Policies - Reports

**Verification Query:**
```sql
SELECT policyname, cmd FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'reports';
```

**Expected Result**: 5 policies (provider CRUD own, admin all)

---

## Migration 019: RLS Policies - Audit Logs

**Verification Query:**
```sql
SELECT policyname, cmd FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'admin_audit_logs';
```

**Expected Result**: 2 policies (admin read and insert ONLY - no update/delete)

**Critical Immutability Check:**
```sql
-- Verify audit logs CANNOT be modified (this should fail with permission denied)
-- First, create a test entry (as admin)
-- Then try to update it - should be DENIED

-- DO NOT RUN IN PRODUCTION - TESTING ONLY
-- UPDATE admin_audit_logs SET action = 'test' WHERE id = 'some-id';
-- Expected: Permission denied error
```

---

## Migration 020: Fix profile insert policy

**Verification Query:**
```sql
-- Check updated insert policy exists
SELECT policyname, qual, with_check 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'profiles' 
AND policyname = 'profiles_insert_own';
```

**Expected Result**: Policy exists with proper checks

---

## Migration 021: Fix RLS with helper function

**Verification Query:**
```sql
-- Check is_admin() function exists
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'is_admin';

-- Test the function (should return false for anon user)
SELECT is_admin();
```

**Expected Result**: Function exists, returns boolean

---

## Migration 022: Data retention and cleanup

**Verification Query:**
```sql
-- Check cleanup function exists
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%cleanup%';

-- Check if pg_cron extension is available (optional for scheduled cleanup)
SELECT extname FROM pg_extension WHERE extname = 'pg_cron';
```

**Expected Result**: Cleanup functions exist (scheduler may not be available on free tier)

---

## Final Verification - Complete RLS Test

Run this comprehensive test to verify all RLS policies are working:

```sql
-- Test 1: Anonymous users cannot read profiles
SET ROLE anon;
SELECT COUNT(*) FROM profiles; -- Should return 0
RESET ROLE;

-- Test 2: Users can only read their own profile
-- (Requires a real authenticated user session)

-- Test 3: Race condition protection
-- Verify confirm_worker_for_job uses row-level locks
SELECT prosrc FROM pg_proc 
WHERE proname = 'confirm_worker_for_job' 
AND prosrc LIKE '%FOR UPDATE%';
-- Should contain "FOR UPDATE" in function body

-- Test 4: Audit log immutability
SELECT policyname, cmd FROM pg_policies 
WHERE tablename = 'admin_audit_logs' 
AND cmd IN ('UPDATE', 'DELETE');
-- Should return 0 rows (no UPDATE or DELETE policies)
```

---

## Troubleshooting

### Issue: RLS enabled but policies missing

**Solution:**
```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'profiles';

-- If rowsecurity is false, enable it
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
```

### Issue: Cannot insert into table

**Solution:**
- Verify you're authenticated (not anonymous)
- Check INSERT policies exist
- Verify policies allow your role

```sql
-- Check your current role
SELECT current_user, session_user;

-- List INSERT policies
SELECT policyname, qual, with_check 
FROM pg_policies 
WHERE tablename = 'profiles' AND cmd = 'INSERT';
```

### Issue: Migration fails with "already exists" error

**Solution:**
- Migrations use `CREATE TABLE IF NOT EXISTS` - safe to rerun
- If function already exists, drop and recreate:

```sql
DROP FUNCTION IF EXISTS function_name CASCADE;
-- Then rerun migration
```

---

## Summary

After all migrations are applied and verified:

✅ **8 tables created** (profiles, catering_jobs, job_confirmations, worker_attendance, location_sharing_sessions, deleted_jobs, reports, admin_audit_logs)

✅ **47 RLS policies** protecting all data access

✅ **Critical security features:**
- Row-level locking for booking operations
- Immutable audit logs
- Expired location sessions inaccessible
- Users can only access their own data

✅ **Performance indexes** on all foreign keys and frequently queried columns

✅ **Triggers** for automatic timestamp updates

✅ **Helper functions** for atomic operations and soft deletes

Your database is production-ready! 🎉
