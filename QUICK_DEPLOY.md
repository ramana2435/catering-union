# Quick Deployment Reference Card

**⚡ Fast reference for deploying Catering Union to production**

For detailed instructions, see **MODULE_14_DEPLOYMENT_GUIDE.md**

---

## Prerequisites ✅

- [x] GitHub account (repository already created)
- [ ] Supabase account (project already exists: hvltowwtbyslgnfmhhcn)
- [ ] Cloudflare account (free)

---

## Step 1: Push to GitHub (5 minutes)

```bash
# Verify .env is NOT staged
git status | grep .env

# Stage all changes
git add .

# Double-check .env is excluded
git status | grep .env  # Should show nothing

# Commit
git commit -m "feat: prepare for production deployment

- Add Modules 4-13 implementation
- Add security review and testing infrastructure
- Add 47 automated tests (all passing)
- Add 22 database migrations with RLS
- Add deployment documentation
- Security: 8.5/10 rating, zero critical issues"

# Push
git push origin main
```

**Verify**: Visit https://github.com/ramana2435/catering-union

---

## Step 2: Supabase Setup (15-20 minutes)

⚠️ **IMPORTANT**: If you're testing locally and getting 401 errors during signup, you MUST apply these migrations first!

### 2.0 Quick Fix for Local Testing (If Signup Fails)

If signup is failing with 401 error, run this immediately:

1. Go to https://supabase.com/dashboard/project/hvltowwtbyslgnfmhhcn
2. Click **SQL Editor**
3. Open `FIX_SIGNUP_401_ERROR.sql` from your project
4. Copy entire contents and paste
5. Click **Run**
6. Look for success messages (✓ marks)
7. Test signup again - should work now!

See **URGENT_FIX_README.md** if you need detailed instructions.

### 2.1 Apply Database Migrations

1. Go to https://supabase.com/dashboard/project/hvltowwtbyslgnfmhhcn
2. Click **SQL Editor**
3. Apply migrations **in order** (001 → 022):

**Quick Apply - Copy/Paste All Migrations:**

Option A: Use combined migration file:
- Open `all_migrations_combined.sql` from your local repo
- Copy entire contents
- Paste into SQL Editor
- Click "Run"

Option B: Apply one by one:
- Open each migration file from `supabase/migrations/`
- Execute in order: 001, 002 (catering_jobs), 002 (atomic), 003 (confirmations), 003 (restore), 004-022
- Skip `012_create_rls_policies_profiles.sql` (use FIXED version only)

### 2.2 Verify RLS

```sql
-- Should return 8 rows, all with rowsecurity = true
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
  'profiles', 'catering_jobs', 'job_confirmations', 
  'worker_attendance', 'location_sharing_sessions', 
  'deleted_jobs', 'reports', 'admin_audit_logs'
);
```

### 2.3 Run Security Tests (Optional)

- Open `supabase/tests/security_tests.sql`
- Copy and paste into SQL Editor
- Run - should pass 51 tests

### 2.4 Configure Auth (Leave URLs blank for now)

1. Navigate to **Authentication → URL Configuration**
2. Note: We'll update this after Cloudflare deployment
3. Enable email confirmations: **Authentication → Providers → Email**

---

## Step 3: Cloudflare Pages (10 minutes)

### 3.1 Create Project

1. Go to https://dash.cloudflare.com
2. Click **Pages** → **Create a project**
3. Click **Connect to Git**
4. Authorize Cloudflare to access GitHub
5. Select repository: `ramana2435/catering-union`

### 3.2 Configure Build

**Build settings:**
```
Production branch: main
Build command: npm run build
Build output directory: dist
Root directory: (leave empty)
```

### 3.3 Add Environment Variables

Click **+ Add variable** for each:

| Variable | Value |
|----------|-------|
| `NODE_VERSION` | `18` |
| `VITE_SUPABASE_URL` | `https://hvltowwtbyslgnfmhhcn.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Get from Supabase Dashboard → Settings → API → anon public |

**Important**: Copy anon key from Supabase, NOT from your local .env

### 3.4 Deploy

1. Click **Save and Deploy**
2. Wait 2-5 minutes for build
3. Note your URL: `https://YOUR-PROJECT-NAME.pages.dev`
4. Click the URL to verify site loads

---

## Step 4: Update Supabase Auth URLs (2 minutes)

1. Copy your Cloudflare Pages URL
2. Go to Supabase Dashboard → **Authentication → URL Configuration**
3. Update:
   - **Site URL**: `https://YOUR-PROJECT-NAME.pages.dev`
   - **Redirect URLs**: `https://YOUR-PROJECT-NAME.pages.dev/**`
4. Click **Save**

---

## Step 5: Test! (10 minutes)

### Critical Tests:

**Test 1: Site loads**
- ✅ Homepage loads
- ✅ No console errors
- ✅ Can navigate to /login, /signup

**Test 2: Authentication**
- ✅ Sign up with real email
- ✅ Receive confirmation email
- ✅ Click confirmation link → redirects to site
- ✅ Log in with new account
- ✅ Log out

**Test 3: Database connection**
- ✅ After login, create profile
- ✅ View dashboard (should load data)

---

## Troubleshooting Quick Fixes

### Build fails on Cloudflare

**Solution**: Check environment variables are set correctly

### "Failed to fetch" errors

**Solution**: 
1. Verify Supabase anon key is correct in Cloudflare
2. Check Supabase project is not paused (visit dashboard)

### Page refresh returns 404

**Solution**: Verify `public/_redirects` file exists with content: `/* /index.html 200`

### Authentication redirect fails

**Solution**: Update Supabase redirect URLs to match Cloudflare URL

---

## You're Live! 🚀

**Live URL**: `https://YOUR-PROJECT-NAME.pages.dev`

### Next Steps:

1. Execute full manual testing: See `MANUAL_TESTING_CHECKLIST.md`
2. Monitor for first 24 hours:
   - Cloudflare Analytics
   - Supabase Logs
3. Share with beta users

---

## Environment Variables Reference

**Supabase Dashboard → Settings → API:**
- Project URL: `https://hvltowwtbyslgnfmhhcn.supabase.co`
- Anon key: `eyJhbGc...` (public, safe to use in frontend)
- Service role key: **NEVER use in frontend or Cloudflare**

**Cloudflare Pages → Settings → Environment variables:**
- Only set: `NODE_VERSION`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

---

## Cost: $0.00/month 💰

All services are free tier:
- ✅ GitHub: Free for public repos
- ✅ Supabase: Free tier (500 MB DB, 5 GB bandwidth)
- ✅ Cloudflare Pages: Free tier (unlimited requests)

**Monitor usage** to avoid hitting free tier limits:
- Supabase: Dashboard → Settings → Billing
- Cloudflare: Dashboard → Pages → Analytics

---

## Support

- **Detailed Guide**: `MODULE_14_DEPLOYMENT_GUIDE.md`
- **Migration Help**: `MIGRATION_VERIFICATION.md`
- **Security Info**: `SECURITY_REVIEW.md`
- **Testing**: `MANUAL_TESTING_CHECKLIST.md`

**Total Deployment Time**: ~30-45 minutes (first time)

---

*Last updated: November 1, 2026*
