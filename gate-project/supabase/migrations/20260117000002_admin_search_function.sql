-- Create admin search function that bypasses RLS
-- This function allows admins to search all user profiles

CREATE OR REPLACE FUNCTION public.admin_search_customers(search_term text)
RETURNS TABLE (
  id uuid,
  email text,
  name text,
  role text,
  created_at timestamptz,
  stripe_customer_id text,
  subscription_tier text,
  subscription_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- First verify the caller is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  -- Return matching profiles
  RETURN QUERY
  SELECT
    up.id,
    up.email,
    up.name,
    up.role,
    up.created_at,
    up.stripe_customer_id,
    up.subscription_tier,
    up.subscription_status
  FROM public.user_profiles up
  WHERE
    search_term = ''
    OR search_term IS NULL
    OR up.email ILIKE '%' || search_term || '%'
    OR up.name ILIKE '%' || search_term || '%'
  ORDER BY up.created_at DESC
  LIMIT 50;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.admin_search_customers(text) TO authenticated;
