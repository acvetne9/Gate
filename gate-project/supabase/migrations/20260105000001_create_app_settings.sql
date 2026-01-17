-- Create app_settings table for storing application configuration
-- This eliminates the need for environment variables

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

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(key);
CREATE INDEX IF NOT EXISTS idx_app_settings_category ON app_settings(category);

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can read settings
CREATE POLICY "Only admins can read settings"
  ON app_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Only admins can insert settings
CREATE POLICY "Only admins can insert settings"
  ON app_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Only admins can update settings
CREATE POLICY "Only admins can update settings"
  ON app_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Insert default settings
INSERT INTO app_settings (key, value, description, is_sensitive, category) VALUES
  ('stripe_publishable_key', 'pk_live_51SkzH9QzIlRI55yLTxHWq9F7lACX4vvzVV66uGeyJjAsWB3fVV6h71DpezjIgrcD7Hi0Wb7UY5wWp4trvrLjbgmC00vK933Njj', 'Stripe publishable key (safe to expose)', false, 'stripe'),
  ('stripe_keeper_price_id', 'prod_TiQr8gEqB8Q6Km', 'Stripe price ID for Keeper plan', false, 'stripe'),
  ('stripe_max_price_id', 'prod_TiQsIG6aaOSikC', 'Stripe price ID for MAX plan', false, 'stripe'),
  ('stripe_connect_client_id', 'ca_your_stripe_connect_client_id', 'Stripe Connect client ID for bot payments', true, 'stripe'),
  ('app_url', 'https://your-app-url.com', 'Application URL for redirects', false, 'general')
ON CONFLICT (key) DO NOTHING;

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION update_app_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update timestamp
CREATE TRIGGER app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_app_settings_timestamp();
