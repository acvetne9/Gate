-- Insert default settings (bypassing RLS by running as superuser in migration)
-- This runs during migration with elevated privileges

INSERT INTO app_settings (key, value, description, is_sensitive, category) VALUES
  ('stripe_publishable_key', 'pk_live_51SkzH9QzIlRI55yLTxHWq9F7lACX4vvzVV66uGeyJjAsWB3fVV6h71DpezjIgrcD7Hi0Wb7UY5wWp4trvrLjbgmC00vK933Njj', 'Stripe publishable key (safe to expose)', false, 'stripe'),
  ('stripe_keeper_price_id', 'prod_TiQr8gEqB8Q6Km', 'Stripe price ID for Keeper plan', false, 'stripe'),
  ('stripe_max_price_id', 'prod_TiQsIG6aaOSikC', 'Stripe price ID for MAX plan', false, 'stripe'),
  ('stripe_connect_client_id', 'ca_your_stripe_connect_client_id', 'Stripe Connect client ID for bot payments', true, 'stripe'),
  ('stripe_account_id', 'acct_1SkzH9QzIlRI55yL', 'Platform Stripe account ID for bot payments', false, 'stripe'),
  ('app_url', 'https://your-app-url.com', 'Application URL for redirects', false, 'general')
ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value,
      description = EXCLUDED.description,
      is_sensitive = EXCLUDED.is_sensitive,
      category = EXCLUDED.category,
      updated_at = now();
