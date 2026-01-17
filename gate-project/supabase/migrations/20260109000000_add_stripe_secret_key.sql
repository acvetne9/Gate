-- Add stripe_secret_key to app_settings table
-- This allows admins to manage the Stripe secret key through the UI instead of environment variables

INSERT INTO app_settings (key, value, description, is_sensitive, category)
VALUES (
  'stripe_secret_key',
  'sk_test_your_stripe_secret_key_here',
  'Stripe secret key for API authentication (SENSITIVE - Never expose publicly)',
  true,
  'stripe'
)
ON CONFLICT (key) DO NOTHING;
