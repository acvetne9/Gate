import { useEffect, useState, useRef } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { getAdminStats } from '../lib/stats'
import { PreserveScrollContainer } from '../components/PreserveScrollContainer'
import SettingsManagementPage from './SettingsManagementPage'
import {
  Shield,
  Users,
  Activity,
  Settings,
  Download,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Play,
  Terminal,
  Target,
  X
} from 'lucide-react'
import { LogDetailModal, CompleteLogDetails, BotLogCard, BotAttackLog } from '../components'

export default function AdminDashboard() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  // Redirect non-admins away from admin page
  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      navigate('/dashboard')
    }
  }, [user, loading, navigate])

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-800 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render admin content for non-admins
  if (!user || user.role !== 'admin') {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header - Like other pages */}
      <nav className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6" />
              <span className="text-xl font-bold">Gate</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <button onClick={() => navigate('/')} className="text-sm font-medium hover:underline">
                Home
              </button>
              <button onClick={() => navigate('/demo')} className="text-sm font-medium hover:underline">
                Demo
              </button>
              <button onClick={() => navigate('/dashboard')} className="text-sm font-medium hover:underline">
                Dashboard
              </button>
              <button onClick={() => navigate('/billing')} className="text-sm font-medium hover:underline">
                Billing
              </button>
              <button onClick={() => navigate('/dashboard/onboarding')} className="text-sm font-medium hover:underline">
                Get Started
              </button>
              <button onClick={() => navigate('/admin')} className="text-sm font-medium hover:underline text-green-800">
                Admin Panel
              </button>
              <button onClick={() => navigate('/blog')} className="text-sm font-medium hover:underline">
                Blog
              </button>
            </div>
            <div>
              <button
                onClick={() => navigate('/dashboard')}
                className="px-6 py-2 rounded-full bg-green-800 text-white text-sm font-medium hover:bg-green-700 hover:shadow-xl hover:scale-105 hover:-translate-y-1 transition-all duration-200"
              >
                Dashboard
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Sub-navigation for Admin sections */}
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-6">
            <button
              onClick={() => navigate('/admin')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
                window.location.pathname === '/admin'
                  ? 'border-green-800 text-green-800'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => navigate('/admin/customers')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
                window.location.pathname === '/admin/customers'
                  ? 'border-green-800 text-green-800'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Customers
            </button>
            <button
              onClick={() => navigate('/admin/logs')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
                window.location.pathname === '/admin/logs'
                  ? 'border-green-800 text-green-800'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Logs
            </button>
            <button
              onClick={() => navigate('/admin/bot-testing')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
                window.location.pathname === '/admin/bot-testing'
                  ? 'border-green-800 text-green-800'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Bot Testing
            </button>
            <button
              onClick={() => navigate('/admin/settings')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
                window.location.pathname === '/admin/settings'
                  ? 'border-green-800 text-green-800'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Settings
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/logs" element={<AllLogsPage />} />
          <Route path="/bot-testing" element={<BotTestingPage />} />
          <Route path="/settings" element={<SettingsManagementPage />} />
        </Routes>
      </div>
    </div>
  )
}

function OverviewPage() {
  const [stats, setStats] = useState({ customers: 0, sites: 0, logs: 0, blockedToday: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  async function loadStats() {
    const adminStats = await getAdminStats()

    setStats({
      customers: adminStats.totalCustomers,
      sites: adminStats.totalSites,
      logs: adminStats.requestsToday,
      blockedToday: adminStats.botsBlockedToday,
    })
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-800 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Overview</h1>
        <p className="text-gray-600 mt-1">System-wide statistics and monitoring</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<Users className="w-6 h-6" />}
          title="Total Customers"
          value={stats.customers}
          color="blue"
        />
        <StatCard
          icon={<Shield className="w-6 h-6" />}
          title="Protected Sites"
          value={stats.sites}
          color="green"
        />
        <StatCard
          icon={<Activity className="w-6 h-6" />}
          title="Requests Monitored"
          value={stats.logs}
          color="purple"
        />
        <StatCard
          icon={<TrendingUp className="w-6 h-6" />}
          title="Bots Blocked"
          value={stats.blockedToday}
          color="red"
        />
      </div>
    </div>
  )
}

function StatCard({
  icon,
  title,
  value,
  color
}: {
  icon: React.ReactNode
  title: string
  value: number
  color: string
}) {
  const colors = {
    blue: 'bg-green-100 text-green-800',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-green-100 text-green-800',
    red: 'bg-red-100 text-red-600'
  }

  return (
    <div className="rounded-3xl bg-white border border-gray-200 hover:border-green-200 hover:shadow-xl transition-all duration-200 p-6">
      <div className={`w-12 h-12 rounded-lg ${colors[color as keyof typeof colors]} flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
      <p className="text-3xl font-bold text-gray-900">{value.toLocaleString()}</p>
    </div>
  )
}

function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null)
  const [customerSites, setCustomerSites] = useState<any[]>([])
  const [customerLogs, setCustomerLogs] = useState<any[]>([])
  const [searching, setSearching] = useState(false)

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Load customers when search changes
  useEffect(() => {
    searchCustomers(debouncedSearch)
  }, [debouncedSearch])

  async function searchCustomers(query: string) {
    setSearching(true)

    try {
      // Use admin RPC function to search customers (bypasses RLS)
      const { data: searchResults, error: searchError } = await supabase
        .rpc('admin_search_customers', { search_term: query.trim() })

      if (searchError) {
        console.error('Admin search error:', searchError)
        setCustomers([])
        setLoading(false)
        setSearching(false)
        return
      }

      if (!searchResults || searchResults.length === 0) {
        setCustomers([])
        setLoading(false)
        setSearching(false)
        return
      }

      // Get customer IDs from search results
      const customerIds = searchResults.map((r: any) => r.id)

      // Fetch full customer data with sites and subscriptions
      const { data: fullCustomers } = await supabase
        .from('user_profiles')
        .select(`
          *,
          sites(id, name, domain, site_id),
          subscriptions(plan_name, status, current_period_end)
        `)
        .in('id', customerIds)
        .order('created_at', { ascending: false })

      if (fullCustomers) {
        setCustomers(fullCustomers)
      } else {
        // Fallback to search results without related data
        setCustomers(searchResults)
      }
    } catch (error) {
      console.error('Search error:', error)
      setCustomers([])
    }

    setLoading(false)
    setSearching(false)
  }

  async function toggleCustomer(customerId: string) {
    if (expandedCustomer === customerId) {
      setExpandedCustomer(null)
      setCustomerSites([])
      setCustomerLogs([])
    } else {
      setExpandedCustomer(customerId)

      // Load customer's sites and their logs
      const { data: sitesData } = await supabase
        .from('sites')
        .select('*')
        .eq('customer_id', customerId)

      if (sitesData) {
        setCustomerSites(sitesData)
        
        // Get logs for all customer's sites
        const siteIds = sitesData.map(s => s.id)
        if (siteIds.length > 0) {
          const { data: logsData } = await supabase
            .from('request_logs')
            .select('*, sites(name)')
            .in('site_id', siteIds)
            .order('timestamp', { ascending: false })
            .limit(50)

          if (logsData) setCustomerLogs(logsData)
        } else {
          setCustomerLogs([])
        }
      }
    }
  }

  const filteredCustomers = customers

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-800"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
        <p className="text-gray-600 mt-1">Manage all customer accounts and their sites</p>
      </div>

      {/* Search Bar */}
      <div className="mb-4 flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 bg-white">
          {searching ? (
            <RefreshCw className="w-4 h-4 text-gray-400 animate-spin" />
          ) : (
            <Search className="w-4 h-4 text-gray-400" />
          )}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by email, name, site, domain, or ID..."
            className="flex-1 border-none outline-none text-sm"
          />
        </div>
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="px-3 py-2 rounded-full border border-gray-200 hover:bg-gray-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search Results Info */}
      {searchQuery && !searching && (
        <div className="mb-4 text-sm text-gray-500">
          Found {filteredCustomers.length} customer{filteredCustomers.length !== 1 ? 's' : ''} matching "{searchQuery}"
        </div>
      )}

      {/* Compact Customers List */}
      <div className="space-y-2">
        {filteredCustomers.map((customer) => (
          <div key={customer.id} className="rounded-3xl border border-gray-200 bg-white hover:border-green-200 hover:shadow-xl transition-all duration-200">
            {/* Customer Row - Compact */}
            <button
              onClick={() => toggleCustomer(customer.id)}
              className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-3 flex-1 text-left">
                {expandedCustomer === customer.id ? (
                  <ChevronDown className="w-4 h-4 text-gray-600" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-sm">{customer.name}</span>
                    <span className="text-xs text-gray-500">{customer.email}</span>
                    {customer.subscriptions?.[0]?.plan_name && (
                      <span className={`text-xs px-2 py-0.5 capitalize ${
                        customer.subscriptions[0].plan_name === 'max'
                          ? 'bg-green-100 text-green-800 border border-green-300'
                          : customer.subscriptions[0].plan_name === 'keeper'
                          ? 'bg-green-100 text-green-700 border border-green-300'
                          : 'bg-gray-200 text-gray-700 border border-gray-400'
                      }`}>
                        {customer.subscriptions[0].plan_name} plan
                      </span>
                    )}
                    {customer.sites?.length > 0 && (
                      <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-700 border border-gray-400">
                        {customer.sites.length} site{customer.sites.length !== 1 ? 's' : ''}
                      </span>
                    )}
                    {customer.role === 'admin' && (
                      <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 border border-green-300">
                        Admin
                      </span>
                    )}
                  </div>
                  {customer.sites?.length > 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                      Sites: {customer.sites.map((s: any) => s.name).join(', ')}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-xs text-gray-500">
                Joined {new Date(customer.created_at).toLocaleDateString()}
              </div>
            </button>

            {/* Expanded Customer Dashboard */}
            {expandedCustomer === customer.id && (
              <div className="border-t border-gray-200 bg-gray-50 p-4 rounded-b-3xl">
                <h3 className="text-sm font-bold mb-3">Customer Dashboard</h3>

                {/* Subscription Info */}
                {customer.subscriptions?.[0] && (
                  <div className="mb-4 bg-white border border-gray-300 px-3 py-2">
                    <h4 className="text-xs font-bold text-gray-700 mb-2">Subscription</h4>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500">Plan:</span>
                        <span className={`ml-2 font-semibold capitalize ${
                          customer.subscriptions[0].plan_name === 'max' ? 'text-green-800' :
                          customer.subscriptions[0].plan_name === 'keeper' ? 'text-green-700' :
                          'text-gray-700'
                        }`}>
                          {customer.subscriptions[0].plan_name}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Status:</span>
                        <span className={`ml-2 font-semibold capitalize ${
                          customer.subscriptions[0].status === 'active' ? 'text-green-700' :
                          customer.subscriptions[0].status === 'canceled' ? 'text-red-700' :
                          'text-gray-700'
                        }`}>
                          {customer.subscriptions[0].status || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Renewal:</span>
                        <span className="ml-2 font-semibold">
                          {customer.subscriptions[0].current_period_end
                            ? new Date(customer.subscriptions[0].current_period_end).toLocaleDateString()
                            : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sites */}
                <div className="mb-4">
                  <h4 className="text-xs font-bold text-gray-700 mb-2">Sites ({customerSites.length})</h4>
                  {customerSites.length === 0 ? (
                    <p className="text-xs text-gray-500">No sites</p>
                  ) : (
                    <div className="space-y-1">
                      {customerSites.map((site) => (
                        <div key={site.id} className="bg-white border border-gray-300 px-3 py-2 text-xs">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-bold">{site.name}</span>
                              <span className="text-gray-500 ml-2">{site.domain}</span>
                            </div>
                            <span className={`px-2 py-0.5 text-xs ${
                              site.status === 'active'
                                ? 'bg-green-100 text-green-700 border border-green-300'
                                : 'bg-gray-200 text-gray-700 border border-gray-400'
                            }`}>
                              {site.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent Logs */}
                <div>
                  <h4 className="text-xs font-bold text-gray-700 mb-2">Recent Activity (Last 20 requests)</h4>
                  {customerLogs.length === 0 ? (
                    <p className="text-xs text-gray-500">No recent activity</p>
                  ) : (
                    <div className="bg-black text-green-400 font-mono text-xs overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-900 border-b border-green-600">
                          <tr>
                            <th className="px-2 py-1 text-left font-normal text-green-500">TIME</th>
                            <th className="px-2 py-1 text-left font-normal text-green-500">SITE</th>
                            <th className="px-2 py-1 text-left font-normal text-green-500">IP</th>
                            <th className="px-2 py-1 text-left font-normal text-green-500">STATUS</th>
                            <th className="px-2 py-1 text-left font-normal text-green-500">PAGE</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                          {customerLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-gray-900">
                              <td className="px-2 py-1 whitespace-nowrap">
                                {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString('en-US', { hour12: false })}
                              </td>
                              <td className="px-2 py-1 whitespace-nowrap">
                                {log.sites?.name || 'Unknown'}
                              </td>
                              <td className="px-2 py-1 whitespace-nowrap text-cyan-400">
                                {log.ip}
                              </td>
                              <td className="px-2 py-1 whitespace-nowrap">
                                <span className={log.status === 'blocked' ? 'text-red-400' : 'text-green-400'}>
                                  {log.status?.toUpperCase()}
                                </span>
                              </td>
                              <td className="px-2 py-1 truncate max-w-[300px]">
                                {log.page}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {filteredCustomers.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No customers found</p>
          </div>
        )}
      </div>
    </div>
  )
}

function AllLogsPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'blocked' | 'allowed'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedLog, setExpandedLog] = useState<any | null>(null)

  useEffect(() => {
    loadLogs()

    // Subscribe to real-time updates
    const channel = supabase
      .channel('admin-logs')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'request_logs' },
        (payload) => {
          setLogs(prev => [payload.new as any, ...prev].slice(0, 100))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // ESC key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && expandedLog) {
        setExpandedLog(null)
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [expandedLog])

  async function loadLogs() {
    setLoading(true)
    const { data } = await supabase
      .from('request_logs')
      .select('*, sites(name, domain), user_profiles(name, email)')
      .order('timestamp', { ascending: false })
      .limit(100)

    if (data) setLogs(data)
    setLoading(false)
  }

  const filteredLogs = logs.filter(log => {
    if (filter !== 'all' && log.status !== filter) return false
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      return (
        log.ip?.toLowerCase().includes(query) ||
        log.page?.toLowerCase().includes(query) ||
        log.user_agent?.toLowerCase().includes(query) ||
        log.sites?.name?.toLowerCase().includes(query) ||
        log.user_profiles?.email?.toLowerCase().includes(query)
      )
    }
    return true
  })

  const exportLogs = () => {
    const csv = [
      ['Timestamp', 'Customer', 'Site', 'IP', 'Type', 'Status', 'Risk Score', 'Page', 'User Agent'],
      ...filteredLogs.map(log => [
        new Date(log.timestamp).toISOString(),
        log.user_profiles?.email || 'Unknown',
        log.sites?.name || 'Unknown',
        log.ip,
        log.type,
        log.status,
        log.risk_score?.toString() || '0',
        log.page,
        log.user_agent || ''
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `admin-logs-${new Date().toISOString()}.csv`
    a.click()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-800"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">All Logs</h1>
          <p className="text-gray-600 mt-1">{filteredLogs.length} requests • System-wide monitoring</p>
        </div>

        <button
          onClick={exportLogs}
          className="flex items-center gap-2 px-6 py-2 rounded-full bg-green-800 text-white hover:bg-green-700 hover:shadow-xl hover:scale-105 hover:-translate-y-1 transition-all duration-200"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Compact Filter Bar */}
      <div className="bg-white rounded-2xl border border-gray-200 px-4 py-3 mb-4 flex items-center gap-2 flex-wrap shadow-sm">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search IP, page, customer, site..."
            className="flex-1 bg-transparent border-none outline-none text-sm"
          />
        </div>

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className="px-3 py-1 rounded-full border border-gray-200 bg-white text-sm hover:bg-gray-50 transition"
        >
          <option value="all">All Status</option>
          <option value="allowed">Allowed</option>
          <option value="blocked">Blocked</option>
        </select>

        <button
          onClick={loadLogs}
          className="flex items-center gap-1 px-3 py-1 rounded-full border border-gray-200 hover:bg-gray-100 transition"
          title="Refresh logs"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="flex items-center gap-1 px-3 py-1 text-gray-600 hover:text-gray-900"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Terminal-Style Table */}
      <div className="bg-gray-900 rounded-3xl border border-gray-700 overflow-hidden shadow-xl">
        {/* Terminal Header */}
        <div className="bg-gray-800 px-3 py-1.5 border-b border-gray-700 flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
          </div>
          <span className="text-xs text-gray-400 font-mono ml-2">admin-logs</span>
          <div className="ml-auto flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-green-400 font-mono">LIVE</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full font-mono text-xs">
            <thead className="bg-gray-800 border-b border-gray-700">
              <tr>
                <th className="px-2 py-1.5 text-left text-green-500 font-normal">TIME</th>
                <th className="px-2 py-1.5 text-left text-green-500 font-normal">CUSTOMER</th>
                <th className="px-2 py-1.5 text-left text-green-500 font-normal">SITE</th>
                <th className="px-2 py-1.5 text-left text-green-500 font-normal">IP</th>
                <th className="px-2 py-1.5 text-left text-green-500 font-normal">LOCATION</th>
                <th className="px-2 py-1.5 text-left text-green-500 font-normal">ISP</th>
                <th className="px-2 py-1.5 text-left text-green-500 font-normal">TYPE</th>
                <th className="px-2 py-1.5 text-left text-green-500 font-normal">STATUS</th>
                <th className="px-2 py-1.5 text-left text-green-500 font-normal">RISK</th>
                <th className="px-2 py-1.5 text-left text-green-500 font-normal">CATEGORY</th>
                <th className="px-2 py-1.5 text-left text-green-500 font-normal">PAGE</th>
                <th className="px-2 py-1.5 text-left text-green-500 font-normal">FLAGS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-2 py-8 text-center">
                    <Activity className="w-6 h-6 text-gray-600 mx-auto mb-2 opacity-50" />
                    <p className="text-xs text-gray-500 font-mono">No logs found</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-800 cursor-pointer transition-colors duration-150" onClick={() => setExpandedLog(log)}>
                    <td className="px-2 py-1.5 text-gray-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString('en-US', { hour12: false })}
                    </td>
                    <td className="px-2 py-1.5 text-purple-400 whitespace-nowrap truncate max-w-[120px]" title={log.user_profiles?.email || 'Unknown'}>
                      {log.user_profiles?.email || 'Unknown'}
                    </td>
                    <td className="px-2 py-1.5 text-cyan-400 whitespace-nowrap truncate max-w-[120px]" title={log.sites?.name || 'Unknown'}>
                      {log.sites?.name || 'Unknown'}
                    </td>
                    <td className="px-2 py-1.5 text-purple-400 whitespace-nowrap">
                      {log.ip}
                    </td>
                    <td className="px-2 py-1.5 text-gray-400 whitespace-nowrap">
                      {log.detection_data?.whois_data?.city && log.detection_data?.whois_data?.country 
                        ? `${log.detection_data.whois_data.city}, ${log.detection_data.whois_data.country}` 
                        : 'Unknown'}
                    </td>
                    <td className="px-2 py-1.5 text-gray-400 whitespace-nowrap">
                      {log.detection_data?.whois_data?.isp || log.detection_data?.whois_data?.orgName || 'Unknown'}
                    </td>
                    <td className="px-2 py-1.5 whitespace-nowrap">
                      <span className={log.type === 'bot' ? 'text-red-400' : log.type === 'human' ? 'text-green-400' : 'text-yellow-400'}>
                        {log.type?.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 whitespace-nowrap">
                      <span className={log.status === 'blocked' ? 'text-red-400' : log.status === 'allowed' ? 'text-green-400' : 'text-yellow-400'}>
                        {log.status?.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 whitespace-nowrap">
                      <span className={
                        (log.risk_score || 0) > 0.7 ? 'text-red-400' :
                        (log.risk_score || 0) > 0.4 ? 'text-yellow-400' :
                        'text-green-400'
                      }>
                        {((log.risk_score || 0) * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-gray-400 whitespace-nowrap">
                      {log.threatIntel?.category || log.botType || 'Unknown'}
                    </td>
                    <td className="px-2 py-1.5 text-gray-400 truncate max-w-[120px]" title={log.page}>
                      {log.page}
                    </td>
                    <td className="px-2 py-1.5 whitespace-nowrap text-xs">
                      {log.network?.isVPN && <span className="text-red-300">VPN </span>}
                      {log.network?.isProxy && <span className="text-red-300">PRX </span>}
                      {log.network?.isDatacenter && <span className="text-yellow-300">DC </span>}
                      {log.fingerprint?.hasWebdriver && <span className="text-red-300">WD </span>}
                      {log.fingerprint?.hasHeadless && <span className="text-red-300">HL </span>}
                      {!log.network?.isVPN && !log.network?.isProxy && !log.network?.isDatacenter && !log.fingerprint?.hasWebdriver && !log.fingerprint?.hasHeadless && <span className="text-gray-600">-</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Terminal Footer */}
        <div className="px-3 py-1.5 bg-gray-800 border-t border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-mono">$ tail -f /var/log/gate/admin.log</span>
          </div>
          {filteredLogs.length === 100 && (
            <span className="text-xs text-yellow-500 font-mono">⚠ showing last 100</span>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="mt-3 flex items-center justify-between text-xs text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>Live • Real-time updates enabled</span>
        </div>
        {filteredLogs.length === 100 && (
          <span className="text-yellow-600">⚠ Limited to 100 most recent results</span>
        )}
      </div>

      {/* Expanded Log Modal */}
      {expandedLog && (
        <LogDetailModal log={expandedLog as any} onClose={() => setExpandedLog(null)}>
          <CompleteLogDetails log={expandedLog as any} showCustomer />
        </LogDetailModal>
      )}
    </div>
  )
}

function BotTestingPage() {
  const [sites, setSites] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSite, setSelectedSite] = useState<any | null>(null)
  const [manualUrl, setManualUrl] = useState('')
  const [useManualUrl, setUseManualUrl] = useState(false)
  const [isAttacking, setIsAttacking] = useState(false)
  const [botLogs, setBotLogs] = useState<any[]>([])
  const [gateLogs, setGateLogs] = useState<any[]>([])
  const [attackStats, setAttackStats] = useState({ total: 0, blocked: 0 })
  const [siteSearchTerm, setSiteSearchTerm] = useState('')
  const [systemLoaded, setSystemLoaded] = useState(false)

  useEffect(() => {
    loadSites()
    
    // Wait for attack system to be loaded
    const checkSystem = setInterval(() => {
      if ((window as any).launchComprehensiveAttack && (window as any).ATTACK_BOTS) {
        setSystemLoaded(true)
        clearInterval(checkSystem)
        console.log('✅ Attack system is ready. Bots available:', (window as any).ATTACK_BOTS.length)
      }
    }, 100)
    
    return () => clearInterval(checkSystem)
  }, [])

  async function loadSites() {
    setLoading(true)
    const { data } = await supabase
      .from('sites')
      .select('*, user_profiles(name, email)')
      .order('created_at', { ascending: false })

    if (data) setSites(data)
    setLoading(false)
  }

  const launchAttack = async () => {
    // Check if we have either a selected site or a manual URL
    if ((!selectedSite && !useManualUrl) || (useManualUrl && !manualUrl.trim()) || isAttacking) return

    setIsAttacking(true)
    setBotLogs([])
    setGateLogs([])
    setAttackStats({ total: 0, blocked: 0 })

    // Record start time for fetching Gate logs
    const attackStartTime = new Date().toISOString()

    // Start polling for Gate logs if testing a database site
    let pollInterval: NodeJS.Timeout | null = null
    if (!useManualUrl && selectedSite) {
      pollInterval = setInterval(async () => {
        const { data } = await supabase
          .from('request_logs')
          .select('*, sites(name)')
          .eq('site_id', selectedSite.id)
          .gte('timestamp', attackStartTime)
          .order('timestamp', { ascending: true })

        if (data) {
          setGateLogs(data)
        }
      }, 1000) // Poll every second
    }

    try {
      // Use the comprehensive attack system that's pre-loaded in window
      // This bypasses import issues and ensures we get the 25-bot version
      if (typeof window !== 'undefined' && (window as any).launchComprehensiveAttack) {
        const launchComprehensiveAttack = (window as any).launchComprehensiveAttack

        // Determine target URL from user selection
        let targetUrl: string
        if (useManualUrl) {
          targetUrl = manualUrl.trim().startsWith('http')
            ? manualUrl.trim()
            : `https://${manualUrl.trim()}`
        } else {
          targetUrl = selectedSite.domain.startsWith('http')
            ? selectedSite.domain
            : `https://${selectedSite.domain}`
        }

        console.log('🎯 Attack config:', {
          targetUrl,
          testType: useManualUrl ? 'manual URL' : 'database site',
          siteName: selectedSite?.name || 'Manual',
          phases: 'Phase 1: Standard | Phase 2: Evasion | Phase 3: Multi-page',
          botsAvailable: (window as any).ATTACK_BOTS?.length || 'unknown'
        })

        // Launch comprehensive attack with enhanced evasion and behavioral patterns
        await launchComprehensiveAttack(targetUrl, (log: any) => {
          // Add to bot logs
          setBotLogs(prev => [...prev, log])

          // Update stats
          setAttackStats(prev => ({
            total: prev.total + 1,
            blocked: prev.blocked + (log.status === 'blocked' ? 1 : 0)
          }))
        }, {
          includeEvasion: true,
          includeBehavioral: false,
          parallelAttacks: false
        })
      } else {
        // Fallback: try dynamic import if window version not available
        const { launchComprehensiveAttack } = await import(`../attack-bots/comprehensiveAttack.js?t=${Date.now()}`)

        // Determine target URL from user selection
        let targetUrl: string
        if (useManualUrl) {
          targetUrl = manualUrl.trim().startsWith('http')
            ? manualUrl.trim()
            : `https://${manualUrl.trim()}`
        } else {
          targetUrl = selectedSite.domain.startsWith('http')
            ? selectedSite.domain
            : `https://${selectedSite.domain}`
        }

        console.log('🎯 Attack config (fallback import):', {
          targetUrl,
          testType: useManualUrl ? 'manual URL' : 'database site',
          siteName: selectedSite?.name || 'Manual',
          phases: 'Phase 1: Standard | Phase 2: Evasion | Phase 3: Multi-page'
        })

        // Launch comprehensive attack with enhanced evasion and behavioral patterns
        await launchComprehensiveAttack(targetUrl, (log: any) => {
          // Add to bot logs
          setBotLogs(prev => [...prev, log])

          // Update stats
          setAttackStats(prev => ({
            total: prev.total + 1,
            blocked: prev.blocked + (log.status === 'blocked' ? 1 : 0)
          }))
        }, {
          includeEvasion: true,
          includeBehavioral: true,
          parallelAttacks: false
        })
      }

    } catch (error) {
      console.error('Attack simulation error:', error)
    }

    // Stop polling and do one final fetch
    if (pollInterval) {
      clearInterval(pollInterval)
      // Final fetch to get any remaining logs
      const { data } = await supabase
        .from('request_logs')
        .select('*, sites(name)')
        .eq('site_id', selectedSite.id)
        .gte('timestamp', attackStartTime)
        .order('timestamp', { ascending: true })

      if (data) {
        setGateLogs(data)
      }
    }

    setIsAttacking(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-800"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Bot Testing</h1>
        <p className="text-gray-600 mt-1">Test defenses from an outside perspective - bots will attempt to scrape the site just like real scrapers would</p>
      </div>

      {/* Site Selection */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-xl p-6 mb-6">

        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Target className="w-5 h-5" />
          Select Target Site
        </h2>

        <div className="space-y-4">
          {/* Toggle between database sites and manual URL */}
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => {
                setUseManualUrl(false)
                setManualUrl('')
                setBotLogs([])
                setGateLogs([])
                setAttackStats({ total: 0, blocked: 0 })
              }}
              className={`px-4 py-2 rounded-full font-medium transition ${
                !useManualUrl
                  ? 'bg-green-800 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Select from Database
            </button>
            <button
              onClick={() => {
                setUseManualUrl(true)
                setSelectedSite(null)
                setBotLogs([])
                setGateLogs([])
                setAttackStats({ total: 0, blocked: 0 })
                setSiteSearchTerm('')
              }}
              className={`px-4 py-2 rounded-full font-medium transition ${
                useManualUrl
                  ? 'bg-green-800 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Enter URL Manually
            </button>
          </div>

          {!useManualUrl ? (
            <div>
              <label className="text-sm font-bold text-gray-700 block mb-2">
                Choose a site to test:
              </label>
              <input
                type="text"
                placeholder="Search sites by name, domain, or customer email..."
                value={siteSearchTerm}
                onChange={(e) => setSiteSearchTerm(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm mb-2"
              />
              {siteSearchTerm && (
                <div className="mt-2 text-xs text-gray-500">
                  Showing {sites.filter(site => {
                    const searchLower = siteSearchTerm.toLowerCase()
                    return (
                      site.name?.toLowerCase().includes(searchLower) ||
                      site.domain?.toLowerCase().includes(searchLower) ||
                      site.user_profiles?.email?.toLowerCase().includes(searchLower) ||
                      site.user_profiles?.name?.toLowerCase().includes(searchLower)
                    )
                  }).length} of {sites.length} sites
                </div>
              )}

              {/* Site List Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4 max-h-64 overflow-y-auto">
                {sites
                  .filter(site => {
                    if (!siteSearchTerm) return true
                    const searchLower = siteSearchTerm.toLowerCase()
                    return (
                      site.name?.toLowerCase().includes(searchLower) ||
                      site.domain?.toLowerCase().includes(searchLower) ||
                      site.user_profiles?.email?.toLowerCase().includes(searchLower) ||
                      site.user_profiles?.name?.toLowerCase().includes(searchLower)
                    )
                  })
                  .map(site => (
                    <button
                      key={site.id}
                      onClick={() => {
                        setSelectedSite(site)
                        setBotLogs([])
                        setGateLogs([])
                        setAttackStats({ total: 0, blocked: 0 })
                      }}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        selectedSite?.id === site.id
                          ? 'border-green-500 bg-green-50 ring-2 ring-green-200'
                          : 'border-gray-200 hover:border-green-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="font-medium text-gray-900 truncate">{site.name}</div>
                      <div className="text-xs text-gray-500 truncate">{site.domain}</div>
                      <div className="text-xs text-gray-400 truncate mt-1">
                        {site.user_profiles?.email || 'No owner'}
                      </div>
                    </button>
                  ))}
                {sites.length === 0 && (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    No sites found in the database
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div>
              <label className="text-sm font-bold text-gray-700 block mb-2">
                Enter any URL to test:
              </label>
              <input
                type="text"
                value={manualUrl}
                onChange={(e) => {
                  setManualUrl(e.target.value)
                  setBotLogs([])
                  setGateLogs([])
                  setAttackStats({ total: 0, blocked: 0 })
                }}
                placeholder="https://example.com or example.com"
                className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm"
              />
              <p className="text-xs text-gray-600 mt-2">
                Test any website, even if it's not integrated with Gate. Great for testing competitor sites or demonstration purposes.
              </p>
            </div>
          )}

          {selectedSite && !useManualUrl && (
            <div className="bg-blue-50 border border-blue-300 p-4">
              <h3 className="text-sm font-bold text-blue-900 mb-2">Selected Site Details</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="font-bold text-blue-800">Name:</span> {selectedSite.name}
                </div>
                <div>
                  <span className="font-bold text-blue-800">Domain:</span> {selectedSite.domain}
                </div>
                <div>
                  <span className="font-bold text-blue-800">Customer:</span> {selectedSite.user_profiles?.email || 'Unknown'}
                </div>
                <div>
                  <span className="font-bold text-blue-800">Status:</span> {selectedSite.status}
                </div>
              </div>
            </div>
          )}

          {useManualUrl && manualUrl.trim() && (
            <div className="bg-green-50 border border-green-300 p-4">
              <h3 className="text-sm font-bold text-green-900 mb-2">Target URL</h3>
              <div className="text-sm font-mono">
                {manualUrl.trim().startsWith('http') ? manualUrl.trim() : `https://${manualUrl.trim()}`}
              </div>
            </div>
          )}

          <button
            onClick={launchAttack}
            disabled={(!selectedSite && !useManualUrl) || (useManualUrl && !manualUrl.trim()) || isAttacking}
            className={`w-full px-6 py-3 rounded-full bg-green-800 text-white font-medium hover:bg-green-700 hover:shadow-xl hover:scale-105 hover:-translate-y-1 transition-all duration-200 inline-flex items-center justify-center gap-2 ${
              ((!selectedSite && !useManualUrl) || (useManualUrl && !manualUrl.trim()) || isAttacking) ? 'opacity-50 cursor-not-allowed hover:scale-100 hover:translate-y-0' : ''
            }`}
          >
            <Play className="w-5 h-5" />
            {isAttacking
              ? 'Attack In Progress...'
              : useManualUrl && manualUrl.trim()
                ? `Launch Attack on ${manualUrl.trim()}`
                : selectedSite
                  ? `Launch Attack on ${selectedSite.name}`
                  : useManualUrl
                    ? 'Enter a URL First'
                    : 'Select a Site First'}
          </button>

          {(selectedSite || (useManualUrl && manualUrl.trim())) && (
            <div className="bg-blue-50 border border-blue-300 p-3">
              <p className="text-xs text-blue-900">
                <strong>ℹ️ How it works:</strong> 25+ bot types (AI crawlers, search engines, SEO tools, scrapers, monitoring tools, and more) will attempt to scrape the site from an outside perspective - exactly like real attackers would.
                Phase 1: Standard detection. Phase 2: Evasion techniques. Phase 3: Multi-page patterns. If Gate blocks all phases, the site is well protected. If any content is scraped, the site is vulnerable.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      {botLogs.length > 0 && (
        <div className="flex justify-center gap-12 mb-6">
          <div className="text-center">
            <div className="text-3xl font-bold">{attackStats.total}</div>
            <div className="text-sm text-gray-600">Requests Monitored</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-red-600">{attackStats.blocked}</div>
            <div className="text-sm text-gray-600">Blocked Bots</div>
          </div>
        </div>
      )}

      {/* Bot Scraping Results */}
      {botLogs.length > 0 && (
        <div>
          {/* Bot Attack Terminal - Bot's Perspective */}
          <div className="group relative mb-6">
            <div className="absolute inset-0 bg-red-100/20 blur-3xl group-hover:bg-red-200/30 transition-all duration-500" />
            <div className="relative bg-slate-900 rounded-2xl shadow-xl overflow-hidden group-hover:shadow-2xl group-hover:-translate-y-1 transition-all duration-500 border border-slate-700">
              <div className="bg-slate-800 px-6 py-4 border-b border-slate-700 flex items-center gap-3">
                <Terminal className="w-5 h-5 text-red-400" />
                <span className="font-semibold text-slate-200">Bot Scraping Results</span>
                <span className="text-xs text-slate-500 ml-2">(Outside Perspective)</span>
                <div className="ml-auto w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              </div>
              <div className="p-6 font-mono text-sm h-96 bg-slate-900 text-green-400 overflow-y-auto">
                {botLogs.length === 0 ? (
                  <div className="text-slate-500 flex items-center justify-center h-full">
                    Select a site and launch attack to begin...
                  </div>
                ) : (
                  botLogs
                    .filter(log => {
                      // Hide 404s and errors - only show meaningful results
                      return !['page_not_found', 'page_error', 'empty_page'].includes(log.status)
                    })
                    .map((log, i) => (
                      <BotAttackLog key={i} log={log} showScrapedContent={true} />
                    ))
                )}
              </div>
            </div>
          </div>

          {/* Gate System Logs - Only show for database sites */}
          {!useManualUrl && selectedSite && (
            <div className="group relative">
              <div className="absolute inset-0 bg-green-100/20 blur-3xl group-hover:bg-green-200/30 transition-all duration-500" />
              <div className="relative bg-slate-900 rounded-2xl shadow-xl overflow-hidden group-hover:shadow-2xl group-hover:-translate-y-1 transition-all duration-500 border border-slate-700">
                <div className="bg-slate-800 px-6 py-4 border-b border-slate-700 flex items-center gap-3">
                  <Shield className="w-5 h-5 text-green-400" />
                  <span className="font-semibold text-slate-200">Gate System Logs</span>
                  <span className="text-xs text-slate-500 ml-2">(What Gate Detected)</span>
                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-xs text-slate-400">{gateLogs.length} logs</span>
                    <div className={`w-2 h-2 rounded-full ${isAttacking ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`} />
                  </div>
                </div>
                <div className="h-96 bg-slate-900 text-green-400 font-mono text-xs overflow-y-auto">
                  {gateLogs.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-slate-500">
                      {isAttacking ? 'Waiting for Gate to detect bot activity...' : 'No Gate logs recorded during this test'}
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead className="bg-slate-800 border-b border-slate-700 sticky top-0">
                        <tr>
                          <th className="px-2 py-1 text-left font-normal text-green-500">TIME</th>
                          <th className="px-2 py-1 text-left font-normal text-green-500">IP</th>
                          <th className="px-2 py-1 text-left font-normal text-green-500">TYPE</th>
                          <th className="px-2 py-1 text-left font-normal text-green-500">STATUS</th>
                          <th className="px-2 py-1 text-left font-normal text-green-500">RISK</th>
                          <th className="px-2 py-1 text-left font-normal text-green-500">PAGE</th>
                          <th className="px-2 py-1 text-left font-normal text-green-500">REASON</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {gateLogs.map((log, i) => (
                          <tr key={i} className="hover:bg-slate-800">
                            <td className="px-2 py-1 whitespace-nowrap text-slate-400">
                              {new Date(log.timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </td>
                            <td className="px-2 py-1 whitespace-nowrap text-cyan-400">{log.ip}</td>
                            <td className="px-2 py-1 whitespace-nowrap">
                              <span className={log.type === 'bot' ? 'text-red-400' : 'text-green-400'}>
                                {log.type?.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-2 py-1 whitespace-nowrap">
                              <span className={log.status === 'blocked' ? 'text-red-400' : 'text-green-400'}>
                                {log.status?.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-2 py-1 whitespace-nowrap">
                              <span className={(log.risk_score || 0) > 0.7 ? 'text-red-400' : (log.risk_score || 0) > 0.4 ? 'text-yellow-400' : 'text-green-400'}>
                                {((log.risk_score || 0) * 100).toFixed(0)}%
                              </span>
                            </td>
                            <td className="px-2 py-1 truncate max-w-[150px]" title={log.page}>
                              {log.page}
                            </td>
                            <td className="px-2 py-1 truncate max-w-[200px] text-slate-400" title={log.decision_reason}>
                              {log.decision_reason || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Results explanation */}
          <div className="mt-6 bg-gray-50 border border-gray-200 rounded-2xl p-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-2">Understanding Results</h3>
                <div className="text-sm text-gray-700 space-y-2">
                  <p><span className="text-green-600 font-medium">SCRAPED</span> = Bot successfully retrieved content (site is <strong>vulnerable</strong>)</p>
                  <p><span className="text-red-600 font-medium">BLOCKED</span> = Gate blocked the bot (site is <strong>protected</strong>)</p>
                  <p><span className="text-yellow-600 font-medium">EMPTY</span> = Page exists but no readable content found</p>
                  <p><span className="text-gray-500 font-medium">404/ERROR</span> = Page doesn't exist or server error</p>
                </div>
                {!useManualUrl && selectedSite && (
                  <p className="mt-3 text-sm text-blue-700 bg-blue-50 p-2 rounded">
                    <strong>Gate Logs:</strong> Shows what Gate actually detected and logged in the database. If Gate is working, you should see bot detections here.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
