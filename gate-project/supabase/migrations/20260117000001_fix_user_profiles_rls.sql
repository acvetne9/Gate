-- Fix infinite recursion in user_profiles RLS policies
-- The issue is that the admin check queries user_profiles, which triggers the policy again

-- Create a security definer function to check if user is admin
-- This bypasses RLS when checking the role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
$$;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Service role insert" ON public.user_profiles;

-- Policy: Users can view their own profile OR if they are admin
CREATE POLICY "Users can view profiles"
  ON public.user_profiles
  FOR SELECT
  USING (
    auth.uid() = id
    OR public.is_admin()
  );

-- Policy: Users can update their own profile OR admins can update any
CREATE POLICY "Users can update profiles"
  ON public.user_profiles
  FOR UPDATE
  USING (
    auth.uid() = id
    OR public.is_admin()
  );

-- Policy: Allow inserts (for handle_new_user trigger)
CREATE POLICY "Service role insert"
  ON public.user_profiles
  FOR INSERT
  WITH CHECK (true);
