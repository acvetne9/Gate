/**
 * Shared Stats Utility
 * Single source of truth for all metrics across the app.
 *
 * Status values written to request_logs by check-access:
 *   'allowed'      — Human or allowed bot granted access
 *   'challenged'   — Bot detected, payment required
 *   'blocked'      — IP blocked (from blocklist)
 *   'pow_required' — Proof-of-work challenge issued (intermediate state)
 *   'token_issued' — Token issued (follow-up log, not a distinct request)
 *   'paused'       — Site protection was paused
 *   'allowed_paid' — Bot paid and was granted access
 *
 * Counting rules:
 *   "Requests Monitored" = all real requests (excludes intermediate/duplicate states)
 *   "Bots Blocked"       = requests where a bot was detected and stopped
 *   "Requests Allowed"   = requests that were granted access
 */

import { supabase } from './supabase'

// Statuses that represent a FINAL decision on a real request
const REAL_REQUEST_STATUSES = ['allowed', 'challenged', 'blocked', 'allowed_paid']

// Statuses that mean "bot was stopped"
const BOT_BLOCKED_STATUSES = ['challenged', 'blocked']

// Statuses that mean "access was granted"
const ALLOWED_STATUSES = ['allowed', 'allowed_paid']

// Statuses to EXCLUDE from "requests monitored" (intermediate/duplicate)
// 'pow_required' = intermediate step before final decision
// 'token_issued' = duplicate log entry for same request
// 'paused'       = site protection disabled, not a security event

export interface SiteStats {
  totalRequests: number
  botsBlocked: number
  requestsAllowed: number
}

export interface GlobalStats {
  totalSites: number
  totalRequests: number
  botsBlocked: number
}

export interface AdminStats {
  totalCustomers: number
  totalSites: number
  requestsToday: number
  botsBlockedToday: number
}

/**
 * Get stats for a single site
 */
export async function getSiteStats(siteId: string): Promise<SiteStats> {
  const [totalResult, blockedResult, allowedResult] = await Promise.all([
    supabase
      .from('request_logs')
      .select('*', { count: 'exact', head: true })
      .eq('site_id', siteId)
      .in('status', REAL_REQUEST_STATUSES),
    supabase
      .from('request_logs')
      .select('*', { count: 'exact', head: true })
      .eq('site_id', siteId)
      .in('status', BOT_BLOCKED_STATUSES),
    supabase
      .from('request_logs')
      .select('*', { count: 'exact', head: true })
      .eq('site_id', siteId)
      .in('status', ALLOWED_STATUSES),
  ])

  return {
    totalRequests: totalResult.count || 0,
    botsBlocked: blockedResult.count || 0,
    requestsAllowed: allowedResult.count || 0,
  }
}

/**
 * Get stats for multiple sites (batch)
 */
export async function getMultiSiteStats(siteIds: string[]): Promise<Map<string, SiteStats>> {
  const results = await Promise.all(siteIds.map(id => getSiteStats(id).then(stats => ({ id, stats }))))
  return new Map(results.map(r => [r.id, r.stats]))
}

/**
 * Get global stats (all sites, used on landing page)
 * Uses Worker stats (edge-level counts) as the primary source.
 * DB queries require auth (RLS) so they fail on the public landing page.
 */
export async function getGlobalStats(): Promise<GlobalStats> {
  const workerStats = await getWorkerStats()

  const totals = workerStats?.totals || {}
  const totalRequests = workerStats?.totalRequests || 0
  // Every request that wasn't allowed with a valid cookie was challenged or blocked — count all of them
  const botsBlocked = totalRequests - (totals.humans_allowed || 0)

  // Try DB for site count (may return 0 due to RLS on public pages)
  let totalSites = 0
  try {
    const { count } = await supabase.from('sites').select('*', { count: 'exact', head: true })
    totalSites = count || 0
  } catch {}

  return { totalSites, totalRequests, botsBlocked }
}

/**
 * Fetch stats from the Cloudflare Worker's /__gate-stats endpoint.
 * Uses the canonical domain (securitygate.app) since the Worker route
 * is only on that domain, not on Pages preview URLs.
 */
async function getWorkerStats(): Promise<any> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    const statsUrl = 'https://securitygate.app/__gate-stats'
    const res = await fetch(statsUrl, {
      signal: controller.signal,
    })
    clearTimeout(timeout)
    if (!res.ok) return null
    const text = await res.text()
    if (text.startsWith('{')) {
      return JSON.parse(text)
    }
    return null
  } catch {
    return null
  }
}

/**
 * Get admin stats (today's metrics, used on admin dashboard)
 */
export async function getAdminStats(): Promise<AdminStats> {
  const [customersResult, sitesResult, workerStats] = await Promise.all([
    supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
    supabase.from('sites').select('id', { count: 'exact', head: true }),
    getWorkerStats(),
  ])

  const totals = workerStats?.totals || {}
  const totalRequests = workerStats?.totalRequests || 0
  const botsBlocked = totalRequests - (totals.humans_allowed || 0)

  return {
    totalCustomers: customersResult.count || 0,
    totalSites: sitesResult.count || 0,
    requestsToday: totalRequests,
    botsBlockedToday: botsBlocked,
  }
}
