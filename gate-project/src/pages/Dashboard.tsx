import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Plus, Settings, Copy, Check, Eye, EyeOff, Globe, BarChart3, AlertCircle, DollarSign, Activity, Download, Search, ChevronDown, User, Bot, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { PageLayout, LogDetailModal, CompleteLogDetails } from '../components';
import { supabase } from '../lib/supabase';
import { getMultiSiteStats, getGlobalStats } from '../lib/stats';
import { toast } from 'sonner';
import SiteConfigModal from './SiteConfigModal';

interface Site {
  id: string;
  site_id: string;
  api_key: string;
  name: string;
  domain: string;
  status: string;
  config: {
    allowedBots?: string[];
    subscribeUrl?: string;
    loginUrl?: string;
    botPaymentAmount?: number;
  };
  stats: {
    totalRequests: number;
    blockedRequests: number;
    allowedRequests: number;
    revenue?: number;
  };
  created_at: string;
}

interface RequestLog {
  id: string;
  timestamp: string;
  ip: string;
  type: string;
  status: string;
  risk_score: number;
  page: string;
  user_agent: string;
  decision_reason: string;
  site_id: string;
  sites: {
    name: string;
  };
  detection_data?: {
    isBot: boolean;
    type: string;
    riskScore: number;
    reasons: string[];
    whois_data?: {
      orgName?: string;
      country?: string;
      city?: string;
      region?: string;
      latitude?: number;
      longitude?: number;
      isp?: string;
      asn?: string;
      netRange?: string;
      description?: string;
      abuseEmail?: string;
      registrationDate?: string;
    };
    bot_identity?: {
      name?: string;
      company?: string;
      type?: string;
      isLegitimate?: boolean;
      verified?: boolean;
      purpose?: string;
      respectsRobotsTxt?: boolean;
      docsUrl?: string;
    };
    device?: {
      browser?: string;
      browserVersion?: string;
      os?: string;
      osVersion?: string;
      deviceType?: string;
      isMobile?: boolean;
      screenResolution?: string;
    };
    request?: {
      method?: string;
      protocol?: string;
      tlsVersion?: string;
      statusCode?: number;
      responseTime?: number;
      bytesSent?: number;
      referrer?: string;
    };
    behavior?: {
      requestsLast24h?: number;
      requestsLastHour?: number;
      avgTimeBetweenRequests?: string;
      pagesVisited?: number;
      sessionDuration?: string;
      mouseMovements?: number;
      keyboardEvents?: number;
      scrollEvents?: number;
      clickEvents?: number;
    };
    threatIntel?: {
      threatLevel?: string;
      category?: string;
      reputation?: string;
      previousBlocks?: number;
      firstSeen?: string;
      lastSeen?: string;
      knownMalicious?: boolean;
      inBlocklist?: boolean;
    };
  };
  fingerprint?: {
    canvas?: string;
    webgl?: { vendor?: string; renderer?: string };
    platform?: string;
    timezone?: string;
    language?: string;
    languages?: string[];
    plugins?: string[];
    screen?: { width?: number; height?: number; colorDepth?: number; pixelRatio?: number };
    deviceMemory?: number;
    hardwareConcurrency?: number;
    touchSupport?: boolean;
    webdriver?: boolean;
    userAgent?: string;
    timing?: { pageLoadTime?: number };
    visitorId?: string;
    hash?: string;
  };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { subscriptionData } = useSubscription();
  const [sites, setSites] = useState<Site[]>([]);
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [revenue, setRevenue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [globalRequests, setGlobalRequests] = useState(0);
  const [globalBlocked, setGlobalBlocked] = useState(0);
  const [showApiKey, setShowApiKey] = useState<{ [key: string]: boolean }>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [showSiteSelector, setShowSiteSelector] = useState(false);
  const [siteSearchQuery, setSiteSearchQuery] = useState('');
  const [expandedLog, setExpandedLog] = useState<RequestLog | null>(null);
  const [showNewSiteModal, setShowNewSiteModal] = useState(false);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteDomain, setNewSiteDomain] = useState('');
  const [creating, setCreating] = useState(false);

  // ESC key handler for closing modals
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (expandedLog) {
          setExpandedLog(null);
        } else if (showNewSiteModal) {
          setShowNewSiteModal(false);
        } else if (selectedSite) {
          setSelectedSite(null);
        }
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [expandedLog, showNewSiteModal, selectedSite]);

  // Fetch data from Supabase
  useEffect(() => {
    if (!user?.id) return;
    const userId = user.id

    let isMounted = true;

    async function fetchData() {
      try {
        setLoading(true);

        // Fetch sites for current user
        const { data: sitesData, error: sitesError } = await supabase
          .from('sites')
          .select('*')
          .eq('customer_id', userId)
          .order('created_at', { ascending: false });

        if (sitesError) throw sitesError;
        if (!isMounted) return;

        // Calculate stats efficiently using aggregation
        const siteIds = (sitesData || []).map(site => site.id);
        
        if (siteIds.length === 0) {
          setSites([]);
          setLogs([]);
          setRevenue(0);
          setLoading(false);
          return;
        }

        // Get all stats using shared utility
        const siteStatsMap = await getMultiSiteStats(siteIds);
        if (!isMounted) return;

        const formattedSites = (sitesData || []).map(site => {
          const s = siteStatsMap.get(site.id) || { totalRequests: 0, botsBlocked: 0, requestsAllowed: 0 };
          return {
            ...site,
            stats: {
              totalRequests: s.totalRequests,
              blockedRequests: s.botsBlocked,
              allowedRequests: s.requestsAllowed,
              revenue: 0
            },
            config: site.config || {}
          };
        });

        setSites(formattedSites);

        // Set first site as selected if none selected
        if (formattedSites.length > 0 && !selectedSiteId) {
          setSelectedSiteId(formattedSites[0].id);
        }

        // Fetch request logs for display (last 100)
        const { data: logsData, error: logsError } = await supabase
          .from('request_logs')
          .select('id, timestamp, ip, type, status, risk_score, page, user_agent, decision_reason, site_id, detection_data, fingerprint, sites(name)')
          .eq('customer_id', userId)
          .order('timestamp', { ascending: false })
          .limit(100);

        if (logsError) throw logsError;
        if (!isMounted) return;

        // Supabase returns related rows as arrays (e.g., sites: [{ name }])
        // Normalize so `sites` is a single object matching `RequestLog` shape
        const normalized = (logsData || []).map((l: any) => ({
          ...l,
          sites: Array.isArray(l.sites) ? l.sites[0] : l.sites
        })) as RequestLog[]

        setLogs(normalized);

        // Calculate total revenue from calculated stats
        const totalRevenue = formattedSites.reduce((sum, site) => sum + (site.stats?.revenue || 0), 0);
        setRevenue(totalRevenue);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        if (isMounted) {
          toast.error('Failed to load dashboard data');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchData();

    // Fetch global stats from Worker (same numbers as landing page)
    getGlobalStats().then(g => {
      setGlobalRequests(g.totalRequests);
      setGlobalBlocked(g.botsBlocked);
    }).catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [user, selectedSiteId]);

  const createSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !newSiteName.trim() || !newSiteDomain.trim()) return;

    try {
      setCreating(true);

      // Generate secure API key and site ID using crypto.randomUUID()
      const siteId = 'site_' + crypto.randomUUID().replace(/-/g, '').substring(0, 16);
      const apiKey = 'pk_live_' + crypto.randomUUID().replace(/-/g, '').substring(0, 32);

      const { data, error } = await supabase
        .from('sites')
        .insert({
          name: newSiteName.trim(),
          domain: newSiteDomain.trim().replace(/^https?:\/\//, ''),
          customer_id: user.id,
          site_id: siteId,
          api_key: apiKey,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      setSites(prev => [
        {
          ...data,
          stats: {
            totalRequests: 0,
            blockedRequests: 0,
            allowedRequests: 0,
            revenue: 0
          },
          config: data.config || {}
        },
        ...prev
      ]);

      setSelectedSiteId(data.id);
      setShowNewSiteModal(false);
      setNewSiteName('');
      setNewSiteDomain('');
      toast.success('Site created successfully!');
    } catch (error) {
      console.error('Error creating site:', error);
      toast.error('Failed to create site');
    } finally {
      setCreating(false);
    }
  };

  const deleteSite = async (siteId: string) => {
    if (!confirm('Are you sure you want to delete this site?')) return;

    try {
      const { error } = await supabase
        .from('sites')
        .delete()
        .eq('id', siteId);

      if (error) throw error;

      setSites(prev => prev.filter(s => s.id !== siteId));

      if (selectedSiteId === siteId) {
        const remainingSites = sites.filter(s => s.id !== siteId);
        setSelectedSiteId(remainingSites[0]?.id || null);
      }

      toast.success('Site deleted successfully');
    } catch (error) {
      console.error('Error deleting site:', error);
      toast.error('Failed to delete site');
    }
  };

  const testSiteConnection = async (site: Site) => {
    const toastId = toast.loading('Testing connection to ' + site.domain + '...');
    
    try {
      const testUrl = site.domain.startsWith('http') ? site.domain : `https://${site.domain}`;
      
      await fetch(testUrl, {
        method: 'HEAD',
        mode: 'no-cors'
      });

      toast.success(`✅ ${site.name} is accessible! Widget should be working if properly installed.`, {
        id: toastId
      });
    } catch (error) {
      toast.error(`⚠️ Could not reach ${site.domain}. Check if the domain is correct and accessible.`, {
        id: toastId
      });
    }
  };

  const refreshDashboard = async () => {
    if (!user?.id) return;

    try {
      const { data: sitesData } = await supabase
        .from('sites')
        .select('*')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });

      const formattedSites = (sitesData || []).map(site => ({
        ...site,
        stats: site.stats || {
          totalRequests: 0,
          blockedRequests: 0,
          allowedRequests: 0,
          revenue: 0
        },
        config: site.config || {}
      }));

      setSites(formattedSites);

      const { data: logsData } = await supabase
        .from('request_logs')
        .select('*, sites(name)')
        .eq('customer_id', user.id)
        .order('timestamp', { ascending: false })
        .limit(100);

      setLogs((logsData || []) as RequestLog[]);
    } catch (error) {
      console.error('Error refreshing:', error);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const toggleApiKeyVisibility = (siteId: string) => {
    setShowApiKey(prev => ({
      ...prev,
      [siteId]: !prev[siteId]
    }));
  };

  const filteredSites = sites.filter(
    site =>
      site.name.toLowerCase().includes(siteSearchQuery.toLowerCase()) ||
      site.domain.toLowerCase().includes(siteSearchQuery.toLowerCase())
  );

  const currentSite = sites.find(s => s.id === selectedSiteId);
  const statCards = [
    {
      icon: Globe,
      value: sites.length,
      label: 'Total Sites',
      iconColor: 'text-blue-600'
    },
    {
      icon: BarChart3,
      value: globalRequests.toLocaleString(),
      label: 'Requests Monitored',
      iconColor: 'text-green-600'
    },
    {
      icon: Shield,
      value: globalBlocked.toLocaleString(),
      label: 'Bots Blocked',
      iconColor: 'text-orange-600'
    },
    {
      icon: DollarSign,
      value: `$${revenue.toFixed(2)}`,
      label: 'Revenue Generated',
      iconColor: 'text-green-600'
    }
  ];

  if (loading) {
    return (
      <PageLayout activeRoute="/dashboard">
        <div className="min-h-screen bg-gray-50">
          <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 64px)' }}>
            <div className="text-center">
              <div className="w-16 h-16 rounded-3xl bg-green-800 flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <p className="text-gray-600">Loading dashboard...</p>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout activeRoute="/dashboard">
      <div className="min-h-screen bg-gray-50">
        {/* Main Content */}
        <div className="pt-24 pb-20 px-8">
          <div className="max-w-7xl mx-auto">
            {/* Welcome Section */}
            <div className="mb-12">
              <h1 className="text-5xl font-semibold text-gray-900 mb-3 tracking-tight">
                Welcome back, <span className="text-green-800">{user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User'}</span>
              </h1>
              <p className="text-xl text-gray-600 font-light">Manage your protected sites and monitor traffic in real-time</p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {statCards.map((stat, i) => (
                <div
                  key={i}
                  className="group bg-white p-8 rounded-3xl border border-gray-200 hover:border-green-200 hover:-translate-y-3 hover:shadow-2xl transition-all duration-500 cursor-pointer"
                >
                  <stat.icon className={`w-8 h-8 ${stat.iconColor} mb-4 group-hover:scale-125 group-hover:rotate-6 transition-all duration-300`} />
                  <div className="text-4xl font-light text-gray-900 mb-2 group-hover:scale-110 transition-all duration-300">
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-600 group-hover:text-gray-700 transition-colors duration-300">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Sites Header */}
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-4xl font-semibold text-gray-900 tracking-tight">Your Sites</h2>
              <button
                onClick={() => setShowNewSiteModal(true)}
                className="flex items-center px-6 py-3 bg-green-800 text-white rounded-full hover:bg-green-700 hover:shadow-xl hover:scale-105 hover:-translate-y-1 transition-all duration-300 group"
              >
                <Plus className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform duration-300" />
                Add New Site
              </button>
            </div>

            {/* Site Display */}
            {sites.length === 0 ? (
              <div className="bg-white rounded-3xl border border-gray-200 p-16 text-center hover:border-green-200 hover:shadow-2xl hover:-translate-y-2 transition-all duration-500">
                <div className="w-20 h-20 rounded-3xl bg-green-50 flex items-center justify-center mx-auto mb-6">
                  <Globe className="w-10 h-10 text-green-800" />
                </div>
                <h3 className="text-3xl font-semibold text-gray-900 mb-3">No sites yet</h3>
                <p className="text-gray-600 mb-8 text-lg">Add your first site to start protecting your content.</p>
                <button
                  onClick={() => setShowNewSiteModal(true)}
                  className="inline-flex items-center px-8 py-4 bg-green-800 text-white rounded-full hover:bg-green-700 hover:shadow-xl hover:scale-105 hover:-translate-y-1 transition-all duration-300 group"
                >
                  <Plus className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform duration-300" />
                  Add Your First Site
                </button>
              </div>
            ) : (
              <>
                {/* Site Selector */}
                {sites.length > 1 && (
                  <div className="mb-8 relative">
                    <button
                      onClick={() => setShowSiteSelector(!showSiteSelector)}
                      className="w-full md:w-96 flex items-center justify-between px-6 py-4 bg-white rounded-full border border-gray-200 hover:border-green-200 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                          <Globe className="w-5 h-5 text-green-800" />
                        </div>
                        <div className="text-left">
                          <div className="font-semibold text-gray-900">{currentSite?.name}</div>
                          <div className="text-sm text-gray-500">{currentSite?.domain}</div>
                        </div>
                      </div>
                      <ChevronDown
                        className={`w-5 h-5 text-gray-600 transition-transform duration-300 ${showSiteSelector ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {/* Dropdown */}
                    {showSiteSelector && (
                      <div className="absolute z-10 w-full md:w-96 mt-2 bg-white rounded-3xl border border-gray-200 shadow-2xl max-h-96 overflow-hidden animate-[fadeIn_0.3s_ease-out]">
                        {/* Search */}
                        <div className="p-4 border-b border-gray-200">
                          <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="text"
                              value={siteSearchQuery}
                              onChange={e => setSiteSearchQuery(e.target.value)}
                              placeholder="Search sites..."
                              className="w-full pl-11 pr-4 py-3 rounded-full border border-gray-300 focus:outline-none focus:border-green-800 transition-all duration-300"
                            />
                          </div>
                        </div>

                        {/* Site List */}
                        <div className="max-h-64 overflow-y-auto">
                          {filteredSites.length === 0 ? (
                            <div className="p-6 text-center text-gray-500">No sites found</div>
                          ) : (
                            filteredSites.map(site => (
                              <button
                                key={site.id}
                                onClick={() => {
                                  setSelectedSiteId(site.id);
                                  setShowSiteSelector(false);
                                  setSiteSearchQuery('');
                                }}
                                className={`w-full text-left px-6 py-4 hover:bg-green-50 border-b border-gray-100 transition-all duration-300 ${
                                  selectedSiteId === site.id ? 'bg-green-50' : ''
                                }`}
                              >
                                <div className="font-medium text-gray-900">{site.name}</div>
                                <div className="text-sm text-gray-500">{site.domain}</div>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Selected Site Details */}
                {currentSite && (
                  <div className="bg-white rounded-3xl border border-gray-200 hover:border-green-200 p-10 hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 mb-12">
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-3">
                          <h3 className="text-3xl font-semibold text-gray-900">{currentSite.name}</h3>
                          <span
                            className={`px-4 py-1.5 text-sm font-semibold rounded-full ${
                              currentSite.status === 'active'
                                ? 'bg-green-50 text-green-700 border border-green-200'
                                : 'bg-gray-100 text-gray-700 border border-gray-200'
                            }`}
                          >
                            {currentSite.status}
                          </span>
                        </div>
                        <p className="text-gray-600 text-lg mb-2">{currentSite.domain}</p>
                        <p className="text-sm text-gray-500">
                          <span className="text-green-800 font-medium">• Bot protection active</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => testSiteConnection(currentSite)}
                          className="flex items-center px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-full hover:bg-gray-50 hover:border-green-200 hover:scale-105 hover:-translate-y-1 transition-all duration-300 group"
                        >
                          <Activity className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform duration-300" />
                          Test
                        </button>
                        <button
                          onClick={() => setSelectedSite(currentSite)}
                          className="flex items-center px-6 py-3 bg-green-800 text-white rounded-full hover:bg-green-700 hover:shadow-xl hover:scale-105 hover:-translate-y-1 transition-all duration-300 group"
                        >
                          <Settings className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform duration-300" />
                          Configure
                        </button>
                      </div>
                    </div>

                    {/* API Key */}
                    <div className="mb-8">
                      <label className="block text-sm font-semibold text-gray-700 mb-3">API Key</label>
                      <div className="flex items-center gap-3">
                        <code className="flex-1 px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-mono text-gray-900">
                          {showApiKey[currentSite.id] ? currentSite.api_key : '••••••••••••••••••••••••••••••••'}
                        </code>
                        <button
                          onClick={() => toggleApiKeyVisibility(currentSite.id)}
                          className="p-4 bg-white border border-gray-200 rounded-2xl hover:bg-gray-50 hover:border-green-200 hover:scale-110 transition-all duration-300"
                          title="Toggle visibility"
                        >
                          {showApiKey[currentSite.id] ? (
                            <EyeOff className="w-5 h-5 text-gray-600" />
                          ) : (
                            <Eye className="w-5 h-5 text-gray-600" />
                          )}
                        </button>
                        <button
                          onClick={() => copyToClipboard(currentSite.api_key, `api-key-${currentSite.id}`)}
                          className="p-4 bg-white border border-gray-200 rounded-2xl hover:bg-gray-50 hover:border-green-200 hover:scale-110 transition-all duration-300"
                          title="Copy API key"
                        >
                          {copied === `api-key-${currentSite.id}` ? (
                            <Check className="w-5 h-5 text-green-600" />
                          ) : (
                            <Copy className="w-5 h-5 text-gray-600" />
                          )}
                        </button>
                      </div>
                      <p className="text-sm text-gray-500 mt-3">Use this API key to authenticate your widget. Keep it secret!</p>
                    </div>

                    {/* Site Stats */}
                    <div className="grid grid-cols-3 gap-4 pt-6 border-t border-gray-100">
                      <div className="text-center p-4 rounded-2xl bg-gray-50 hover:bg-green-50 transition-colors duration-300">
                        <div className="flex items-center justify-center mb-2">
                          <BarChart3 className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="text-2xl font-semibold text-gray-900">
                          {(currentSite.stats?.totalRequests || 0).toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">Requests Monitored</div>
                      </div>
                      <div className="text-center p-4 rounded-2xl bg-gray-50 hover:bg-orange-50 transition-colors duration-300">
                        <div className="flex items-center justify-center mb-2">
                          <Shield className="w-5 h-5 text-orange-600" />
                        </div>
                        <div className="text-2xl font-semibold text-gray-900">
                          {(currentSite.stats?.blockedRequests || 0).toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">Bots Caught</div>
                      </div>
                      <div className="text-center p-4 rounded-2xl bg-gray-50 hover:bg-green-50 transition-colors duration-300">
                        <div className="flex items-center justify-center mb-2">
                          <DollarSign className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="text-2xl font-semibold text-gray-900">
                          ${(currentSite.stats?.revenue || 0).toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">Revenue Generated</div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Request Logs Section - Terminal Style */}
            <div>
              {/* Terminal-Style Logs Display */}
              <div className="bg-gray-900 rounded-3xl border border-gray-200 overflow-hidden shadow-2xl">
                {/* Terminal Header */}
                <div className="bg-gray-100 px-4 py-3 border-b border-gray-200 flex items-center gap-3">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400 hover:bg-red-500 transition-colors"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-400 hover:bg-yellow-500 transition-colors"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400 hover:bg-green-500 transition-colors"></div>
                  </div>
                  <span className="text-sm text-gray-600 font-mono ml-2">gate-logs</span>
                  <div className="ml-auto flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-green-600 font-medium">LIVE</span>
                  </div>
                </div>

                {logs.length === 0 ? (
                  <div className="text-center py-12">
                    <Activity className="w-6 h-6 text-gray-600 mx-auto mb-2" />
                    <p className="text-xs text-gray-500 font-mono">No logs found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full font-mono text-xs">
                      <thead className="bg-gray-800 border-b border-gray-700">
                        <tr>
                          <th className="px-2 py-1.5 text-left text-green-500 font-normal">TIME</th>
                          <th className="px-2 py-1.5 text-left text-green-500 font-normal">SITE</th>
                          <th className="px-2 py-1.5 text-left text-green-500 font-normal">IP</th>
                          <th className="px-2 py-1.5 text-left text-green-500 font-normal">TYPE</th>
                          <th className="px-2 py-1.5 text-left text-green-500 font-normal">STATUS</th>
                          <th className="px-2 py-1.5 text-left text-green-500 font-normal">RISK</th>
                          <th className="px-2 py-1.5 text-left text-green-500 font-normal">PAGE</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {logs.map(log => (
                          <tr
                            key={log.id}
                            className="hover:bg-gray-800 cursor-pointer transition-colors duration-150"
                            onClick={() => setExpandedLog(log)}
                          >
                            <td className="px-2 py-1.5 text-gray-400 whitespace-nowrap">
                              {new Date(log.timestamp).toLocaleTimeString('en-US', { hour12: false })}
                            </td>
                            <td className="px-2 py-1.5 text-cyan-400 whitespace-nowrap">{log.sites.name}</td>
                            <td className="px-2 py-1.5 text-green-400 whitespace-nowrap">{log.ip}</td>
                            <td className="px-2 py-1.5 whitespace-nowrap">
                              <span className={log.type === 'bot' ? 'text-red-400' : 'text-green-400'}>
                                {log.type.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-2 py-1.5 whitespace-nowrap">
                              <span className={log.status === 'blocked' ? 'text-red-400' : 'text-green-400'}>
                                {log.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-2 py-1.5 whitespace-nowrap">
                              <span
                                className={
                                  log.risk_score > 0.7
                                    ? 'text-red-400'
                                    : log.risk_score > 0.4
                                    ? 'text-yellow-400'
                                    : 'text-green-400'
                                }
                              >
                                {(log.risk_score * 100).toFixed(0)}%
                              </span>
                            </td>
                            <td className="px-2 py-1.5 text-gray-400 truncate max-w-xs">{log.page}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Terminal Footer */}
                <div className="px-3 py-1.5 bg-gray-800 border-t border-gray-700 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 font-mono">$ tail -f /var/log/gate/requests.log</span>
                  </div>
                  {logs.length === 100 && <span className="text-xs text-yellow-500 font-mono">⚠ showing last 100</span>}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* New Site Modal */}
        {showNewSiteModal && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowNewSiteModal(false)}
          >
            <div className="bg-white rounded-3xl border border-gray-200 max-w-md w-full p-8 shadow-2xl" onClick={e => e.stopPropagation()}>
              <h2 className="text-3xl font-semibold text-gray-900 mb-6">Add New Site</h2>

              <form onSubmit={createSite} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Site Name *</label>
                  <input
                    type="text"
                    required
                    value={newSiteName}
                    onChange={e => setNewSiteName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:border-green-800 transition-all duration-300"
                    placeholder="My Awesome Site"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Domain *</label>
                  <input
                    type="text"
                    required
                    value={newSiteDomain}
                    onChange={e => setNewSiteDomain(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:border-green-800 transition-all duration-300"
                    placeholder="example.com or https://example.com"
                  />
                  <p className="mt-2 text-xs text-gray-500">http:// and https:// will be automatically removed</p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowNewSiteModal(false)}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-full hover:bg-gray-50 hover:scale-105 transition-all duration-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 px-6 py-3 bg-green-800 text-white rounded-full hover:bg-green-700 hover:shadow-xl hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creating ? 'Creating...' : 'Create Site'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Site Configuration Modal */}
        {selectedSite && (
          <SiteConfigModal
            site={selectedSite}
            onClose={() => setSelectedSite(null)}
            onSuccess={() => {
              setSelectedSite(null);
              refreshDashboard();
            }}
          />
        )}

        {/* Expanded Log Modal */}
        {expandedLog && (
          <LogDetailModal log={expandedLog as any} onClose={() => setExpandedLog(null)}>
            <CompleteLogDetails log={expandedLog as any} />
          </LogDetailModal>
        )}

        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    </PageLayout>
  );
}