# Fix 406 and 401 Errors - Complete Solution

## Your Errors Explained

### Error 1: 406 (Not Acceptable)
```
hvltowwtbyslgnfmhhcn.supabase.co/rest/v1/profiles?select=*&id=eq.xxx:1
Failed to load resource: the server responded with a status of 406
```
**Meaning**: The `profiles` table doesn't exist OR doesn't have the expected columns.

### Error 2: 401 (Unauthorized) 
```
hvltowwtbyslgnfmhhcn.supabase.co/rest/v1/profiles?select=*:1
Failed to load resource: the server responded with a status of 401
```
**Meaning**: RLS policies are blocking access.

### Error 3: "Error creating profile: Object"
**Meaning**: Profile insert failed due to above issues.

---

## Complete Fix (5 Minutes)

### Step 1: Diagnose the Problem

1. **Open Supabase SQL Editor**:
   ```
   https://supabase.com/dashboard/project/hvltowwtbyslgnfmhhcn
   ```

2. **Run diagnostic**:
   - Copy contents of `DIAGNOSE_ISSUE.sql`
   - Paste into SQL Editor
   - Click Run
   - **Look at the results**

3. **If you see ANY ❌ marks**, continue to Step 2.

---

### Step 2: Apply Complete Fix

1. **In the same SQL Editor**, run:
   - Copy **entire contents** of `COMPLETE_FIX_ALL_ISSUES.sql`
   - Paste into SQL Editor
   - Click **Run**

2. **Wait for it to complete** (should take 5-10 seconds)

3. **Check the verification results** at the bottom:
   ```
   ✅ profiles table exists
   ✅ RLS enabled
   ✅ 5 policies created
   ✅ is_admin() function exists
   ```

---

### Step 3: Verify the Fix

Run the diagnostic again:

```sql
-- Quick verification
SELECT 
  tablename, 
  relrowsecurity as rls_enabled,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'profiles') as policy_count
FROM pg_tables 
JOIN pg_class ON pg_tables.tablename = pg_class.relname
WHERE tablename = 'profiles';
```

**Expected result**:
- `tablename`: profiles
- `rls_enabled`: true
- `policy_count`: 5

---

### Step 4: Disable Email Confirmation

While you're in Supabase Dashboard:

1. Go to **Authentication** → **Providers**
2. Click **Email**
3. Find **"Enable email confirmations"**
4. **Turn it OFF**
5. Click **Save**

This makes signup instant (no email needed).

---

### Step 5: Test Signup

1. **Clear your browser's cache** (or use incognito mode)

2. Go to your app: http://localhost:5174/signup

3. Fill in the form:
   ```
   Name: Test User
   Email: newtest@test.com  (use a NEW email!)
   Password: test123
   Role: Worker
   ```

4. Click **Sign Up**

5. **Expected result**: ✅ Logged in immediately!

---

## If Signup Still Fails

### Check 1: Are you using a new email?

If you tried to sign up before, that email might be stuck in Supabase auth:

**Solution**: Use a completely different email OR delete the old user:

```sql
-- Delete test users (CAREFUL!)
DELETE FROM auth.users WHERE email LIKE '%test%';
```

### Check 2: Check browser console

Press F12 in your browser:
- Look for the full error message
- Look in **Network** tab for failed requests
- Look for the response body

### Check 3: Check Supabase logs

1. Go to Supabase Dashboard
2. Click **Logs** → **Postgres Logs**
3. Look for recent errors
4. Filter by "error" or "policy"

### Check 4: Restart dev server

Sometimes environment variables don't reload:

```bash
# Stop your dev server (Ctrl+C)
# Then restart:
npm run dev
```

---

## Common Issues & Solutions

### Issue: "Profile not found, signing out user"

**Cause**: Profile insert succeeded but SELECT policy is blocking it

**Solution**: Make sure you ran `COMPLETE_FIX_ALL_ISSUES.sql` which includes SELECT policy

### Issue: "unique constraint violation" on phone_number

**Cause**: Phone number already exists

**Solution**: Leave phone number blank or use a different one

### Issue: "role must be worker or provider"

**Cause**: Trying to create admin account through signup

**Solution**: Only worker/provider allowed. Create admin via SQL:

```sql
-- After signup, upgrade to admin:
UPDATE profiles 
SET role = 'admin' 
WHERE id = (SELECT id FROM auth.users WHERE email = 'your@email.com');
```

---

## Still Not Working?

### Nuclear Option: Reset Everything

⚠️ **WARNING**: This deletes ALL users and profiles!

```sql
-- Delete all profiles
TRUNCATE profiles CASCADE;

-- Delete all auth users (requires admin access)
-- You may need to do this in Supabase Dashboard → Authentication → Users
-- Click each user and delete manually
```

Then:
1. Run `COMPLETE_FIX_ALL_ISSUES.sql` again
2. Try signup with a fresh email

---

## Summary of What COMPLETE_FIX_ALL_ISSUES.sql Does

1. ✅ Creates `profiles` table with all columns
2. ✅ Creates indexes for performance
3. ✅ Creates `is_admin()` helper function
4. ✅ Enables RLS on profiles table
5. ✅ Creates 5 RLS policies:
   - `profiles_select_own` - Users can view their profile
   - `profiles_admin_select` - Admins can view all profiles
   - `profiles_insert_signup` - **Users can create profile** ← KEY!
   - `profiles_update_own` - Users can update their profile
   - `profiles_admin_update` - Admins can update any profile
6. ✅ Creates triggers for auto-updating timestamps
7. ✅ Verifies everything is set up correctly

---

## Checklist

Complete these in order:

- [ ] Run `DIAGNOSE_ISSUE.sql` to see what's wrong
- [ ] Run `COMPLETE_FIX_ALL_ISSUES.sql` to fix everything
- [ ] Verify you see all ✅ marks
- [ ] Disable email confirmation in Supabase
- [ ] Clear browser cache or use incognito
- [ ] Try signup with a NEW email address
- [ ] Check browser console for any remaining errors

---

## Success Criteria

You'll know it's working when:
1. ✅ No 406 errors in console
2. ✅ No 401 errors in console
3. ✅ "Failed to create profile" error is gone
4. ✅ You're logged in immediately after signup
5. ✅ You see your profile/dashboard

---

*If you're still stuck after all this, share the results of `DIAGNOSE_ISSUE.sql` and the browser console errors.*
