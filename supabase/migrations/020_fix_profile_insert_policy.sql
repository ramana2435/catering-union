-- Migration 020: Fix profile INSERT policy for signup
-- The existing policy is blocking profile creation during signup
-- This migration relaxes the INSERT policy to allow authenticated users to create their own profile

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "profiles_insert_own_non_admin" ON profiles;

-- Create new INSERT policy that allows authenticated users to create their own profile
-- Only for their own auth.uid() and only with worker/provider roles
CREATE POLICY "profiles_insert_own_non_admin" ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    id = auth.uid()
    AND role IN ('worker', 'provider')
    AND account_status IN ('active', 'pending_verification')
  );

-- Add comment
COMMENT ON POLICY "profiles_insert_own_non_admin" ON profiles IS 
  'Authenticated users can create profile for their own auth.uid() with worker or provider role only. Admin role must be assigned via SQL.';
