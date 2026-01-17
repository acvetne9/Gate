-- Create global_settings table for admin configuration
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.global_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  enabled BOOLEAN DEFAULT true,
  api_url TEXT DEFAULT '',
  subscribe_url TEXT DEFAULT '',
  login_url TEXT DEFAULT '',
  redirect_immediately BOOLEAN DEFAULT false,
  default_blocked_bots TEXT[] DEFAULT ARRAY['GPTBot', 'ClaudeBot', 'CCBot', 'ChatGPT-User', 'Google-Extended', 'anthropic-ai', 'Omgilibot', 'Bytespider'],
  default_paywall_type TEXT DEFAULT 'metered',
  default_metered_limit INTEGER DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create only one row for global settings
INSERT INTO public.global_settings (enabled, api_url, subscribe_url, login_url, redirect_immediately, default_paywall_type, default_metered_limit)
VALUES (
  true,
  'https://your-project.supabase.co/functions/v1/check-access',
  '',
  '',
  false,
  'metered',
  3
)
ON CONFLICT DO NOTHING;

-- Enable Row Level Security
ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can read global settings
CREATE POLICY "Admins can read global settings"
ON public.global_settings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Policy: Only admins can update global settings
CREATE POLICY "Admins can update global settings"
ON public.global_settings
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_global_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_global_settings_timestamp
BEFORE UPDATE ON public.global_settings
FOR EACH ROW
EXECUTE FUNCTION update_global_settings_updated_at();
