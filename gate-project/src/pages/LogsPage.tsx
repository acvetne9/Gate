import { useState, useEffect } from 'react'
import { Activity, Download } from 'lucide-react'
import { useEnhancedLogs, RequestLog } from '../hooks/useEnhancedLogs'
import { LogFilters } from '../components/LogFilters'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'
import { PageLayout, LogDetailModal, CompleteLogDetails } from '../components'

// Helper to get short location display
const getShortLocation = (log: RequestLog): string => {
  const whois = log.detection_data?.whois_data
  if (!whois) return '-'
  if (whois.city && whois.country) {
    return `${whois.city}, ${whois.country.substring(0, 2).toUpperCase()}`
  }
  return whois.country || '-'
}

interface Site {
  id: string
  name: string
  domain: string
}

export default function LogsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [sites, setSites] = useState<Site[]>([])
  const [expandedLog, setExpandedLog] = useState<RequestLog | null>(null)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/login')
    }
  }, [user, navigate])

  // ESC key handler for closing modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && expandedLog) {
        setExpandedLog(null)
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [expandedLog])

  const { logs, loading, filters, updateFilters, clearFilters, hasMore, loadMore } = useEnhancedLogs(user?.id || '', {})

  // Fetch sites for the filter
  useEffect(() => {
    if (!user) return

    async function fetchSites() {
      if (!user) return
      const { data, error } = await supabase
        .from('sites')
        .select('id, name, domain')
        .eq('customer_id', user.id)

      if (!error && data) {
        setSites(data)
      }
    }

    fetchSites()
  }, [user])

  const exportToCSV = () => {
    if (logs.length === 0) {
      toast.error('No logs to export')
      return
    }

    // Escape CSV values to prevent CSV injection
    const escapeCSV = (value: string) => {
      if (value === null || value === undefined) return ''
      const stringValue = String(value)
      // Prevent CSV injection by sanitizing values that start with =, +, -, @, \t, \r
      if (/^[=+\-@\t\r]/.test(stringValue)) {
        return `"'${stringValue.replace(/"/g, '""')}"`
      }
      return `"${stringValue.replace(/"/g, '""')}"`
    }

    // Create CSV content
    const headers = ['Time', 'Site', 'IP', 'Type', 'Status', 'Risk Score', 'Page', 'Decision Reason', 'Platform', 'Timezone']
    const rows = logs.map(log => [
      new Date(log.timestamp).toISOString(),
      log.sites?.name || 'Unknown',
      log.ip,
      log.type,
      log.status,
      ((log.risk_score || 0) * 100).toFixed(0) + '%',
      log.page,
      log.decision_reason || '',
      log.fingerprint?.platform || '',
      log.fingerprint?.timezone || ''
    ])

    const csvContent = [
      headers.map(escapeCSV).join(','),
      ...rows.map(row => row.map(escapeCSV).join(','))
    ].join('\n')

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `logs-${new Date().toISOString()}.csv`
    a.click()
    window.URL.revokeObjectURL(url)

    toast.success(`Exported ${logs.length} logs to CSV`)
  }

  if (loading && logs.length === 0) {
      return (
        <PageLayout activeRoute="/logs">
          <div className="min-h-screen bg-gray-50">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="relative w-16 h-16 mx-auto mb-4">
                  <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-t-green-800 border-r-green-600 animate-spin"></div>
                </div>
                <p className="text-gray-600 text-sm">Loading logs...</p>
              </div>
            </div>
          </div>
        </PageLayout>
      )
    }

  return (
    <PageLayout activeRoute="/logs">
      <div className="min-h-screen bg-gray-50">
        <div className="pt-24 pb-8 px-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-5xl font-semibold text-gray-900 tracking-tight">
            Request Logs
          </h1>
          <p className="text-gray-600 mt-3 text-lg font-light">
            Real-time traffic monitoring with advanced filtering
          </p>
        </div>

        <button
          onClick={exportToCSV}
          disabled={logs.length === 0}
          className="flex items-center gap-2 px-6 py-3 rounded-full bg-green-800 text-white hover:bg-green-700 hover:shadow-xl hover:scale-105 transition-all duration-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          <Download className="w-5 h-5" />
          Export CSV
        </button>
      </div>

      {/* Enhanced Filters */}
      <LogFilters
        filters={filters}
        onFiltersChange={updateFilters}
        onClearFilters={clearFilters}
        sites={sites}
      />

      {/* Results Count */}
      <div className="mb-6 flex items-center justify-between">
        <span className="text-sm text-gray-600">
          Showing {logs.length} {logs.length === 1 ? 'request' : 'requests'}
        </span>
        {logs.length === 500 && (
          <span className="text-sm text-yellow-700 bg-yellow-50 px-3 py-1 rounded-full">
            Limited to 500 most recent results. Use filters to refine your search.
          </span>
        )}
      </div>

      {/* Logs Table */}
      <div className="rounded-3xl bg-white border border-gray-200 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Site
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  IP Address
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Risk Score
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Reason
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Page
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <Activity className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p className="text-gray-600 font-medium">No logs found</p>
                    {(filters.siteIds.length > 0 ||
                      filters.dateRange.start ||
                      filters.dateRange.end ||
                      filters.type !== 'all' ||
                      filters.status !== 'all' ||
                      filters.ipSearch ||
                      filters.pageSearch) && (
                      <p className="text-sm mt-2 text-gray-500">Try adjusting your filters</p>
                    )}
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr 
                    key={log.id} 
                    className="hover:bg-gray-50 transition-colors duration-150 cursor-pointer"
                    onClick={() => setExpandedLog(log)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(log.timestamp).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div>
                        <div className="font-medium text-gray-900">
                          {log.sites?.name || 'Unknown'}
                        </div>
                        <div className="text-gray-500 text-xs">{log.sites?.domain}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-mono">
                      {log.ip?.split(',')[0] || log.ip}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          log.type === 'bot' || log.type === 'scraper'
                            ? 'bg-red-100 text-red-800'
                            : log.type === 'human'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {log.type?.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          log.status === 'blocked' || log.status === 'challenged'
                            ? 'bg-red-100 text-red-800'
                            : log.status === 'allowed'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {log.status?.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[80px]">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              (log.risk_score || 0) > 0.7
                                ? 'bg-red-500'
                                : (log.risk_score || 0) > 0.4
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                            }`}
                            style={{ width: `${(log.risk_score || 0) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600 font-medium min-w-[3rem]">
                          {((log.risk_score || 0) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs">
                      <div className="truncate" title={log.decision_reason || 'No reason'}>
                        {log.decision_reason ? (
                          <span className={`${
                            log.decision_reason.startsWith('BLOCKED')
                              ? 'text-red-700 font-medium'
                              : log.decision_reason.startsWith('SCRAPED')
                              ? 'text-orange-600 font-medium'
                              : 'text-gray-600'
                          }`}>
                            {log.decision_reason.length > 60
                              ? log.decision_reason.substring(0, 60) + '...'
                              : log.decision_reason}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">N/A</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                      {log.page}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Live Status Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-3">
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-600 font-medium">
              Live • Auto-refreshing with filters applied • Click a row for details
            </span>
          </div>
        </div>
      </div>

      {/* Load More Button */}
      {hasMore && !loading && (
        <div className="mt-6 text-center">
          <button
            onClick={loadMore}
            className="px-8 py-3 bg-green-600 text-white rounded-full hover:bg-green-700 transition font-medium"
          >
            Load More Logs
          </button>
        </div>
      )}

      {loading && logs.length > 0 && (
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 text-gray-600">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-green-600 rounded-full animate-spin"></div>
            <span>Loading more logs...</span>
          </div>
        </div>
      )}
      </div>

      {/* Expanded Log Modal */}
      {expandedLog && (
        <LogDetailModal log={expandedLog as any} onClose={() => setExpandedLog(null)}>
          <CompleteLogDetails log={expandedLog as any} />
        </LogDetailModal>
      )}
    </div>
  </PageLayout>
  )
}