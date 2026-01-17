-- Enable RLS on test_logs table
ALTER TABLE public.test_logs ENABLE ROW LEVEL SECURITY;

-- Create a security definer function to check site ownership
CREATE OR REPLACE FUNCTION public.user_owns_site(_site_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.sites
    WHERE id = _site_id
      AND customer_id = auth.uid()
  )
$$;

-- Policy: Users can view test logs for their own sites
CREATE POLICY "Users see own test logs"
  ON public.test_logs
  FOR SELECT
  USING (public.user_owns_site(site_id));

-- Policy: Admins can view all test logs
CREATE POLICY "Admins see all test logs"
  ON public.test_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Users can insert test logs for their own sites
CREATE POLICY "Users can insert own test logs"
  ON public.test_logs
  FOR INSERT
  WITH CHECK (public.user_owns_site(site_id));

-- Policy: Admins can insert any test logs
CREATE POLICY "Admins can insert test logs"
  ON public.test_logs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Users can delete their own test logs
CREATE POLICY "Users can delete own test logs"
  ON public.test_logs
  FOR DELETE
  USING (public.user_owns_site(site_id));