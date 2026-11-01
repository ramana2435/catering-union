# 🚀 START HERE: Get Your App Working in 5 Minutes

You're getting errors while testing. Let's fix them quickly!

---

## Problem 1: ❌ "Failed to create account" (401 Error)

**What it means**: Database policies not set up yet

**Fix (3 minutes)**:

1. Open Supabase SQL Editor:
   ```
   https://supabase.com/dashboard/project/hvltowwtbyslgnfmhhcn
   ```

2. Copy and paste this file: **`FIX_SIGNUP_SIMPLE.sql`**

3. Click **Run**

4. ✅ Done! Try signup again.

---

## Problem 2: ❌ "Email rate limit exceeded"

**What it means**: Too many test emails sent

**Fix (2 minutes)**:

1. Open Supabase Dashboard (same link as above)

2. Go to: **Authentication → Providers → Email**

3. Find: **"Enable email confirmations"**

4. **Turn it OFF**

5. Click **Save**

6. ✅ Done! Signups are now instant, no emails needed.

---

## Test Your App Now!

After applying both fixes:

### Test 1: Create Worker Account

1. Go to: http://localhost:5174/signup
2. Fill in:
   - Name: `Test Worker`
   - Email: `worker@test.com`
   - Password: `test123`
   - Role: **Worker**
3. Click Sign Up
4. ✅ Should be logged in immediately!

### Test 2: Create Provider Account

1. Logout (if needed)
2. Go to signup again
3. Fill in:
   - Name: `Test Provider`
   - Email: `provider@test.com`
   - Password: `test123`
   - Role: **Provider**
4. Click Sign Up
5. ✅ Should be logged in immediately!

### Test 3: Login/Logout

1. Logout
2. Go to: http://localhost:5174/login
3. Login with: `worker@test.com` / `test123`
4. ✅ Should work instantly!

---

## Create Admin Account (Optional)

Admins must be created via SQL:

1. First, signup normally as worker or provider (through the app)
2. Then run this in Supabase SQL Editor:

```sql
-- Make yourself admin
UPDATE profiles 
SET role = 'admin' 
WHERE id = (
  SELECT id FROM auth.users 
  WHERE email = 'your-email@test.com'
);
```

Replace `your-email@test.com` with your actual email.

---

## Detailed Help

If you need more details:

| Issue | Read This File |
|-------|---------------|
| 401 signup error | `URGENT_FIX_README.md` |
| Email rate limits | `QUICK_FIX_EMAIL_LIMITS.md` |
| All email issues | `DISABLE_EMAIL_CONFIRMATION.md` |
| Deployment guide | `QUICK_DEPLOY.md` |

---

## Quick Checklist

Complete these steps in order:

- [ ] Fix 401 error: Run `FIX_SIGNUP_SIMPLE.sql` in Supabase
- [ ] Disable email confirmation in Supabase settings
- [ ] Test worker signup: `worker@test.com`
- [ ] Test provider signup: `provider@test.com`
- [ ] Test login/logout
- [ ] (Optional) Create admin account via SQL

---

## Summary

**Two fixes needed:**
1. ✅ Database policies → Run `FIX_SIGNUP_SIMPLE.sql`
2. ✅ Email limits → Disable email confirmation

**Total time:** 5 minutes

**Result:** Fast, easy signup and login for local testing! 🎉

---

## Still Having Issues?

If something doesn't work:

1. Check browser console for errors (F12)
2. Check Supabase logs: Dashboard → Logs
3. Make sure both fixes were applied
4. Try with a completely new email address

---

**Ready? Let's fix it! Start with Step 1: Run the SQL script.**
