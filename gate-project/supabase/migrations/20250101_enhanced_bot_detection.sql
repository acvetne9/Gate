-- Enhanced Bot Detection Migration
-- Adds WHOIS data, bot identity, and enhanced network information to request_logs

-- Add new columns to request_logs table
ALTER TABLE request_logs
ADD COLUMN IF NOT EXISTS whois_data jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS bot_identity jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS reverse_dns text,
ADD COLUMN IF NOT EXISTS network_type text,
ADD COLUMN IF NOT EXISTS hosting_provider text;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_request_logs_bot_identity ON request_logs USING gin (bot_identity);
CREATE INDEX IF NOT EXISTS idx_request_logs_whois_data ON request_logs USING gin (whois_data);
CREATE INDEX IF NOT EXISTS idx_request_logs_reverse_dns ON request_logs (reverse_dns);
CREATE INDEX IF NOT EXISTS idx_request_logs_network_type ON request_logs (network_type);

-- Add comments for documentation
COMMENT ON COLUMN request_logs.whois_data IS 'WHOIS information for the IP address including org name, registration date, abuse contact';
COMMENT ON COLUMN request_logs.bot_identity IS 'Identified bot information including name, company, type, purpose, legitimacy';
COMMENT ON COLUMN request_logs.reverse_dns IS 'Reverse DNS (PTR) record for the IP address';
COMMENT ON COLUMN request_logs.network_type IS 'Type of network: datacenter, hosting, residential, enterprise, cloud';
COMMENT ON COLUMN request_logs.hosting_provider IS 'Identified hosting provider name';

-- Example data structures (for documentation):
--
-- whois_data format:
-- {
--   "orgName": "Example Organization",
--   "netRange": "192.0.2.0/24",
--   "description": "Example ISP",
--   "abuseEmail": "abuse@example.com",
--   "registrationDate": "2020-01-01",
--   "country": "US"
-- }
--
-- bot_identity format:
-- {
--   "name": "GPTBot",
--   "company": "OpenAI",
--   "type": "ai-training",
--   "purpose": "Training GPT models",
--   "isLegitimate": true,
--   "respectsRobotsTxt": true,
--   "docsUrl": "https://platform.openai.com/docs/gptbot",
--   "verified": true
-- }
