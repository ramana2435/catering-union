-- Migration 007: Create reports table
-- Stores user reports about inappropriate or fake catering job posts
-- Enables community moderation and admin review workflow

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES catering_jobs(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on job_id for viewing all reports about a job
CREATE INDEX IF NOT EXISTS idx_reports_job_id ON reports(job_id);

-- Create index on reporter_id for user's report history
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id);

-- Create index on status and created_at for admin review queue
CREATE INDEX IF NOT EXISTS idx_reports_status_created ON reports(status, created_at);

-- Add comments
COMMENT ON TABLE reports IS 'User reports about inappropriate or fake catering job posts. Supports community moderation.';
COMMENT ON COLUMN reports.reason IS 'Primary reason for report (e.g., spam, fake, inappropriate)';
COMMENT ON COLUMN reports.description IS 'Optional detailed description provided by reporter';
COMMENT ON COLUMN reports.status IS 'Report status: pending (awaiting review), reviewed (admin viewed), resolved (action taken), or dismissed (no action needed)';
