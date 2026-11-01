# Database Integration Layer

## Overview

This directory contains the database integration layer for the Catering Union application. The `database.ts` file provides type-safe query builders and helper functions for interacting with the Supabase PostgreSQL database.

All database operations respect Row Level Security (RLS) policies configured in Supabase, ensuring users can only access and modify data they are authorized for.

## Architecture

### Files

- **`supabase.ts`**: Exports the type-safe Supabase client with the `Database` generic
- **`database.ts`**: Helper functions and query builders for common database operations
- **`../types/database.types.ts`**: Auto-generated TypeScript types from Supabase schema

### Type Safety

The integration uses TypeScript generics to provide full type inference:

```typescript
// The Supabase client is typed with the Database schema
import { supabase } from './supabase'

// All queries have full type inference
const { data, error } = await supabase
  .from('profiles')  // TypeScript knows all tables
  .select('*')       // TypeScript knows all columns
  .eq('role', 'worker')  // TypeScript validates values
```

### Database Types vs Interface Types

**Database Types (snake_case)**: Direct mappings from PostgreSQL schema

```typescript
type Profile = Database['public']['Tables']['profiles']['Row']
// Fields: full_name, phone_number, profile_image_url, etc.
```

**Interface Types (camelCase)**: Frontend-friendly types matching React conventions

```typescript
interface AuthUser {
  fullName: string      // maps to full_name
  phoneNumber?: string  // maps to phone_number
  profileImageUrl?: string  // maps to profile_image_url
}
```

**Conversion**: Use provided helper functions to convert between formats:

```typescript
import { dbProfileToProfile, dbJobToCateringJob } from './database'

const dbProfile = await supabase.from('profiles').select('*').single()
const frontendProfile = dbProfileToProfile(dbProfile.data)
```

## Common Patterns

### Querying with RLS-Safe Filters

All query helpers respect RLS policies. You don't need to manually add `auth.uid()` checks:

```typescript
import { getCateringJobs, getCurrentUserProfile } from '@/lib/database'

// Get all jobs the current user can access (RLS enforced)
const jobs = await getCateringJobs({ status: 'open' })

// Get current user's profile (RLS ensures it's their own)
const profile = await getCurrentUserProfile()
```

### Handling Authenticated Context

Most operations require authentication. Always check for authenticated user:

```typescript
import { supabase } from '@/lib/supabase'

const { data: { user } } = await supabase.auth.getUser()

if (!user) {
  // Handle unauthenticated state
  return
}

// Proceed with authenticated operations
```

### Error Handling for Policy Violations

When RLS policies block an operation, Supabase returns an error:

```typescript
import { confirmJob } from '@/lib/database'

const confirmation = await confirmJob(jobId, workerId)

if (!confirmation) {
  // Could be: job doesn't exist, already confirmed, RLS policy blocked, etc.
  console.error('Unable to confirm job')
}
```

For more detailed error handling, use the Supabase client directly:

```typescript
const { data, error } = await supabase
  .from('job_confirmations')
  .insert({ job_id: jobId, worker_id: workerId })

if (error) {
  if (error.code === '42501') {
    // RLS policy violation
    alert('You do not have permission to perform this action')
  } else if (error.code === '23505') {
    // Unique constraint violation
    alert('You have already confirmed this job')
  }
}
```

## Regenerating Types

### Option 1: Using Supabase CLI (Recommended)

1. Install Supabase CLI globally:
   ```bash
   npm install -g supabase
   ```

2. Get your project reference ID from Supabase Dashboard:
   - Go to https://supabase.com/dashboard
   - Select your project
   - Go to Settings > General
   - Copy the "Reference ID"

3. Set environment variable and run the script:
   ```bash
   # Windows PowerShell
   $env:SUPABASE_PROJECT_REF="your-project-ref"
   npm run db:types
   
   # Windows CMD
   set SUPABASE_PROJECT_REF=your-project-ref
   npm run db:types
   
   # Linux/Mac
   export SUPABASE_PROJECT_REF=your-project-ref
   npm run db:types
   ```

4. Or run directly:
   ```bash
   supabase gen types typescript --project-ref your-project-ref > src/types/database.types.ts
   ```

### Option 2: Manual Export from Dashboard

1. Go to Supabase Dashboard > API Docs
2. Scroll to "TypeScript Types"
3. Click "Generate Types"
4. Copy the generated TypeScript code
5. Paste into `src/types/database.types.ts`

### When to Regenerate

Regenerate types whenever you:
- Add a new table
- Add/remove/modify columns
- Change column types
- Modify relationships

**Important**: Always commit the regenerated `database.types.ts` to git after schema changes.

## Snake Case vs CamelCase Conversion

### Why Both Exist

- **PostgreSQL convention**: Uses `snake_case` for column names
- **TypeScript/React convention**: Uses `camelCase` for properties
- **Solution**: Conversion helpers bridge the gap

### Conversion Helpers

```typescript
import { 
  dbProfileToProfile,
  dbJobToCateringJob,
  dbConfirmationToConfirmation,
  dbAttendanceToAttendance,
  dbLocationSessionToLocationSession,
  dbReportToReport,
  dbAuditLogToAuditLog
} from '@/lib/database'

// Example: Convert database row to frontend format
const { data: dbJob } = await supabase
  .from('catering_jobs')
  .select('*')
  .eq('id', jobId)
  .single()

const frontendJob = dbJobToCateringJob(dbJob)

// Now use camelCase properties
console.log(frontendJob.eventName)  // instead of event_name
console.log(frontendJob.requiredWorkers)  // instead of required_workers
```

### When to Use Which

- **Direct Supabase queries**: Use snake_case (database types)
- **React components and state**: Use camelCase (interface types)
- **API boundaries**: Convert at the boundary using helpers

## Code Examples

### Example 1: List Open Jobs

```typescript
import { getCateringJobs, dbJobToCateringJob } from '@/lib/database'

async function loadOpenJobs() {
  const jobs = await getCateringJobs({ 
    status: 'open',
    city: 'Mumbai' 
  })
  
  // Convert to frontend format
  const frontendJobs = jobs.map(dbJobToCateringJob)
  
  return frontendJobs
}
```

### Example 2: Confirm a Job

```typescript
import { confirmJob } from '@/lib/database'
import { supabase } from '@/lib/supabase'

async function handleJobConfirmation(jobId: string) {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    alert('Please log in to confirm jobs')
    return
  }
  
  const confirmation = await confirmJob(jobId, user.id)
  
  if (confirmation) {
    alert('Job confirmed successfully!')
  } else {
    alert('Unable to confirm job. It may be full or you may have already confirmed.')
  }
}
```

### Example 3: Share Location

```typescript
import { startLocationSharing, updateWorkerLocation } from '@/lib/database'
import { supabase } from '@/lib/supabase'

async function startTracking(jobId: string) {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return
  
  // Start 8-hour location sharing session
  const session = await startLocationSharing(jobId, user.id, 480)
  
  if (!session) {
    alert('Unable to start location sharing')
    return
  }
  
  // Update location every 30 seconds
  const intervalId = setInterval(async () => {
    navigator.geolocation.getCurrentPosition(async (position) => {
      await updateWorkerLocation(
        session.id,
        position.coords.latitude,
        position.coords.longitude
      )
    })
  }, 30000)
  
  return { session, intervalId }
}
```

### Example 4: Submit a Report

```typescript
import { submitJobReport } from '@/lib/database'
import { supabase } from '@/lib/supabase'

async function reportJob(jobId: string, reason: string, description: string) {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    alert('Please log in to submit a report')
    return
  }
  
  const report = await submitJobReport(user.id, jobId, reason, description)
  
  if (report) {
    alert('Report submitted successfully. Our team will review it.')
  } else {
    alert('Unable to submit report. Please try again.')
  }
}
```

### Example 5: Admin Actions

```typescript
import { logAdminAction } from '@/lib/database'
import { supabase } from '@/lib/supabase'

async function suspendUser(userId: string, reason: string, duration: string) {
  // Update user account status
  const { error } = await supabase
    .from('profiles')
    .update({ account_status: 'suspended' })
    .eq('id', userId)
  
  if (error) {
    alert('Unable to suspend user')
    return
  }
  
  // Log the admin action
  await logAdminAction('suspend_user', 'profile', userId, {
    reason,
    duration,
    timestamp: new Date().toISOString()
  })
  
  alert('User suspended successfully')
}
```

### Example 6: Update Worker Attendance

```typescript
import { updateAttendance } from '@/lib/database'
import { supabase } from '@/lib/supabase'

// Worker updates their own status
async function workerUpdateStatus(attendanceId: string, status: 'on_the_way' | 'arrived') {
  const attendance = await updateAttendance(attendanceId, status)
  
  if (attendance) {
    alert(`Status updated to: ${status}`)
  }
}

// Provider marks worker as present
async function providerMarkPresent(attendanceId: string) {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return
  
  const attendance = await updateAttendance(attendanceId, 'present', user.id)
  
  if (attendance) {
    alert('Worker marked as present')
  }
}
```

## RLS Policy Summary

Quick reference for which operations require which roles:

### Profiles Table

| Operation | Who Can Do It |
|-----------|---------------|
| SELECT (public fields) | All authenticated users |
| SELECT (full profile) | User (own profile only) |
| INSERT | User (on signup, role must be worker/provider) |
| UPDATE (name, phone, image) | User (own profile only) |
| UPDATE (role, account_status) | Admin only |

### Catering Jobs Table

| Operation | Who Can Do It |
|-----------|---------------|
| SELECT (open jobs) | All authenticated users |
| SELECT (own jobs) | Provider (created the job) |
| SELECT (confirmed jobs) | Worker (confirmed the job) |
| INSERT | Provider only (provider_id = auth.uid()) |
| UPDATE | Provider (own jobs only) |
| Soft DELETE | Provider (own jobs only) |

### Job Confirmations Table

| Operation | Who Can Do It |
|-----------|---------------|
| SELECT | Worker (own), Provider (for their jobs), Admin |
| INSERT | Worker (worker_id = auth.uid(), job must be open) |
| UPDATE | Worker (own confirmations), Provider (for their jobs) |
| DELETE | Worker (own confirmations, job not started) |

### Worker Attendance Table

| Operation | Who Can Do It |
|-----------|---------------|
| SELECT | Worker (own), Provider (for their jobs), Admin |
| INSERT | Provider (for confirmed workers on their jobs) |
| UPDATE | Worker (limited statuses), Provider (mark present/absent) |
| DELETE | Provider (for their jobs) |

### Location Sharing Sessions Table

| Operation | Who Can Do It |
|-----------|---------------|
| SELECT (own) | Worker (own sessions) |
| SELECT (job workers) | Provider (confirmed workers on their jobs, not expired) |
| INSERT | Worker (for jobs they confirmed) |
| UPDATE | Worker (own sessions only) |
| DELETE | Worker (own sessions only) |

**Privacy Note**: Expired location sessions (expires_at < NOW()) are not accessible via SELECT policies.

### Reports Table

| Operation | Who Can Do It |
|-----------|---------------|
| SELECT (own) | User (reports they submitted) |
| SELECT (all) | Admin only |
| INSERT | All authenticated users |
| UPDATE | Admin only (to change status) |
| DELETE | Admin only |

### Admin Audit Logs Table

| Operation | Who Can Do It |
|-----------|---------------|
| SELECT | Admin only |
| INSERT | Admin only (via log_admin_action function) |
| UPDATE | Nobody (immutable) |
| DELETE | Nobody (immutable) |

### Deleted Jobs Table

| Operation | Who Can Do It |
|-----------|---------------|
| SELECT | Provider (own deleted jobs), Admin |
| INSERT | Automatic via soft_delete_job() function |
| UPDATE | Admin only (adjust expiration) |
| DELETE | Admin only (cleanup/restore) |

## Best Practices

1. **Always use helper functions** instead of raw queries when available
2. **Convert at boundaries**: Use snake_case for database, camelCase for components
3. **Check authentication** before operations that modify data
4. **Handle errors gracefully**: RLS violations should not crash the app
5. **Regenerate types** after schema changes
6. **Test RLS policies** manually after creating or modifying them
7. **Never disable RLS** even temporarily for development
8. **Use type guards** (`isValidRole`, `isValidJobStatus`) to validate user input
9. **Log admin actions** for audit trail and compliance
10. **Respect location privacy**: Only access location data when authorized

## Troubleshooting

### "Permission denied for table" Error

This usually means an RLS policy is blocking the operation. Check:
1. Is the user authenticated?
2. Does the RLS policy allow this operation for this user?
3. Are you trying to access data from another user?

### "Foreign key violation" Error

You're trying to reference a record that doesn't exist. Check:
1. Does the referenced record exist?
2. Are you using the correct UUID?
3. Has the referenced record been soft-deleted?

### "Unique constraint violation" Error

You're trying to insert a duplicate record. Common cases:
1. Worker already confirmed the job
2. Duplicate profile creation

### Type Errors After Schema Changes

If you see TypeScript errors after changing the database schema:
1. Regenerate types: `npm run db:types`
2. Update interface types in `src/types/index.ts` if needed
3. Update conversion helpers in `database.ts` if needed
4. Run `npm run type-check` to verify

## Security Notes

- **Never expose the service role key** in frontend code
- All client operations use the **anon key** with RLS enforcement
- RLS policies are the **primary security mechanism**
- **Validate user input** before database operations
- **Audit sensitive operations** using admin_audit_logs
- **Location data is privacy-sensitive**: respect sharing preferences and expiration

## Further Reading

- [Supabase Row Level Security Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase TypeScript Support](https://supabase.com/docs/reference/javascript/typescript-support)
- [PostgreSQL RLS Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
