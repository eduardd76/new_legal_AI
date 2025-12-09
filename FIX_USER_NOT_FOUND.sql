-- ============================================
-- FIX: User Not Found in Database
-- ============================================

-- Step 1: Check if there are ANY users in the database
SELECT
  au.email as auth_email,
  au.created_at as auth_created,
  pu.email as profile_email,
  pu.full_name,
  pu.role
FROM auth.users au
FULL OUTER JOIN public.users pu ON au.id = pu.id
ORDER BY au.created_at DESC
LIMIT 10;

-- If this returns no rows, the database is empty (no users at all)
-- If this returns some rows, check if your email is there

-- ============================================
-- Step 2: Create a test user manually
-- ============================================

-- Since signup isn't working, let's create a user manually
-- This will bypass the signup form and create a working user

-- IMPORTANT: Run these queries ONE AT A TIME, not all together

-- 2A: Create the auth user (this creates the Supabase authentication account)
-- You'll get a user ID back - SAVE THIS ID for the next step

-- Go to: Dashboard → Authentication → Users → "Add User"
-- Or run this in SQL Editor:

-- NOTE: You cannot create auth.users directly via SQL in most cases
-- Instead, use the Supabase Dashboard:
-- 1. Go to Authentication → Users
-- 2. Click "Add User" button
-- 3. Enter:
--    Email: test@example.com
--    Password: Test123456!
--    Auto Confirm User: YES (check this box!)
-- 4. Click "Create User"
-- 5. Copy the User ID that appears

-- ============================================
-- Step 3: Add the user to public.users table
-- ============================================

-- After creating the user in Supabase Dashboard,
-- run this query (replace USER_ID_HERE with the ID you copied):

INSERT INTO public.users (id, email, full_name, role, created_at, updated_at)
VALUES (
  'USER_ID_HERE',  -- ← Replace with the ID from Supabase Dashboard
  'test@example.com',
  'Test User',
  'business_user',
  NOW(),
  NOW()
);

-- ============================================
-- Alternative: Use Supabase Dashboard to Verify Signup
-- ============================================

-- Try signing up again through the website:
-- 1. Go to https://contract-review-ai.vercel.app/signup
-- 2. Fill in:
--    Email: newtest@example.com
--    Password: Test123456!
--    Full Name: New Test
--    Role: Business User
-- 3. Click Create Account
-- 4. Immediately check if user was created:

SELECT
  au.id,
  au.email,
  au.email_confirmed_at,
  pu.email as profile_email,
  pu.full_name
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.email = 'newtest@example.com';

-- If this returns a row with:
-- - auth.email filled = user created in Supabase Auth ✅
-- - profile_email NULL = profile NOT created in public.users ❌

-- Then the problem is the RLS policy blocking INSERT into public.users
-- Fix: The RLS policy we created should have fixed this, but let's verify:

-- Check if the INSERT policy exists:
SELECT * FROM pg_policies WHERE tablename = 'users' AND policyname = 'Users can insert own profile';

-- If it doesn't exist, create it:
CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);
