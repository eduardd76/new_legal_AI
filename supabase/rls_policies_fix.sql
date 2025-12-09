-- ============================================
-- FIX: Remove infinite recursion in users table policies
-- ============================================

-- Step 1: Drop the problematic admin policy
DROP POLICY IF EXISTS "Admins can manage users" ON public.users;

-- Step 2: Add INSERT policy for new user signups
CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Step 3: Create a security definer function to check admin role
-- This avoids RLS recursion by bypassing RLS when checking the role
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

-- Step 4: Recreate admin policies using the security definer function
CREATE POLICY "Admins can read all users" ON public.users
  FOR SELECT USING (public.is_admin() OR auth.uid() = id);

CREATE POLICY "Admins can update all users" ON public.users
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins can delete users" ON public.users
  FOR DELETE USING (public.is_admin());

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
