-- Fix the security definer view issue by recreating recent_request_logs without SECURITY DEFINER
DROP VIEW IF EXISTS public.recent_request_logs;

CREATE VIEW public.recent_request_logs AS
SELECT 
  id,
  site_id,
  customer_id,
  timestamp,
  type,
  status,
  ip,
  page,
  user_agent,
  decision_reason
FROM public.request_logs
ORDER BY timestamp DESC
LIMIT 1000;

-- Fix handle_new_user function search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', ''),
    COALESCE(new.raw_user_meta_data->>'role', 'customer')
  );
  RETURN new;
END;
$$;