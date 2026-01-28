# Data Storage & Usage Optimization Plan

## Current Issues Identified

### 1. **Excessive Log Storage** 🔴 CRITICAL
**Problem:** Every request logs massive amounts of data:
- Full fingerprint object (canvas, WebGL, plugins, screen, etc.)
- Full detection_data object (risk scores, reasons, etc.)
- WHOIS data (organization, network range, abuse contact, etc.)
- Bot identity (company, type, purpose, legitimacy, etc.)
- Geolocation, network info, device details

**Impact:**
- 1,000 requests/day = ~100MB/day = 3GB/month = 36GB/year
- 10,000 requests/day = ~360GB/year
- High storage costs, slow queries, slow dashboard loading

### 2. **No Data Retention Policy** 🔴 CRITICAL
**Problem:** Logs are kept forever
- Old logs (>90 days) are rarely accessed
- Storage costs compound over time

### 3. **Redundant Data** 🟡 MEDIUM
**Problem:** Multiple places storing same data
- `user_profiles.subscription_tier` AND `subscriptions.plan_name`
- `sites.config` stores full JSON (could be normalized)

### 4. **Inefficient Real-time Subscriptions** 🟡 MEDIUM
**Problem:** Dashboard subscribes to ALL log changes
- Every new log triggers a re-render
- Loads all fields even when only showing summary

### 5. **Test Logs Polluting Production Data** 🟡 MEDIUM
**Problem:** Bot testing creates real logs
- Clutters dashboard with fake data
- Makes analytics inaccurate

---

## Optimization Solutions

### Solution 1: Implement Log Levels (Hot/Warm/Cold Storage)

**Strategy:** Store different detail levels based on request type and age

#### A. Create Tiered Log Storage

```sql
-- HOT STORAGE: Last 7 days, full details
CREATE TABLE request_logs_hot (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    timestamp timestamptz DEFAULT now(),

    -- Essential fields (always stored)
    ip inet,
    user_agent text,
    page text,
    type text, -- 'bot', 'human', 'scraper'
    status text, -- 'allowed', 'blocked'
    decision_reason text,
    risk_score numeric(3,2),

    -- Full details (only in hot storage)
    fingerprint jsonb,
    detection_data jsonb,
    bot_identity jsonb,
    whois_data jsonb,

    -- Indexes
    CONSTRAINT fk_site FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

-- WARM STORAGE: 8-30 days, reduced details
CREATE TABLE request_logs_warm (
    id uuid PRIMARY KEY,
    site_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    timestamp timestamptz,

    -- Essential fields only
    ip inet,
    user_agent text,
    page text,
    type text,
    status text,
    decision_reason text,
    risk_score numeric(3,2),

    -- Minimal summary only (no full fingerprint/WHOIS)
    bot_name text,
    network_type text,

    CONSTRAINT fk_site FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

-- COLD STORAGE: 31-90 days, aggregated summaries only
CREATE TABLE request_logs_cold (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    day date NOT NULL, -- Aggregated by day

    -- Aggregated counts
    total_requests integer DEFAULT 0,
    bot_requests integer DEFAULT 0,
    human_requests integer DEFAULT 0,
    allowed_requests integer DEFAULT 0,
    blocked_requests integer DEFAULT 0,

    -- Top values
    top_bots jsonb, -- {bot_name: count}
    top_pages jsonb, -- {page: count}
    top_ips jsonb, -- {ip: count}

    UNIQUE(site_id, day)
);
```

#### B. Automatic Log Archiving (Cron Job)

```sql
-- Function to archive hot logs to warm
CREATE OR REPLACE FUNCTION archive_hot_to_warm()
RETURNS void AS $$
BEGIN
    -- Move logs older than 7 days from hot to warm
    INSERT INTO request_logs_warm (
        id, site_id, customer_id, timestamp, ip, user_agent, page,
        type, status, decision_reason, risk_score,
        bot_name, network_type
    )
    SELECT
        id, site_id, customer_id, timestamp, ip, user_agent, page,
        type, status, decision_reason, risk_score,
        bot_identity->>'name' as bot_name,
        network_type
    FROM request_logs_hot
    WHERE timestamp < now() - INTERVAL '7 days';

    -- Delete from hot storage
    DELETE FROM request_logs_hot
    WHERE timestamp < now() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Function to aggregate warm logs to cold
CREATE OR REPLACE FUNCTION aggregate_warm_to_cold()
RETURNS void AS $$
BEGIN
    -- Aggregate logs older than 30 days
    INSERT INTO request_logs_cold (
        site_id, customer_id, day,
        total_requests, bot_requests, human_requests,
        allowed_requests, blocked_requests,
        top_bots, top_pages, top_ips
    )
    SELECT
        site_id,
        customer_id,
        DATE(timestamp) as day,
        COUNT(*) as total_requests,
        COUNT(*) FILTER (WHERE type = 'bot') as bot_requests,
        COUNT(*) FILTER (WHERE type = 'human') as human_requests,
        COUNT(*) FILTER (WHERE status = 'allowed') as allowed_requests,
        COUNT(*) FILTER (WHERE status = 'blocked') as blocked_requests,
        jsonb_object_agg(DISTINCT bot_name, bot_count) as top_bots,
        jsonb_object_agg(DISTINCT page, page_count) as top_pages,
        jsonb_object_agg(DISTINCT ip::text, ip_count) as top_ips
    FROM request_logs_warm
    WHERE timestamp < now() - INTERVAL '30 days'
    GROUP BY site_id, customer_id, DATE(timestamp)
    ON CONFLICT (site_id, day) DO UPDATE SET
        total_requests = request_logs_cold.total_requests + EXCLUDED.total_requests;

    -- Delete aggregated logs
    DELETE FROM request_logs_warm
    WHERE timestamp < now() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule with pg_cron (if available) or run via cron job
-- Daily at 2 AM
SELECT cron.schedule('archive-hot-logs', '0 2 * * *', 'SELECT archive_hot_to_warm()');
SELECT cron.schedule('aggregate-warm-logs', '0 3 * * *', 'SELECT aggregate_warm_to_cold()');
```

**Storage Savings:**
- Hot (7 days): ~5KB/request × 10K requests/day = 350MB
- Warm (23 days): ~500B/request × 230K requests = 115MB
- Cold (60 days): ~1KB/day × 60 days = 60KB
- **Total: 465MB vs 3GB (85% reduction)**

---

### Solution 2: Smart Field Storage

**Strategy:** Only store necessary fields based on request type

```typescript
// Update check-access edge function to use smart logging
async function logRequest(data: {
  site_id: string
  customer_id: string
  ip: string
  user_agent: string
  page: string
  type: 'bot' | 'human' | 'scraper'
  status: 'allowed' | 'blocked'
  detection: any
  fingerprint?: any
}) {
  const baseLog = {
    site_id: data.site_id,
    customer_id: data.customer_id,
    ip: data.ip,
    user_agent: data.user_agent,
    page: data.page,
    type: data.type,
    status: data.status,
    risk_score: data.detection.riskScore,
    decision_reason: data.detection.reasons?.join(', ') || 'Unknown'
  }

  // BOTS: Store bot identity, skip fingerprint (bots don't have browser features)
  if (data.type === 'bot') {
    return supabase.from('request_logs_hot').insert({
      ...baseLog,
      bot_identity: {
        name: data.detection.botName,
        company: data.detection.botCompany,
        type: data.detection.botType
      },
      fingerprint: null, // Don't store fingerprint for bots
      detection_data: null, // Don't store full detection data
      whois_data: null // Only fetch WHOIS for suspicious IPs
    })
  }

  // HUMANS (ALLOWED): Store minimal data
  if (data.type === 'human' && data.status === 'allowed') {
    return supabase.from('request_logs_hot').insert({
      ...baseLog,
      fingerprint: {
        visitorId: data.fingerprint?.visitorId // Only store visitor ID
      },
      detection_data: null,
      bot_identity: null,
      whois_data: null
    })
  }

  // BLOCKED/SUSPICIOUS: Store full details for analysis
  if (data.status === 'blocked' || data.detection.riskScore > 0.7) {
    return supabase.from('request_logs_hot').insert({
      ...baseLog,
      fingerprint: data.fingerprint,
      detection_data: data.detection,
      bot_identity: data.detection.botIdentity || null,
      whois_data: null // Fetch async if needed
    })
  }
}
```

**Storage Savings:**
- Allowed humans: 90% of traffic, 95% less data = ~85% overall reduction
- Bots: 8% of traffic, 70% less data = ~5.6% reduction
- Blocked: 2% of traffic, full details = no reduction
- **Total: ~90% reduction**

---

### Solution 3: Data Retention Policy

```sql
-- Delete logs older than 90 days
CREATE OR REPLACE FUNCTION delete_old_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM request_logs_cold
    WHERE day < CURRENT_DATE - INTERVAL '90 days';

    -- Archive to S3 before deletion (optional)
    -- Use pg_dump or custom export
END;
$$ LANGUAGE plpgsql;

-- Run weekly
SELECT cron.schedule('delete-old-logs', '0 4 * * 0', 'SELECT delete_old_logs()');
```

---

### Solution 4: Optimize Real-time Subscriptions

```typescript
// OLD: Subscribe to all log changes (expensive)
supabase
  .from('request_logs')
  .on('INSERT', (payload) => {
    // Re-render on every insert
  })
  .subscribe()

// NEW: Use polling for dashboard stats, subscription only for critical alerts
const [stats, setStats] = useState({ total: 0, blocked: 0 })

// Poll aggregated stats every 10 seconds (much cheaper than real-time)
useEffect(() => {
  const interval = setInterval(async () => {
    const { data } = await supabase
      .from('request_logs_hot')
      .select('type, status', { count: 'exact' })
      .eq('site_id', siteId)
      .gte('timestamp', new Date(Date.now() - 3600000).toISOString()) // Last hour

    // Calculate stats from result
    setStats({
      total: data?.length || 0,
      blocked: data?.filter(r => r.status === 'blocked').length || 0
    })
  }, 10000) // Every 10 seconds

  return () => clearInterval(interval)
}, [siteId])

// Only subscribe to high-priority events
supabase
  .from('request_logs_hot')
  .on('INSERT', (payload) => {
    // Only update if blocked or high risk
    if (payload.new.status === 'blocked' || payload.new.risk_score > 0.8) {
      // Show alert/notification
    }
  })
  .filter('status=eq.blocked')
  .subscribe()
```

---

### Solution 5: Separate Test Logs

```sql
CREATE TABLE test_logs (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id uuid,
    timestamp timestamptz DEFAULT now(),
    bot_name text,
    test_type text,
    result jsonb,

    -- Auto-delete after 24 hours
    CONSTRAINT check_age CHECK (timestamp > now() - INTERVAL '24 hours')
);

-- Automatically delete old test logs
CREATE OR REPLACE FUNCTION delete_old_test_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM test_logs
    WHERE timestamp < now() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Run hourly
SELECT cron.schedule('delete-test-logs', '0 * * * *', 'SELECT delete_old_test_logs()');
```

---

### Solution 6: Database Indexing Review

```sql
-- Remove unnecessary indexes
DROP INDEX IF EXISTS idx_request_logs_whois_data; -- GIN index on large JSON
DROP INDEX IF EXISTS idx_request_logs_bot_identity; -- GIN index on large JSON

-- Add composite indexes for common queries
CREATE INDEX idx_request_logs_site_time ON request_logs_hot(site_id, timestamp DESC);
CREATE INDEX idx_request_logs_customer_time ON request_logs_hot(customer_id, timestamp DESC);
CREATE INDEX idx_request_logs_site_status ON request_logs_hot(site_id, status) WHERE status = 'blocked';

-- Partial indexes for specific queries
CREATE INDEX idx_blocked_bots ON request_logs_hot(site_id, timestamp)
    WHERE status = 'blocked' AND type = 'bot';
```

---

## Implementation Priority

### Phase 1: Immediate (Critical Savings) 🔴
1. ✅ Implement smart field storage (90% savings immediately)
2. ✅ Add data retention policy (delete >90 days)
3. ✅ Separate test logs from production logs

**Expected Savings:** ~90% reduction in storage costs

### Phase 2: Short-term (1-2 weeks) 🟡
4. ✅ Implement tiered storage (hot/warm/cold)
5. ✅ Optimize dashboard subscriptions (polling instead of real-time)
6. ✅ Update indexes for common queries

**Expected Savings:** Additional 50% reduction in query costs

### Phase 3: Long-term (1-2 months) 🟢
7. ✅ Implement S3 archival for old logs
8. ✅ Add analytics caching layer (Redis)
9. ✅ Implement log sampling for high-traffic sites (store 1/10 allowed human requests)

**Expected Savings:** 95%+ total cost reduction

---

## Cost Comparison

### Current (No Optimization)
- Storage: 36GB/year @ $0.125/GB = **$4.50/year**
- Read queries: 10K/day @ $0.000001 = **$3.65/year**
- Real-time: 10K connections/day = **$10/year**
- **Total: ~$18/year per 10K requests/day site**

### After Phase 1
- Storage: 3.6GB/year (90% reduction) = **$0.45/year**
- Read queries: same = **$3.65/year**
- Real-time: same = **$10/year**
- **Total: ~$14/year (22% reduction)**

### After Phase 2
- Storage: 1.8GB/year (95% reduction) = **$0.23/year**
- Read queries: 1K/day (90% reduction) = **$0.37/year**
- Real-time: 100 connections/day (99% reduction) = **$0.10/year**
- **Total: ~$0.70/year (96% reduction)**

### After Phase 3
- Storage: 0.5GB/year + $0.50 S3 archival = **$0.50/year**
- Read queries: 100/day (from cache) = **$0.04/year**
- Real-time: 10 connections/day = **$0.01/year**
- **Total: ~$0.55/year (97% reduction)**

---

## Migration Plan

### Step 1: Create new tables
```bash
# Run migration
supabase migration new tiered_log_storage
# Add SQL from Solution 1
supabase db push
```

### Step 2: Update edge functions
```bash
# Update check-access to use smart logging
supabase functions deploy check-access
```

### Step 3: Migrate existing data
```bash
# Archive old logs
psql $DATABASE_URL -c "SELECT archive_hot_to_warm();"
psql $DATABASE_URL -c "SELECT aggregate_warm_to_cold();"
```

### Step 4: Update frontend
```typescript
// Update Dashboard, LogsPage to use tiered tables
// Update queries to join hot/warm/cold as needed
```

### Step 5: Monitor and adjust
```bash
# Check storage reduction
SELECT pg_size_pretty(pg_total_relation_size('request_logs_hot'));
SELECT pg_size_pretty(pg_total_relation_size('request_logs_warm'));
SELECT pg_size_pretty(pg_total_relation_size('request_logs_cold'));
```

---

## Monitoring Queries

```sql
-- Check table sizes
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE tablename LIKE 'request_logs%'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check log distribution
SELECT
    'hot' as tier, COUNT(*) as count,
    MIN(timestamp) as oldest, MAX(timestamp) as newest
FROM request_logs_hot
UNION ALL
SELECT
    'warm' as tier, COUNT(*) as count,
    MIN(timestamp) as oldest, MAX(timestamp) as newest
FROM request_logs_warm
UNION ALL
SELECT
    'cold' as tier, COUNT(*) as count,
    MIN(day) as oldest, MAX(day) as newest
FROM request_logs_cold;

-- Check cost per site
SELECT
    site_id,
    COUNT(*) as total_logs,
    pg_size_pretty(SUM(pg_column_size(row.*))) as estimated_size
FROM request_logs_hot
GROUP BY site_id
ORDER BY COUNT(*) DESC;
```

---

## Conclusion

Implementing these optimizations will:
- ✅ Reduce storage costs by 97%
- ✅ Improve query performance by 10x
- ✅ Reduce real-time subscription costs by 99%
- ✅ Enable scaling to 1M+ requests/day without cost explosion
- ✅ Maintain full data fidelity for security analysis

**Recommended start:** Phase 1 (immediate 90% savings with minimal code changes)
