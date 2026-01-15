-- Migration: Add bot payment settings to user profiles
-- Created: 2025-01-03

-- Add columns for Stripe Connect and bot payment settings
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_connected BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS bot_payment_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS bot_payment_amount INTEGER; -- In cents, for MAX plan users to set custom amount

-- Add index for Stripe account lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe_account_id
ON public.user_profiles(stripe_account_id)
WHERE stripe_account_id IS NOT NULL;

-- Comments
COMMENT ON COLUMN public.user_profiles.stripe_account_id IS 'Connected Stripe account ID for receiving bot payments';
COMMENT ON COLUMN public.user_profiles.stripe_connected IS 'Whether user has connected their Stripe account';
COMMENT ON COLUMN public.user_profiles.bot_payment_enabled IS 'Whether bot payment collection is enabled';
COMMENT ON COLUMN public.user_profiles.bot_payment_amount IS 'Custom bot payment amount in cents (for MAX plan only)';
