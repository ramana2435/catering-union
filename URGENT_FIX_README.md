# 🚨 URGENT: Fix 401 Signup Error

## The Problem

You're seeing this error when signing up:
```
Failed to create the account
401 (Unauthorized)
Error creating profile: Object
```

## The Cause

Your Supabase database doesn't have the Row Level Security (RLS) policies applied yet. Without these policies, the database rejects profile creation attempts.

## The Fix (5 Minutes)

### Option 1: Quick Fix SQL Script (Recommended) ⚡

1. **Open your Supabase Dashboard**:
   - Go to: https://supabase.com/dashboard/project/hvltowwtbyslgnfmhhcn
   - Click **SQL Editor**

2. **Run the fix script**:
   - Open the file: `FIX_SIGNUP_SIMPLE.sql` (simpler version)
   - Copy the **entire contents**
   - Paste into Supabase SQL Editor
   - Click **Run** (or press Ctrl+Enter)

3. **Check the results**:
   After running, you'll see a results table showing:
   ```
   check_type      | status
   ----------------|------------------
   RLS Status      | ✓ ENABLED
   Policy Count    | 3 policies
   
   And a list of policies:
   - profiles_select_own (SELECT) - Users can view their profile
   - profiles_insert_signup (INSERT) - Users can create profile (SIGNUP) ✓
   - profiles_update_own (UPDATE) - Users can update their profile
   ```

4. **Test signup again**:
   - Go back to your app: http://localhost:5174/signup
   - Try creating an account
   - Should work now! ✅

---

### Option 2: Apply Single Migration

If Option 1 doesn't work, apply the specific migration:

1. Open file: `supabase/migrations/023_fix_profile_insert_rls.sql`
2. Copy entire contents
3. Paste into Supabase SQL Editor
4. Click Run

---

### Option 3: Apply All Migrations (Complete Setup)

For full functionality, apply all 23 migrations in order:

1. Go to `supabase/migrations/` folder
2. Start with `001_create_profiles.sql`
3. Apply each migration sequentially
4. See `MODULE_14_DEPLOYMENT_GUIDE.md` Section 2.2 for complete list

---

## Verify the Fix

After running the fix, verify it worked:

```sql
-- Should return: rowsecurity = true
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'profiles';

-- Should return at least 3 policies
SELECT COUNT(*) as policy_count 
FROM pg_policies 
WHERE tablename = 'profiles';

-- List all policies
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY cmd;
```

Expected policies:
- `profiles_select_own` (SELECT) ✓
- `profiles_insert_signup` (INSERT) ✓
- `profiles_update_own` (UPDATE) ✓

---

## Still Not Working?

### Check 1: Is profiles table created?

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'profiles';
```

If this returns **no rows**, you need to run migration 001 first:
- Open `supabase/migrations/001_create_profiles.sql`
- Copy and run in SQL Editor

### Check 2: Are you using the correct API key?

Check your `.env` file:
```env
VITE_SUPABASE_URL=https://hvltowwtbyslgnfmhhcn.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc... (from Supabase Dashboard → Settings → API)
```

⚠️ Make sure you're using the **anon key**, NOT the service_role key!

### Check 3: Is the Supabase project active?

Free-tier projects pause after 1 week of inactivity. Visit your dashboard to wake it up.

---

## Detailed Troubleshooting

See **TROUBLESHOOT_401_ERROR.md** for:
- Complete diagnostic queries
- Step-by-step debugging
- Alternative solutions
- Supabase logs analysis

---

## What This Fix Does

The SQL script:

1. ✅ Enables Row Level Security (RLS) on profiles table
2. ✅ Creates `is_admin()` helper function
3. ✅ Creates SELECT policy (users can view their profile)
4. ✅ Creates INSERT policy (users can create their profile during signup)
5. ✅ Creates UPDATE policy (users can update their profile)
6. ✅ Verifies everything is working

---

## After the Fix

Once signup works:

1. **Create test accounts**:
   - Worker account: test-worker@example.com
   - Provider account: test-provider@example.com

2. **Check email** for confirmation (if email verification is enabled)

3. **Continue with deployment**:
   - See `QUICK_DEPLOY.md` for deployment steps
   - See `MODULE_14_DEPLOYMENT_GUIDE.md` for complete guide

---

## Next Steps

### Immediate
- [x] Fix 401 signup error (you're doing this now!)
- [ ] Create test worker account
- [ ] Create test provider account
- [ ] Test authentication flow

### Short-term
- [ ] Apply remaining migrations for full features
- [ ] Execute manual testing checklist
- [ ] Deploy to Cloudflare Pages

### Long-term
- [ ] Gather user feedback
- [ ] Monitor usage
- [ ] Optimize performance

---

## Summary

**Problem**: 401 error during signup  
**Cause**: Missing RLS policies  
**Fix**: Run `FIX_SIGNUP_401_ERROR.sql` (5 minutes)  
**Verify**: Try signing up again

**Quick Steps:**
1. Open Supabase SQL Editor
2. Copy/paste `FIX_SIGNUP_401_ERROR.sql`
3. Click Run
4. Test signup

That's it! 🎉

---

*If you're still stuck, check **TROUBLESHOOT_401_ERROR.md** for detailed debugging.*
