# Supabase Database Documentation

This directory contains PostgreSQL database migrations, schema documentation, and test files for the Catering Union application.

## Directory Structure

```
supabase/
├── migrations/          # SQL migration files (numbered sequentially)
├── README.md           # This file - overview and setup instructions
└── SCHEMA.md           # Detailed schema documentation
```

## Migration System

### Migration Files

Migrations are numbered sequentially and should be applied in order:

1. **001_create_profiles.sql** - User profiles table with role-based access
2. **002_create_catering_jobs.sql** - Catering job postings with soft delete
3. **003_create_job_confirmations.sql** - Worker confirmations for jobs
4. **004_create_worker_attendance.sql** - Real-time attendance tracking
5. **005_create_location_sharing_sessions.sql** - Voluntary location sharing
6. **006_create_deleted_jobs.sql** - Soft delete recovery system
7. **007_create_reports.sql** - User reports for moderation
8. **008_create_admin_audit_logs.sql** - Immutable admin action audit trail
9. **009_create_functions_and_triggers.sql** - Database functions and triggers
10. **010_enable_rls.sql** - Enable Row Level Security framework
11. **011_create_indexes.sql** - Performance optimization indexes

### Applying Migrations

#### Method 1: Supabase CLI (Recommended)

```bash
# Apply all migrations to your remote Supabase project
supabase db push

# Apply migrations to local development database
supabase db reset
```

#### Method 2: SQL Editor (Manual)

1. Open your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy and paste each migration file's content in order
4. Execute each migration

#### Method 3: Direct PostgreSQL Connection

```bash
# Connect to your database
psql "postgresql://[USER]:[PASSWORD]@[HOST]:[PORT]/[DATABASE]"

# Run migrations in order
\i supabase/migrations/001_create_profiles.sql
\i supabase/migrations/002_create_catering_jobs.sql
# ... continue for all migrations
```

## Generating TypeScript Types

After applying migrations or making schema changes, regenerate TypeScript types:

```bash
# Generate types from your Supabase project
supabase gen types typescript --project-id [YOUR_PROJECT_ID] > src/types/database.types.ts

# Or from local database
supabase gen types typescript --local > src/types/database.types.ts
```

### Using Generated Types

```typescript
import { Database } from '@/types/database.types';
import { createClient } from '@supabase/supabase-js';

// Create typed client
const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Type-safe queries
const { data, error } = await supabase
  .from('catering_jobs')
  .select('*')
  .eq('status', 'open');
```

## Supabase Project Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Wait for provisioning (2-3 minutes)
4. Note your project URL and API keys

### 2. Configure Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**NEVER** commit your service role key or add it to `.env` files that might be tracked by git.

### 3. Link Local Project (Optional)

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref [YOUR_PROJECT_REF]
```

### 4. Apply Migrations

```bash
supabase db push
```

### 5. Enable Email Authentication

1. Go to Authentication → Providers in Supabase Dashboard
2. Enable Email provider
3. Configure email templates if needed

## Key Features

### Idempotent Migrations

All migrations use `IF NOT EXISTS` and `CREATE OR REPLACE` to ensure they can be run multiple times safely without errors.

### Soft Delete Pattern

The `catering_jobs` table uses soft deletes:
- Jobs are marked with `deleted_at` timestamp instead of being removed
- Complete job data is copied to `deleted_jobs` table for recovery
- Soft-deleted jobs are excluded from normal queries via `WHERE deleted_at IS NULL`

### Automatic Triggers

- **updated_at**: Automatically updates `updated_at` column on record changes
- **event_date validation**: Prevents creating jobs with past dates (INSERT only)
- **confirmed_workers count**: Auto-recalculates worker count and updates job status
- **location tracking**: Updates `last_updated_at` when location changes

### Row Level Security (RLS)

RLS is **enabled** on all tables via migration 010. This is a security requirement - RLS policies control data access at the database level, preventing unauthorized access even if the application code has bugs.

**Important**: RLS policies are defined in a separate feature (FEAT-002). After applying migration 010, tables will have RLS enabled but no policies, which means no data access until policies are added.

### Performance Indexes

Migration 011 creates 20+ indexes for common query patterns:
- User role and status filtering
- Job listings by date and status
- Worker confirmations and attendance
- Location sharing lookups
- Admin audit trails

## Database Functions

### update_updated_at_column()

Trigger function that automatically sets `updated_at = NOW()` on record updates.

### validate_event_date_on_insert()

Prevents creating jobs with event dates in the past. Only runs on INSERT (allows updates for corrections).

### update_confirmed_workers_count()

Recalculates the number of confirmed workers for a job and automatically sets status to 'full' when capacity is reached.

### soft_delete_job(job_id, deleted_by, reason, expires_days)

Performs soft delete by:
1. Creating a JSONB snapshot of the job data
2. Storing snapshot in `deleted_jobs` table
3. Marking original job with `deleted_at` timestamp

### log_admin_action(admin_id, action, target_type, target_id, details)

Manually logs admin actions to the audit trail. Verifies the user has admin role.

## Security Best Practices

1. **Never disable RLS** - Even during development, use appropriate policies instead
2. **Use anon key in frontend** - Never expose the service role key
3. **Validate on both sides** - Database constraints + frontend validation
4. **Audit admin actions** - Log all sensitive operations
5. **Respect privacy** - Location data requires explicit consent and has limited access

## Common Tasks

### Add New Migration

1. Create new file: `012_description.sql`
2. Write idempotent SQL using `IF NOT EXISTS`
3. Apply migration: `supabase db push`
4. Regenerate types: `supabase gen types typescript`
5. Commit both migration and updated types

### Rollback (Manual)

Migrations don't auto-rollback. To undo:
1. Write a new migration that reverses changes
2. Or drop/recreate tables (loses data!)

### Test RLS Policies

```sql
-- Switch to test user context
SET ROLE authenticated;
SET request.jwt.claim.sub TO 'user-uuid-here';

-- Test queries
SELECT * FROM profiles WHERE id = 'user-uuid-here';
```

## Troubleshooting

### Migration Fails

- Check PostgreSQL logs in Supabase Dashboard
- Verify previous migrations applied successfully
- Check for syntax errors using `psql` locally

### Type Generation Fails

- Ensure migrations are applied
- Check Supabase CLI is logged in: `supabase login`
- Verify project link: `supabase projects list`

### RLS Blocking All Access

- Check if policies exist: `SELECT * FROM pg_policies;`
- Verify you're using the correct authentication context
- Remember: migration 010 enables RLS but creates no policies

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Database Functions](https://supabase.com/docs/guides/database/functions)
