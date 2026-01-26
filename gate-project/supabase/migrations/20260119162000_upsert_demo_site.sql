-- Upsert demo site for public demo usage
DO $$
DECLARE
  demo_user_id UUID;
BEGIN
  SELECT id INTO demo_user_id FROM auth.users WHERE email = 'demo@gatesecurities.com';

  IF demo_user_id IS NULL THEN
    demo_user_id := gen_random_uuid();
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
      demo_user_id := gen_random_uuid();
    END;

    -- Use 'admin' role for demo system user to satisfy role constraint
    INSERT INTO user_profiles (id, email, name, role, created_at)
    VALUES (
      demo_user_id,
      'demo@gatesecurities.com',
      'Demo System User',
      'admin',
      now()
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Insert by `api_key` to avoid invalid UUIDs and ensure id is generated
  INSERT INTO sites (
    customer_id,
    name,
    domain,
    api_key,
    status,
    config,
    created_at
  )
  VALUES (
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
  ON CONFLICT (api_key) DO UPDATE SET
    customer_id = EXCLUDED.customer_id,
    name = EXCLUDED.name,
    domain = EXCLUDED.domain,
    status = EXCLUDED.status,
    config = EXCLUDED.config;

END $$;

COMMENT ON TABLE sites IS 'Sites table includes a special demo site (id: d3m0-s1t3-d3m0-s1t3-d3m0s1t3d3m0) for the public demo page';
