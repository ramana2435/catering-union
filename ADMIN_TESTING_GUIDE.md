# Admin Panel Testing Guide

## 🎯 Quick Start

1. **Login as Admin**
   - Use your admin account credentials
   - Navigate to `/admin` in the browser
   - You should see "Admin Panel" header with "System Health" button

---

## 📊 Tab 1: Overview (Dashboard)

### What You'll See:
- **4 Stat Cards:**
  - Total Users (with providers/workers/admins breakdown)
  - Total Jobs (with active/upcoming/completed breakdown)
  - Open Vacancies
  - Pending Reports

- **Quick Actions (4 Buttons):**
  - Click "User Management" → Jumps to Users tab
  - Click "Job Management" → Jumps to Jobs tab
  - Click "Reports Queue" → Jumps to Reports tab
  - Click "Audit Logs" → Jumps to Audit tab

### Test:
✅ All stat cards show numbers
✅ Quick Actions buttons respond to clicks
✅ Each button navigates to correct tab

---

## 👥 Tab 2: Users

### What You'll See:
- **Search/Filter Bar:**
  - Search input (name/phone)
  - Role dropdown (All/Providers/Workers/Admins)
  - Status dropdown (All/Active/Suspended)

- **Users Table:**
  - User name
  - Role badge (colored)
  - Status badge (green=active, red=suspended)
  - Phone number
  - Join date
  - Action button (Suspend/Reactivate)

### Test Actions:

1. **Search:**
   ```
   Type a name → Table filters instantly
   ```

2. **Filter by Role:**
   ```
   Select "Providers" → See only providers
   Select "Workers" → See only workers
   ```

3. **Suspend User:**
   ```
   Click "Suspend" on active user
   → Confirmation dialog appears
   → Click OK
   → Alert: "User suspended"
   → Status changes to red "suspended"
   → Button changes to "Reactivate"
   ```

4. **Reactivate User:**
   ```
   Click "Reactivate" on suspended user
   → Confirmation dialog appears
   → Click OK
   → Alert: "User reactivated"
   → Status changes to green "active"
   → Button changes to "Suspend"
   ```

### Expected Results:
✅ Search works instantly
✅ Filters update the table
✅ Suspend/Reactivate buttons work
✅ Status badges update correctly
✅ Actions appear in Audit Logs tab

---

## 💼 Tab 3: Jobs

### What You'll See:
- **Search/Filter Bar:**
  - Search input (event name/location)
  - Status dropdown (All/Open/Full/In Progress/Completed/Cancelled)

- **Jobs Table:**
  - Event name & type
  - Status badge (colored)
  - Event date
  - Worker count (confirmed/required)
  - Location
  - Actions (View | Remove)

### Test Actions:

1. **Search:**
   ```
   Type event name → Table filters
   Type location → Table filters
   ```

2. **Filter by Status:**
   ```
   Select "Open" → See only open jobs
   Select "Completed" → See only completed jobs
   ```

3. **View Job:**
   ```
   Click "View" link
   → Opens job detail page in same tab
   → Press back to return to admin panel
   ```

4. **Remove Job:**
   ```
   Click "Remove" button
   → Prompt: "Reason for removal (optional):"
   → Type reason or click OK
   → Confirmation: "Remove this job?"
   → Click OK
   → Alert: "Job removed successfully"
   → Job disappears from list (soft deleted)
   ```

### Expected Results:
✅ Search works for event names and locations
✅ Status filter updates table
✅ View link opens job detail page
✅ Remove button soft-deletes job
✅ Actions appear in Audit Logs tab

---

## 🚩 Tab 4: Reports

### What You'll See:
- **Status Filter:**
  - Dropdown: Pending/Reviewed/Resolved/Dismissed
  - Default: Pending

- **Reports Cards (one per report):**
  - Report type header
  - Timestamp
  - Status badge (colored)
  - Description text
  - Reporter ID and Target ID
  - Action buttons (for pending reports)

### Test Actions:

1. **Filter by Status:**
   ```
   Select "Pending" → See pending reports
   Select "Reviewed" → See reviewed reports
   Select "Resolved" → See resolved reports
   Select "Dismissed" → See dismissed reports
   ```

2. **Mark as Reviewed:**
   ```
   Click "Mark Reviewed" button
   → Confirmation: "Mark this report as reviewed?"
   → Click OK
   → Alert: "Report marked as reviewed"
   → Report disappears (now filtered to Reviewed)
   ```

3. **Resolve Report:**
   ```
   Click "Resolve" button
   → Confirmation: "Mark this report as resolved?"
   → Click OK
   → Alert: "Report marked as resolved"
   → Report disappears (now filtered to Resolved)
   ```

4. **Dismiss Report:**
   ```
   Click "Dismiss" button
   → Confirmation: "Mark this report as dismissed?"
   → Click OK
   → Alert: "Report marked as dismissed"
   → Report disappears (now filtered to Dismissed)
   ```

### Expected Results:
✅ Filter changes visible reports
✅ All three action buttons work
✅ Reports move between statuses correctly
✅ Actions appear in Audit Logs tab

---

## 📝 Tab 5: Audit Logs

### What You'll See:
- **Audit Table:**
  - Timestamp (date & time)
  - Admin ID (first 8 characters)
  - Action badge (colored blue)
  - Target type and ID
  - Details (JSON formatted)

### Test Actions:

1. **View Recent Actions:**
   ```
   Scroll through table
   → See chronological list of admin actions
   → Most recent at top
   ```

2. **Check Your Actions:**
   ```
   After suspending a user:
   → Switch to Audit Logs tab
   → See "suspend_user" action
   → See target_id matching user
   → See details: {"new_status": "suspended"}
   
   After removing a job:
   → See "remove_job" action
   → See reason in details
   ```

3. **Inspect JSON Details:**
   ```
   Look at "Details" column
   → Should show formatted JSON
   → May show reason, status, or other metadata
   ```

### Expected Results:
✅ All actions are logged
✅ Timestamps are correct
✅ Action types are descriptive
✅ Details JSON is readable
✅ Last 100 actions shown

---

## 🎨 Visual Indicators

### Status Badges Colors:
- **User Status:**
  - 🟢 Active = Green
  - 🔴 Suspended = Red

- **Job Status:**
  - 🟢 Open = Green
  - 🔵 Full = Blue
  - 🟡 In Progress = Yellow
  - ⚫ Completed = Gray
  - 🔴 Cancelled = Red

- **Report Status:**
  - 🟡 Pending = Yellow
  - 🔵 Reviewed = Blue
  - 🟢 Resolved = Green
  - ⚫ Dismissed = Gray

- **User Roles:**
  - 🟣 Admin = Purple
  - 🔵 Provider = Blue
  - 🟢 Worker = Green

---

## 🧪 Complete Test Scenario

### Step-by-Step Full Test:

1. **Login as Admin**
   - Navigate to `http://localhost:5173/admin`

2. **Check Overview:**
   - Verify stats show numbers
   - Click each Quick Action button
   - Confirm each navigates to correct tab

3. **Test Users Tab:**
   - Search for a user by name
   - Filter to see only workers
   - Suspend one worker
   - Check status changed to red
   - Reactivate the worker
   - Check status back to green

4. **Test Jobs Tab:**
   - Search for a job by name
   - Filter to see only "Open" jobs
   - Click "View" on one job
   - Go back to admin panel
   - Click "Remove" on a test job
   - Provide reason "Test removal"
   - Confirm job disappears

5. **Test Reports Tab:**
   - View pending reports
   - Click "Mark Reviewed" on one
   - Switch filter to "Reviewed"
   - Confirm report appears there
   - Click "Resolve" on another
   - Switch filter to "Resolved"
   - Confirm report appears there

6. **Check Audit Logs:**
   - Switch to Audit Logs tab
   - Verify you see:
     - suspend_user action
     - reactivate_user action
     - remove_job action
     - update_report_status actions (x2)
   - Check timestamps are recent
   - Check details JSON shows correct info

---

## ✅ Success Criteria

After testing, you should have:

✅ All tabs load without errors
✅ All searches work instantly
✅ All filters update tables correctly
✅ All action buttons work (Suspend/Remove/Resolve)
✅ Confirmation dialogs appear before destructive actions
✅ Success alerts appear after actions
✅ Status badges update correctly
✅ All actions logged in Audit Logs
✅ Quick Actions navigate to tabs
✅ No console errors in browser

---

## 🐛 Troubleshooting

### Problem: Tables show "No data found"
**Solution:** 
- Check if you have data in database
- Check browser console for errors
- Verify RLS is still disabled

### Problem: Actions fail with error
**Solution:**
- Check if user is admin role in profiles table
- Verify Supabase connection
- Check browser console for specific error

### Problem: Audit logs empty
**Solution:**
- Perform some actions first (suspend user, remove job)
- Refresh the page
- Check if admin_audit_logs table exists

### Problem: Quick Actions don't work
**Solution:**
- Check browser console for errors
- Try clicking tabs manually first
- Refresh the page

---

## 📸 Expected Screenshots

### Overview Tab:
```
╔══════════════════════════════════════════════╗
║ Admin Panel               [System Health]   ║
║ Dashboard                                    ║
╠══════════════════════════════════════════════╣
║ [Overview] Users Jobs Reports Audit          ║
╠══════════════════════════════════════════════╣
║                                              ║
║  👥 Total Users: 25     💼 Total Jobs: 42    ║
║  └─ Providers: 8        └─ Active: 15       ║
║  └─ Workers: 16         └─ Upcoming: 10     ║
║  └─ Admins: 1           └─ Completed: 17    ║
║                                              ║
║  📋 Open Vacancies: 23  🚩 Pending: 3        ║
║                                              ║
║ ─────── Quick Actions ──────────────────     ║
║                                              ║
║ [👥 User Management] [💼 Job Management]     ║
║ [🚩 Reports Queue]   [📝 Audit Logs]         ║
║                                              ║
╚══════════════════════════════════════════════╝
```

### Users Tab:
```
╔══════════════════════════════════════════════╗
║ [Search: John] [Role: All] [Status: All]     ║
╠══════════════════════════════════════════════╣
║ USER        | ROLE   | STATUS  | ACTIONS     ║
║─────────────┼────────┼─────────┼─────────────║
║ John Doe    | Worker | Active  | [Suspend]   ║
║ Jane Smith  | Provider| Active | [Suspend]   ║
║ Bob Admin   | Admin  | Active  | [Suspend]   ║
╚══════════════════════════════════════════════╝
```

---

## 🎉 Completion

Once all tests pass, your admin panel is **100% functional** and ready for use!

Remember: Before production, run `ENABLE_RLS_WITH_POLICIES.sql` to secure the database.
