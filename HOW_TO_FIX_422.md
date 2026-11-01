# Fix 422 Error - Profile Creation Failing

## What's Happening

**Error 422** means the data your app is sending is being rejected by the database.

**Root cause**: The table's CHECK constraints or defaults are incompatible with what the app is sending.

---

## The Fix (One Script)

### Run This Script

**File**: `FINAL_FIX_422_ERROR.sql`

This script:
1. ✅ Fixes table constraints  
2. ✅ Sets proper defaults
3. ✅ Creates simple RLS policies
4. ✅ Tests that insert works
5. ✅ Verifies everything

### Steps

1. **Open Supabase SQL Editor**
   ```
   https://supabase.com/dashboard/project/hvltowwtbyslgnfmhhcn
   ```

2. **Copy entire contents** of `FINAL_FIX_422_ERROR.sql`

3. **Paste** into SQL Editor

4. **Click Run**

5. **Look for success messages**:
   ```
   ✅ SUCCESS: Test profile created!
   ✅ Test cleanup complete
   ✅ Database is configured
   ✅ Go to your app and try signup
   ```

---

## Then Test Signup

1. Go to: http://localhost:5174/signup
2. Fill in:
   - Name: `Test User`
   - Email: `newtest@test.com` (use NEW email!)
   - Password: `test123`
   - Role: Worker
3. Click Sign Up
4. ✅ **Should work!**

---

## What the 422 Error Means

| Error Code | Meaning | Our Fix |
|------------|---------|---------|
| 422 | Data validation failed | Relaxed constraints |
| 406 | Wrong data format | Fixed column types |
| 401 | Permission denied | Fixed RLS policies |

---

## If It Still Fails

### Option 1: Run Diagnostic

Run `TEST_PROFILE_INSERT.sql` to see exactly what's wrong.

### Option 2: Check Browser Console

1. Press F12
2. Go to **Network** tab
3. Find the failed request to `/profiles`
4. Click it
5. Look at **Payload** (what was sent)
6. Look at **Response** (error details)

### Option 3: Try Different Email

The old auth user might be stuck. Try:
- `freshtest@test.com`
- `worker999@test.com`
- Any completely new email

---

## What We Changed

### Before (Strict - Causing 422):
```sql
CHECK (account_status IN ('active', 'suspended', 'pending_verification'))
-- Problem: Rejects NULL, but app might send NULL
```

### After (Lenient - Allows signup):
```sql
-- Same constraint but with DEFAULT 'active'
-- So if app sends NULL, database uses 'active'
```

---

## Summary

**Problem**: 422 error = data rejected  
**Cause**: Table constraints too strict  
**Fix**: Run `FINAL_FIX_422_ERROR.sql`  
**Time**: 2 minutes  
**Result**: Signup works!

---

**Run the script now and test!** 🚀
