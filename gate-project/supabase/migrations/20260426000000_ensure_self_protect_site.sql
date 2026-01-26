-- Ensure the self-protection site exists for the Gate marketing site itself
-- Uses the pk_live_demo_paywallprotect_2024 API key referenced in index.html

DO $$
DECLARE
  demo_user_id UUID;
BEGIN
  -- Reuse the demo system user created by earlier migrations
  SELECT id INTO demo_user_id FROM auth.users WHERE email = 'demo@gatesecurities.com';

  -- Fallback: try the original user
  IF demo_user_id IS NULL THEN
    SELECT id INTO demo_user_id FROM auth.users WHERE email = 'acvetne@gmail.com';
  END IF;

  -- Last resort: create the demo system user
  IF demo_user_id IS NULL THEN
    demo_user_id := gen_random_uuid();
    BEGIN
      INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
      VALUES (
        demo_user_id,
        'demo@gatesecurities.com',
        crypt('DEMO_PASSWORD_NOT_FOR_LOGIN', gen_salt('bf')),
        now(), now(), now()
      );
    EXCEPTION WHEN OTHERS THEN
      NULL; -- user may already exist with different id
    END;

    INSERT INTO user_profiles (id, email, name, role, created_at)
    VALUES (demo_user_id, 'demo@gatesecurities.com', 'Demo System User', 'admin', now())
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Upsert the self-protection site with the key used in index.html
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
    'Gate Marketing Site (Self-Protection)',
    'gatesecurities.com',
    'pk_live_demo_paywallprotect_2024',
    'active',
    jsonb_build_object(
      'allowedBots', ARRAY['googlebot', 'bingbot', 'slurp', 'duckduckbot', 'baiduspider', 'yandexbot', 'twitterbot', 'facebookexternalhit']::text[],
      'showPaywallToHumans', false,
      'botPaymentAmount', 0.50,
      'paywallType', 'none'
    ),
    now()
  )
  ON CONFLICT (api_key) DO UPDATE SET
    status = 'active',
    config = EXCLUDED.config,
    domain = EXCLUDED.domain,
    name = EXCLUDED.name;

END $$;
