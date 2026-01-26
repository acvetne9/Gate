-- Honeypot logs table
CREATE TABLE IF NOT EXISTS honeypot_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  ip TEXT NOT NULL,
  user_agent TEXT,
  trap_path TEXT NOT NULL,
  trap_type TEXT NOT NULL,
  referer TEXT,
  headers JSONB,
  is_confirmed_bot BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_honeypot_logs_ip ON honeypot_logs(ip);
CREATE INDEX IF NOT EXISTS idx_honeypot_logs_timestamp ON honeypot_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_honeypot_logs_trap_type ON honeypot_logs(trap_type);

-- Blocked IPs table (temporary blocks)
CREATE TABLE IF NOT EXISTS blocked_ips (
  ip TEXT PRIMARY KEY,
  reason TEXT NOT NULL,
  blocked_until TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for cleanup
CREATE INDEX IF NOT EXISTS idx_blocked_ips_until ON blocked_ips(blocked_until);

-- Behavioral analysis logs
CREATE TABLE IF NOT EXISTS behavioral_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  site_id UUID REFERENCES sites(id),
  ip TEXT,
  user_agent TEXT,
  -- Behavioral metrics
  mouse_movements INT DEFAULT 0,
  scroll_events INT DEFAULT 0,
  click_events INT DEFAULT 0,
  key_presses INT DEFAULT 0,
  time_on_page INT DEFAULT 0,
  scroll_depth DECIMAL(5,2) DEFAULT 0,
  -- Analysis results
  behavior_score INT DEFAULT 0,
  is_bot_behavior BOOLEAN DEFAULT false,
  behavior_reasons TEXT[],
  -- Fingerprint
  fingerprint JSONB,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  analyzed_at TIMESTAMPTZ
);

-- Index for behavioral logs
CREATE INDEX IF NOT EXISTS idx_behavioral_logs_session ON behavioral_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_behavioral_logs_site ON behavioral_logs(site_id);
CREATE INDEX IF NOT EXISTS idx_behavioral_logs_is_bot ON behavioral_logs(is_bot_behavior);

-- Function to check if IP is blocked
CREATE OR REPLACE FUNCTION is_ip_blocked(check_ip TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM blocked_ips
    WHERE ip = check_ip
    AND blocked_until > NOW()
  );
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired blocks (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_blocks()
RETURNS void AS $$
BEGIN
  DELETE FROM blocked_ips WHERE blocked_until < NOW();
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE honeypot_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_ips ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavioral_logs ENABLE ROW LEVEL SECURITY;

-- Policies for admin access
CREATE POLICY "Admin read honeypot_logs" ON honeypot_logs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Service insert honeypot_logs" ON honeypot_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admin read blocked_ips" ON blocked_ips
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Service manage blocked_ips" ON blocked_ips
  FOR ALL WITH CHECK (true);

CREATE POLICY "Admin read behavioral_logs" ON behavioral_logs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Service insert behavioral_logs" ON behavioral_logs
  FOR INSERT WITH CHECK (true);
