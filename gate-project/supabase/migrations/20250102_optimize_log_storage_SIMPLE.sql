-- SIMPLIFIED LOG OPTIMIZATION - Works with any schema
-- Run this directly in Supabase Dashboard → SQL Editor

-- 1. Create test_logs table
CREATE TABLE IF NOT EXISTS test_logs (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id uuid,
    timestamp timestamptz DEFAULT now(),
    bot_name text,
    test_type text,
    status text,
    result jsonb
);

CREATE INDEX IF NOT EXISTS idx_test_logs_timestamp ON test_logs(timestamp);

-- 2. Add created_at column to request_logs if it doesn't exist
ALTER TABLE request_logs
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- Backfill existing rows
UPDATE request_logs SET created_at = timestamp WHERE created_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_request_logs_created_at ON request_logs(created_at);

-- 3. Create cleanup functions
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS integer AS $$
DECLARE
    deleted_count integer;
BEGIN
    DELETE FROM request_logs
    WHERE created_at < now() - INTERVAL '90 days';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_test_logs()
RETURNS integer AS $$
DECLARE
    deleted_count integer;
BEGIN
    DELETE FROM test_logs
    WHERE timestamp < now() - INTERVAL '48 hours';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 4. Optimize indexes
DROP INDEX IF EXISTS idx_request_logs_whois_data;
DROP INDEX IF EXISTS idx_request_logs_bot_identity;

CREATE INDEX IF NOT EXISTS idx_request_logs_site_time
    ON request_logs(site_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_request_logs_customer_time
    ON request_logs(customer_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_request_logs_blocked
    ON request_logs(site_id, timestamp DESC)
    WHERE status = 'blocked';

-- NOTE: Replacing this view can fail if the existing view has a different
-- column schema in the remote DB (e.g. column name changes). To avoid
-- accidental breaking changes during automated migration pushes, we skip
-- replacing the view here. If you need to update the view, run a manual
-- `CREATE OR REPLACE VIEW` in the Supabase SQL editor after verifying
-- the current view columns and dependencies.
--
-- CREATE OR REPLACE VIEW recent_request_logs AS
-- SELECT
--     id,
--     site_id,
--     customer_id,
--     timestamp,
--     ip,
--     user_agent,
--     page,
--     type,
--     status,
--     decision_reason
-- FROM request_logs
-- WHERE timestamp > now() - INTERVAL '7 days'
-- ORDER BY timestamp DESC;

-- 6. Grant permissions
GRANT SELECT ON recent_request_logs TO authenticated;
GRANT INSERT ON test_logs TO authenticated;
GRANT SELECT ON test_logs TO authenticated;

-- 7. Run initial cleanup
SELECT cleanup_old_logs() as deleted_old_logs;
SELECT cleanup_test_logs() as deleted_test_logs;

-- Done!
SELECT 'Optimization migration completed successfully!' as status;
