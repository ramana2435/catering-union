# Database Schema Documentation

Complete reference for the Catering Union PostgreSQL database schema.

## Overview

The database consists of 8 main tables supporting a catering worker marketplace platform:

1. **profiles** - User accounts and role management
2. **catering_jobs** - Job postings by providers
3. **job_confirmations** - Worker applications/confirmations
4. **worker_attendance** - Real-time attendance tracking
5. **location_sharing_sessions** - Voluntary location sharing
6. **deleted_jobs** - Soft delete recovery system
7. **reports** - Community moderation reports
8. **admin_audit_logs** - Administrator action audit trail

## Entity Relationship Diagram

```
┌─────────────────┐
│   auth.users    │ (Supabase Auth)
│                 │
│  id (UUID)      │
└────────┬────────┘
         │
         │ 1:1
         │
┌────────▼────────┐
│    profiles     │
│                 │
│  id (PK, FK)    │
│  full_name      │
│  phone_number   │◄──────────┐
│  role           │           │ deleted_by
│  account_status │           │
└────┬───────┬────┘           │
     │       │                │
     │ 1:N   │ 1:N            │
     │       │                │
     │       │         ┌──────┴────────┐
     │       │         │ deleted_jobs  │
     │       │         │               │
     │       │         │  id (PK)      │
     │       │         │  original_job_id
     │       │         │  provider_id (FK)
     │       │         │  deleted_by (FK)
     │       │         │  job_snapshot (JSONB)
     │       │         └───────────────┘
     │       │
     │       │
┌────▼───────▼──────┐
│  catering_jobs    │
│                   │
│  id (PK)          │
│  provider_id (FK) │◄────────┐
│  event_name       │         │
│  event_date       │         │
│  required_workers │         │
│  confirmed_workers│         │
│  status           │         │
│  deleted_at       │         │ FK
└──────┬────────────┘         │
       │                      │
       │ 1:N                  │
       │                      │
┌──────▼──────────────┐   ┌───┴────────────┐
│ job_confirmations   │   │    reports     │
│                     │   │                │
│  id (PK)            │   │  id (PK)       │
│  job_id (FK)        │   │  reporter_id (FK)
│  worker_id (FK)     │   │  job_id (FK)   │
│  status             │   │  reason        │
└──────┬──────────────┘   │  status        │
       │                  └────────────────┘
       │ triggers
       │ confirmed_workers
       │ count update
       │
       │ 1:1
       │
┌──────▼──────────────┐
│ worker_attendance   │
│                     │
│  id (PK)            │
│  job_id (FK)        │
│  worker_id (FK)     │
│  attendance_status  │
│  arrival_time       │
└─────────────────────┘

┌─────────────────────────┐
│ location_sharing_       │
│       sessions          │
│                         │
│  id (PK)                │
│  job_id (FK)            │
│  worker_id (FK)         │
│  latitude               │
│  longitude              │
│  sharing_enabled        │
│  expires_at             │
└─────────────────────────┘

┌─────────────────────────┐
│  admin_audit_logs       │
│                         │
│  id (PK)                │
│  admin_id (FK)          │
│  action                 │
│  target_type            │
│  target_id              │
│  details (JSONB)        │
└─────────────────────────┘
```

## Tables

### 1. profiles

User profile information linked to Supabase Auth users.

#### Fields

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, FK → auth.users(id) | User's unique identifier from Supabase Auth |
| full_name | TEXT | NOT NULL | User's full name |
| phone_number | TEXT | UNIQUE (when not null) | Contact phone number |
| role | TEXT | NOT NULL, CHECK | User role: 'provider', 'worker', or 'admin' |
| preferred_language | TEXT | DEFAULT 'en' | UI language preference (e.g., 'en', 'hi', 'te') |
| profile_image_url | TEXT | - | URL to profile picture |
| account_status | TEXT | CHECK, DEFAULT 'active' | Account status: 'active', 'suspended', 'pending_verification' |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Account creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last profile update timestamp (auto-updated) |

#### Constraints

- **PK**: `id`
- **FK**: `id` → `auth.users(id)` ON DELETE CASCADE
- **CHECK**: `role IN ('provider', 'worker', 'admin')`
- **CHECK**: `account_status IN ('active', 'suspended', 'pending_verification')`
- **UNIQUE**: `phone_number` (when not null)

#### Indexes

- `idx_profiles_role` on `role`
- `idx_profiles_account_status` on `account_status`

#### Usage Examples

```sql
-- Get all active providers
SELECT * FROM profiles 
WHERE role = 'provider' 
  AND account_status = 'active';

-- Update user profile
UPDATE profiles 
SET full_name = 'Updated Name',
    phone_number = '+919876543210'
WHERE id = 'user-uuid';
```

---

### 2. catering_jobs

Catering job postings by providers. Supports soft delete pattern.

#### Fields

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Job's unique identifier |
| provider_id | UUID | NOT NULL, FK → profiles(id) | Provider who posted the job |
| event_name | TEXT | NOT NULL | Name of the catering event |
| event_type | TEXT | - | Type of event (wedding, corporate, etc.) |
| event_date | DATE | NOT NULL | Date of the event (validated on INSERT) |
| start_time | TIME | - | Event start time |
| end_time | TIME | - | Event end time |
| required_workers | INTEGER | NOT NULL, CHECK > 0 | Number of workers needed |
| confirmed_workers | INTEGER | DEFAULT 0, CHECK >= 0 | Current confirmed count (auto-updated by trigger) |
| address | TEXT | NOT NULL | Full event address |
| area | TEXT | - | Area/neighborhood |
| city | TEXT | - | City name |
| district | TEXT | - | District name |
| latitude | DOUBLE PRECISION | - | Location latitude |
| longitude | DOUBLE PRECISION | - | Location longitude |
| google_maps_url | TEXT | - | Google Maps link |
| description | TEXT | - | Detailed job description |
| contact_person | TEXT | - | On-site contact person |
| contact_number | TEXT | - | Contact phone number |
| image_url | TEXT | - | Event or venue image |
| status | TEXT | DEFAULT 'open', CHECK | Job status: 'open', 'full', 'completed', 'cancelled' |
| deleted_at | TIMESTAMPTZ | - | Soft delete timestamp (null = not deleted) |
| deleted_by | UUID | FK → profiles(id) | User who deleted the job |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Job creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp (auto-updated) |

#### Constraints

- **PK**: `id`
- **FK**: `provider_id` → `profiles(id)` ON DELETE CASCADE
- **FK**: `deleted_by` → `profiles(id)` ON DELETE SET NULL
- **CHECK**: `required_workers > 0`
- **CHECK**: `confirmed_workers >= 0`
- **CHECK**: `confirmed_workers <= required_workers`
- **CHECK**: `status IN ('open', 'full', 'completed', 'cancelled')`

#### Triggers

- **validate_event_date_on_insert**: Prevents creating jobs with past event dates (INSERT only)
- **trigger_catering_jobs_updated_at**: Auto-updates `updated_at` on changes

#### Indexes

- `idx_catering_jobs_provider_status` on `(provider_id, status)`
- `idx_catering_jobs_event_date` on `event_date` WHERE `deleted_at IS NULL`
- `idx_catering_jobs_status` on `status` WHERE `deleted_at IS NULL`
- `idx_catering_jobs_open_by_date` on `(event_date, created_at)` WHERE `status = 'open' AND deleted_at IS NULL`
- `idx_catering_jobs_provider_active` on `(provider_id, event_date)` WHERE `deleted_at IS NULL`

#### Soft Delete Pattern

Jobs are **never** hard deleted. Instead:

1. `deleted_at` is set to current timestamp
2. `deleted_by` records who deleted it
3. Complete job data is copied to `deleted_jobs` table as JSONB snapshot
4. Normal queries exclude deleted jobs using `WHERE deleted_at IS NULL`

**Why soft delete?**
- Preserves audit trail and historical data
- Enables recovery of accidentally deleted jobs
- Maintains referential integrity with confirmations and attendance
- Allows compliance with data retention policies

#### Usage Examples

```sql
-- Get all open jobs for workers (excludes soft-deleted)
SELECT * FROM catering_jobs
WHERE status = 'open'
  AND deleted_at IS NULL
  AND event_date >= CURRENT_DATE
ORDER BY event_date ASC;

-- Provider's active jobs
SELECT * FROM catering_jobs
WHERE provider_id = 'provider-uuid'
  AND deleted_at IS NULL
ORDER BY event_date DESC;

-- Soft delete a job (use the function)
SELECT soft_delete_job(
  'job-uuid',
  'user-uuid',
  'Event cancelled by venue',
  30  -- expires in 30 days
);
```

---

### 3. job_confirmations

Worker confirmations/applications for catering jobs.

#### Fields

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Confirmation's unique identifier |
| job_id | UUID | NOT NULL, FK → catering_jobs(id) | Job being confirmed |
| worker_id | UUID | NOT NULL, FK → profiles(id) | Worker confirming |
| status | TEXT | DEFAULT 'confirmed' | Confirmation status |
| confirmed_at | TIMESTAMPTZ | DEFAULT NOW() | When worker confirmed |
| cancelled_at | TIMESTAMPTZ | - | When confirmation was cancelled |

#### Constraints

- **PK**: `id`
- **FK**: `job_id` → `catering_jobs(id)` ON DELETE CASCADE
- **FK**: `worker_id` → `profiles(id)` ON DELETE CASCADE
- **UNIQUE**: `(job_id, worker_id)` - prevents duplicate confirmations

#### Triggers

- **update_confirmed_workers_count**: Recalculates `catering_jobs.confirmed_workers` and auto-sets status to 'full'

#### Indexes

- `idx_job_confirmations_job_id` on `job_id`
- `idx_job_confirmations_worker_id` on `worker_id`
- `idx_job_confirmations_job_status` on `(job_id, status)`
- `idx_job_confirmations_worker_status` on `(worker_id, status)`
- `idx_job_confirmations_confirmed` on `job_id` WHERE `status = 'confirmed'`

#### Trigger Behavior

When a confirmation is INSERT/UPDATE/DELETE, the `update_confirmed_workers_count()` trigger:

1. Counts all confirmations with `status = 'confirmed'` for the job
2. Updates `catering_jobs.confirmed_workers` with the count
3. If count >= `required_workers`, sets `catering_jobs.status = 'full'`
4. If count < `required_workers` and status was 'full', sets it back to 'open'

This ensures the job status and worker count are always in sync.

#### Usage Examples

```sql
-- Worker confirms a job
INSERT INTO job_confirmations (job_id, worker_id)
VALUES ('job-uuid', 'worker-uuid');
-- Trigger automatically updates catering_jobs.confirmed_workers

-- Get all confirmed workers for a job
SELECT 
  p.full_name,
  p.phone_number,
  jc.confirmed_at
FROM job_confirmations jc
JOIN profiles p ON p.id = jc.worker_id
WHERE jc.job_id = 'job-uuid'
  AND jc.status = 'confirmed';

-- Worker cancels confirmation
UPDATE job_confirmations
SET 
  status = 'cancelled',
  cancelled_at = NOW()
WHERE job_id = 'job-uuid'
  AND worker_id = 'worker-uuid';
-- Trigger automatically decrements confirmed_workers count
```

---

### 4. worker_attendance

Real-time attendance and arrival tracking for confirmed workers.

#### Fields

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Attendance record identifier |
| job_id | UUID | NOT NULL, FK → catering_jobs(id) | Job reference |
| worker_id | UUID | NOT NULL, FK → profiles(id) | Worker reference |
| attendance_status | TEXT | DEFAULT 'confirmed', CHECK | Current attendance status |
| arrival_time | TIMESTAMPTZ | - | When worker arrived at location |
| marked_by | UUID | FK → profiles(id) | Who last updated the status |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp (auto-updated) |

#### Constraints

- **PK**: `id`
- **FK**: `job_id` → `catering_jobs(id)` ON DELETE CASCADE
- **FK**: `worker_id` → `profiles(id)` ON DELETE CASCADE
- **FK**: `marked_by` → `profiles(id)` ON DELETE SET NULL
- **CHECK**: `attendance_status IN ('confirmed', 'getting_ready', 'on_the_way', 'arrived', 'present', 'absent', 'cancelled')`

#### Indexes

- `idx_worker_attendance_job_worker` on `(job_id, worker_id)`
- `idx_worker_attendance_status` on `attendance_status`
- `idx_worker_attendance_job_status` on `(job_id, attendance_status)`

#### Status Flow

```
confirmed → getting_ready → on_the_way → arrived → present
          ↘                                      ↘
            cancelled                             absent
```

- **confirmed**: Worker confirmed, hasn't started preparing
- **getting_ready**: Worker is preparing to leave
- **on_the_way**: Worker is traveling to location
- **arrived**: Worker has arrived at location
- **present**: Worker is checked in and working
- **absent**: Worker didn't show up
- **cancelled**: Worker cancelled their attendance

#### Usage Examples

```sql
-- Update worker status to "on the way"
UPDATE worker_attendance
SET 
  attendance_status = 'on_the_way',
  marked_by = 'worker-uuid'
WHERE job_id = 'job-uuid'
  AND worker_id = 'worker-uuid';

-- Mark worker as arrived
UPDATE worker_attendance
SET 
  attendance_status = 'arrived',
  arrival_time = NOW(),
  marked_by = 'provider-uuid'
WHERE job_id = 'job-uuid'
  AND worker_id = 'worker-uuid';

-- Get attendance overview for a job
SELECT 
  p.full_name,
  wa.attendance_status,
  wa.arrival_time,
  wa.updated_at
FROM worker_attendance wa
JOIN profiles p ON p.id = wa.worker_id
WHERE wa.job_id = 'job-uuid'
ORDER BY wa.attendance_status, p.full_name;
```

---

### 5. location_sharing_sessions

Temporary voluntary location sharing by workers.

#### Fields

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Session identifier |
| job_id | UUID | NOT NULL, FK → catering_jobs(id) | Job reference |
| worker_id | UUID | NOT NULL, FK → profiles(id) | Worker sharing location |
| latitude | DOUBLE PRECISION | - | Current latitude |
| longitude | DOUBLE PRECISION | - | Current longitude |
| sharing_enabled | BOOLEAN | DEFAULT TRUE | Whether sharing is currently enabled |
| started_at | TIMESTAMPTZ | DEFAULT NOW() | When sharing session started |
| expires_at | TIMESTAMPTZ | - | When session expires (null = no expiration) |
| last_updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last location update timestamp |

#### Constraints

- **PK**: `id`
- **FK**: `job_id` → `catering_jobs(id)` ON DELETE CASCADE
- **FK**: `worker_id` → `profiles(id)` ON DELETE CASCADE

#### Indexes

- `idx_location_sessions_job_worker` on `(job_id, worker_id)`
- `idx_location_sessions_worker` on `worker_id`
- `idx_location_sessions_active` on `(job_id, worker_id, expires_at)`
- `idx_location_sessions_enabled` on `(job_id, sharing_enabled)` WHERE `sharing_enabled = TRUE AND (expires_at IS NULL OR expires_at > NOW())`

#### Privacy Considerations

- Location sharing is **voluntary** - workers must explicitly enable it
- Workers can **disable sharing** at any time by setting `sharing_enabled = FALSE`
- Sessions can **expire** - after expiration, data should not be accessible
- **RLS policies** restrict access to:
  - Worker themselves
  - Provider of the specific job
  - Authorized administrators only
- Location data should **never** be publicly readable or accessible to other workers

#### Usage Examples

```sql
-- Worker starts sharing location for a job
INSERT INTO location_sharing_sessions (
  job_id,
  worker_id,
  latitude,
  longitude,
  expires_at
) VALUES (
  'job-uuid',
  'worker-uuid',
  17.3850,
  78.4867,
  NOW() + INTERVAL '4 hours'
);

-- Update worker's current location
UPDATE location_sharing_sessions
SET 
  latitude = 17.3900,
  longitude = 78.4900,
  last_updated_at = NOW()
WHERE job_id = 'job-uuid'
  AND worker_id = 'worker-uuid'
  AND sharing_enabled = TRUE;

-- Worker disables location sharing
UPDATE location_sharing_sessions
SET sharing_enabled = FALSE
WHERE job_id = 'job-uuid'
  AND worker_id = 'worker-uuid';

-- Provider views active location shares for their job
SELECT 
  p.full_name,
  lss.latitude,
  lss.longitude,
  lss.last_updated_at,
  AGE(NOW(), lss.last_updated_at) as staleness
FROM location_sharing_sessions lss
JOIN profiles p ON p.id = lss.worker_id
WHERE lss.job_id = 'job-uuid'
  AND lss.sharing_enabled = TRUE
  AND (lss.expires_at IS NULL OR lss.expires_at > NOW());
```

---

### 6. deleted_jobs

Recovery system for soft-deleted catering jobs.

#### Fields

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Deleted job record identifier |
| original_job_id | UUID | NOT NULL | Original job's UUID |
| provider_id | UUID | NOT NULL, FK → profiles(id) | Provider who owned the job |
| deleted_by | UUID | NOT NULL, FK → profiles(id) | User who deleted it |
| deleted_at | TIMESTAMPTZ | DEFAULT NOW() | When job was deleted |
| expires_at | TIMESTAMPTZ | - | When this record expires (null = never) |
| deletion_reason | TEXT | - | Optional reason for deletion |
| job_snapshot | JSONB | NOT NULL | Complete job data as JSON |

#### Constraints

- **PK**: `id`
- **FK**: `provider_id` → `profiles(id)` ON DELETE CASCADE
- **FK**: `deleted_by` → `profiles(id)` ON DELETE SET NULL

#### Indexes

- `idx_deleted_jobs_original_id` on `original_job_id`
- `idx_deleted_jobs_provider` on `provider_id`
- `idx_deleted_jobs_expires_at` on `expires_at`
- `idx_deleted_jobs_recoverable` on `(provider_id, deleted_at)` WHERE `expires_at IS NULL OR expires_at > NOW()`

#### job_snapshot Structure

The `job_snapshot` JSONB column contains the complete row data from `catering_jobs` at deletion time:

```json
{
  "id": "uuid",
  "provider_id": "uuid",
  "event_name": "Wedding Reception",
  "event_date": "2024-06-15",
  "required_workers": 10,
  "confirmed_workers": 7,
  "status": "open",
  "address": "123 Main St",
  ...
}
```

#### Usage Examples

```sql
-- Soft delete a job (using the function)
SELECT soft_delete_job(
  p_job_id := 'job-uuid',
  p_deleted_by := 'user-uuid',
  p_deletion_reason := 'Event cancelled by client',
  p_expires_days := 30
);

-- View provider's deleted jobs
SELECT 
  dj.original_job_id,
  dj.job_snapshot->>'event_name' as event_name,
  (dj.job_snapshot->>'event_date')::date as event_date,
  dj.deleted_at,
  dj.deletion_reason
FROM deleted_jobs dj
WHERE dj.provider_id = 'provider-uuid'
  AND (dj.expires_at IS NULL OR dj.expires_at > NOW())
ORDER BY dj.deleted_at DESC;

-- Restore a deleted job (manual recovery)
INSERT INTO catering_jobs
SELECT (job_snapshot->>'id')::uuid as id,
       (job_snapshot->>'provider_id')::uuid as provider_id,
       job_snapshot->>'event_name' as event_name,
       -- ... map all fields from JSONB
       NULL as deleted_at,  -- Clear soft delete flag
       NULL as deleted_by
FROM deleted_jobs
WHERE original_job_id = 'job-uuid';
```

---

### 7. reports

User reports about inappropriate or fake catering job posts.

#### Fields

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Report identifier |
| reporter_id | UUID | NOT NULL, FK → profiles(id) | User who filed the report |
| job_id | UUID | NOT NULL, FK → catering_jobs(id) | Job being reported |
| reason | TEXT | NOT NULL | Primary reason category |
| description | TEXT | - | Detailed explanation |
| status | TEXT | DEFAULT 'pending', CHECK | Review status |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | When report was filed |

#### Constraints

- **PK**: `id`
- **FK**: `reporter_id` → `profiles(id)` ON DELETE CASCADE
- **FK**: `job_id` → `catering_jobs(id)` ON DELETE CASCADE
- **CHECK**: `status IN ('pending', 'reviewed', 'resolved', 'dismissed')`

#### Indexes

- `idx_reports_job_id` on `job_id`
- `idx_reports_reporter` on `reporter_id`
- `idx_reports_status_created` on `(status, created_at)`
- `idx_reports_pending` on `created_at DESC` WHERE `status = 'pending'`

#### Report Statuses

- **pending**: New report awaiting admin review
- **reviewed**: Admin has viewed the report
- **resolved**: Admin took action (e.g., removed job, warned provider)
- **dismissed**: Report determined to be invalid or not actionable

#### Usage Examples

```sql
-- User reports a job
INSERT INTO reports (reporter_id, job_id, reason, description)
VALUES (
  'reporter-uuid',
  'job-uuid',
  'Fake job posting',
  'This job has unrealistic pay and I think it is a scam'
);

-- Admin views pending reports queue
SELECT 
  r.id,
  r.reason,
  r.description,
  r.created_at,
  reporter.full_name as reporter_name,
  cj.event_name,
  provider.full_name as provider_name
FROM reports r
JOIN profiles reporter ON reporter.id = r.reporter_id
JOIN catering_jobs cj ON cj.id = r.job_id
JOIN profiles provider ON provider.id = cj.provider_id
WHERE r.status = 'pending'
ORDER BY r.created_at ASC;

-- Admin resolves report
UPDATE reports
SET status = 'resolved'
WHERE id = 'report-uuid';
```

---

### 8. admin_audit_logs

Immutable audit trail of administrator actions.

#### Fields

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Audit log entry identifier |
| admin_id | UUID | FK → profiles(id) | Admin who performed the action |
| action | TEXT | NOT NULL | Action type/description |
| target_type | TEXT | - | Entity type affected (e.g., 'profile', 'catering_job') |
| target_id | UUID | - | UUID of affected entity |
| details | JSONB | - | Additional context as JSON |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | When action occurred |

#### Constraints

- **PK**: `id`
- **FK**: `admin_id` → `profiles(id)` ON DELETE SET NULL

**Note**: No `updated_at` column - audit logs are immutable.

#### Indexes

- `idx_admin_audit_logs_admin_created` on `(admin_id, created_at)`
- `idx_admin_audit_logs_target` on `(target_type, target_id)`
- `idx_admin_audit_logs_created` on `created_at`
- `idx_admin_audit_logs_recent` on `created_at DESC`
- `idx_admin_audit_logs_action` on `(action, created_at DESC)`

#### Common Actions

- `suspend_user` - Suspended a user account
- `activate_user` - Reactivated a user account
- `delete_job` - Removed a job posting
- `resolve_report` - Resolved a user report
- `grant_admin` - Granted admin privileges
- `revoke_admin` - Revoked admin privileges

#### Usage Examples

```sql
-- Manually log an admin action
SELECT log_admin_action(
  p_admin_id := 'admin-uuid',
  p_action := 'suspend_user',
  p_target_type := 'profile',
  p_target_id := 'user-uuid',
  p_details := '{"reason": "Repeated policy violations", "duration": "30 days"}'::jsonb
);

-- View admin activity timeline
SELECT 
  a.action,
  a.target_type,
  a.created_at,
  admin.full_name as admin_name,
  a.details
FROM admin_audit_logs a
JOIN profiles admin ON admin.id = a.admin_id
WHERE a.admin_id = 'admin-uuid'
ORDER BY a.created_at DESC
LIMIT 50;

-- View all actions on a specific entity
SELECT 
  a.action,
  a.created_at,
  admin.full_name as admin_name,
  a.details
FROM admin_audit_logs a
LEFT JOIN profiles admin ON admin.id = a.admin_id
WHERE a.target_type = 'profile'
  AND a.target_id = 'user-uuid'
ORDER BY a.created_at DESC;
```

---

## Database Functions Reference

### update_updated_at_column()

**Type**: Trigger Function  
**Returns**: TRIGGER

Automatically sets `NEW.updated_at = NOW()` on record updates.

**Attached to**:
- profiles (BEFORE UPDATE)
- catering_jobs (BEFORE UPDATE)
- worker_attendance (BEFORE UPDATE)

---

### validate_event_date_on_insert()

**Type**: Trigger Function  
**Returns**: TRIGGER

Prevents creating catering jobs with past event dates. Only runs on INSERT operations to allow updating existing jobs for corrections.

**Attached to**:
- catering_jobs (BEFORE INSERT)

**Raises Exception**: When `event_date < CURRENT_DATE`

---

### update_confirmed_workers_count()

**Type**: Trigger Function  
**Returns**: TRIGGER

Automatically recalculates the `confirmed_workers` count for a catering job and updates the job status:
- Sets status to 'full' when `confirmed_workers >= required_workers`
- Sets status back to 'open' if it was 'full' and workers drop below required

**Attached to**:
- job_confirmations (AFTER INSERT, UPDATE, DELETE)

**Process**:
1. Count all confirmations with `status = 'confirmed'` for the affected job
2. Update `catering_jobs.confirmed_workers` with the count
3. Update `catering_jobs.status` based on capacity

---

### soft_delete_job()

**Type**: Function  
**Returns**: UUID (deleted_job record id)

```sql
soft_delete_job(
  p_job_id UUID,
  p_deleted_by UUID,
  p_deletion_reason TEXT DEFAULT NULL,
  p_expires_days INTEGER DEFAULT 30
)
```

Performs soft delete of a catering job:
1. Creates JSONB snapshot of complete job data
2. Inserts snapshot into `deleted_jobs` table
3. Marks original job with `deleted_at` and `deleted_by`

**Parameters**:
- `p_job_id`: UUID of job to delete
- `p_deleted_by`: UUID of user performing deletion
- `p_deletion_reason`: Optional reason text
- `p_expires_days`: Days until record expires (default 30)

**Returns**: UUID of the created `deleted_jobs` record

**Raises Exception**: If job not found or already deleted

---

### log_admin_action()

**Type**: Function  
**Returns**: UUID (audit log entry id)

```sql
log_admin_action(
  p_admin_id UUID,
  p_action TEXT,
  p_target_type TEXT DEFAULT NULL,
  p_target_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
```

Manually logs administrator actions to the audit trail.

**Parameters**:
- `p_admin_id`: UUID of admin performing action (verified to have admin role)
- `p_action`: Action description (e.g., 'suspend_user')
- `p_target_type`: Type of entity affected (e.g., 'profile', 'catering_job')
- `p_target_id`: UUID of affected entity
- `p_details`: Additional context as JSONB

**Returns**: UUID of the created audit log entry

**Raises Exception**: If `p_admin_id` does not have admin role

---

## Common Query Patterns

### Find available jobs for workers

```sql
SELECT 
  cj.*,
  p.full_name as provider_name,
  p.phone_number as provider_phone,
  (cj.required_workers - cj.confirmed_workers) as workers_needed
FROM catering_jobs cj
JOIN profiles p ON p.id = cj.provider_id
WHERE cj.status = 'open'
  AND cj.deleted_at IS NULL
  AND cj.event_date >= CURRENT_DATE
  -- Optional: Worker hasn't already confirmed this job
  AND NOT EXISTS (
    SELECT 1 FROM job_confirmations
    WHERE job_id = cj.id
      AND worker_id = 'current-worker-uuid'
  )
ORDER BY cj.event_date ASC, cj.created_at ASC;
```

### Provider dashboard: upcoming jobs with worker counts

```sql
SELECT 
  cj.id,
  cj.event_name,
  cj.event_date,
  cj.start_time,
  cj.required_workers,
  cj.confirmed_workers,
  cj.status,
  COUNT(jc.id) FILTER (WHERE jc.status = 'confirmed') as confirmed_count,
  COUNT(wa.id) FILTER (WHERE wa.attendance_status = 'present') as present_count
FROM catering_jobs cj
LEFT JOIN job_confirmations jc ON jc.job_id = cj.id
LEFT JOIN worker_attendance wa ON wa.job_id = cj.id
WHERE cj.provider_id = 'provider-uuid'
  AND cj.deleted_at IS NULL
  AND cj.event_date >= CURRENT_DATE
GROUP BY cj.id
ORDER BY cj.event_date ASC;
```

### Worker's confirmed jobs with attendance status

```sql
SELECT 
  cj.event_name,
  cj.event_date,
  cj.start_time,
  cj.address,
  cj.city,
  jc.confirmed_at,
  wa.attendance_status,
  p.full_name as provider_name,
  p.phone_number as provider_phone
FROM job_confirmations jc
JOIN catering_jobs cj ON cj.id = jc.job_id
JOIN profiles p ON p.id = cj.provider_id
LEFT JOIN worker_attendance wa ON wa.job_id = jc.job_id 
  AND wa.worker_id = jc.worker_id
WHERE jc.worker_id = 'worker-uuid'
  AND jc.status = 'confirmed'
  AND cj.deleted_at IS NULL
  AND cj.event_date >= CURRENT_DATE
ORDER BY cj.event_date ASC;
```

### Real-time job attendance tracking for provider

```sql
SELECT 
  p.id as worker_id,
  p.full_name as worker_name,
  p.phone_number as worker_phone,
  jc.confirmed_at,
  wa.attendance_status,
  wa.arrival_time,
  wa.updated_at as status_updated_at,
  lss.latitude,
  lss.longitude,
  lss.last_updated_at as location_updated_at,
  lss.sharing_enabled
FROM job_confirmations jc
JOIN profiles p ON p.id = jc.worker_id
LEFT JOIN worker_attendance wa ON wa.job_id = jc.job_id 
  AND wa.worker_id = jc.worker_id
LEFT JOIN location_sharing_sessions lss ON lss.job_id = jc.job_id 
  AND lss.worker_id = jc.worker_id
  AND lss.sharing_enabled = TRUE
  AND (lss.expires_at IS NULL OR lss.expires_at > NOW())
WHERE jc.job_id = 'job-uuid'
  AND jc.status = 'confirmed'
ORDER BY wa.attendance_status, p.full_name;
```

---

## Migration Checklist

When applying the schema for the first time:

- [ ] Run migrations 001-008 in sequence (table creation)
- [ ] Run migration 009 (functions and triggers)
- [ ] Run migration 010 (enable RLS framework)
- [ ] Run migration 011 (performance indexes)
- [ ] Verify all tables exist: `\dt` in psql
- [ ] Verify RLS is enabled: `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';`
- [ ] Generate TypeScript types: `supabase gen types typescript`
- [ ] Apply RLS policies (FEAT-002 - separate feature)
- [ ] Test database access with authenticated users

---

## Security Considerations

### Row Level Security (RLS)

RLS is **enabled** on all 8 tables via migration 010. This is critical for security:

- Without RLS policies, no data is accessible (except with service role key)
- RLS policies will be defined in FEAT-002 (separate feature)
- **NEVER** disable RLS, even during development
- Use service role key only for admin operations, never in frontend code

### Sensitive Data

- **Location data** (`location_sharing_sessions`): Privacy-sensitive, requires explicit consent
- **Phone numbers** (`profiles.phone_number`): PII, restrict access
- **Admin audit logs**: Sensitive administrative data, admin-only access

### Foreign Key Cascade Behavior

- Most FK use `ON DELETE CASCADE` to clean up related records
- Exception: `deleted_by`, `marked_by`, `admin_id` use `ON DELETE SET NULL` to preserve audit trail

### Immutable Tables

- `admin_audit_logs`: No `updated_at` column, records are append-only
- Audit trail must never be editable by ordinary users

---

## Performance Optimization

### Index Strategy

- **B-tree indexes** on foreign keys (job_id, worker_id, etc.)
- **Composite indexes** for common multi-column queries
- **Partial indexes** with WHERE clauses for filtered queries (e.g., non-deleted jobs)
- **JSONB indexes** could be added if querying job_snapshot frequently

### Query Optimization Tips

1. Always filter soft-deleted jobs: `WHERE deleted_at IS NULL`
2. Use indexed columns in WHERE clauses
3. Avoid SELECT * in production, specify needed columns
4. Use EXPLAIN ANALYZE to identify slow queries
5. Consider materialized views for complex aggregations

### Monitoring

```sql
-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

---

## Maintenance Tasks

### Cleanup Expired Location Sessions

```sql
DELETE FROM location_sharing_sessions
WHERE expires_at < NOW() - INTERVAL '7 days';
```

### Cleanup Expired Deleted Jobs

```sql
DELETE FROM deleted_jobs
WHERE expires_at < NOW();
```

### Vacuum and Analyze

```sql
VACUUM ANALYZE;  -- Recommended to run periodically
```

---

## Additional Resources

- [PostgreSQL CHECK Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-CHECK-CONSTRAINTS)
- [PostgreSQL Triggers](https://www.postgresql.org/docs/current/triggers.html)
- [JSONB Functions](https://www.postgresql.org/docs/current/functions-json.html)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)

---

**Last Updated**: 2024 (Module 2 - Database Schema Implementation)
