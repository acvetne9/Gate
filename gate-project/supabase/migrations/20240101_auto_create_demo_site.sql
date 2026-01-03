-- Auto-create a demo site for the PaywallProtect website itself
-- This allows the site to protect itself and log all traffic

-- First, ensure we have the acvetne@gmail.com user
-- (This assumes the user already exists from signup)

-- Create a site for the PaywallProtect website itself
INSERT INTO sites (
  customer_id,
  site_id,
  api_key,
  name,
  domain,
  status,
  config,
  stats
)
SELECT
  id,
  'site_paywallprotect_demo',
  'pk_live_demo_paywallprotect_2024',
  'PaywallProtect Demo Site',
  'localhost:5173',
  'active',
  jsonb_build_object(
    'paywallType', 'none',
    'showPaywallToHumans', false,
    'allowedBots', ARRAY['googlebot', 'bingbot', 'slurp', 'duckduckbot', 'baiduspider', 'yandexbot']::text[],
    'meteredLimit', 3,
    'premiumPages', ARRAY[]::text[],
    'subscribeUrl', '/signup',
    'loginUrl', '/login'
  ),
  jsonb_build_object(
    'totalRequests', 0,
    'blockedRequests', 0,
    'allowedRequests', 0
  )
FROM auth.users
WHERE email = 'acvetne@gmail.com'
ON CONFLICT (site_id) DO NOTHING;

-- Grant access to this site for the user
COMMENT ON TABLE sites IS 'Auto-created demo site for PaywallProtect to protect itself';
