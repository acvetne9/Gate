-- Create a demo site for the public demo page
-- This allows the bot attack demo to work without requiring user authentication

-- First, create a system user for the demo site (if it doesn't exist)
DO $$
DECLARE
  demo_user_id UUID;
BEGIN
  -- Check if demo user exists
  SELECT id INTO demo_user_id FROM auth.users WHERE email = 'demo@gatesecurities.com';

  -- If not, create a system demo user
  IF demo_user_id IS NULL THEN
    demo_user_id := gen_random_uuid();

    -- Insert into auth.users (this might fail if you don't have permission - that's okay)
    BEGIN
      INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
      VALUES (
        demo_user_id,
        'demo@gatesecurities.com',
        crypt('DEMO_PASSWORD_NOT_FOR_LOGIN', gen_salt('bf')),
        now(),
        now(),
        now()
      );
    EXCEPTION WHEN OTHERS THEN
      -- If we can't create auth user, just use a random UUID for the demo site
      demo_user_id := 'd3m0-d3m0-d3m0-d3m0-d3m0d3m0d3m0';
    END;

    -- Create user profile
    INSERT INTO user_profiles (id, email, name, role, created_at)
    VALUES (
      demo_user_id,
      'demo@gatesecurities.com',
      'Demo System User',
      'user',
      now()
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Create demo site with fixed API key
  INSERT INTO sites (
    id,
    customer_id,
    name,
    domain,
    api_key,
    status,
    config,
    created_at
  )
  VALUES (
    'd3m0-s1t3-d3m0-s1t3-d3m0s1t3d3m0',
    demo_user_id,
    'Gate Demo Site',
    'gatesecurities.com',
    'DEMO_API_KEY_11111111-2222-3333-4444-555555555555',
    'active',
    jsonb_build_object(
      'allowedBots', ARRAY[]::text[],
      'showPaywallToHumans', false,
      'botPaymentAmount', 0.50
    ),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    api_key = EXCLUDED.api_key,
    status = EXCLUDED.status,
    config = EXCLUDED.config;

END $$;

-- Add comment
COMMENT ON TABLE sites IS 'Sites table includes a special demo site (id: d3m0-s1t3-d3m0-s1t3-d3m0s1t3d3m0) for the public demo page';
