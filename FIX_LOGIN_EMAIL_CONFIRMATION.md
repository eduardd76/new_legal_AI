# Fix: Login Not Working After Successful Signup

## Problem
- ✅ Signup works successfully
- ❌ Login fails with same credentials
- User gets stuck on login page or sees "Invalid credentials" error

## Most Likely Cause: Email Confirmation Required

Supabase has **email confirmation enabled by default**. When you sign up:
1. ✅ Account is created
2. 📧 Confirmation email is sent
3. ❌ You cannot login **until you click the confirmation link**

## Solution 1: Confirm Your Email (Recommended for Production)

1. Check your email inbox for message from Supabase
2. Look for subject like "Confirm your signup"
3. Click the confirmation link
4. ✅ Now try logging in again

**If you didn't receive the email:**
- Check spam/junk folder
- Wait a few minutes and try again
- Use a different email address to test

## Solution 2: Disable Email Confirmation (For Development Only)

**⚠️ Only do this for development/testing - not recommended for production!**

1. Go to **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project: **contract-review-ai**
3. Click **Authentication** in left sidebar
4. Click **Settings** tab (or **Providers** → **Email**)
5. Find **"Enable email confirmations"**
6. **Toggle it OFF** (disable)
7. Click **Save**

After disabling:
- New signups won't need email confirmation
- Existing unconfirmed users still need confirmation
- **Create a new test account** to test login

## Solution 3: Auto-confirm Users (Alternative)

If you want signups to work immediately without email confirmation, add this to Supabase:

1. Go to **Database** → **Functions**
2. Create new function:

```sql
-- Auto-confirm user emails on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Auto-confirm the email
  NEW.email_confirmed_at = NOW();
  NEW.confirmed_at = NOW();
  RETURN NEW;
END;
$$;

-- Trigger before insert on auth.users
CREATE TRIGGER on_auth_user_created
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

**Note:** This bypasses email verification - use only for development!

## Verify the Fix

After applying one of the solutions above:

1. **Create a NEW test account:**
   - Go to https://contract-review-ai.vercel.app/signup
   - Use a different email (e.g., test2@example.com)
   - Complete signup

2. **Try logging in:**
   - Go to https://contract-review-ai.vercel.app/login
   - Enter the NEW credentials
   - Click "Sign In"

3. **Expected result:**
   - ✅ Redirects to `/dashboard`
   - ✅ Shows "Welcome back, [Your Name]"
   - ✅ Stays logged in on page refresh

## How to Check Current Email Confirmation Setting

Run this in Supabase SQL Editor:

```sql
SELECT
  raw_app_meta_data->>'provider' as provider,
  raw_app_meta_data->>'providers' as providers,
  email_confirmed_at,
  confirmed_at,
  email
FROM auth.users
WHERE email = 'your-test-email@example.com';
```

If `email_confirmed_at` is `NULL`, the email isn't confirmed yet.

## Still Not Working?

If login still fails after disabling email confirmation:

1. **Check browser console** for errors (F12 → Console tab)
2. **Check Network tab** (F12 → Network tab)
   - Filter for `login`
   - Check the API response
   - Look for status code and error message

3. **Run the diagnostic script:**
   ```bash
   python test_login_simple.py
   ```
   And enter your test credentials

4. **Share the error message** so I can diagnose further!
