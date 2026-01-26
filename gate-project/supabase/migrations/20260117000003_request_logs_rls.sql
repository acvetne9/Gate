-- Add RLS policies for request_logs to allow admin access

-- Enable RLS on request_logs if not already enabled
ALTER TABLE public.request_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own site logs" ON public.request_logs;
DROP POLICY IF EXISTS "Admins can view all logs" ON public.request_logs;
DROP POLICY IF EXISTS "Service role insert logs" ON public.request_logs;

-- Policy: Users can view logs for their own sites
CREATE POLICY "Users can view own site logs"
  ON public.request_logs
  FOR SELECT
  USING (
    customer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.sites
      WHERE sites.id = request_logs.site_id
      AND sites.customer_id = auth.uid()
    )
  );

-- Policy: Admins can view ALL logs
CREATE POLICY "Admins can view all logs"
  ON public.request_logs
  FOR SELECT
  USING (public.is_admin());

-- Policy: Allow inserts (for check-access edge function using service role)
CREATE POLICY "Service role insert logs"
  ON public.request_logs
  FOR INSERT
  WITH CHECK (true);
