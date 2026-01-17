-- Create app_settings table for storing application configuration
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  is_sensitive BOOLEAN DEFAULT false,
  category TEXT NOT NULL DEFAULT 'general',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(key);
CREATE INDEX IF NOT EXISTS idx_app_settings_category ON app_settings(category);

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow authenticated users to read (we'll tighten this later)
DROP POLICY IF EXISTS "Allow authenticated users to read settings" ON app_settings;
CREATE POLICY "Allow authenticated users to read settings"
  ON app_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert/update (we'll tighten this later)
DROP POLICY IF EXISTS "Allow authenticated users to update settings" ON app_settings;
CREATE POLICY "Allow authenticated users to update settings"
  ON app_settings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert default settings
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
      updated_at = now();
