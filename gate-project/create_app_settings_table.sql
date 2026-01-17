-- Create app_settings table for database-based configuration
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

-- Only admins can read settings
CREATE POLICY "Admins can read all settings"
  ON app_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Only admins can update settings
CREATE POLICY "Admins can update settings"
  ON app_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Insert default settings
INSERT INTO app_settings (key, value, description, is_sensitive, category) VALUES
  ('stripe_publishable_key', 'pk_live_51SkzH9QzIlRI55yLTxHWq9F7lACX4vvzVV66uGeyJjAsWB3fVV6h71DpezjIgrcD7Hi0Wb7UY5wWp4trvrLjbgmC00vK933Njj', 'Stripe publishable key for client-side', true, 'stripe'),
  ('stripe_keeper_price_id', 'prod_TiQr8gEqB8Q6Km', 'Stripe price ID for Keeper plan', false, 'stripe'),
  ('stripe_max_price_id', 'prod_TiQsIG6aaOSikC', 'Stripe price ID for Max plan', false, 'stripe'),
  ('stripe_connect_client_id', 'ca_your_stripe_connect_client_id', 'Stripe Connect client ID', true, 'stripe'),
  ('stripe_account_id', 'acct_1SkzH9QzIlRI55yL', 'Stripe platform account ID', true, 'stripe'),
  ('app_url', 'https://your-app-url.com', 'Application base URL', false, 'general')
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    description = EXCLUDED.description,
    is_sensitive = EXCLUDED.is_sensitive,
    category = EXCLUDED.category;
