# Manual Testing Checklist - Catering Union Application

**Version**: 1.0  
**Date**: November 1, 2026  
**Purpose**: Comprehensive manual testing guide for functional and security verification

## Testing Environment Setup

### Required Test Accounts

Create three test accounts with different roles:

| Role | Email | Password | UUID (to be filled) |
|------|-------|----------|---------------------|
| Worker | worker.test@example.com | Test123! | _________________ |
| Provider | provider.test@example.com | Test123! | _________________ |
| Admin | admin.test@example.com | Test123! | _________________ |

**Setup Instructions**:
1. Sign up as worker and provider through the application
2. Create admin account via SQL:
   ```sql
   -- After signing up as a regular user, upgrade to admin:
   UPDATE profiles SET role = 'admin' WHERE email = 'admin.test@example.com';
   ```

### Test Data Requirements

- [ ] At least 2 test jobs (one open, one full)
- [ ] At least 3 worker accounts
- [ ] At least 2 provider accounts
- [ ] At least 1 job confirmation per worker
- [ ] Test reports submitted
- [ ] Test deleted jobs

---

## 1. Authentication & Authorization Tests

### 1.1 Signup Flow

| # | Test Case | Expected Result | Actual Result | Pass/Fail | Notes |
|---|-----------|-----------------|---------------|-----------|-------|
| 1.1.1 | Sign up as worker with valid data | Account created, redirected to dashboard | | ☐ | |
| 1.1.2 | Sign up as provider with valid data | Account created, redirected to dashboard | | ☐ | |
| 1.1.3 | Sign up with existing email | Error: "Account already exists" | | ☐ | |
| 1.1.4 | Sign up with invalid email format | Error: "Invalid email" | | ☐ | |
| 1.1.5 | Sign up with password < 6 characters | Error: "Password must be at least 6 characters" | | ☐ | |
| 1.1.6 | Sign up with mismatched password confirmation | Error: "Passwords do not match" | | ☐ | |
| 1.1.7 | Sign up without required fields | Form validation errors shown | | ☐ | |
| 1.1.8 | Attempt to sign up with role='admin' | Should fail or default to worker/provider | | ☐ | |

### 1.2 Login Flow

| # | Test Case | Expected Result | Actual Result | Pass/Fail | Notes |
|---|-----------|-----------------|---------------|-----------|-------|
| 1.2.1 | Login with valid credentials | Logged in, redirected to dashboard | | ☐ | |
| 1.2.2 | Login with invalid password | Error: "Invalid email or password" | | ☐ | |
| 1.2.3 | Login with non-existent email | Error: "Invalid email or password" | | ☐ | |
| 1.2.4 | Login with empty email | Form validation error | | ☐ | |
| 1.2.5 | Login with empty password | Form validation error | | ☐ | |
| 1.2.6 | "Remember me" checkbox persists session | Session persists after browser restart | | ☐ | |
| 1.2.7 | Show/hide password toggle works | Password visibility toggles | | ☐ | |

### 1.3 Session Management

| # | Test Case | Expected Result | Actual Result | Pass/Fail | Notes |
|---|-----------|-----------------|---------------|-----------|-------|
| 1.3.1 | Session persists after page refresh | User remains logged in | | ☐ | |
| 1.3.2 | Session expires after inactivity | User logged out after timeout | | ☐ | Check Supabase settings |
| 1.3.3 | Logout clears session | User logged out, redirected to landing | | ☐ | |
| 1.3.4 | Token refresh works automatically | No logout during active use | | ☐ | Use app for >1 hour |
| 1.3.5 | Accessing protected route when logged out | Redirected to login page | | ☐ | |

### 1.4 Role-Based Access

| # | Test Case | Expected Result | Actual Result | Pass/Fail | Notes |
|---|-----------|-----------------|---------------|-----------|-------|
| 1.4.1 | Worker cannot access provider routes | AccessDenied or redirect | | ☐ | Try /provider/jobs as worker |
| 1.4.2 | Provider cannot access admin routes | AccessDenied or redirect | | ☐ | Try /admin as provider |
| 1.4.3 | Worker cannot access admin routes | AccessDenied or redirect | | ☐ | Try /admin as worker |
| 1.4.4 | Admin can access all routes | Full access granted | | ☐ | |
| 1.4.5 | Worker cannot change own role | Profile update fails/blocks role change | | ☐ | |

---

## 2. Provider Features Tests

### 2.1 Job Creation

| # | Test Case | Expected Result | Actual Result | Pass/Fail | Notes |
|---|-----------|-----------------|---------------|-----------|-------|
| 2.1.1 | Create job with all required fields | Job created successfully | | ☐ | |
| 2.1.2 | Create job with past event date | Error: "Event date cannot be in the past" | | ☐ | |
| 2.1.3 | Create job with required_workers = 0 | Error or validation failure | | ☐ | |
| 2.1.4 | Create job without required fields | Form validation errors | | ☐ | |
| 2.1.5 | Created job appears in "My Jobs" list | Job visible in provider's list | | ☐ | |
| 2.1.6 | Created job visible to workers | Job appears in open jobs list for workers | | ☐ | |

### 2.2 Job Management

| # | Test Case | Expected Result | Actual Result | Pass/Fail | Notes |
|---|-----------|-----------------|---------------|-----------|-------|
| 2.2.1 | View job details | All details displayed correctly | | ☐ | |
| 2.2.2 | Edit own job title | Update saved successfully | | ☐ | |
| 2.2.3 | Edit own job date | Update saved successfully | | ☐ | |
| 2.2.4 | Increase required workers | Update saved, job remains open | | ☐ | |
| 2.2.5 | Attempt to edit another provider's job | Access denied or not visible | | ☐ | |
| 2.2.6 | Change job status to cancelled | Job marked as cancelled | | ☐ | |
| 2.2.7 | Change job status to completed | Job marked as completed | | ☐ | |
| 2.2.8 | Cancelled job not visible to workers | Workers cannot see cancelled job | | ☐ | |

### 2.3 Soft Delete & Recovery

| # | Test Case | Expected Result | Actual Result | Pass/Fail | Notes |
|---|-----------|-----------------|---------------|-----------|-------|
| 2.3.1 | Soft-delete own job | Job moved to "Recently Deleted" | | ☐ | |
| 2.3.2 | Deleted job removed from active list | Not visible in "My Jobs" | | ☐ | |
| 2.3.3 | Deleted job not visible to workers | Workers cannot see deleted job | | ☐ | |
| 2.3.4 | View deleted jobs list | All deleted jobs visible | | ☐ | |
| 2.3.5 | Restore deleted job within 30 days | Job restored to active list | | ☐ | |
| 2.3.6 | Deleted job shows expiration date | expires_at displayed (30 days from deletion) | | ☐ | |
| 2.3.7 | Attempt to restore expired job | Error: "Recovery period expired" | | ☐ | |
| 2.3.8 | Cannot view another provider's deleted jobs | Access denied or empty list | | ☐ | |

### 2.4 Confirmations Management

| # | Test Case | Expected Result | Actual Result | Pass/Fail | Notes |
|---|-----------|-----------------|---------------|-----------|-------|
| 2.4.1 | View confirmations for own job | List of confirmed workers displayed | | ☐ | |
| 2.4.2 | Confirmed workers count correct | confirmed_workers matches actual count | | ☐ | |
| 2.4.3 | Vacancy count correct | (required - confirmed) = vacancies shown | | ☐ | |
| 2.4.4 | Job status changes to 'full' when capacity reached | Status updates automatically | | ☐ | |
| 2.4.5 | Cannot view confirmations for other jobs | Access denied | | ☐ | |
| 2.4.6 | Remove worker confirmation | Confirmation deleted, count decremented | | ☐ | |
| 2.4.7 | Job status reverts to 'open' after removal | Status updates correctly | | ☐ | |

### 2.5 Attendance Management

| # | Test Case | Expected Result | Actual Result | Pass/Fail | Notes |
|---|-----------|-----------------|---------------|-----------|-------|
| 2.5.1 | View attendance for own job | List of confirmed workers with status | | ☐ | |
| 2.5.2 | Mark worker as present | Status updated to 'present' | | ☐ | |
| 2.5.3 | Mark worker as absent | Status updated to 'absent' | | ☐ | |
| 2.5.4 | Cannot mark attendance for other jobs | Access denied | | ☐ | |
| 2.5.5 | Attendance status visible to marked worker | Worker sees their attendance status | | ☐ | |
| 2.5.6 | Arrival time recorded when marked present | arrival_time field populated | | ☐ | |

### 2.6 Location Tracking (Provider View)

| # | Test Case | Expected Result | Actual Result | Pass/Fail | Notes |
|---|-----------|-----------------|---------------|-----------|-------|
| 2.6.1 | View location of worker who enabled sharing | Map/coordinates displayed | | ☐ | |
| 2.6.2 | Cannot view location of worker who disabled sharing | No location shown | | ☐ | |
| 2.6.3 | Cannot view expired location session | Location not accessible | | ☐ | |
| 2.6.4 | Cannot view location for other providers' jobs | Access denied | | ☐ | |
| 2.6.5 | Last updated time displayed | Timestamp shown for location data | | ☐ | |
| 2.6.6 | Worker location updates in real-time | Location refreshes when worker moves | | ☐ | Test if implemented |

---

## 3. Worker Features Tests

### 3.1 Job Browsing

| # | Test Case | Expected Result | Actual Result | Pass/Fail | Notes |
|---|-----------|-----------------|---------------|-----------|-------|
| 3.1.1 | View list of open jobs | All open, non-deleted jobs displayed | | ☐ | |
| 3.1.2 | Deleted jobs not visible | Soft-deleted jobs not in list | | ☐ | |
| 3.1.3 | Cancelled jobs not visible | Cancelled jobs not in list | | ☐ | |
| 3.1.4 | Filter by date | Jobs filtered correctly | | ☐ | If implemented |
| 3.1.5 | Filter by area | Jobs filtered correctly | | ☐ | If implemented |
| 3.1.6 | Job card shows vacancy count | (required - confirmed) displayed | | ☐ | |
| 3.1.7 | Full jobs marked as full | "Full" badge/indicator displayed | | ☐ | |

### 3.2 Job Confirmation

| # | Test Case | Expected Result | Actual Result | Pass/Fail | Notes |
|---|-----------|-----------------|---------------|-----------|-------|
| 3.2.1 | Confirm available job | Success message, job added to "My Jobs" | | ☐ | |
| 3.2.2 | Attempt to confirm already confirmed job | Error: "Already confirmed" | | ☐ | |
| 3.2.3 | Attempt to confirm full job | Error: "Job is now full" | | ☐ | |
| 3.2.4 | Attempt to confirm cancelled job | Error: "Job has been cancelled" | | ☐ | |
| 3.2.5 | Attempt to confirm past job | Error: "Job has already passed" | | ☐ | |
| 3.2.6 | Vacancy count decreases after confirmation | Count updated immediately | | ☐ | |
| 3.2.7 | Job status changes to 'full' on last vacancy | Status updates when last spot filled | | ☐ | |

**CRITICAL TEST - Race Condition**:
| 3.2.8 | **TWO workers confirm last vacancy simultaneously** | **Only ONE confirmation succeeds, other gets "Job is full" error** | | ☐ | **MUST PASS** - Open two browser windows, coordinate clicks |

### 3.3 My Confirmed Jobs

| # | Test Case | Expected Result | Actual Result | Pass/Fail | Notes |
|---|-----------|-----------------|---------------|-----------|-------|
| 3.3.1 | View list of confirmed jobs | All confirmed jobs displayed | | ☐ | |
| 3.3.2 | Job details displayed correctly | Event date, location, provider name | | ☐ | |
| 3.3.3 | Upcoming jobs count correct | Count matches jobs with future date | | ☐ | |
| 3.3.4 | Completed jobs count correct | Count matches jobs with status='completed' | | ☐ | |
| 3.3.5 | Cannot view other workers' confirmed jobs | Only own confirmations visible | | ☐ | |

### 3.4 Attendance (Worker Self-Update)

| # | Test Case | Expected Result | Actual Result | Pass/Fail | Notes |
|---|-----------|-----------------|---------------|-----------|-------|
| 3.4.1 | Update status to "Getting Ready" | Status updated successfully | | ☐ | |
| 3.4.2 | Update status to "On the Way" | Status updated successfully | | ☐ | |
| 3.4.3 | Update status to "Arrived" | Status updated, arrival time recorded | | ☐ | |
| 3.4.4 | Attempt to set status to "Present" | Error or blocked (provider-only) | | ☐ | |
| 3.4.5 | Attempt to set status to "Absent" | Error or blocked (provider-only) | | ☐ | |
| 3.4.6 | View own attendance history | Past attendance records visible | | ☐ | |

### 3.5 Location Sharing (Worker Control)

| # | Test Case | Expected Result | Actual Result | Pass/Fail | Notes |
|---|-----------|-----------------|---------------|-----------|-------|
| 3.5.1 | Location sharing OFF by default | No active session on page load | | ☐ | |
| 3.5.2 | Enable location sharing | Location session created, coordinates sent | | ☐ | |
| 3.5.3 | Location updates while sharing enabled | Coordinates refresh periodically | | ☐ | |
| 3.5.4 | Disable location sharing | sharing_enabled set to false | | ☐ | |
| 3.5.5 | Provider can see location while enabled | Provider sees worker location | | ☐ | Test with provider account |
| 3.5.6 | Provider cannot see location after disabled | Location no longer accessible | | ☐ | Test with provider account |
| 3.5.7 | Delete location session | Session deleted from database | | ☐ | |
| 3.5.8 | Session expires after job ends | expires_at set to job end time | | ☐ | |
| 3.5.9 | Cannot start sharing for unconfirmed job | Error or blocked | | ☐ | |

### 3.6 Cancellation

| # | Test Case | Expected Result | Actual Result | Pass/Fail | Notes |
|---|-----------|-----------------|---------------|-----------|-------|
| 3.6.1 | Cancel own confirmation | Confirmation status = 'cancelled' | | ☐ | |
| 3.6.2 | Job removed from "My Jobs" after cancel | Not visible in confirmed jobs list | | ☐ | |
| 3.6.3 | Vacancy count increases after cancel | confirmed_workers decremented | | ☐ | |
| 3.6.4 | Job status reverts to 'open' if was 'full' | Status updated correctly | | ☐ | |
| 3.6.5 | Cannot cancel another worker's confirmation | Access denied | | ☐ | |

---

## 4. Admin Features Tests

### 4.1 Admin Dashboard

| # | Test Case | Expected Result | Actual Result | Pass/Fail | Notes |
|---|-----------|-----------------|---------------|-----------|-------|
| 4.1.1 | Access admin dashboard | Statistics displayed correctly | | ☐ | |
| 4.1.2 | Total users count accurate | Count matches database query | | ☐ | |
| 4.1.3 | Total jobs count accurate | Count matches database query | | ☐ | |
| 4.1.4 | Open vacancies count accurate | Sum of (required - confirmed) for open jobs | | ☐ | |
| 4.1.5 | Pending reports count accurate | Count of reports with status='pending' | | ☐ | |
| 4.1.6 | Non-admin cannot access dashboard | AccessDenied component shown | | ☐ | |

### 4.2 User Management

| # | Test Case | Expected Result | Actual Result | Pass/Fail | Notes |
|---|-----------|-----------------|---------------|-----------|-------|
| 4.2.1 | View all users list | All users displayed | | ☐ | |
| 4.2.2 | Search users by name | Filtered results displayed | | ☐ | |
| 4.2.3 | Filter users by role | Only selected role displayed | | ☐ | |
| 4.2.4 | Suspend user account | account_status = 'suspended' | | ☐ | |
| 4.2.5 | Reactivate suspended account | account_status = 'active' | | ☐ | |
| 4.2.6 | Change user role | Role updated successfully | | ☐ | |
| 4.2.7 | Promote user to admin | Role changed to 'admin' | | ☐ | |
| 4.2.8 | Action logged in audit log | Entry created in admin_audit_logs | | ☐ | |

### 4.3 Job Moderation

| # | Test Case | Expected Result | Actual Result | Pass/Fail | Notes |
|---|-----------|-----------------|---------------|-----------|-------|
| 4.3.1 | View all jobs including soft-deleted | All jobs visible | | ☐ | |
| 4.3.2 | View job details | All details displayed | | ☐ | |
| 4.3.3 | Edit any job | Update saved successfully | | ☐ | |
| 4.3.4 | Soft-delete any job | Job moved to deleted_jobs | | ☐ | |
| 4.3.5 | Restore deleted job | Job restored to active | | ☐ | |
| 4.3.6 | Hard delete job (cleanup) | Job permanently deleted | | ☐ | Use with caution |
| 4.3.7 | Action logged in audit log | Entry created for each action | | ☐ | |

### 4.4 Reports Management

| # | Test Case | Expected Result | Actual Result | Pass/Fail | Notes |
|---|-----------|-----------------|---------------|-----------|-------|
| 4.4.1 | View all reports | All reports displayed | | ☐ | |
| 4.4.2 | Filter by status | Filtered reports displayed | | ☐ | |
| 4.4.3 | View report details | Reporter, job, reason displayed | | ☐ | |
| 4.4.4 | Update report status to 'reviewed' | Status updated | | ☐ | |
| 4.4.5 | Update report status to 'resolved' | Status updated | | ☐ | |
| 4.4.6 | Update report status to 'dismissed' | Status updated | | ☐ | |
| 4.4.7 | Delete report | Report removed | | ☐ | |
| 4.4.8 | Action logged in audit log | Entry created | | ☐ | |

### 4.5 Audit Logs

| # | Test Case | Expected Result | Actual Result | Pass/Fail | Notes |
|---|-----------|-----------------|---------------|-----------|-------|
| 4.5.1 | View audit logs | All admin actions logged | | ☐ | |
| 4.5.2 | Logs show who, what, when | admin_id, action, created_at visible | | ☐ | |
| 4.5.3 | Logs show target information | target_type, target_id populated | | ☐ | |
| 4.5.4 | Logs show details (JSONB) | Additional context displayed | | ☐ | |
| 4.5.5 | **Attempt to update audit log** | **Error - no UPDATE policy** | | ☐ | **MUST FAIL** |
| 4.5.6 | **Attempt to delete audit log** | **Error - no DELETE policy** | | ☐ | **MUST FAIL** |
| 4.5.7 | Non-admin cannot view logs | Access denied | | ☐ | |

### 4.6 Health Monitoring (Module 12)

| # | Test Case | Expected Result | Actual Result | Pass/Fail | Notes |
|---|-----------|-----------------|---------------|-----------|-------|
| 4.6.1 | Access /admin/health page | Statistics displayed | | ☐ | |
| 4.6.2 | Retention statistics accurate | Matches get_retention_statistics() query | | ☐ | |
| 4.6.3 | Expired records count correct | Shows deleted_jobs past expires_at | | ☐ | |
| 4.6.4 | Expiring soon (7d) count correct | Shows records expiring within 7 days | | ☐ | |
| 4.6.5 | Free-tier warning displayed | Notice about 500MB limit shown | | ☐ | |
| 4.6.6 | Cleanup instructions visible | SQL commands displayed | | ☐ | |
| 4.6.7 | Refresh button works | Statistics reload on click | | ☐ | |
| 4.6.8 | Non-admin cannot access | AccessDenied component shown | | ☐ | |

---

## 5. Localization Tests

### 5.1 Language Switching

| # | Test Case | Expected Result | Actual Result | Pass/Fail | Notes |
|---|-----------|-----------------|---------------|-----------|-------|
| 5.1.1 | Switch to Telugu | UI updates to Telugu | | ☐ | |
| 5.1.2 | Switch back to English | UI updates to English | | ☐ | |
| 5.1.3 | Language preference persists | Reloading page keeps selected language | | ☐ | |
| 5.1.4 | All pages support both languages | No missing translations | | ☐ | Check all routes |
| 5.1.5 | Dates formatted correctly in Telugu | Regional format used | | ☐ | |
| 5.1.6 | Numbers formatted correctly | Locale-specific formatting | | ☐ | |

### 5.2 Translation Coverage

| # | Test Case | Expected Result | Actual Result | Pass/Fail | Notes |
|---|-----------|-----------------|---------------|-----------|-------|
| 5.2.1 | Landing page fully translated | All text in selected language | | ☐ | |
| 5.2.2 | Login/Signup fully translated | All labels and errors translated | | ☐ | |
| 5.2.3 | Dashboard fully translated | All UI elements translated | | ☐ | |
| 5.2.4 | Job forms fully translated | All fields and validations translated | | ☐ | |
| 5.2.5 | Error messages translated | User-friendly errors in both languages | | ☐ | |
| 5.2.6 | Success messages translated | Confirmations in both languages | | ☐ | |

---

## 6. Error Handling & Reliability Tests

### 6.1 Network Errors

| # | Test Case | Expected Result | Actual Result | Pass/Fail | Notes |
|---|-----------|-----------------|---------------|-----------|-------|
| 6.1.1 | API call fails (network error) | User-friendly error message displayed | | ☐ | Throttle network to test |
| 6.1.2 | Retry button appears | "Try Again" button shown | | ☐ | |
| 6.1.3 | Retry button works | Operation retries on click | | ☐ | |
| 6.1.4 | No false success on network error | Error shown, not success message | | ☐ | **CRITICAL** |
| 6.1.5 | Loading state cleared after error | Loading spinner stops | | ☐ | |

### 6.2 Offline Behavior

| # | Test Case | Expected Result | Actual Result | Pass/Fail | Notes |
|---|-----------|-----------------|---------------|-----------|-------|
| 6.2.1 | Go offline (disable network) | Offline indicator appears | | ☐ | |
| 6.2.2 | Attempt to load data while offline | "You're offline" message shown | | ☐ | |
| 6.2.3 | Reconnect to network | Offline indicator disappears | | ☐ | |
| 6.2.4 | Data loads after reconnect | Data fetches successfully | | ☐ | |
| 6.2.5 | Form submissions blocked while offline | Error shown, not submitted | | ☐ | |

### 6.3 Error Boundaries

| # | Test Case | Expected Result | Actual Result | Pass/Fail | Notes |
|---|-----------|-----------------|---------------|-----------|-------|
| 6.3.1 | Component renders successfully | No errors | | ☐ | |
| 6.3.2 | Error boundary catches runtime errors | Fallback UI shown, not white screen | | ☐ | Trigger error in dev tools |
| 6.3.3 | Error details logged | Console shows error details | | ☐ | |
| 6.3.4 | Page reload option available | "Reload" button shown | | ☐ | |

### 6.4 Validation Errors

| # | Test Case | Expected Result | Actual Result | Pass/Fail | Notes |
|---|-----------|-----------------|---------------|-----------|-------|
| 6.4.1 | Submit empty form | Field-level errors displayed | | ☐ | |
| 6.4.2 | Enter invalid email | Email error shown | | ☐ | |
| 6.4.3 | Enter short password | Password error shown | | ☐ | |
| 6.4.4 | Mismatch password confirmation | Confirmation error shown | | ☐ | |
| 6.4.5 | Error messages clear when fixed | Errors disappear after correction | | ☐ | |

---

## 7. Security Tests

### 7.1 SQL Injection Prevention

| # | Test Case | Expected Result | Actual Result | Pass/Fail | Notes |
|---|-----------|-----------------|---------------|-----------|-------|
| 7.1.1 | Enter SQL in job title: `'; DROP TABLE profiles; --` | Treated as text, no SQL executed | | ☐ | |
| 7.1.2 | Enter SQL in search: `' OR '1'='1` | No unauthorized data returned | | ☐ | |
| 7.1.3 | Enter SQL in filters | Treated as parameter, not executed | | ☐ | |

### 7.2 XSS Prevention

| # | Test Case | Expected Result | Actual Result | Pass/Fail | Notes |
|---|-----------|-----------------|---------------|-----------|-------|
| 7.2.1 | Enter HTML in job title: `<script>alert('XSS')</script>` | Rendered as text, not executed | | ☐ | |
| 7.2.2 | Enter HTML in description | Sanitized or escaped | | ☐ | |
| 7.2.3 | Enter `<img src=x onerror=alert(1)>` | Rendered as text | | ☐ | |

### 7.3 Authorization Bypass Attempts

| # | Test Case | Expected Result | Actual Result | Pass/Fail | Notes |
|---|-----------|-----------------|---------------|-----------|-------|
| 7.3.1 | Worker tries to access /provider/jobs directly | Redirected or AccessDenied | | ☐ | |
| 7.3.2 | Worker tries to access /admin directly | Redirected or AccessDenied | | ☐ | |
| 7.3.3 | Modify URL to access another user's job | Access denied or not found | | ☐ | Example: /provider/jobs/{other-provider-job-id} |
| 7.3.4 | Worker attempts to modify own role via profile update | Error, role not updated | | ☐ | |

### 7.4 RLS Policy Verification

| # | Test Case | Expected Result | Actual Result | Pass/Fail | Notes |
|---|-----------|-----------------|---------------|-----------|-------|
| 7.4.1 | Worker SELECT on job_confirmations | Only own confirmations returned | | ☐ | Use SQL console |
| 7.4.2 | Provider SELECT on catering_jobs | Only own jobs returned | | ☐ | Use SQL console |
| 7.4.3 | Worker attempts INSERT with role='admin' | Error, INSERT blocked | | ☐ | Use SQL console |
| 7.4.4 | Worker UPDATE own role to 'admin' | Error, UPDATE blocked | | ☐ | Use SQL console |
| 7.4.5 | Worker SELECT on deleted_jobs | No rows returned | | ☐ | Use SQL console |

---

## 8. Performance & Responsiveness Tests

### 8.1 Page Load Performance

| # | Test Case | Expected Result | Actual Result | Pass/Fail | Notes |
|---|-----------|-----------------|---------------|-----------|-------|
| 8.1.1 | Initial page load < 3 seconds | Page interactive in < 3s | | ☐ | Use Chrome DevTools Network |
| 8.1.2 | Job list loads < 2 seconds | Data displayed in < 2s | | ☐ | |
| 8.1.3 | No unnecessary re-renders | Minimal React re-renders | | ☐ | Use React DevTools Profiler |
| 8.1.4 | Images optimized | Images load without blocking | | ☐ | |

### 8.2 Mobile Responsiveness

| # | Test Case | Expected Result | Actual Result | Pass/Fail | Notes |
|---|-----------|-----------------|---------------|-----------|-------|
| 8.2.1 | Landing page responsive on mobile | Layout adapts correctly | | ☐ | Test 375px width |
| 8.2.2 | Login form usable on mobile | Fields accessible, buttons tappable | | ☐ | |
| 8.2.3 | Job list readable on mobile | Cards stack vertically | | ☐ | |
| 8.2.4 | Navigation menu accessible | Hamburger menu or tabs work | | ☐ | |
| 8.2.5 | Forms usable on mobile | Input fields size correctly | | ☐ | |
| 8.2.6 | Touch targets at least 44px | Buttons large enough to tap | | ☐ | |

### 8.3 Desktop Responsiveness

| # | Test Case | Expected Result | Actual Result | Pass/Fail | Notes |
|---|-----------|-----------------|---------------|-----------|-------|
| 8.3.1 | Layout works on 1920x1080 | No horizontal scroll | | ☐ | |
| 8.3.2 | Layout works on 1366x768 | Content fits viewport | | ☐ | |
| 8.3.3 | Sidebar navigation visible | Navigation accessible | | ☐ | |
| 8.3.4 | Multi-column layouts used | Desktop space utilized | | ☐ | |

---

## 9. Browser Compatibility Tests

Test in the following browsers:

### 9.1 Chrome

| # | Feature | Works Correctly | Issues Found | Notes |
|---|---------|-----------------|--------------|-------|
| 9.1.1 | All functionality | ☐ | | |
| 9.1.2 | Responsive design | ☐ | | |
| 9.1.3 | Console errors | ☐ None | | |

### 9.2 Firefox

| # | Feature | Works Correctly | Issues Found | Notes |
|---|---------|-----------------|--------------|-------|
| 9.2.1 | All functionality | ☐ | | |
| 9.2.2 | Responsive design | ☐ | | |
| 9.2.3 | Console errors | ☐ None | | |

### 9.3 Safari (if available)

| # | Feature | Works Correctly | Issues Found | Notes |
|---|---------|-----------------|--------------|-------|
| 9.3.1 | All functionality | ☐ | | |
| 9.3.2 | Responsive design | ☐ | | |
| 9.3.3 | Console errors | ☐ None | | |

### 9.4 Edge

| # | Feature | Works Correctly | Issues Found | Notes |
|---|---------|-----------------|--------------|-------|
| 9.4.1 | All functionality | ☐ | | |
| 9.4.2 | Responsive design | ☐ | | |
| 9.4.3 | Console errors | ☐ None | | |

---

## 10. Data Integrity Tests

### 10.1 Booking Integrity

| # | Test Case | Expected Result | Actual Result | Pass/Fail | Notes |
|---|-----------|-----------------|---------------|-----------|-------|
| 10.1.1 | confirmed_workers never exceeds required_workers | Count is always ≤ required | | ☐ | **CRITICAL** |
| 10.1.2 | Job status 'full' when confirmed = required | Status accurate | | ☐ | |
| 10.1.3 | Job status 'open' when confirmed < required | Status accurate | | ☐ | |
| 10.1.4 | No duplicate confirmations | Unique constraint enforced | | ☐ | Check database |
| 10.1.5 | Cancellation decrements count correctly | confirmed_workers -= 1 | | ☐ | |

### 10.2 Referential Integrity

| # | Test Case | Expected Result | Actual Result | Pass/Fail | Notes |
|---|-----------|-----------------|---------------|-----------|-------|
| 10.2.1 | Cannot delete user with active jobs | Error or soft-delete | | ☐ | |
| 10.2.2 | Deleting job cascades to confirmations | Related records deleted | | ☐ | |
| 10.2.3 | Foreign keys enforced | Cannot insert invalid references | | ☐ | |

---

## Test Execution Summary

**Tester Name**: _________________  
**Test Date**: _________________  
**Environment**: ☐ Local ☐ Staging ☐ Production  
**Browser**: _________________  
**OS**: _________________

### Overall Results

- **Total Tests**: _____ / _____
- **Passed**: _____
- **Failed**: _____
- **Skipped**: _____
- **Blocked**: _____

### Critical Issues Found

| # | Description | Severity | Status |
|---|-------------|----------|--------|
| 1 | | | |
| 2 | | | |
| 3 | | | |

### High Priority Issues Found

| # | Description | Severity | Status |
|---|-------------|----------|--------|
| 1 | | | |
| 2 | | | |

### Notes

_____________________________________
_____________________________________
_____________________________________

### Sign-off

**Ready for Deployment**: ☐ Yes ☐ No (if no, explain blocking issues)

**Blocker Explanation**:
_____________________________________
_____________________________________

**Tester Signature**: _________________  
**Date**: _________________
