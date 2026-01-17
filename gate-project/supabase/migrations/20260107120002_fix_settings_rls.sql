-- Fix RLS policies to allow public read access to app_settings
-- Settings are not sensitive (publishable keys, product IDs, etc.)
-- This allows the frontend to load settings without authentication

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Allow authenticated users to read settings" ON app_settings;
DROP POLICY IF EXISTS "Allow authenticated users to update settings" ON app_settings;

-- Allow anyone to read settings (they're non-sensitive config)
CREATE POLICY "Allow public read access to settings"
  ON app_settings
  FOR SELECT
  TO public
  USING (true);

-- Only authenticated users can insert/update/delete
CREATE POLICY "Only authenticated users can modify settings"
  ON app_settings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
