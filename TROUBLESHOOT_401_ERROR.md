# Troubleshooting 401 Error During Signup

## Problem

When trying to sign up, you get:
- **Error**: `Failed to create the account`
- **Console Error**: `401 (Unauthorized)`
- **Database Error**: `Error creating profile: Object`

## Root Cause

The 401 error means authentication succeeded (user was created), but the profile INSERT is being rejected by Row Level Security (RLS) policies in Supabase.

This happens when:
1. RLS policies haven't been applied to your production database yet
2. The `is_admin()` function isn't set up correctly
3. The INSERT policy is missing or misconfigured

---

## Solution: Apply Database Migrations

### Step 1: Verify Current RLS Status

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/hvltowwtbyslgnfmhhcn
2. Click **SQL Editor**
3. Run this query:

```sql
-- Check if RLS is enabled
SELECT 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'profiles';

-- Check existing INSERT policies
SELECT 
  policyname, 
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'profiles'
AND cmd = 'INSERT';
```

**Expected Results:**
- `rowsecurity` should be `true`
- Should see at least one INSERT policy (e.g., `profiles_insert_signup`)

**If either is missing, continue to Step 2.**

---

### Step 2: Apply RLS Fix Migration

1. Open the file: `supabase/migrations/023_fix_profile_insert_rls.sql`
2. Copy the entire contents
3. Go to Supabase Dashboard → **SQL Editor**
4. Paste the migration
5. Click **Run**
6. Look for the success message: `SUCCESS: RLS is enabled on profiles table`

---

### Step 3: Verify the Fix

Run this query to verify the policy was created:

```sql
-- Should return 1 row
SELECT 
  policyname,
  with_check
FROM pg_policies 
WHERE tablename = 'profiles' 
AND policyname = 'profiles_insert_signup';
```

Expected output:
```
policyname: profiles_insert_signup
with_check: ((id = auth.uid()) AND (role = ANY (ARRAY['worker'::text, 'provider'::text])) AND ((account_status IS NULL) OR (account_status = ANY (ARRAY['active'::text, 'pending_verification'::text]))))
```

---

### Step 4: Test Signup Again

1. Go back to your app: http://localhost:5174/signup
2. Fill in the signup form:
   - Full Name: Test User
   - Email: test@example.com
   - Password: test123
   - Role: Worker
3. Click **Sign Up**

**Expected Result**: ✅ Account created successfully or email confirmation message

---

## Alternative: Apply ALL Missing Migrations

If migration 023 alone doesn't fix it, you may need to apply all RLS migrations. Here's the correct order:

### Critical RLS Migrations (Apply in Order)

```sql
-- 1. Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 2. Create helper function
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM profiles WHERE id = user_id LIMIT 1;
  RETURN user_role = 'admin';
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated;

-- 3. Create SELECT policy (users can view their own profile)
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- 4. Create INSERT policy (for signup)
CREATE POLICY "profiles_insert_signup" ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    id = auth.uid()
    AND role IN ('worker', 'provider')
    AND (account_status IS NULL OR account_status IN ('active', 'pending_verification'))
  );

-- 5. Create UPDATE policy (users can update their own profile)
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 6. Verify
SELECT 
  tablename, 
  rowsecurity,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'profiles') as policy_count
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'profiles';
```

This should show:
- `rowsecurity: true`
- `policy_count: 3` (or more)

---

## Quick Fix: Temporarily Disable RLS (DEVELOPMENT ONLY)

⚠️ **WARNING**: Only use this for local development testing. **NEVER do this in production!**

```sql
-- DEVELOPMENT ONLY - Remove RLS temporarily to test
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
```

This will allow signups to work, but **removes all security protections**.

After testing, **immediately re-enable RLS**:

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
```

---

## Debugging: Check What Went Wrong

If signup still fails after applying migrations, run this diagnostic:

```sql
-- 1. Check if profiles table exists
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'profiles';

-- 2. Check table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'profiles';

-- 3. Check RLS status
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relname = 'profiles';

-- 4. List all policies
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'profiles';

-- 5. Check is_admin function exists
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'is_admin';

-- 6. Test is_admin function
SELECT is_admin('00000000-0000-0000-0000-000000000000'::uuid);
-- Should return: false
```

---

## Still Not Working?

If you've applied the migrations and it still fails, check:

### 1. Check Supabase Project Status
- Go to Supabase Dashboard
- Verify project is not paused (free tier pauses after 1 week inactivity)
- Check project health in Settings

### 2. Check API Keys
In your `.env` file, verify:
```env
VITE_SUPABASE_URL=https://hvltowwtbyslgnfmhhcn.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc... (get from Supabase Dashboard → Settings → API)
```

**Important**: Make sure you're using the **anon key**, NOT the service_role key!

### 3. Check Browser Console
Open Developer Tools (F12) → Console tab:
- Look for the full error message
- Check the Network tab for the failed request
- Look for the request body and response

### 4. Check Supabase Logs
Go to Supabase Dashboard → **Logs** → **Postgres Logs**:
- Look for policy violation errors
- Check for any permission denied messages

---

## Prevention: Apply All Migrations

To avoid this issue in the future, apply ALL migrations in order:

1. Go to `supabase/migrations/` folder
2. Apply migrations sequentially: 001, 002, 003... 023
3. Verify each one with the queries in `MIGRATION_VERIFICATION.md`

See **MODULE_14_DEPLOYMENT_GUIDE.md** Section 2.2 for complete migration checklist.

---

## Summary

**Most Common Cause**: RLS policies not applied to database

**Quick Fix**: Apply migration 023_fix_profile_insert_rls.sql

**Verify Fix**: Run the verification query in Step 3

**Next Steps**: Apply all 23 migrations for full functionality

---

## Contact

If you're still stuck after following these steps:
1. Check the full error in browser console
2. Check Supabase Postgres logs
3. Verify RLS is enabled and policies exist
4. Share the output of the diagnostic queries above

*Last updated: November 1, 2026*
