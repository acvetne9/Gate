# Quick Implementation Guide - Phase 1 Optimization

**Expected Result:** 90% storage reduction with minimal code changes

## Step 1: Run Database Migration

```bash
cd /Users/acvetne/Projects/gate-project-root/gate-project

# Push the migration
supabase db push

# Or if using remote:
supabase db push --db-url "your-database-url"
```

This creates:
- ✅ `test_logs` table (auto-expires after 48h)
- ✅ Data retention policy (90 days)
- ✅ Optimized indexes
- ✅ `recent_request_logs` view
- ✅ Cleanup functions

## Step 2: Schedule Cleanup Jobs

### Option A: Using Supabase Dashboard (Recommended)

1. Go to Database → Functions
2. Create a new function schedule:
   - **Name:** `daily-log-cleanup`
   - **Schedule:** `0 2 * * *` (2 AM daily)
   - **SQL:** `SELECT cleanup_old_logs();`

3. Create another schedule:
   - **Name:** `hourly-test-cleanup`
   - **Schedule:** `0 * * * *` (every hour)
   - **SQL:** `SELECT cleanup_test_logs();`

### Option B: Using pg_cron (if available)

```sql
-- Schedule daily cleanup at 2 AM
SELECT cron.schedule(
    'cleanup-old-logs',
    '0 2 * * *',
    'SELECT cleanup_old_logs();'
);

-- Schedule hourly test log cleanup
SELECT cron.schedule(
    'cleanup-test-logs',
    '0 * * * *',
    'SELECT cleanup_test_logs();'
);
```

### Option C: Using GitHub Actions (free tier friendly)

Create `.github/workflows/cleanup-logs.yml`:

```yaml
name: Database Cleanup
on:
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM UTC

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Cleanup old logs
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: |
          psql $DATABASE_URL -c "SELECT cleanup_old_logs();"
          psql $DATABASE_URL -c "SELECT cleanup_test_logs();"
```

## Step 3: Update Dashboard to Use Optimized View

**File:** `src/hooks/useEnhancedLogs.ts`

```typescript
// OLD: Query full request_logs table
const { data, error } = await supabase
  .from('request_logs')
  .select('*')
  .eq('site_id', siteId)

// NEW: Query optimized view (much faster, less data)
const { data, error } = await supabase
  .from('recent_request_logs') // Optimized view
  .select('*')
  .eq('site_id', siteId)
```

**Note:** The view only shows last 7 days. For older logs, use `request_logs` table.

## Step 4: Update Bot Testing to Use test_logs

**File:** `src/pages/PublicDemoPage.tsx` (or wherever bot testing happens)

```typescript
// OLD: Logs go to production request_logs
await supabase.from('request_logs').insert({ ... })

// NEW: Test logs go to test_logs table
await supabase.from('test_logs').insert({
  site_id: siteId,
  bot_name: 'GPTBot',
  test_type: 'bot_detection',
  status: result.status,
  result: result // Full result as JSON
})
```

## Step 5: Update Edge Function (Optional - for even more savings)

**File:** `supabase/functions/check-access/index.ts`

Add smart field storage:

```typescript
// Only store full fingerprint for blocked/suspicious requests
const logData = {
  site_id: site.id,
  customer_id: site.customer_id,
  ip: clientIp,
  user_agent: userAgent,
  page,
  type: detection.type,
  status: finalStatus,
  risk_score: detection.riskScore,
  decision_reason: detection.reasons?.join(', ') || 'Unknown'
}

// Smart storage based on request type
if (detection.type === 'bot') {
  // Bots: Store bot identity, skip heavy fingerprint
  logData.bot_identity = {
    name: detection.botName,
    company: detection.botCompany,
    type: detection.botType
  }
  logData.fingerprint = null // Don't store for bots
  logData.whois_data = null
} else if (finalStatus === 'allowed') {
  // Allowed humans: Store minimal data
  logData.fingerprint = {
    visitorId: fingerprint?.visitorId // Only visitor ID
  }
  logData.bot_identity = null
  logData.whois_data = null
} else {
  // Blocked/suspicious: Store full details
  logData.fingerprint = fingerprint
  logData.detection_data = detection
  logData.bot_identity = detection.botIdentity || null
  // WHOIS can be fetched async if needed
}

await supabaseClient.from('request_logs').insert(logData)
```

## Step 6: Verify Optimization

### Check Table Sizes

```sql
-- Check current storage usage
SELECT
    tablename,
    pg_size_pretty(pg_total_relation_size(tablename::regclass)) AS size
FROM pg_tables
WHERE tablename IN ('request_logs', 'test_logs')
ORDER BY pg_total_relation_size(tablename::regclass) DESC;
```

### Monitor Log Distribution

```sql
-- Check how many logs in each age range
SELECT
    CASE
        WHEN timestamp > now() - INTERVAL '7 days' THEN 'Hot (0-7 days)'
        WHEN timestamp > now() - INTERVAL '30 days' THEN 'Warm (8-30 days)'
        WHEN timestamp > now() - INTERVAL '90 days' THEN 'Cold (31-90 days)'
        ELSE 'Archived (>90 days)'
    END as age_range,
    COUNT(*) as log_count,
    pg_size_pretty(SUM(pg_column_size(row.*))::bigint) as estimated_size
FROM request_logs
GROUP BY age_range
ORDER BY log_count DESC;
```

### Check Cleanup Job Status

```sql
-- Verify no logs older than 90 days
SELECT COUNT(*) as old_logs_count
FROM request_logs
WHERE timestamp < now() - INTERVAL '90 days';
-- Should return 0

-- Verify test logs are being cleaned
SELECT COUNT(*) as test_logs_count
FROM test_logs
WHERE timestamp < now() - INTERVAL '48 hours';
-- Should return 0
```

## Step 7: Monitor Performance

Track these metrics weekly:

1. **Storage size:** Should decrease by ~90% over first week
2. **Query speed:** Dashboard should load 2-5x faster
3. **Cost:** Check Supabase dashboard for storage/bandwidth costs

## Expected Results

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Storage (10K req/day) | 3GB/month | 300MB/month | 90% ↓ |
| Dashboard load time | 2-5s | 0.5-1s | 70% ↓ |
| Query cost | $3.65/year | $0.37/year | 90% ↓ |
| Oldest log age | Forever | 90 days | Managed |

## Troubleshooting

### Cleanup jobs not running
- Check cron schedule syntax
- Verify database permissions
- Check logs: `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;`

### Dashboard showing empty logs
- Make sure `recent_request_logs` view exists
- Check if you have logs in last 7 days
- For older logs, query `request_logs` table directly

### Migration failed
- Check if columns already exist
- Run manually: `psql $DATABASE_URL -f supabase/migrations/20250102_optimize_log_storage_phase1.sql`
- Check error message for specific issue

## Next Steps (Optional)

After Phase 1 is working:
- **Phase 2:** Implement tiered storage (hot/warm/cold) - see OPTIMIZATION_PLAN.md
- **Phase 3:** Add S3 archival for old logs
- **Add monitoring:** Set up alerts for storage usage spikes

---

**Need Help?** Check `OPTIMIZATION_PLAN.md` for detailed explanation of each optimization.
