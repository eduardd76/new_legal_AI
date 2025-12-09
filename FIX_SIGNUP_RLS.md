# Fix: Infinite Recursion in Users Table RLS Policies

## Problem
When trying to create a new user account, you get:
```
infinite recursion detected in policy for relation "users"
```

## Root Cause
The "Admins can manage users" policy in `supabase/rls_policies.sql` creates a circular reference:
- Policy is ON `public.users` table
- Policy checks `public.users` table to verify if user is admin
- This triggers the policy again → infinite loop

## Solution

### Step 1: Access Supabase SQL Editor
1. Go to https://supabase.com/dashboard
2. Select your project: `contract-review-ai`
3. Click **SQL Editor** in the left sidebar
4. Click **New query**

### Step 2: Run the Fix SQL
Copy and paste the contents of `supabase/rls_policies_fix.sql` into the SQL Editor and click **Run**.

The fix:
1. ✅ Removes the problematic "Admins can manage users" policy
2. ✅ Adds INSERT policy for new user signups
3. ✅ Creates a SECURITY DEFINER function to check admin status (bypasses RLS)
4. ✅ Recreates admin policies using the safe function

### Step 3: Verify the Fix
After running the SQL, test signup:
1. Go to https://contract-review-ai.vercel.app/signup
2. Fill in the form with:
   - Full Name: Test User
   - Email: testuser@example.com
   - Password: TestPassword123!
   - Role: Business User
3. Click "Create Account"
4. ✅ Should succeed without recursion error

### Step 4: Test Login
1. Go to https://contract-review-ai.vercel.app/login
2. Sign in with the account you just created
3. ✅ Should redirect to dashboard and stay logged in

## Technical Details

### What Changed

**Before (Broken):**
```sql
CREATE POLICY "Admins can manage users" ON public.users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users  -- ← Recursion!
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

**After (Fixed):**
```sql
-- Allow new user signups
CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Safe admin check function (bypasses RLS)
CREATE FUNCTION public.is_admin() RETURNS boolean
SECURITY DEFINER  -- ← This is the key!
AS $$ ... $$;

-- Admin policies using the safe function
CREATE POLICY "Admins can read all users" ON public.users
  FOR SELECT USING (public.is_admin() OR auth.uid() = id);
```

The `SECURITY DEFINER` function runs with the permissions of the function owner (bypassing RLS), preventing the infinite loop.

## Verification

After applying the fix, these operations should work:
- ✅ New user signup (INSERT into users table)
- ✅ User login and profile reading (SELECT from users table)
- ✅ User profile updates (UPDATE users table)
- ✅ Admin users can manage other users

## Rollback (If Needed)

If something goes wrong, you can restore the original policies:
```sql
-- Remove all policies
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can read all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
DROP POLICY IF EXISTS "Admins can delete users" ON public.users;
DROP FUNCTION IF EXISTS public.is_admin();

-- Restore original (but broken) policy
CREATE POLICY "Admins can manage users" ON public.users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

Then apply the fix again.
