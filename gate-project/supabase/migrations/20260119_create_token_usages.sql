-- Create table to record one-time token usages
CREATE TABLE IF NOT EXISTS public.token_usages (
  jti TEXT PRIMARY KEY,
  site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

COMMENT ON TABLE public.token_usages IS 'Records one-time JWT jti values to prevent replay.';
