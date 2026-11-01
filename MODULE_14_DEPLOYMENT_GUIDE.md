# MODULE 14: Free-Tier Deployment Guide

Complete deployment guide for **Catering Union** application to GitHub, Supabase (free tier), and Cloudflare Pages.

## 📋 Table of Contents

1. [Pre-Deployment Verification](#pre-deployment-verification)
2. [GitHub Setup](#github-setup)
3. [Supabase Production Setup](#supabase-production-setup)
4. [Cloudflare Pages Deployment](#cloudflare-pages-deployment)
5. [Post-Deployment Configuration](#post-deployment-configuration)
6. [Free-Tier Limitations](#free-tier-limitations)
7. [Troubleshooting](#troubleshooting)

---

## ✅ Pre-Deployment Verification

### Build Status (Completed)

All pre-deployment checks have passed:

| Check | Status | Details |
|-------|--------|---------|
| TypeScript | ✅ PASS | 0 errors |
| Unit Tests | ✅ PASS | 47/47 tests passing |
| Production Build | ✅ PASS | 573.75 KB bundle (154.32 KB gzipped) |
| No Secrets in Code | ✅ PASS | All secrets in `.env` only |
| `.gitignore` Configured | ✅ PASS | Excludes `.env`, `dist/`, `node_modules/` |
| Git History Clean | ✅ PASS | No `.env` files ever committed |

### Current Repository Status

- **Repository**: `https://github.com/ramana2435/catering-union.git`
- **Branch**: `main`
- **Status**: 2 commits ahead of origin + uncommitted changes
- **Security**: ✅ No secrets in tracked files

---

## 1. GitHub Setup

### Step 1.1: Review Uncommitted Changes

You have many Module implementation files and new features that need to be committed:

```bash
# Check what files will be committed
git status
```

**Files to commit:**
- Module documentation (MODULE_4-13, SECURITY_REVIEW.md, etc.)
- New components (admin/, attendance/, jobs/, LocationSharingToggle, etc.)
- Test infrastructure (src/lib/__tests__/, vitest.config.ts)
- New migrations (002-022)
- Utility files (errors.ts, admin.ts, i18n/)

### Step 1.2: Create Deployment Commit

⚠️ **IMPORTANT**: Verify `.env` is NOT staged before committing!

```bash
# Verify .env is ignored
git status | grep .env

# Stage all changes EXCEPT .env
git add .
git add src/
git add supabase/migrations/
git add *.md
git add vitest.config.ts
git add public/

# Double-check .env is not staged
git status | grep .env

# Create commit
git commit -m "feat: prepare for production deployment

- Add Modules 4-13 implementation (auth, jobs, tracking, admin, security audit)
- Add comprehensive security review and testing infrastructure
- Add 47 automated tests (all passing)
- Add 22 database migrations with RLS policies
- Add internationalization (English, Hindi, Telugu)
- Add offline detection and error handling
- Add manual testing checklist (200+ test cases)
- Add SPA redirect configuration for Cloudflare Pages
- Security: 8.5/10 rating, zero critical issues, approved for beta deployment"
```

### Step 1.3: Push to GitHub

```bash
# Push to remote
git push origin main

# Verify push succeeded
git log --oneline -1 origin/main
```

### Step 1.4: Verify Repository

Visit your GitHub repository and confirm:
- ✅ All files are present
- ✅ `.env` is **not** visible in the file list
- ✅ Only `.env.example` is present
- ✅ Latest commit shows on main branch

---

## 2. Supabase Production Setup

### Step 2.1: Verify Supabase Project

Your production Supabase project details:
- **Project URL**: `https://hvltowwtbyslgnfmhhcn.supabase.co`
- **Anon Key**: Available (not shown for security)

### Step 2.2: Database Migrations Checklist

These migrations must be applied **in order** to your production Supabase database:

| # | Migration File | Description | Critical |
|---|----------------|-------------|----------|
| 1 | `001_create_profiles.sql` | User profiles table | ✅ Yes |
| 2 | `002_create_catering_jobs.sql` | Jobs table | ✅ Yes |
| 3 | `002_atomic_worker_confirmation.sql` | Atomic booking RPC | ✅ Yes |
| 4 | `003_create_job_confirmations.sql` | Job confirmations | ✅ Yes |
| 5 | `003_add_restore_job_function.sql` | Restore deleted jobs | ⚠️ Depends on 006 |
| 6 | `004_create_worker_attendance.sql` | Attendance tracking | ✅ Yes |
| 7 | `005_create_location_sharing_sessions.sql` | Real-time location | ✅ Yes |
| 8 | `006_create_deleted_jobs.sql` | Soft delete archive | ✅ Yes |
| 9 | `007_create_reports.sql` | Provider reports | ✅ Yes |
| 10 | `008_create_admin_audit_logs.sql` | Immutable audit logs | ✅ Yes |
| 11 | `009_create_functions_and_triggers.sql` | Triggers and helpers | ✅ Yes |
| 12 | `010_enable_rls.sql` | Enable RLS on all tables | ✅ CRITICAL |
| 13 | `011_create_indexes.sql` | Performance indexes | ⚠️ Performance |
| 14 | `012_create_rls_policies_profiles_FIXED.sql` | Profile RLS (use FIXED version) | ✅ CRITICAL |
| 15 | `013_create_rls_policies_catering_jobs.sql` | Jobs RLS | ✅ CRITICAL |
| 16 | `014_create_rls_policies_job_confirmations.sql` | Confirmations RLS | ✅ CRITICAL |
| 17 | `015_create_rls_policies_worker_attendance.sql` | Attendance RLS | ✅ CRITICAL |
| 18 | `016_create_rls_policies_location_sharing.sql` | Location RLS | ✅ CRITICAL |
| 19 | `017_create_rls_policies_deleted_jobs.sql` | Deleted jobs RLS | ✅ CRITICAL |
| 20 | `018_create_rls_policies_reports.sql` | Reports RLS | ✅ CRITICAL |
| 21 | `019_create_rls_policies_audit_logs.sql` | Audit logs RLS | ✅ CRITICAL |
| 22 | `020_fix_profile_insert_policy.sql` | Profile insert fix | ✅ CRITICAL |
| 23 | `021_fix_rls_with_function.sql` | RLS helper function | ✅ CRITICAL |
| 24 | `022_data_retention_and_cleanup.sql` | Cleanup scheduler | ⚠️ Optional |

**Note**: Skip `012_create_rls_policies_profiles.sql` (the non-FIXED version) - use only the FIXED version.

### Step 2.3: Apply Migrations

**Option A: Manual Application (Recommended for First Deployment)**

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/hvltowwtbyslgnfmhhcn
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste each migration file **in order**
5. Execute each migration
6. Verify no errors appear
7. Check "Table Editor" to confirm tables are created

**Option B: Using Supabase CLI**

⚠️ This requires Supabase CLI to be installed and linked to your project:

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Link to your project
supabase link --project-ref hvltowwtbyslgnfmhhcn

# Push all migrations
supabase db push

# Verify migrations applied
supabase db remote-commit-status
```

### Step 2.4: Verify RLS is Enabled

After applying migrations, verify RLS protection:

1. Go to **Table Editor**
2. For each table, click the shield icon
3. Confirm "RLS Enabled" is checked
4. Confirm policies are listed

**Critical Tables to Verify:**
- ✅ `profiles` - 5 policies
- ✅ `catering_jobs` - 7 policies
- ✅ `job_confirmations` - 8 policies
- ✅ `worker_attendance` - 8 policies
- ✅ `location_sharing_sessions` - 6 policies
- ✅ `deleted_jobs` - 5 policies
- ✅ `reports` - 5 policies
- ✅ `admin_audit_logs` - 2 policies (READ ONLY, immutable)

### Step 2.5: Run Security Tests (Optional but Recommended)

Execute the SQL security test suite:

1. Open SQL Editor
2. Open file `supabase/tests/security_tests.sql` from your local repository
3. Copy entire contents
4. Paste into SQL Editor
5. Execute
6. Review results - all 51 tests should pass

### Step 2.6: Configure Authentication

Navigate to **Authentication → Settings**:

#### Email Templates
- ✅ Enable email confirmations
- ✅ Customize confirmation email template
- ✅ Customize password reset email template

#### Site URL Configuration
⚠️ **IMPORTANT**: You'll update this after getting your Cloudflare Pages URL

**Initial Configuration:**
```
Site URL: https://YOUR-PROJECT-NAME.pages.dev
```

**Redirect URLs (wildcards allowed):**
```
https://YOUR-PROJECT-NAME.pages.dev/**
```

**Leave as defaults for now** - we'll update after Cloudflare deployment.

#### Email Auth Settings
- ✅ Enable email provider
- ✅ Enable email confirmations
- ✅ Set confirmation link template: `{{ .SiteURL }}/auth/confirm?token={{ .Token }}&type=signup`
- ✅ Set password recovery template: `{{ .SiteURL }}/auth/reset-password?token={{ .Token }}`

### Step 2.7: Configure Rate Limiting

Navigate to **Settings → API**:

- Rate limiting: **100 requests per minute per IP** (adjust as needed)
- Enable CORS: ✅ Yes (for your frontend domain)

---

## 3. Cloudflare Pages Deployment

### Step 3.1: Prepare Build Configuration

Your app is already configured for Cloudflare Pages:

**Build Settings:**
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `/` (repository root)
- Node version: `18` or higher

**SPA Configuration:**
- ✅ `public/_redirects` file created (handles client-side routing)

### Step 3.2: Create Cloudflare Pages Project

1. **Sign in to Cloudflare Dashboard**: https://dash.cloudflare.com
2. Navigate to **Pages**
3. Click **Create a project**
4. Click **Connect to Git**

### Step 3.3: Connect GitHub Repository

1. Authorize Cloudflare to access your GitHub account
2. Select repository: `ramana2435/catering-union`
3. Click **Begin setup**

### Step 3.4: Configure Build Settings

**Build configuration:**
```
Production branch: main
Build command: npm run build
Build output directory: dist
Root directory: (leave empty or use /)
```

**Environment variables:**

⚠️ **CRITICAL**: Add these environment variables before first deployment!

| Variable Name | Value | Source |
|---------------|-------|--------|
| `NODE_VERSION` | `18` | Build requirement |
| `VITE_SUPABASE_URL` | `https://hvltowwtbyslgnfmhhcn.supabase.co` | From Supabase Dashboard → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | From Supabase Dashboard → Settings → API → anon public |

**How to add environment variables:**
1. In Cloudflare Pages setup, scroll to **Environment variables**
2. Click **+ Add variable**
3. Enter variable name
4. Enter value
5. Click **Production** scope
6. Repeat for all variables

### Step 3.5: Deploy

1. Click **Save and Deploy**
2. Wait for build to complete (2-5 minutes)
3. Monitor build logs for errors
4. Note your deployment URL: `https://YOUR-PROJECT-NAME.pages.dev`

### Step 3.6: Verify Deployment

Once deployed:

1. **Visit your live site**: `https://YOUR-PROJECT-NAME.pages.dev`
2. **Test critical paths:**
   - ✅ Homepage loads
   - ✅ Signup page accessible
   - ✅ Login page accessible
   - ✅ Console has no errors
   - ✅ Supabase connection works
3. **Test routing:**
   - ✅ Navigate to `/login`
   - ✅ Refresh page - should not 404
   - ✅ Direct navigation to `/signup` works

### Step 3.7: Custom Domain (Optional)

To use a custom domain:

1. Navigate to **Pages → Your Project → Custom domains**
2. Click **Set up a custom domain**
3. Enter your domain
4. Update DNS records as instructed by Cloudflare
5. Wait for DNS propagation (5 minutes to 48 hours)

---

## 4. Post-Deployment Configuration

### Step 4.1: Update Supabase Authentication URLs

⚠️ **CRITICAL**: After getting your Cloudflare Pages URL, update Supabase:

1. Copy your Cloudflare Pages URL: `https://YOUR-PROJECT-NAME.pages.dev`
2. Go to Supabase Dashboard → **Authentication → URL Configuration**
3. Update **Site URL**:
   ```
   https://YOUR-PROJECT-NAME.pages.dev
   ```
4. Update **Redirect URLs** (add both):
   ```
   https://YOUR-PROJECT-NAME.pages.dev/**
   https://YOUR-PROJECT-NAME.pages.dev/auth/callback
   ```
5. Click **Save**

### Step 4.2: Test Authentication Flow

1. Visit your live site
2. Click **Sign Up**
3. Create a test account with a real email address
4. Check email for confirmation link
5. Click confirmation link - should redirect to your site
6. Verify you can sign in

### Step 4.3: Test Password Reset

1. Click **Forgot Password**
2. Enter test email
3. Check email for reset link
4. Click reset link - should redirect to your site
5. Reset password
6. Verify new password works

### Step 4.4: Deploy Updates

To deploy updates in the future:

```bash
# Make changes locally
git add .
git commit -m "your change description"
git push origin main

# Cloudflare Pages will automatically detect the push and redeploy
# Watch deployment at: https://dash.cloudflare.com/pages
```

---

## 5. Free-Tier Limitations

### Supabase Free Tier

**Included:**
- ✅ 500 MB database storage
- ✅ 5 GB bandwidth per month
- ✅ 50,000 monthly active users (MAUs)
- ✅ 2 GB file storage
- ✅ 50 MB file upload limit
- ✅ Unlimited API requests
- ✅ Social OAuth providers (Google, Facebook, etc.)
- ✅ Row Level Security (RLS)
- ✅ Realtime (up to 200 concurrent connections)

**Limitations:**
- ⚠️ Project pauses after 1 week of inactivity (auto-resumes on next request)
- ⚠️ 2 free projects maximum per organization
- ⚠️ Daily database backups kept for 7 days only
- ⚠️ No point-in-time recovery
- ⚠️ 1 GB max database size before needing to upgrade

**Monitoring Usage:**
- Dashboard → **Settings → Billing**
- Monitor bandwidth, storage, and MAUs
- Set up email alerts for approaching limits

### Cloudflare Pages Free Tier

**Included:**
- ✅ Unlimited sites
- ✅ Unlimited requests
- ✅ Unlimited bandwidth
- ✅ 500 builds per month
- ✅ 1 concurrent build
- ✅ Free SSL certificate
- ✅ DDoS protection
- ✅ Global CDN (300+ cities)
- ✅ Automatic HTTPS
- ✅ Preview deployments for all branches

**Limitations:**
- ⚠️ 500 builds per month (usually sufficient for most projects)
- ⚠️ 1 concurrent build (subsequent pushes queue)
- ⚠️ 20,000 files per deployment
- ⚠️ 25 MB per file

**Monitoring Usage:**
- Dashboard → **Pages → Your Project → Analytics**

### GitHub Free Tier

**Included:**
- ✅ Unlimited public repositories
- ✅ 2,000 GitHub Actions minutes per month
- ✅ 500 MB GitHub Packages storage
- ✅ Community support

---

## 6. Troubleshooting

### Build Fails on Cloudflare Pages

**Problem**: Build command fails with TypeScript errors

**Solutions:**
```bash
# Locally verify build works
npm run build

# Check Node version matches
node --version  # Should be 18+

# Verify all dependencies are in package.json (not devDependencies that are needed)
# TypeScript and Vite should be in devDependencies
```

**Problem**: "Missing environment variables" error

**Solution:**
1. Go to Pages → Your Project → Settings → Environment variables
2. Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
3. Redeploy from Pages → Deployments → ⋯ → Retry deployment

### Page Refresh Returns 404

**Problem**: Direct navigation to `/login` or `/dashboard` returns 404

**Solution:**
- Verify `public/_redirects` file exists with content: `/* /index.html 200`
- Redeploy if file was missing

### 401 Error During Signup

**Problem**: Signup fails with "Failed to create account" and 401 error in console

**Root Cause**: RLS policies not applied to database

**Solutions:**
1. Apply migration `023_fix_profile_insert_rls.sql`:
   ```sql
   -- Copy contents of supabase/migrations/023_fix_profile_insert_rls.sql
   -- Paste into Supabase SQL Editor and run
   ```

2. Verify RLS is enabled:
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE tablename = 'profiles';
   ```

3. Check INSERT policy exists:
   ```sql
   SELECT policyname 
   FROM pg_policies 
   WHERE tablename = 'profiles' AND cmd = 'INSERT';
   ```

See **TROUBLESHOOT_401_ERROR.md** for detailed debugging steps.

### Authentication Doesn't Work

**Problem**: Sign up email never arrives

**Solutions:**
1. Check Supabase Dashboard → **Authentication → Logs**
2. Verify email provider is enabled
3. Check spam folder
4. Verify Site URL is correct in Supabase settings
5. Check redirect URLs match your Cloudflare Pages domain

**Problem**: "Invalid redirect URL" error

**Solution:**
1. Supabase Dashboard → Authentication → URL Configuration
2. Add your Cloudflare Pages URL to redirect URLs with `**` wildcard
3. Format: `https://your-project.pages.dev/**`

### Database Connection Fails

**Problem**: "Failed to fetch" or connection errors

**Solutions:**
1. Verify environment variables are correct
2. Check Supabase project is not paused (visit dashboard)
3. Verify API keys in Cloudflare Pages environment variables
4. Check browser console for CORS errors

**Problem**: "RLS policy violation" errors

**Solution:**
1. Verify all migrations were applied
2. Check RLS is enabled on tables
3. Review `SECURITY_REVIEW.md` for policy details
4. Test with SQL Editor to verify policies work

### Performance Issues

**Problem**: Slow initial page load

**Solutions:**
- Bundle size is 573 KB (acceptable for MVP)
- Consider code splitting for production optimization
- Enable Cloudflare caching
- Optimize images

**Problem**: Supabase connection is slow

**Solution:**
- Check Supabase region (should be close to users)
- Monitor Supabase Dashboard → **Performance**
- Add database indexes if needed (already included in migrations)

---

## 7. Deployment Checklist

### Pre-Deployment ✅
- [x] All tests passing (47/47)
- [x] Type-check passing (0 errors)
- [x] Build succeeds locally
- [x] No secrets in code
- [x] `.gitignore` configured
- [x] `.env.example` has placeholders only
- [x] `public/_redirects` created for SPA routing

### GitHub ⏳
- [ ] Uncommitted changes reviewed
- [ ] Deployment commit created
- [ ] Pushed to `origin/main`
- [ ] Repository verified on GitHub

### Supabase Production ⏳
- [ ] All 22 migrations applied in order
- [ ] RLS enabled and verified on all tables
- [ ] Security tests run (51 tests)
- [ ] Email authentication configured
- [ ] Site URL configured (after Cloudflare deployment)
- [ ] Redirect URLs configured (after Cloudflare deployment)
- [ ] Rate limiting configured

### Cloudflare Pages ⏳
- [ ] Project created
- [ ] GitHub repository connected
- [ ] Build settings configured
- [ ] Environment variables added:
  - [ ] `NODE_VERSION=18`
  - [ ] `VITE_SUPABASE_URL`
  - [ ] `VITE_SUPABASE_ANON_KEY`
- [ ] First deployment successful
- [ ] Live URL noted
- [ ] SPA routing verified (refresh works)

### Post-Deployment ⏳
- [ ] Supabase Site URL updated with Cloudflare URL
- [ ] Supabase redirect URLs updated
- [ ] Test authentication flow (signup, login, password reset)
- [ ] Test critical paths (job listing, booking, profile)
- [ ] Monitor initial traffic

---

## 8. Next Steps After Deployment

### Immediate (First 24 Hours)
1. Create test accounts (worker, provider, admin)
2. Execute manual testing checklist (`MANUAL_TESTING_CHECKLIST.md`)
3. Monitor Cloudflare Pages analytics
4. Monitor Supabase logs for errors
5. Set up error monitoring (optional: Sentry integration)

### Short-term (First Week)
1. Gather beta user feedback
2. Monitor Supabase usage (approaching free-tier limits?)
3. Review security audit logs
4. Fix any critical bugs
5. Optimize performance if needed

### Medium-term (First Month)
1. Implement medium-priority security items:
   - Complete password reset UI
   - Add GDPR compliance (account deletion, data export)
2. Consider adding monitoring/alerting
3. Plan for scale if approaching free-tier limits
4. Implement analytics

---

## 9. Support and Resources

### Documentation
- **Supabase Docs**: https://supabase.com/docs
- **Cloudflare Pages Docs**: https://developers.cloudflare.com/pages
- **Vite Docs**: https://vitejs.dev
- **React Router Docs**: https://reactrouter.com

### Project Documentation
- `SECURITY_REVIEW.md` - Comprehensive security audit
- `MANUAL_TESTING_CHECKLIST.md` - 200+ test cases
- `MODULE_13_AUDIT_REPORT.md` - Deployment readiness report
- `README.md` - Local development setup

### Community Support
- Supabase Discord: https://discord.supabase.com
- Cloudflare Discord: https://discord.cloudflare.com
- Stack Overflow: Tag questions with `supabase`, `cloudflare-pages`, `vite`

---

## 10. Security Reminders

⚠️ **NEVER commit these to Git:**
- `.env` files
- Service role keys (these bypass RLS!)
- User data exports
- Database backups with personal data
- API keys or tokens

✅ **Safe to commit:**
- `.env.example` (with placeholders)
- Public anon keys (they're designed to be public)
- Migration files
- Documentation

---

## Deployment Complete! 🚀

Once all checklist items are complete, your Catering Union application will be:

- ✅ Live on the internet
- ✅ Secured with RLS policies (8.5/10 security rating)
- ✅ Automatically backed up by Supabase
- ✅ Protected by Cloudflare CDN and DDoS protection
- ✅ Free to operate (within tier limits)
- ✅ Auto-deploying on every push to main

**Live URL**: `https://YOUR-PROJECT-NAME.pages.dev`

Monitor your deployment and enjoy your live application! 🎉
