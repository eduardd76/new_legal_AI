-- Fix: Add RLS policy to allow users to INSERT their own profile
-- This fixes the signup flow

DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);
