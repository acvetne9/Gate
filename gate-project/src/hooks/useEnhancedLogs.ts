import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'

export interface LogFilters {
  siteIds: string[]
  dateRange: {
    start: Date | null
    end: Date | null
  }
  type: 'all' | 'bot' | 'human' | 'scraper'
  status: 'all' | 'allowed' | 'blocked' | 'challenged'
  ipSearch: string
  pageSearch: string
}

export interface RequestLog {
  id: string
  timestamp: string
  ip: string
  type: string
  status: string
  risk_score: number
  page: string
  user_agent: string
  decision_reason: string
  site_id: string
  customer_id: string
  sites?: { name: string; domain?: string }
  user_profiles?: { name: string; email: string }
  detection_data?: {
    isBot?: boolean
    type?: string
    riskScore?: number
    reasons?: string[]
    // Honest logging fields
    targetFetched?: boolean
    targetUrl?: string
    blockedBy?: string | null
    requestId?: string
    botName?: string
    botType?: string
    company?: string
    isKnownBot?: boolean
    contentLength?: number | null
    whois_data?: {
      orgName?: string
      country?: string
      city?: string
      region?: string
      latitude?: number
      longitude?: number
      isp?: string
      asn?: string
      netRange?: string
      description?: string
      abuseEmail?: string
      registrationDate?: string
    }
    bot_identity?: {
      name?: string
      company?: string
      type?: string
      isLegitimate?: boolean
      verified?: boolean
      purpose?: string
      respectsRobotsTxt?: boolean
      docsUrl?: string
    }
    device?: {
      browser?: string
      browserVersion?: string
      os?: string
      osVersion?: string
      deviceType?: string
      isMobile?: boolean
      screenResolution?: string
    }
    request?: {
      method?: string
      protocol?: string
      tlsVersion?: string
      statusCode?: number
      responseTime?: number
      bytesSent?: number
      referrer?: string
    }
    behavior?: {
      requestsLast24h?: number
      requestsLastHour?: number
      avgTimeBetweenRequests?: string
      pagesVisited?: number
      sessionDuration?: string
      mouseMovements?: number
      keyboardEvents?: number
      scrollEvents?: number
      clickEvents?: number
    }
    threatIntel?: {
      threatLevel?: string
      category?: string
      reputation?: string
      previousBlocks?: number
      firstSeen?: string
      lastSeen?: string
      knownMalicious?: boolean
      inBlocklist?: boolean
    }
  }
  fingerprint?: {
    canvas?: string
    webgl?: { vendor?: string; renderer?: string }
    platform?: string
    timezone?: string
    language?: string
    languages?: string[]
    plugins?: string[]
    screen?: { width?: number; height?: number; colorDepth?: number; pixelRatio?: number }
    deviceMemory?: number
    hardwareConcurrency?: number
    touchSupport?: boolean
    webdriver?: boolean
    userAgent?: string
    timing?: { pageLoadTime?: number }
    visitorId?: string
    hash?: string
  }
}

const DEFAULT_FILTERS: LogFilters = {
  siteIds: [],
  dateRange: { start: null, end: null },
  type: 'all',
  status: 'all',
  ipSearch: '',
  pageSearch: ''
}

export const useEnhancedLogs = (customerId: string, initialFilters: Partial<LogFilters> = {}) => {
  const [logs, setLogs] = useState<RequestLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<LogFilters>({ ...DEFAULT_FILTERS, ...initialFilters })
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)
  const LIMIT = 100

  const loadLogs = useCallback(async (reset: boolean = false) => {
    // Don't query if no customerId
    if (!customerId || customerId === '') {
      setLoading(false)
      setLogs([])
      return
    }

    try {
      setLoading(true)
      setError(null)

      const currentOffset = reset ? 0 : offset

      // Build base query - include detection_data and fingerprint
      let query = supabase
        .from('request_logs')
        .select('id, timestamp, ip, type, status, risk_score, page, user_agent, decision_reason, site_id, customer_id, detection_data, fingerprint, sites(name, domain)', { count: 'exact' })
        .eq('customer_id', customerId)

      // Apply filters
      // Multi-site filter
      if (filters.siteIds.length > 0) {
        query = query.in('site_id', filters.siteIds)
      }

      // Date range filter
      if (filters.dateRange.start) {
        query = query.gte('timestamp', filters.dateRange.start.toISOString())
      }
      if (filters.dateRange.end) {
        // Add 1 day to include the end date
        const endDate = new Date(filters.dateRange.end)
        endDate.setHours(23, 59, 59, 999)
        query = query.lte('timestamp', endDate.toISOString())
      }

      // Type filter
      if (filters.type !== 'all') {
        query = query.eq('type', filters.type)
      }

      // Status filter
      if (filters.status !== 'all') {
        query = query.eq('status', filters.status)
      }

      // IP search filter
      if (filters.ipSearch.trim()) {
        query = query.ilike('ip', `%${filters.ipSearch.trim()}%`)
      }

      // Page search filter
      if (filters.pageSearch.trim()) {
        query = query.ilike('page', `%${filters.pageSearch.trim()}%`)
      }

      // Order and paginate
      query = query
        .order('timestamp', { ascending: false })
        .range(currentOffset, currentOffset + LIMIT - 1)

      const { data, error: queryError, count } = await query

      if (queryError) {
        console.error('Error fetching logs:', queryError)
        setError(queryError.message)
        toast.error('Failed to load logs')
        return
      }

      const newLogs = (data || []) as unknown as RequestLog[]

      if (reset) {
        setLogs(newLogs)
        setOffset(LIMIT)
      } else {
        setLogs(prev => [...prev, ...newLogs])
        setOffset(prev => prev + LIMIT)
      }

      // Check if there are more logs to load
      setHasMore(count ? currentOffset + LIMIT < count : false)

    } catch (err) {
      console.error('Error loading logs:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      toast.error('Failed to load logs')
    } finally {
      setLoading(false)
    }
  }, [customerId, filters, offset])

  const updateFilters = (newFilters: Partial<LogFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
    setOffset(0)
    setHasMore(true)
  }

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS)
    setOffset(0)
    setHasMore(true)
  }

  const loadMore = () => {
    if (!loading && hasMore) {
      loadLogs(false)
    }
  }

  // Reload logs when filters change
  useEffect(() => {
    loadLogs(true)
  }, [filters, customerId])

  // Real-time subscription for new logs
  useEffect(() => {
    // Don't subscribe if no customerId
    if (!customerId || customerId === '') return

    const channel = supabase
      .channel('request_logs_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'request_logs',
          filter: `customer_id=eq.${customerId}`
        },
        async (payload) => {
          // Fetch the full log with site info
          const { data: newLog } = await supabase
            .from('request_logs')
            .select('*, sites(name, domain)')
            .eq('id', payload.new.id)
            .single()

          if (newLog) {
            // Check if new log matches current filters
            const matchesFilters = applyFiltersToLog(newLog as RequestLog, filters)

            if (matchesFilters) {
              setLogs(prev => [newLog as RequestLog, ...prev])
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [customerId, filters])

  return {
    logs,
    loading,
    error,
    filters,
    updateFilters,
    clearFilters,
    hasMore,
    loadMore,
    reload: () => loadLogs(true)
  }
}

// Helper function to check if a log matches current filters
const applyFiltersToLog = (log: RequestLog, filters: LogFilters): boolean => {
  // Site filter
  if (filters.siteIds.length > 0 && !filters.siteIds.includes(log.site_id)) {
    return false
  }

  // Date range filter
  if (filters.dateRange.start) {
    const logDate = new Date(log.timestamp)
    if (logDate < filters.dateRange.start) {
      return false
    }
  }
  if (filters.dateRange.end) {
    const logDate = new Date(log.timestamp)
    const endDate = new Date(filters.dateRange.end)
    endDate.setHours(23, 59, 59, 999)
    if (logDate > endDate) {
      return false
    }
  }

  // Type filter
  if (filters.type !== 'all' && log.type !== filters.type) {
    return false
  }

  // Status filter
  if (filters.status !== 'all' && log.status !== filters.status) {
    return false
  }

  // IP search
  if (filters.ipSearch.trim() && !log.ip.toLowerCase().includes(filters.ipSearch.toLowerCase())) {
    return false
  }

  // Page search
  if (filters.pageSearch.trim() && !log.page.toLowerCase().includes(filters.pageSearch.toLowerCase())) {
    return false
  }

  return true
}
