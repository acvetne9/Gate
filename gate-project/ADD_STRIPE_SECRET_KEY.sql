-- Run this SQL in Supabase SQL Editor to add Stripe Secret Key field to admin dashboard
-- Go to: https://supabase.com/dashboard/project/bakzzkadgmyvvvnpuvki/sql/new

INSERT INTO app_settings (key, value, description, is_sensitive, category)
VALUES (
  'stripe_secret_key',
  'sk_test_your_stripe_secret_key_here',
  'Stripe secret key for API authentication (SENSITIVE - Never expose publicly)',
  true,
  'stripe'
)
ON CONFLICT (key) DO UPDATE SET
  description = EXCLUDED.description,
  is_sensitive = EXCLUDED.is_sensitive,
  category = EXCLUDED.category;

-- After running this, go to your Admin Dashboard > Settings Management
-- Update the value with your real Stripe secret key from: https://dashboard.stripe.com/apikeys
