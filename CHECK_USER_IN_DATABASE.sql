-- ============================================
-- CHECK IF USER EXISTS IN DATABASE
-- ============================================
-- Run this in Supabase SQL Editor to check if your test user exists properly

-- Replace 'your-email@example.com' with the email you used for signup
-- Example: WHERE email = 'test@example.com'

-- Step 1: Check if user exists in auth.users (Supabase authentication)
SELECT
  id,
  email,
  email_confirmed_at,
  confirmed_at,
  created_at,
  CASE
    WHEN email_confirmed_at IS NOT NULL THEN 'Confirmed ✅'
    ELSE 'NOT CONFIRMED ❌'
  END as confirmation_status
FROM auth.users
WHERE email = 'your-email@example.com';  -- ← CHANGE THIS TO YOUR EMAIL

-- Step 2: Check if user exists in public.users (Application user table)
SELECT
  id,
  email,
  full_name,
  role,
  created_at
FROM public.users
WHERE email = 'your-email@example.com';  -- ← CHANGE THIS TO YOUR EMAIL

-- Step 3: Check if user is in BOTH tables (JOIN)
SELECT
  au.id as auth_id,
  au.email as auth_email,
  au.email_confirmed_at,
  pu.id as profile_id,
  pu.email as profile_email,
  pu.full_name,
  pu.role,
  CASE
    WHEN au.id IS NOT NULL AND pu.id IS NOT NULL THEN '✅ User in BOTH tables (GOOD)'
    WHEN au.id IS NOT NULL AND pu.id IS NULL THEN '⚠️ User in auth.users but NOT in public.users (BAD)'
    WHEN au.id IS NULL AND pu.id IS NOT NULL THEN '⚠️ User in public.users but NOT in auth.users (BAD)'
    ELSE '❌ User not found in either table'
  END as status
FROM auth.users au
FULL OUTER JOIN public.users pu ON au.id = pu.id
WHERE au.email = 'your-email@example.com' OR pu.email = 'your-email@example.com';  -- ← CHANGE THIS

-- ============================================
-- EXPECTED RESULTS
-- ============================================
-- All three queries should return 1 row each
-- The third query should show: "✅ User in BOTH tables (GOOD)"
--
-- If the user is NOT in public.users, that's the problem!
-- The signup created the auth user but failed to create the profile.

-- ============================================
-- FIX: If user is missing from public.users
-- ============================================
-- If the user exists in auth.users but NOT in public.users, run this:
/*
INSERT INTO public.users (id, email, full_name, role, created_at, updated_at)
VALUES (
  'USER_ID_FROM_AUTH_USERS',  -- Get this from the first query
  'your-email@example.com',
  'Your Full Name',
  'business_user',  -- or 'legal_professional'
  NOW(),
  NOW()
);
*/
