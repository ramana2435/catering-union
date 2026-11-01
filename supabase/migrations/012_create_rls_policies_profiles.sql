-- =====================================================
-- Migration: 012_create_rls_policies_profiles.sql
-- Description: Row Level Security policies for profiles table
-- =====================================================

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "profiles_select_public_info" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own_full" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own_non_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own_limited" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_select_all" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_update_all" ON profiles;

-- =====================================================
-- SELECT POLICIES
-- =====================================================

-- Policy 1: All authenticated users can read public profile information
CREATE POLICY "profiles_select_public_info" ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Note: The above policy allows SELECT but application layer should filter
-- sensitive fields. For row-level granularity, use:
-- SELECT id, full_name, role, profile_image_url FROM profiles (public fields)
-- vs SELECT * FROM profiles WHERE id = auth.uid() (all fields for own profile)

-- Policy 2: Admin can SELECT all fields from all profiles
CREATE POLICY "profiles_admin_select_all" ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- INSERT POLICIES
-- =====================================================

-- Policy 3: Users can create profile for their own auth.users.id
-- Block self-assignment of admin role
CREATE POLICY "profiles_insert_own_non_admin" ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    id = auth.uid()
    AND role IN ('worker', 'provider')
  );

-- =====================================================
-- UPDATE POLICIES
-- =====================================================

-- Policy 4: Users can update own profile but CANNOT change role or account_status
CREATE POLICY "profiles_update_own_limited" ON profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND NEW.role = OLD.role
    AND NEW.account_status = OLD.account_status
  );

-- Policy 5: Admins can update any field including role and account_status
CREATE POLICY "profiles_admin_update_all" ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- NO DELETE POLICIES (preserve data integrity)
-- =====================================================
-- Profiles should never be deleted to maintain referential integrity
-- Use account_status = 'suspended' instead
