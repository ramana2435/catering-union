-- Migration 004: Create worker_attendance table
-- Stores real-time attendance and arrival status for workers
-- Tracks progression from confirmed -> getting_ready -> on_the_way -> arrived -> present

CREATE TABLE IF NOT EXISTS worker_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES catering_jobs(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  attendance_status TEXT DEFAULT 'confirmed' CHECK (
    attendance_status IN (
      'confirmed', 
      'getting_ready', 
      'on_the_way', 
      'arrived', 
      'present', 
      'absent', 
      'cancelled'
    )
  ),
  arrival_time TIMESTAMPTZ,
  marked_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on job_id and worker_id for efficient lookups
CREATE INDEX IF NOT EXISTS idx_worker_attendance_job_worker ON worker_attendance(job_id, worker_id);

-- Create index on attendance_status for filtering by status
CREATE INDEX IF NOT EXISTS idx_worker_attendance_status ON worker_attendance(attendance_status);

-- Add comments
COMMENT ON TABLE worker_attendance IS 'Real-time attendance tracking for workers. Records progression from confirmation through arrival to presence.';
COMMENT ON COLUMN worker_attendance.attendance_status IS 'Current attendance status: confirmed, getting_ready, on_the_way, arrived, present, absent, or cancelled';
COMMENT ON COLUMN worker_attendance.arrival_time IS 'Timestamp when worker marked as arrived at job location';
COMMENT ON COLUMN worker_attendance.marked_by IS 'User who last updated the attendance status (worker themselves or provider/admin)';
