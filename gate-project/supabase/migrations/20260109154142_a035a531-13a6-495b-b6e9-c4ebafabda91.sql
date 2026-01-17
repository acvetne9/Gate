-- Add Stripe Connect columns to user_profiles table
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_connected BOOLEAN DEFAULT false;