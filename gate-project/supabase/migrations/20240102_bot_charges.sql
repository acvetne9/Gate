-- Bot Charges Table
-- Tracks revenue generated when bots pay to access protected content

CREATE TABLE IF NOT EXISTS bot_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Bot information
  bot_ip TEXT NOT NULL,
  bot_user_agent TEXT NOT NULL,
  bot_type TEXT, -- e.g., 'GPTBot', 'ClaudeBot', etc.

  -- Charge details
  amount DECIMAL(10, 2) NOT NULL DEFAULT 0.10, -- Default $0.10 per access
  currency TEXT NOT NULL DEFAULT 'USD',
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,

  -- Access details
  page_accessed TEXT NOT NULL,
  access_granted BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Indexes
  CONSTRAINT bot_charges_amount_check CHECK (amount >= 0)
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_bot_charges_customer_id ON bot_charges(customer_id);
CREATE INDEX IF NOT EXISTS idx_bot_charges_site_id ON bot_charges(site_id);
CREATE INDEX IF NOT EXISTS idx_bot_charges_created_at ON bot_charges(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bot_charges_bot_ip ON bot_charges(bot_ip);

-- RLS Policies
ALTER TABLE bot_charges ENABLE ROW LEVEL SECURITY;

-- Users can only see charges for their own sites
CREATE POLICY "Users can view their own bot charges"
  ON bot_charges
  FOR SELECT
  USING (customer_id = auth.uid());

-- System can insert charges (will be done via Edge Function)
CREATE POLICY "System can insert bot charges"
  ON bot_charges
  FOR INSERT
  WITH CHECK (true);

-- Create a view for aggregate revenue stats
CREATE OR REPLACE VIEW customer_revenue AS
SELECT
  customer_id,
  COUNT(*) as total_charges,
  SUM(amount) as total_revenue,
  SUM(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN amount ELSE 0 END) as revenue_last_30_days,
  SUM(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN amount ELSE 0 END) as revenue_last_7_days,
  SUM(CASE WHEN created_at >= CURRENT_DATE THEN amount ELSE 0 END) as revenue_today
FROM bot_charges
GROUP BY customer_id;

-- Grant access to the view
GRANT SELECT ON customer_revenue TO authenticated;

-- Create a view for global platform revenue (all customers)
CREATE OR REPLACE VIEW platform_revenue AS
SELECT
  COUNT(*) as total_charges,
  SUM(amount) as total_revenue,
  SUM(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN amount ELSE 0 END) as revenue_last_30_days,
  SUM(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN amount ELSE 0 END) as revenue_last_7_days,
  SUM(CASE WHEN created_at >= CURRENT_DATE THEN amount ELSE 0 END) as revenue_today,
  COUNT(DISTINCT customer_id) as customers_with_revenue
FROM bot_charges;

-- Grant access to the view (all authenticated users can see platform stats)
GRANT SELECT ON platform_revenue TO authenticated;
GRANT SELECT ON platform_revenue TO anon;

COMMENT ON TABLE bot_charges IS 'Tracks charges when bots pay to access protected content';
COMMENT ON VIEW customer_revenue IS 'Aggregate revenue stats per customer';
COMMENT ON VIEW platform_revenue IS 'Global platform revenue statistics';
