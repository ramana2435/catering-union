# Module 7: Location Sharing - Testing Guide

## Overview
This guide covers how to test the voluntary worker location sharing and Google Maps navigation features.

## Prerequisites
- Application is running (`npm run dev`)
- At least one worker account created
- At least one provider account created
- Provider has posted at least one job
- Worker has confirmed attendance for the job

## Test Scenarios

### ✅ Scenario 1: Worker Starts Location Sharing (Happy Path)

**Steps:**
1. Log in as a worker
2. Go to "My Jobs"
3. Click on a confirmed job
4. Scroll to "Location Sharing (Optional)" section
5. Click "Start Sharing" button
6. Read the consent dialog
7. Click "Start Sharing" in the dialog
8. Browser will request location permission
9. Click "Allow" in browser permission prompt

**Expected Result:**
- Button changes to "Stop Sharing" (red)
- Green status indicator appears
- "Last updated" time shows current time
- Blue info box appears: "Your location is being shared..."
- No errors displayed

**What's Happening:**
- Session created in database with 2-hour expiry
- `navigator.geolocation.watchPosition()` starts
- Location updates sent to database every few seconds
- Provider can now see your location

---

### ✅ Scenario 2: Worker Denies Browser Permission

**Steps:**
1. Log in as a worker
2. Go to confirmed job details
3. Click "Start Sharing"
4. Accept consent dialog
5. Browser asks for location permission
6. Click "Block" or "Deny"

**Expected Result:**
- Error appears: "Location error: Location permission denied"
- Button remains "Start Sharing"
- Sharing does not activate
- Session not created in database

**Recovery:**
- Worker must grant permission in browser settings
- Then try "Start Sharing" again

---

### ✅ Scenario 3: Worker Stops Sharing

**Steps:**
1. Worker has location sharing active (green status)
2. Click "Stop Sharing" button

**Expected Result:**
- Button changes to "Start Sharing"
- Green indicator disappears
- "Last updated" time disappears
- `watchPosition()` is cleared
- Database session marked as `sharing_enabled: false`
- Provider no longer sees worker in location list

---

### ✅ Scenario 4: Provider Views Worker Locations

**Steps:**
1. Worker starts sharing (as in Scenario 1)
2. Log in as provider
3. Go to "My Jobs"
4. Click on the same job
5. Scroll to "Worker Locations" section in attendance dashboard

**Expected Result:**
- Provider sees "Worker Locations" section at top
- If job has address: "Job Location" card with "📍 Open" button
- For each sharing worker:
  - Worker name and phone
  - "Last updated: X minutes ago"
  - "🗺️ View on Map" button (gray)
  - "🧭 Directions" button (blue)
  - Coordinates displayed at bottom
- Real-time: updates appear without refresh

**What's Happening:**
- Supabase Realtime subscription active
- Location updates stream from database
- Provider sees only workers for their jobs
- RLS policies enforce access control

---

### ✅ Scenario 5: Google Maps Integration

**Steps:**
1. Provider views worker locations (Scenario 4)
2. Click "🗺️ View on Map" button

**Expected Result:**
- New tab opens
- Google Maps loads showing worker's location
- Red marker at coordinates
- No API key required
- URL format: `https://www.google.com/maps?q=LAT,LNG`

**Steps (Directions):**
3. Click "🧭 Directions" button

**Expected Result:**
- New tab opens
- Google Maps opens with directions interface
- "Your location" → Worker location
- URL format: `https://www.google.com/maps/dir/?api=1&destination=LAT,LNG`

**Steps (Job Location):**
4. Click "📍 Open" on Job Location card

**Expected Result:**
- Google Maps opens showing job address
- Search results for the address displayed

---

### ✅ Scenario 6: Real-Time Updates

**Setup:**
- Provider has job detail page open
- Worker starts sharing

**Steps:**
1. Provider opens job detail page
2. Worker (on another device/browser) starts sharing
3. Watch provider's screen (no refresh)

**Expected Result:**
- Worker appears in location list automatically
- "Last updated" time updates in real-time
- No page refresh needed
- Supabase Realtime subscription working

**Steps (Stop Sharing):**
4. Worker stops sharing

**Expected Result:**
- Worker disappears from provider's list automatically
- Update happens within 1-2 seconds

---

### ✅ Scenario 7: Multiple Workers Sharing

**Setup:**
- 2+ workers confirmed for same job

**Steps:**
1. Worker A starts sharing
2. Worker B starts sharing
3. Provider views job locations

**Expected Result:**
- Provider sees both workers in list
- Each has own "Last updated" time
- Each has separate "View" and "Directions" buttons
- Locations update independently
- No interference between sessions

---

### ✅ Scenario 8: Session Expiration (2 Hours)

**Normal Testing (Fast Forward):**
1. Worker starts sharing
2. In database, manually set `expires_at` to past time:
   ```sql
   UPDATE location_sharing_sessions
   SET expires_at = NOW() - INTERVAL '1 minute'
   WHERE worker_id = '<WORKER_ID>';
   ```
3. Provider refreshes job detail page

**Expected Result:**
- Worker no longer appears in provider's location list
- Worker can restart sharing (creates new session)

---

### ✅ Scenario 9: Page Reload Persistence

**Steps:**
1. Worker starts sharing
2. Close browser tab
3. Reopen tab and navigate to job detail

**Expected Result:**
- Sharing status restored automatically
- Button shows "Stop Sharing" (red)
- `watchPosition()` restarts automatically
- Location continues updating
- Provider sees location throughout

**Important:**
- Only works if worker REOPENS the page
- Does NOT work if browser is closed (not a background service)

---

### ✅ Scenario 10: GPS Unavailable

**Steps:**
1. Worker starts sharing
2. Simulate GPS failure:
   - On mobile: Turn off location services mid-session
   - On desktop: Use browser DevTools → Sensors → Location → Unavailable

**Expected Result:**
- Error appears: "Location error: Location unavailable"
- Sharing stops automatically
- Worker can try again once GPS is available

---

## Edge Cases

### Worker Confirms Then Cancels Job
- Location sharing section disappears
- Active session automatically becomes invalid (RLS policy)

### Job Status Changes to 'cancelled'
- Location sharing disabled
- Active sessions expire

### Worker Not Confirmed
- Location sharing section not visible
- Cannot create session (RLS prevents it)

### Provider Views Wrong Job
- Cannot see other providers' workers
- RLS filters to only their jobs

### No Browser Geolocation Support
- Error: "Geolocation is not supported by your browser"
- Cannot start sharing
- Rare (95%+ browser support)

---

## Privacy Verification

### ✅ Confirm NO Background Tracking
1. Worker starts sharing
2. Close browser completely
3. Wait 5 minutes
4. Provider checks location

**Expected:**
- Location frozen at last update
- No new updates while browser closed
- Privacy maintained

### ✅ Confirm Location History NOT Stored
1. Worker shares location
2. Check database:
   ```sql
   SELECT * FROM location_sharing_sessions 
   WHERE worker_id = '<WORKER_ID>';
   ```

**Expected:**
- Only ONE row per worker per job
- No history table
- Only latest `latitude`, `longitude`, `last_updated_at`

### ✅ Confirm Explicit Consent Required
1. Try to start sharing
2. Dismiss consent dialog

**Expected:**
- Sharing does not start
- No permission request
- Must click "Start Sharing" in dialog

---

## Troubleshooting

### Worker: "Start Sharing" button does nothing
- Check: Is job confirmed?
- Check: Is job status 'open'?
- Check: Browser console for errors

### Worker: Permission denied error
- Browser blocked location access
- Fix: Browser settings → Site permissions → Location → Allow
- Chrome: chrome://settings/content/location
- Firefox: about:preferences#privacy

### Provider: Cannot see any workers
- Check: Are workers confirmed for THIS job?
- Check: Have workers started sharing?
- Check: Browser console for Realtime errors
- Verify: RLS policies allow provider access

### Location never updates
- Check: Worker's page is still open?
- Check: `expires_at` not in past?
- Check: `sharing_enabled = true` in database?
- Check: Network tab shows POST requests to Supabase?

### Google Maps links don't work
- Check: Pop-up blocker?
- Check: URL includes coordinates?
- Verify: Coordinates are not null

---

## Database Verification

### Check Active Sessions
```sql
SELECT 
  ls.*,
  p.full_name as worker_name,
  cj.event_name
FROM location_sharing_sessions ls
JOIN profiles p ON p.id = ls.worker_id
JOIN catering_jobs cj ON cj.id = ls.job_id
WHERE ls.sharing_enabled = true
  AND ls.expires_at > NOW();
```

### Check RLS Policies
```sql
-- Workers can manage their own sessions
SELECT * FROM location_sharing_sessions 
WHERE worker_id = auth.uid();

-- Providers can view their jobs' sessions
SELECT ls.* 
FROM location_sharing_sessions ls
JOIN catering_jobs cj ON cj.id = ls.job_id
WHERE cj.provider_id = auth.uid()
  AND ls.sharing_enabled = true
  AND ls.expires_at > NOW();
```

---

## Performance Notes

- Location update frequency: Every ~5-10 seconds (GPS dependent)
- Realtime latency: 1-2 seconds
- Battery impact: Moderate (GPS active)
- Data usage: Minimal (few KB per update)
- Concurrent workers: Tested up to 10 workers per job

---

## Browser Compatibility

### ✅ Supported
- Chrome 80+
- Firefox 75+
- Safari 14+
- Edge 80+
- Mobile browsers (iOS Safari, Chrome Android)

### ❌ Not Supported
- Internet Explorer
- Very old browsers without Geolocation API

---

## Success Checklist

After testing all scenarios, verify:

- [ ] Worker can start sharing with consent
- [ ] Worker can stop sharing anytime
- [ ] Provider sees locations in real-time
- [ ] Google Maps links work
- [ ] Multiple workers work simultaneously
- [ ] Page reload preserves state
- [ ] Privacy: no background tracking
- [ ] Privacy: no location history
- [ ] Error handling for denied permissions
- [ ] Error handling for GPS unavailable
- [ ] RLS policies work correctly
- [ ] Session expiration works
- [ ] No TypeScript errors
- [ ] Build succeeds
- [ ] Mobile responsive UI

All tests passed? Module 7 is complete! ✅
