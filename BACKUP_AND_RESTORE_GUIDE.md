# Backup and Restore Guide

## Overview

This guide provides step-by-step procedures for backing up and restoring the Catering Union application database and related data. 

**CRITICAL SECURITY WARNING**: 
- ❌ NEVER commit database backups to public GitHub repositories
- ❌ NEVER include service-role keys, secrets, or API keys in version control
- ❌ NEVER share backup files containing user PII publicly
- ✅ Store backups locally or in secure, private cloud storage
- ✅ Encrypt backups containing sensitive data
- ✅ Use separate test projects for restore testing

## Free Tier Limitations

The Supabase free tier has the following backup-related limitations:

| Feature | Free Tier | Paid Tiers |
|---------|-----------|------------|
| **Automatic Daily Backups** | ❌ No | ✅ Yes (Pro+) |
| **Point-in-Time Recovery (PITR)** | ❌ No | ✅ Yes (Pro+) |
| **Manual Export** | ✅ Yes | ✅ Yes |
| **SQL Editor Access** | ✅ Yes | ✅ Yes |
| **API Access** | ✅ Yes | ✅ Yes |
| **Backup Retention** | N/A | 30 days (Pro) |

**Implication**: You MUST implement manual backup procedures. There are no automatic safety nets on free tier.

## Backup Strategy

### What to Back Up

1. **Database Schema** (migrations)
   - Already version-controlled in `supabase/migrations/`
   - No separate backup needed (use Git)

2. **Database Data** (actual records)
   - Tables: profiles, catering_jobs, job_confirmations, worker_attendance, location_sharing_sessions, deleted_jobs, reports, admin_audit_logs
   - Export via Supabase Dashboard or SQL dump
   - **Contains PII - store securely**

3. **Environment Configuration**
   - `.env` file (NEVER commit to repo)
   - Supabase project settings (manual documentation)

4. **Application Code**
   - Already version-controlled in Git
   - No separate backup needed

### Backup Frequency Recommendations

| Data Category | Frequency | Reason |
|---------------|-----------|--------|
| **Active Jobs** | Daily | High change rate, business critical |
| **Profiles** | Weekly | Moderate change rate |
| **Completed Jobs** | Weekly | Historical data, slower change |
| **Audit Logs** | Monthly | Compliance, grows slowly |
| **Schema (migrations)** | On every migration | Version controlled via Git |

## Manual Backup Procedures

### Method 1: Supabase Dashboard Export (Recommended for Small Datasets)

#### Step 1: Access SQL Editor
1. Log into Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Navigate to: **SQL Editor** (left sidebar)

#### Step 2: Export Table Data as CSV

For each table, run this query and download results:

```sql
-- Export profiles (exclude sensitive password hashes if exported)
SELECT 
  id, 
  email, 
  full_name, 
  phone_number, 
  role, 
  created_at, 
  updated_at
FROM profiles;
```

Click **"Download CSV"** button after query executes.

**Repeat for all tables**:
- `profiles`
- `catering_jobs`
- `job_confirmations`
- `worker_attendance`
- `location_sharing_sessions` (privacy-sensitive)
- `deleted_jobs`
- `reports`
- `admin_audit_logs`

**Storage**: Save CSVs in a secure, local directory (NOT in the Git repo).

#### Limitations of CSV Export
- ❌ Does not preserve JSONB structure (flattened)
- ❌ Timestamps may lose timezone info
- ❌ Foreign key relationships not preserved
- ✅ Good for quick data viewing/analysis
- ✅ Good for small tables

### Method 2: SQL Dump (Recommended for Complete Backups)

#### Step 1: Install PostgreSQL Tools

You need `pg_dump` command-line tool installed locally.

**Windows**: Download from https://www.postgresql.org/download/windows/  
**macOS**: `brew install postgresql`  
**Linux**: `sudo apt-get install postgresql-client`

#### Step 2: Get Connection Details

From Supabase Dashboard:
1. Go to **Settings > Database**
2. Find **Connection String** section
3. Copy the **Connection string** (URI format)

Example format:
```
postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
```

**Security Note**: This contains your database password. Never share or commit it.

#### Step 3: Create Full Database Dump

```bash
# Full schema + data dump
pg_dump "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" \
  --clean \
  --if-exists \
  --schema=public \
  --file=backup_$(date +%Y%m%d_%H%M%S).sql

# This creates: backup_20261101_143022.sql
```

**Flags Explained**:
- `--clean`: Include DROP statements for clean restore
- `--if-exists`: Use DROP IF EXISTS (safer)
- `--schema=public`: Only backup the public schema (exclude internal Supabase tables)
- `--file`: Output filename with timestamp

#### Step 4: Verify Backup

```bash
# Check file size (should be > 0 bytes)
ls -lh backup_*.sql

# Quick inspection (first 50 lines)
head -n 50 backup_20261101_143022.sql
```

You should see:
- `DROP TABLE IF EXISTS` statements
- `CREATE TABLE` statements
- `COPY` or `INSERT` statements with your data

#### Step 5: Secure Storage

```bash
# Create secure backup directory (outside Git repo)
mkdir -p ~/secure-backups/catering-union

# Move backup file
mv backup_*.sql ~/secure-backups/catering-union/

# Set restrictive permissions (Linux/macOS)
chmod 600 ~/secure-backups/catering-union/backup_*.sql
```

**Windows Users**: Store in a private directory, not in Desktop or Documents.

### Method 3: Automated Backup Script (Optional)

Create a backup script for recurring manual execution:

**`backup-database.sh`** (Linux/macOS):
```bash
#!/bin/bash
# Catering Union Database Backup Script
# Usage: ./backup-database.sh
# Requires: pg_dump, .env file with DATABASE_URL

set -e  # Exit on error

# Load environment variables (contains DATABASE_URL)
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
else
  echo "Error: .env file not found"
  exit 1
fi

# Configuration
BACKUP_DIR="$HOME/secure-backups/catering-union"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.sql"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Perform backup
echo "Starting backup at $(date)"
pg_dump "$DATABASE_URL" \
  --clean \
  --if-exists \
  --schema=public \
  --file="$BACKUP_FILE"

# Verify backup
if [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
  SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo "Backup successful: $BACKUP_FILE ($SIZE)"
  
  # Set restrictive permissions
  chmod 600 "$BACKUP_FILE"
  
  # Optional: Delete backups older than 30 days
  find "$BACKUP_DIR" -name "backup_*.sql" -mtime +30 -delete
  echo "Old backups (>30 days) deleted"
else
  echo "Error: Backup failed or file is empty"
  exit 1
fi

echo "Backup completed at $(date)"
```

**Make executable**:
```bash
chmod +x backup-database.sh
```

**Run manually**:
```bash
./backup-database.sh
```

**Windows Users**: Create a PowerShell script or use Windows Task Scheduler with similar logic.

## Restore Procedures

### CRITICAL: Test Restores in Separate Project

**NEVER restore directly to production without testing first**.

1. Create a new Supabase project (free tier allows multiple projects)
2. Name it: "Catering Union - Restore Test"
3. Test restore there first
4. Verify data integrity
5. Only then consider restoring to production (if needed)

### Method 1: Restore from SQL Dump (Full Database)

#### Step 1: Create Fresh Supabase Project for Testing

1. Go to: https://app.supabase.com
2. Click **"New Project"**
3. Name: "Catering Union - Restore Test"
4. Set database password (save it securely)
5. Wait for project provisioning (~2 minutes)

#### Step 2: Get Connection String

From new project:
1. **Settings > Database**
2. Copy **Connection String**
3. Replace `[YOUR-PASSWORD]` with your actual password

Example:
```
postgresql://postgres:TEST_PASSWORD@db.test-project-ref.supabase.co:5432/postgres
```

#### Step 3: Restore Database

```bash
# Restore from backup file
psql "postgresql://postgres:TEST_PASSWORD@db.test-project-ref.supabase.co:5432/postgres" \
  --file=backup_20261101_143022.sql

# This will:
# - Drop existing tables (if any)
# - Create schema from backup
# - Insert all data from backup
```

**Note**: You may see warnings about Supabase internal objects. This is normal and safe to ignore.

#### Step 4: Verify Restore

```sql
-- Check table counts match original
SELECT 'profiles' as table_name, COUNT(*) FROM profiles
UNION ALL
SELECT 'catering_jobs', COUNT(*) FROM catering_jobs
UNION ALL
SELECT 'job_confirmations', COUNT(*) FROM job_confirmations
UNION ALL
SELECT 'worker_attendance', COUNT(*) FROM worker_attendance
UNION ALL
SELECT 'reports', COUNT(*) FROM reports
UNION ALL
SELECT 'admin_audit_logs', COUNT(*) FROM admin_audit_logs;
```

Compare counts with your production database.

#### Step 5: Test Application Against Restored Database

1. Update `.env` file **temporarily** to point to test project:
   ```
   VITE_SUPABASE_URL=https://test-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=test_project_anon_key
   ```
2. Run application: `npm run dev`
3. Test critical flows:
   - Login as provider
   - View jobs
   - View confirmations
   - Check admin dashboard
4. Verify data accuracy (job titles, dates, names)

#### Step 6: If Testing Successful, Restore to Production (If Needed)

**Only do this if production data is corrupted or lost**:

```bash
# Restore to production database
psql "postgresql://postgres:PROD_PASSWORD@db.prod-project-ref.supabase.co:5432/postgres" \
  --file=backup_20261101_143022.sql
```

**WARNING**: This will **OVERWRITE** all current production data. Ensure this is your intent.

### Method 2: Restore from CSV (Partial Restore)

If you only need to restore specific tables or rows:

#### Step 1: Access SQL Editor in Target Project

1. Supabase Dashboard > SQL Editor
2. Select target project (test or production)

#### Step 2: Import CSV Data

**Option A: Manual INSERT** (small datasets)

```sql
-- Example: Restore a deleted profile
INSERT INTO profiles (id, email, full_name, phone_number, role, created_at)
VALUES 
  ('uuid-here', 'user@example.com', 'John Doe', '+1234567890', 'worker', '2026-01-15 10:30:00+00');
```

**Option B: CSV Import via Supabase Dashboard**

Unfortunately, Supabase Dashboard does not have a native CSV import feature. You must:

1. Convert CSV to SQL INSERT statements using a script, or
2. Use `psql` with `\copy` command:

```bash
# Connect to database
psql "postgresql://postgres:PASSWORD@db.project-ref.supabase.co:5432/postgres"

# Inside psql shell
\copy profiles(id, email, full_name, phone_number, role, created_at) FROM 'profiles_backup.csv' CSV HEADER;
```

### Method 3: Point-in-Time Recovery (PITR)

**NOT AVAILABLE on free tier**. Requires Pro plan or higher.

If you need PITR, consider upgrading to Supabase Pro ($25/month):
- Daily automated backups
- Point-in-time recovery to any second within 30 days
- No manual backup scripts needed

## Disaster Recovery Scenarios

### Scenario 1: Accidental Data Deletion (Recent)

**Symptom**: User accidentally deleted a job, record not in `deleted_jobs` table.

**Solution**:
1. Check `deleted_jobs` table for soft-deleted record
2. If found, use `restore_job()` function (30-day window)
3. If not found, restore from latest backup (if data loss is critical)
4. If backup not recent, data may be lost (free tier limitation)

**Prevention**: 
- Always use soft-delete, not hard delete
- Take daily backups of active data

### Scenario 2: Database Corruption

**Symptom**: Queries failing, data inconsistencies, foreign key violations.

**Solution**:
1. Identify scope of corruption (one table vs. entire database)
2. If localized: restore specific table from CSV/SQL dump
3. If widespread: full database restore from latest backup
4. Contact Supabase support (they may have internal backups)

**Prevention**:
- Regular backups (daily for critical data)
- Test restores monthly (verify backup integrity)

### Scenario 3: Supabase Project Accidentally Deleted

**Symptom**: Entire project is gone from Supabase Dashboard.

**Solution**:
1. **Immediate**: Contact Supabase support (they may recover within 24-48 hours)
2. **Parallel**: Create new project and restore from your latest backup
3. Update `.env` with new project credentials
4. Test thoroughly before switching production traffic

**Prevention**:
- Enable project deletion protection (Supabase Dashboard > Settings > General)
- Store backups outside of Supabase
- Keep `.env` files backed up securely

### Scenario 4: Migration Error

**Symptom**: Applied a migration that broke the database schema.

**Solution**:
1. **If caught immediately**: Rollback via SQL (reverse the migration manually)
2. **If data affected**: Restore from pre-migration backup
3. Fix migration SQL locally
4. Test in development project
5. Re-apply corrected migration

**Prevention**:
- Always backup before running migrations
- Test migrations in separate development project first
- Use database transactions where possible

## Backup Verification Checklist

Before considering a backup valid, verify:

- [ ] Backup file exists and is non-empty (`ls -lh backup.sql`)
- [ ] File size is reasonable (should be MB, not KB for real data)
- [ ] Can open file in text editor and see SQL statements
- [ ] Test restore in separate project succeeds
- [ ] Record counts match original database
- [ ] Sample data spot-check (check 5-10 records manually)
- [ ] RLS policies are preserved (test with non-admin user)
- [ ] Functions and triggers are preserved (`\df` in psql)

**Monthly Test**: Pick one backup file and perform full restore test to ensure backups are actually usable.

## Security Best Practices

### Backup Storage Security

1. **Never commit backups to Git**
   ```bash
   # Add to .gitignore
   echo "backup_*.sql" >> .gitignore
   echo "*.csv" >> .gitignore
   echo "secure-backups/" >> .gitignore
   ```

2. **Use encrypted storage** (for sensitive data)
   ```bash
   # Encrypt backup (Linux/macOS)
   gpg --symmetric --cipher-algo AES256 backup_20261101.sql
   # Creates: backup_20261101.sql.gpg
   
   # Decrypt when needed
   gpg --decrypt backup_20261101.sql.gpg > backup_20261101.sql
   ```

3. **Set restrictive file permissions**
   ```bash
   chmod 600 backup_*.sql  # Only owner can read/write
   ```

4. **Use separate database passwords for backups**
   - Create a read-only database user for backups
   - Never use service-role key for backup scripts

### Access Control

- Only admins should have access to backup files
- Store backups in admin-only accessible locations
- Never share backup files via email or messaging apps
- Use secure file transfer (SFTP, encrypted cloud storage) if needed

## Backup Retention Policy

| Backup Type | Retention Period | Storage Location |
|-------------|------------------|------------------|
| Daily backups | 7 days | Local secure directory |
| Weekly backups | 30 days | Local + encrypted cloud |
| Monthly backups | 6 months | Encrypted cloud storage |
| Migration backups | Indefinite | Version control (schema only) |

**Cleanup old backups**:
```bash
# Delete backups older than 30 days
find ~/secure-backups/catering-union -name "backup_*.sql" -mtime +30 -delete
```

## Related Documentation

- `DATA_RETENTION_POLICY.md` - Data lifecycle and cleanup procedures
- `supabase/migrations/` - Schema version control
- `MODULE_12_IMPLEMENTATION.md` - Implementation details for backup/recovery system

## Support Resources

- **Supabase Documentation**: https://supabase.com/docs/guides/platform/backups
- **PostgreSQL Backup Tools**: https://www.postgresql.org/docs/current/backup.html
- **Supabase Support**: https://supabase.com/support (for account/project issues)

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-11-01 | Initial backup and restore guide for Module 12 | Kiro AI Agent |
