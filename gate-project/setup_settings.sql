-- Drop existing table if you want to start fresh
-- DROP TABLE IF EXISTS app_settings CASCADE;

-- Create app_settings table
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

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can read all settings" ON app_settings;
DROP POLICY IF EXISTS "Admins can update settings" ON app_settings;

-- Create policies - Allow authenticated users to read (we'll check admin in the app)
CREATE POLICY "Authenticated users can read settings"
  ON app_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to update (we'll check admin in the app)
CREATE POLICY "Authenticated users can update settings"
  ON app_settings
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert default Stripe settings
INSERT INTO app_settings (key, value, description, is_sensitive, category) VALUES
  ('stripe_publishable_key', 'pk_live_51SkzH9QzIlRI55yLTxHWq9F7lACX4vvzVV66uGeyJjAsWB3fVV6h71DpezjIgrcD7Hi0Wb7UY5wWp4trvrLjbgmC00vK933Njj', 'Stripe publishable key for client-side payments', true, 'stripe'),
  ('stripe_keeper_price_id', 'prod_TiQr8gEqB8Q6Km', 'Stripe price ID for Keeper plan', false, 'stripe'),
  ('stripe_max_price_id', 'prod_TiQsIG6aaOSikC', 'Stripe price ID for Max plan', false, 'stripe'),
  ('stripe_connect_client_id', 'ca_your_stripe_connect_client_id', 'Stripe Connect client ID for platform', true, 'stripe'),
  ('stripe_account_id', 'acct_1SkzH9QzIlRI55yL', 'Your Stripe platform account ID', true, 'stripe'),
  ('app_url', 'https://gatesecurities.com', 'Application base URL', false, 'general')
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    description = EXCLUDED.description,
    is_sensitive = EXCLUDED.is_sensitive,
    category = EXCLUDED.category;
