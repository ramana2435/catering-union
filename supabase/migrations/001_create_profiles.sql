-- Migration 001: Create profiles table
-- This table stores user profile information for providers, workers, and admins
-- Each profile is linked to a Supabase Auth user

-- Create profiles table if not exists
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone_number TEXT,
  role TEXT NOT NULL CHECK (role IN ('provider', 'worker', 'admin')),
  preferred_language TEXT DEFAULT 'en',
  profile_image_url TEXT,
  account_status TEXT DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'pending_verification')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add unique constraint on phone_number (when not null)
-- This prevents duplicate phone numbers across users
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_phone_number_key'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_phone_number_key UNIQUE (phone_number);
  END IF;
END $$;

-- Create index on role for efficient filtering by user type
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Create index on account_status for filtering active/suspended users
CREATE INDEX IF NOT EXISTS idx_profiles_account_status ON profiles(account_status);

-- Add comment to table
COMMENT ON TABLE profiles IS 'User profile information linked to Supabase Auth users. Stores role-based data for providers, workers, and admins.';
COMMENT ON COLUMN profiles.role IS 'User role: provider (posts jobs), worker (applies for jobs), or admin (manages platform)';
COMMENT ON COLUMN profiles.account_status IS 'Account status: active, suspended, or pending_verification';
