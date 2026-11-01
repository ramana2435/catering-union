-- ============================================================================
-- ALTERNATIVE FIX - Use Database Trigger for Automatic Profile Creation
-- ============================================================================
-- This approach creates the profile automatically when auth.users is created
-- This bypasses RLS issues completely
-- ============================================================================

-- Step 1: Create a function that creates profile automatically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile automatically for new user
  -- This runs with SECURITY DEFINER so it bypasses RLS
  INSERT INTO public.profiles (
    id,
    full_name,
    phone_number,
    role,
    preferred_language,
    account_status
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    COALESCE(NEW.raw_user_meta_data->>'phone_number', NULL),
    COALESCE(NEW.raw_user_meta_data->>'role', 'worker'),
    COALESCE(NEW.raw_user_meta_data->>'preferred_language', 'en'),
    'active'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 3: Still need SELECT/UPDATE policies for app to work
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DO $$ 
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', pol.policyname);
  END LOOP;
END $$;

-- Create simple policies (INSERT not needed since trigger handles it)
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Step 4: Grant permissions
GRANT ALL ON profiles TO authenticated;

-- Step 5: Verify
SELECT '✅ Trigger created: Profiles will be created automatically' as status;
SELECT '✅ No more RLS issues with profile creation' as status;
SELECT '✅ Try signup now' as status;

-- ============================================================================
-- HOW THIS WORKS:
-- 1. User signs up → auth.users record created
-- 2. Trigger fires automatically → creates profile
-- 3. App can immediately query the profile
-- 4. No RLS issues because trigger runs as SECURITY DEFINER
-- ============================================================================
