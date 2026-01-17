-- Insert the remaining settings that didn't get created
-- Using individual INSERT statements for better error handling

INSERT INTO app_settings (key, value, description, is_sensitive, category)
VALUES ('stripe_keeper_price_id', 'prod_TiQr8gEqB8Q6Km', 'Stripe price ID for Keeper plan', false, 'stripe')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

INSERT INTO app_settings (key, value, description, is_sensitive, category)
VALUES ('stripe_max_price_id', 'prod_TiQsIG6aaOSikC', 'Stripe price ID for MAX plan', false, 'stripe')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

INSERT INTO app_settings (key, value, description, is_sensitive, category)
VALUES ('stripe_connect_client_id', 'ca_your_stripe_connect_client_id', 'Stripe Connect client ID for bot payments', true, 'stripe')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

INSERT INTO app_settings (key, value, description, is_sensitive, category)
VALUES ('stripe_account_id', 'acct_1SkzH9QzIlRI55yL', 'Platform Stripe account ID for bot payments', false, 'stripe')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

INSERT INTO app_settings (key, value, description, is_sensitive, category)
VALUES ('app_url', 'https://your-app-url.com', 'Application URL for redirects', false, 'general')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
