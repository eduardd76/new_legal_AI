-- ============================================
-- VERIFY AND FIX RLS POLICIES
-- ============================================

-- Step 1: Check which RLS policies currently exist on public.users
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;

-- This should show ALL policies on the users table
-- Look for: "Users can insert own profile"

-- ============================================
-- Step 2: Check if RLS is enabled on the table
-- ============================================

SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'users';

-- rowsecurity should be TRUE

-- ============================================
-- Step 3: Fix - Drop ALL policies and recreate correctly
-- ============================================

-- Drop all existing policies (start fresh)
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Admins can manage users" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can read all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
DROP POLICY IF EXISTS "Admins can delete users" ON public.users;

-- Ensure RLS is enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create the CORRECT policies

-- 1. Allow users to INSERT their own profile during signup
CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 2. Allow users to SELECT (read) their own data
CREATE POLICY "Users can read own data" ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- 3. Allow users to UPDATE their own data
CREATE POLICY "Users can update own data" ON public.users
  FOR UPDATE
  USING (auth.uid() = id);

-- 4. Create the security definer function for admin checks
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

-- 5. Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;

-- 6. Admin policies using the safe function
CREATE POLICY "Admins can read all users" ON public.users
  FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can update all users" ON public.users
  FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can delete users" ON public.users
  FOR DELETE
  USING (public.is_admin());

-- ============================================
-- Step 4: Verify policies are created
-- ============================================

SELECT
  policyname,
  cmd,
  CASE
    WHEN cmd = 'SELECT' THEN '✅ Read'
    WHEN cmd = 'INSERT' THEN '✅ Create'
    WHEN cmd = 'UPDATE' THEN '✅ Update'
    WHEN cmd = 'DELETE' THEN '✅ Delete'
    ELSE '?'
  END as operation
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;

-- You should see:
-- - Users can insert own profile (INSERT)
-- - Users can read own data (SELECT)
-- - Users can update own data (UPDATE)
-- - Admins can read all users (SELECT)
-- - Admins can update all users (UPDATE)
-- - Admins can delete users (DELETE)

-- ============================================
-- Step 5: Test the INSERT policy
-- ============================================

-- Try to manually insert a test record (this should work now)
-- Replace YOUR_USER_ID with an actual auth.uid() value

/*
INSERT INTO public.users (id, email, full_name, role, created_at, updated_at)
VALUES (
  auth.uid(),  -- This uses the currently authenticated user's ID
  'test-from-sql@example.com',
  'SQL Test User',
  'business_user',
  NOW(),
  NOW()
);
*/

-- If you get an error about auth.uid() being null,
-- that means you're not authenticated when running the SQL
-- In that case, use the Supabase Dashboard method instead
