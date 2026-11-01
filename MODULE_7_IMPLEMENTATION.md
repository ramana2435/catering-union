# Module 7: Optional Worker Location Sharing and Google Maps Navigation

## Implementation Summary

Successfully implemented voluntary, privacy-first location sharing with browser geolocation API, provider live view, and Google Maps navigation.

## Components Created

### 1. LocationSharingToggle.tsx
**Purpose**: Worker-side component for voluntary location sharing

**Features**:
- ✅ Off by default - requires explicit consent
- ✅ Consent dialog explains what happens when sharing starts
- ✅ Browser permission request only after consent
- ✅ `navigator.geolocation.watchPosition()` for real-time tracking
- ✅ Automatic cleanup with `clearWatch()` on stop/unmount
- ✅ 2-hour session expiration
- ✅ Visual feedback (last update time, status)
- ✅ Error handling for permission denied, unavailable, timeout
- ✅ Clear privacy notice: "only while app is open"

**Location**:
- Worker job detail page: `src/pages/WorkerJobDetail.tsx`
- Shows only for confirmed workers on open jobs

**Database Operations**:
- `startLocationSharing(jobId, workerId, 2)` - creates session with 2-hour expiry
- `updateWorkerLocation(jobId, workerId, lat, lng)` - updates location on watch callback
- `stopLocationSharing(jobId, workerId)` - ends session and disables sharing

### 2. ProviderLocationView.tsx
**Purpose**: Provider-side component to view worker locations in real-time

**Features**:
- ✅ Displays all workers currently sharing location for the job
- ✅ Real-time updates via Supabase subscription
- ✅ Worker name, phone, last update time
- ✅ Google Maps links (no API key required):
  - "View on Map" - opens worker's current location
  - "Directions" - opens Google Maps directions to worker
- ✅ Job location "Open in Maps" button (if address/coords available)
- ✅ Coordinate display for reference
- ✅ Auto-updates when location_sharing_sessions change

**Location**:
- Provider attendance dashboard: `src/components/attendance/ProviderAttendanceDashboard.tsx`

**Database Operations**:
- `getJobLocationSessions(jobId)` - fetches active sessions with worker profiles
- Real-time subscription on `location_sharing_sessions` table

## Google Maps Integration

### URL Formats (No API Key Required)

1. **View Location**:
   ```
   https://www.google.com/maps?q=LAT,LNG
   ```

2. **Directions**:
   ```
   https://www.google.com/maps/dir/?api=1&destination=LAT,LNG
   ```

3. **Search by Address**:
   ```
   https://www.google.com/maps/search/?api=1&query=ENCODED_ADDRESS
   ```

All links open in new tab with `target="_blank" rel="noopener noreferrer"`.

## Database Schema

### Existing Table: `location_sharing_sessions`
```sql
CREATE TABLE location_sharing_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES catering_jobs(id) ON DELETE CASCADE NOT NULL,
  worker_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  latitude decimal(10, 8),
  longitude decimal(11, 8),
  sharing_enabled boolean DEFAULT false,
  started_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  last_updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(job_id, worker_id)
);
```

### RLS Policies
- ✅ Workers: select/insert/update/delete own sessions
- ✅ Providers: select sessions for their jobs (non-expired only)

## Browser Geolocation API

### Configuration
```javascript
navigator.geolocation.watchPosition(
  successCallback,
  errorCallback,
  {
    enableHighAccuracy: true,  // Use GPS if available
    timeout: 10000,             // 10 second timeout
    maximumAge: 0               // No caching
  }
)
```

### Error Handling
- `PERMISSION_DENIED` - User denied location access
- `POSITION_UNAVAILABLE` - Location not available (GPS off, etc.)
- `TIMEOUT` - Request took too long

All errors automatically stop sharing and show user-friendly message.

## Privacy & Limitations

### What This IS:
✅ Voluntary location sharing while app is open
✅ Worker must explicitly consent
✅ Real-time updates while sharing is active
✅ Provider sees latest location only (no history)
✅ Automatic 2-hour expiration
✅ Worker can stop at any time

### What This IS NOT:
❌ Background tracking (requires app to be open)
❌ Location history storage (only latest position)
❌ Automatic check-in/check-out
❌ Continuous tracking after browser/tab closes
❌ Tracking without consent

### Browser Limitations
- ⚠️ `watchPosition()` only works while browser tab is active
- ⚠️ Closing the app/tab stops location updates automatically
- ⚠️ Background location requires native mobile app (not web)
- ⚠️ Battery drain increases with GPS usage

## Real-Time Updates

### Worker Side (LocationSharingToggle)
- Checks existing session on mount
- Restarts watch if valid session exists
- Cleans up watch on unmount
- Updates location every GPS callback

### Provider Side (ProviderLocationView)
```javascript
supabase
  .channel(`location-sessions-${jobId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'location_sharing_sessions',
    filter: `job_id=eq.${jobId}`
  }, () => {
    loadLocationSessions()
  })
  .subscribe()
```

## Testing Scenarios

### ✅ 1. Worker Starts Sharing (Happy Path)
1. Worker confirms job
2. Click "Start Sharing"
3. See consent dialog
4. Click "Start Sharing" again
5. Browser asks for location permission
6. Worker approves
7. Status changes to "Stop Sharing" (green)
8. Last update time appears

### ✅ 2. Worker Denies Permission
1. Start sharing process
2. Browser asks for permission
3. Worker clicks "Block"
4. Error shown: "Location permission denied"
5. Sharing does not start

### ✅ 3. Worker Stops Sharing
1. While sharing is active
2. Click "Stop Sharing"
3. Watch is cleared
4. Status changes to "Start Sharing"
5. Provider no longer sees worker's location

### ✅ 4. Provider Views Locations
1. Provider opens job detail
2. Sees "Worker Locations" section
3. If job has address/coords, sees "Job Location" with "Open" button
4. For each sharing worker, sees:
   - Name, phone
   - Last update time
   - "View on Map" button
   - "Directions" button
5. Clicks button → Opens Google Maps in new tab

### ✅ 5. Real-Time Updates
1. Worker starts sharing
2. Provider page is already open
3. Worker appears in list immediately (via Realtime)
4. Location updates reflect in "Last updated" time
5. Worker stops sharing
6. Worker disappears from list

### ✅ 6. Job Location Navigation
1. Provider views job with address
2. Clicks "Open" on Job Location card
3. Google Maps opens showing job address
4. Works with coordinates or text address

### ✅ 7. Multiple Workers Sharing
1. Multiple workers confirm same job
2. Each starts sharing independently
3. Provider sees all sharing workers
4. Each has separate update time
5. Each has own "View" and "Directions" buttons

### ✅ 8. Session Expiration (2 hours)
1. Worker starts sharing
2. Wait 2 hours (or manually update expires_at in DB)
3. Session automatically becomes invalid
4. Provider no longer sees worker
5. Worker can restart sharing

### ✅ 9. Page Reload Persistence
1. Worker starts sharing
2. Close and reopen worker job detail
3. Sharing status restored
4. watchPosition automatically restarts
5. Provider continues seeing location

### ✅ 10. GPS Unavailable
1. Worker starts sharing
2. GPS disabled or unavailable
3. Error shown: "Location unavailable"
4. Sharing stops automatically

## File Changes

### New Files
1. `src/components/LocationSharingToggle.tsx` - Worker location sharing toggle
2. `src/components/ProviderLocationView.tsx` - Provider location view

### Modified Files
1. `src/pages/WorkerJobDetail.tsx` - Added LocationSharingToggle for confirmed workers
2. `src/components/attendance/ProviderAttendanceDashboard.tsx` - Added ProviderLocationView
3. `src/pages/ProviderJobDetail.tsx` - Pass jobLocation prop to attendance dashboard

### No Database Changes
- ✅ Reused existing `location_sharing_sessions` table from Module 2
- ✅ RLS policies already correct
- ✅ Helper functions already exist in `src/lib/database.ts`

## Success Criteria

✅ Location sharing is off by default
✅ Worker must give explicit consent before permission request
✅ Uses `navigator.geolocation.watchPosition()` correctly
✅ Cleanup with `clearWatch()` on stop/unmount
✅ No background tracking or location without consent
✅ Provider can view latest locations in real-time
✅ Google Maps links work without API key
✅ Real-time updates via Supabase subscriptions
✅ Mobile-first responsive UI
✅ Privacy-first: clear notices about limitations
✅ Error handling for all geolocation error codes
✅ Workers can only manage their own sessions
✅ Providers can only view locations for their jobs
✅ No misleading claims about background tracking or scheduled cleanup
✅ TypeScript type-check passes
✅ Build successful (9.22s, 505.58 KB)
✅ Uses emoji icons (no external icon library required)

## Next Steps (Future Enhancements)

### Optional Improvements:
- 📱 Native mobile app for true background tracking
- 🗺️ Embedded map view (requires Google Maps API key + billing)
- 📊 Location history/breadcrumb trail
- 🔔 Push notifications when worker arrives at job
- 🚗 ETA calculation based on current location
- 📍 Geofencing (automatic check-in when near job)
- 🔋 Battery optimization settings
- 📷 Photo upload with location proof

### Not Implemented (Out of Scope):
- Background GPS tracking (requires native app)
- Scheduled cleanup job (Supabase cron/edge functions)
- Location history storage
- Payment/incentive features
- Automatic check-in based on location
- Offline location queueing

## Documentation Updated

- ✅ Clear browser limitations documented
- ✅ Privacy-first approach explained
- ✅ No false claims about background tracking
- ✅ Consent flow documented
- ✅ Testing scenarios provided
- ✅ Google Maps URL format documented
