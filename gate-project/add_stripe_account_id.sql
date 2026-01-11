-- Add Stripe Account ID to app_settings
INSERT INTO app_settings (key, value, description, is_sensitive, category)
VALUES (
  'stripe_account_id',
  'acct_1SkzH9QzIlRI55yL',
  'Stripe platform account ID',
  true,
  'stripe'
)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value;
