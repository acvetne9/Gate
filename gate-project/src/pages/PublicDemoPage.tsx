import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, Terminal, Activity, ArrowRight, Check, Shield } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { PageLayout, BotLogCard, BotAttackLog } from '../components'

interface BotLog {
  timestamp: string
  bot: string
  userAgent: string
  page: string
  ip: string
  type: string
  status: string
  riskScore: number
  risk_score: number
  reason: string
  decision_reason: string
  targetFetched?: boolean
  confidence?: number
  contentCaptured?: {
    fullLength: number
    snippet: string
    wordCount: number
  }
  riskBreakdown?: {
    userAgentScore: number
    behaviorScore: number
    fingerprintScore: number
    networkScore: number
  }
  riskFactors?: string[]
  geolocation?: {
    city: string
    region: string
    country: string
    countryCode: string
    latitude: number
    longitude: number
    timezone: string
  }
  network?: {
    asn: string
    org: string
    isp: string
    isVPN: boolean
    isProxy: boolean
    isDatacenter: boolean
    connectionType: string
  }
  device?: {
    browser: string
    browserVersion: string
    os: string
    osVersion: string
    deviceType: string
    isMobile: boolean
    screenResolution: string
  }
  request?: {
    method: string
    protocol: string
    tlsVersion: string
    referrer: string | null
    responseTime: number
    statusCode: number
    bytesSent: number
  }
  behavior?: {
    requestsLast24h: number
    requestsLastHour: number
    avgTimeBetweenRequests: string
    pagesVisited: number
    sessionDuration: string
    mouseMovements: number
    keyboardEvents: number
    scrollEvents: number
    clickEvents: number
  }
  fingerprint?: {
    hash: string
    canvas: string | null
    webgl: string | null
    webglVendor: string | null
    webglRenderer: string | null
    plugins: string[]
    pluginsCount: number
    hasWebdriver: boolean
    hasHeadless: boolean
    languages: string[]
    timezone: string
    platform: string
  }
  threatIntel?: {
    threatLevel: string
    knownMalicious: boolean
    inBlocklist: boolean
    reputation: string
    previousBlocks: number
    firstSeen: string
    lastSeen: string
    category: string
  }
  botType?: string
  user_agent?: string
  attackFlow?: Array<{
    step: number
    action: string
    timestamp: string
    detail: string
    targetFetched?: boolean
    blockedBy?: string
    detectionReasons?: string[]
    contentLength?: number
    wordCount?: number
  }>
  blockDetails?: {
    blockedBy: string
    targetFetched: boolean
    detectedAs: string
    detectionReasons: string[]
    riskScore: number
  }
  gateRequestId?: string
  gateLogId?: string
}

export default function PublicDemoPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [botLogs, setBotLogs] = useState<BotLog[]>([])
  const [isAttacking, setIsAttacking] = useState(false)
  const [attackStats, setAttackStats] = useState({ total: 0, blocked: 0, passed: 0, failed: 0 })
  const [targetUrl, setTargetUrl] = useState('https://securitygate.app')
  const [currentTest, setCurrentTest] = useState('')
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const botTermRef = useRef<HTMLDivElement>(null)
  const gateTermRef = useRef<HTMLDivElement>(null)

  const launchAttack = async () => {
    if (isAttacking) return

    // Validate URL
    try { new URL(targetUrl) } catch { return }

    setIsAttacking(true)
    setBotLogs([])
    setAttackStats({ total: 0, blocked: 0, passed: 0, failed: 0 })
    setCurrentTest('Connecting to test server...')

    try {
      const { launchComprehensiveAttack } = await import('../attack-bots/comprehensiveAttack.js')

      await launchComprehensiveAttack(targetUrl, (log: BotLog) => {
        setCurrentTest((log as any).bot || (log as any).testName || '')
        setBotLogs(prev => [...prev, log])
        setAttackStats(prev => ({
          total: prev.total + 1,
          blocked: prev.blocked + (log.status === 'blocked' ? 1 : 0),
          passed: prev.passed + ((log as any).testPassed ? 1 : 0),
          failed: prev.failed + ((log as any).testPassed === false ? 1 : 0),
        }))
        // Auto-scroll terminals
        setTimeout(() => {
          botTermRef.current?.scrollTo({ top: botTermRef.current.scrollHeight, behavior: 'smooth' })
          gateTermRef.current?.scrollTo({ top: gateTermRef.current.scrollHeight, behavior: 'smooth' })
        }, 10)
      })
    } catch (error) {
      console.error('Attack error:', error)
    }

    setCurrentTest('')
    setIsAttacking(false)
  }

  return (
    <PageLayout activeRoute="/demo">
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 relative">
      {/* Global Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px]" />
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-green-100/20 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-[800px] h-[800px] bg-green-50/30 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 w-[700px] h-[700px] bg-green-100/15 rounded-full blur-3xl" />
      </div>

      {/* Navigation provided by PageLayout */}

      {/* Enhanced Hero Section */}
      <section className="pt-32 pb-20 px-8 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-green-50/40 via-transparent to-transparent" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-radial from-green-100/30 to-transparent blur-2xl" />
        </div>
        
        <div className="max-w-7xl mx-auto relative">
          <div className="text-center max-w-5xl mx-auto mb-16">
            <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-white border border-green-200/60 rounded-full text-green-900 text-sm font-medium mb-12 shadow-sm hover:shadow-md hover:border-green-300/80 transition-all duration-300 cursor-pointer backdrop-blur-sm animate-[fadeIn_0.6s_ease-out]">
              <div className="relative">
                <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
                <div className="absolute inset-0 w-2 h-2 bg-green-600 rounded-full animate-ping opacity-75" />
              </div>
              <span className="tracking-wide">Live Interactive Demonstration</span>
            </div>
            
            <h1 className="text-8xl md:text-9xl font-bold mb-8 leading-[0.95] tracking-tighter bg-gradient-to-r from-green-800 via-green-700 to-green-900 bg-clip-text text-transparent animate-[fadeIn_0.8s_ease-out]">
              See Gate in Action
            </h1>
            
            <p className="text-2xl md:text-3xl text-slate-600 mb-12 leading-relaxed font-light max-w-4xl mx-auto tracking-tight animate-[fadeIn_1s_ease-out]">
              Launch a simulated bot attack and watch our enterprise-grade protection system 
              <span className="text-slate-900 font-medium"> identify and block malicious traffic</span> in real-time
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 animate-[fadeIn_1.2s_ease-out]">
              {[
                { icon: Shield, text: 'Zero Configuration' },
                { icon: Activity, text: 'Real-Time Detection' },
                { icon: Terminal, text: 'Complete Visibility' }
              ].map((feature, i) => (
                <div 
                  key={i}
                  className="group flex items-center gap-2.5 px-5 py-3 bg-white border border-slate-200 rounded-full text-slate-700 text-sm font-medium shadow-sm hover:shadow-md hover:border-green-200 hover:-translate-y-0.5 transition-all duration-300 cursor-default"
                >
                  <feature.icon className="w-4 h-4 text-green-700 group-hover:scale-110 transition-transform duration-300" />
                  <span className="group-hover:text-slate-900 transition-colors duration-300">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Website Preview */}
      <section className="py-20 px-8 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,_var(--tw-gradient-stops))] from-white via-green-50/40 to-gray-50" />
        </div>
        
        <div className="max-w-6xl mx-auto relative">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden hover:shadow-2xl transition-shadow duration-500">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400 hover:bg-red-500 transition-colors cursor-pointer" />
                <div className="w-3 h-3 rounded-full bg-yellow-400 hover:bg-yellow-500 transition-colors cursor-pointer" />
                <div className="w-3 h-3 rounded-full bg-green-400 hover:bg-green-500 transition-colors cursor-pointer" />
              </div>
              <div className="flex-1 mx-4">
                <div className="bg-white rounded-lg px-4 py-2.5 text-sm text-slate-600 font-mono border border-slate-200 flex items-center gap-2 shadow-sm">
                  <Activity className="w-4 h-4 text-green-600" />
                  {window.location.origin}
                </div>
              </div>
            </div>

            <div className="relative bg-white" style={{ height: '500px' }}>
              <iframe
                ref={iframeRef}
                src="/"
                title="Website Preview"
                className="w-full h-full border-0"
                style={{
                  pointerEvents: 'auto',
                  transform: 'scale(1)',
                  transformOrigin: 'top left'
                }}
              />
            </div>
          </div>
          
          <p className="text-center text-slate-500 mt-8 font-light text-lg">
            ↑ Interactive preview - Explore the site before launching the attack
          </p>
        </div>
      </section>

      {/* Dual Terminal Logs */}
      <section className="pt-8 pb-24 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,_var(--tw-gradient-stops))] from-white via-green-50/50 to-gray-50" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,_var(--tw-gradient-stops))] from-green-100/20 via-transparent to-transparent" />
        </div>
        
        <div className="max-w-7xl mx-auto px-8 relative">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-6xl font-bold text-slate-900 mb-6 tracking-tight">
              Real-Time Protection Logs
            </h2>
            <p className="text-xl text-slate-600 font-light mb-10">Watch both perspectives simultaneously</p>

            <div className="max-w-xl mx-auto">
              <div className="flex gap-3">
                <input
                  type="url"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder="https://yoursite.com"
                  className="flex-1 px-5 py-4 border border-gray-300 rounded-xl text-gray-900 font-mono text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  disabled={isAttacking}
                />
                <button
                  onClick={launchAttack}
                  disabled={isAttacking}
                  className={`px-8 py-4 bg-gradient-to-r from-green-800 to-green-700 text-white font-semibold rounded-xl hover:shadow-xl hover:scale-105 transition-all duration-300 inline-flex items-center gap-3 group ${
                    isAttacking ? 'opacity-50 cursor-not-allowed' : 'shadow-lg'
                  }`}
                >
                  <Play className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
                  {isAttacking ? 'Testing...' : 'Run Tests'}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">Sends real server-side HTTP requests with bot user agents, spoofed headers, and attack patterns</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Bot Attack Terminal */}
            <div className="group relative">
              <div className="absolute inset-0 bg-red-100/20 blur-3xl group-hover:bg-red-200/30 transition-all duration-500" />
              <div className="relative bg-slate-900 rounded-2xl shadow-xl overflow-hidden group-hover:shadow-2xl group-hover:-translate-y-1 transition-all duration-500 border border-slate-700">
                <div className="bg-slate-800 px-6 py-4 border-b border-slate-700 flex items-center gap-3">
                  <Terminal className="w-5 h-5 text-red-400" />
                  <span className="font-semibold text-slate-200">Bot Attack Logs</span>
                  <span className="text-xs text-slate-500 ml-2">(Bot's Perspective)</span>
                  <div className="ml-auto w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                </div>
                <div ref={botTermRef} className="p-4 font-mono text-xs h-96 bg-slate-900 text-green-400 overflow-y-auto">
                  {botLogs.length === 0 && !isAttacking && (
                    <div className="text-slate-500 flex items-center justify-center h-full">
                      Waiting for attack simulation...
                    </div>
                  )}
                  {isAttacking && botLogs.length === 0 && (
                    <div className="space-y-2 animate-pulse">
                      <div className="text-cyan-400">$ connecting to test server...</div>
                      <div className="text-slate-500">Loading bot arsenal ({targetUrl})</div>
                      <div className="flex items-center gap-2 text-yellow-400">
                        <div className="w-2 h-2 bg-yellow-400 rounded-full animate-ping" />
                        Initializing 15 attack vectors...
                      </div>
                    </div>
                  )}
                  {botLogs.map((log, i) => (
                    <div key={i} className="mb-3 animate-[fadeSlideIn_0.3s_ease-out]">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${log.status === 'blocked' ? 'bg-red-500' : log.status === 'error' ? 'bg-yellow-500' : 'bg-green-500'}`} />
                        <span className="text-slate-400">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                        <span className="text-cyan-300 font-semibold">{(log as any).bot || 'Test'}</span>
                        <span className={`ml-auto px-2 py-0.5 rounded text-[10px] font-bold ${
                          (log as any).testPassed ? 'bg-green-900/50 text-green-400 border border-green-700' : 'bg-red-900/50 text-red-400 border border-red-700'
                        }`}>
                          {(log as any).testPassed ? 'BLOCKED' : 'BYPASSED'}
                        </span>
                      </div>
                      <div className="pl-4 text-slate-500 text-[11px]">
                        <div>UA: <span className="text-slate-400">{log.userAgent?.substring(0, 60) || 'N/A'}{(log.userAgent?.length || 0) > 60 ? '...' : ''}</span></div>
                        <div>Verdict: <span className={`${(log as any).verdict === 'redirected_to_payment' ? 'text-red-400' : (log as any).verdict === 'challenge_served' ? 'text-yellow-400' : (log as any).verdict === 'content_returned' ? 'text-green-400' : 'text-slate-400'}`}>{(log as any).verdict}</span> ({(log as any).responseTime || 0}ms)</div>
                      </div>
                    </div>
                  ))}
                  {isAttacking && botLogs.length > 0 && (
                    <div className="flex items-center gap-2 text-yellow-400 mt-2">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full animate-ping" />
                      <span>Testing: {currentTest}...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Gate System Logs */}
            <div className="group relative">
              <div className="absolute inset-0 bg-green-100/20 blur-3xl group-hover:bg-green-200/30 transition-all duration-500" />
              <div className="relative bg-slate-900 rounded-2xl shadow-xl overflow-hidden group-hover:shadow-2xl group-hover:-translate-y-1 transition-all duration-500 border border-slate-700">
                <div className="bg-slate-800 px-6 py-4 border-b border-slate-700 flex items-center gap-3">
                  <Shield className="w-5 h-5 text-green-400" />
                  <span className="font-semibold text-slate-200">Gate System Logs</span>
                  <span className="text-xs text-slate-500 ml-2">(Dashboard View)</span>
                  <div className="ml-auto w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                </div>
                <div ref={gateTermRef} className="h-96 bg-slate-900 text-green-400 font-mono text-xs overflow-y-auto p-4">
                  {botLogs.length === 0 && !isAttacking && (
                    <div className="text-slate-500 flex items-center justify-center h-full">
                      System ready. Launch attack to begin...
                    </div>
                  )}
                  {isAttacking && botLogs.length === 0 && (
                    <div className="space-y-2 animate-pulse">
                      <div className="text-green-400">[GATE] System armed</div>
                      <div className="text-slate-500">[GATE] Monitoring incoming requests to {targetUrl}</div>
                      <div className="flex items-center gap-2 text-green-400">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-ping" />
                        Waiting for traffic...
                      </div>
                    </div>
                  )}
                  {botLogs.map((log, i) => (
                    <div key={i} className="mb-3 py-2 border-b border-slate-800 animate-[fadeSlideIn_0.3s_ease-out]">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          log.status === 'blocked' ? 'bg-red-900/60 text-red-400' : log.status === 'error' ? 'bg-yellow-900/60 text-yellow-400' : 'bg-green-900/60 text-green-400'
                        }`}>
                          {log.status === 'blocked' ? 'DENY' : log.status === 'error' ? 'ERR' : 'ALLOW'}
                        </span>
                        <span className="text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                        <span className="text-white font-semibold">{(log as any).bot}</span>
                      </div>
                      <div className="pl-4 space-y-0.5">
                        <div className="text-slate-500">
                          Test: <span className="text-slate-300">{(log as any).testName || (log as any).test}</span>
                          {' '}<span className={(log as any).testPassed ? 'text-green-400' : 'text-red-400'}>
                            {(log as any).testPassed ? 'PASS' : 'FAIL'}
                          </span>
                        </div>
                        <div className="text-slate-600 truncate">{(log as any).detail?.substring(0, 100)}</div>
                      </div>
                    </div>
                  ))}
                  {isAttacking && botLogs.length > 0 && (
                    <div className="flex items-center gap-2 text-green-400 mt-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-ping" />
                      <span>[GATE] Processing: {currentTest}...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Test Results */}
          {attackStats.total > 0 && (
            <div className="mt-12 flex justify-center gap-12">
              <div className="group cursor-default">
                <div className="text-5xl font-bold text-slate-900 mb-2 tabular-nums">{attackStats.total}</div>
                <div className="text-sm text-slate-600 font-medium uppercase tracking-wider">Tests Run</div>
              </div>
              <div className="w-px bg-slate-200" />
              <div className="group cursor-default">
                <div className="text-5xl font-bold text-green-700 mb-2 tabular-nums">{attackStats.passed}</div>
                <div className="text-sm text-slate-600 font-medium uppercase tracking-wider">Passed</div>
              </div>
              <div className="w-px bg-slate-200" />
              <div className="group cursor-default">
                <div className="text-5xl font-bold text-red-600 mb-2 tabular-nums">{attackStats.failed}</div>
                <div className="text-sm text-slate-600 font-medium uppercase tracking-wider">Failed</div>
              </div>
              <div className="w-px bg-slate-200" />
              <div className="group cursor-default">
                <div className="text-5xl font-bold text-slate-900 mb-2 tabular-nums">{attackStats.blocked}</div>
                <div className="text-sm text-slate-600 font-medium uppercase tracking-wider">Bots Blocked</div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,_var(--tw-gradient-stops))] from-white via-green-50/40 to-gray-50" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,_var(--tw-gradient-stops))] from-green-100/20 via-transparent to-transparent" />
        </div>
        
        <div className="max-w-7xl mx-auto px-8 relative">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-6xl font-semibold text-gray-900 mb-6 tracking-tight hover:scale-105 transition-transform duration-300 inline-block cursor-default">
              How the demo works
            </h2>
            <p className="text-xl text-gray-600 font-light">Three stages of simulated attack</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-12">
            {[
              { 
                num: '01', 
                title: 'Simulate Attack', 
                desc: 'Launch multiple bot types including GPTBot, ClaudeBot, CCBot, and custom scrapers targeting different pages.',
                features: ['20+ different bot types', 'Multiple simultaneous requests', 'Realistic attack patterns']
              },
              { 
                num: '02', 
                title: 'Detection Engine', 
                desc: 'Our AI-powered system analyzes user agents, fingerprints, and behavioral patterns in real-time.',
                features: ['User agent analysis', 'Fingerprint detection', 'Behavioral scoring']
              },
              { 
                num: '03', 
                title: 'Block & Log', 
                desc: 'Threats are instantly blocked while legitimate traffic flows freely. All activity logged for review.',
                features: ['Instant blocking', 'Comprehensive logs', 'Zero false positives']
              }
            ].map((step, i) => (
              <div key={i} className="group relative">
                <div className="relative bg-white p-10 rounded-3xl border border-gray-200 group-hover:border-green-200 group-hover:-translate-y-3 group-hover:shadow-2xl transition-all duration-500 cursor-pointer">
                  <div className="text-7xl font-light text-green-200 mb-8 group-hover:text-green-300 group-hover:scale-125 group-hover:-translate-x-2 transition-all duration-500 inline-block">
                    {step.num}
                  </div>
                  <h3 className="text-3xl font-semibold text-gray-900 mb-4 group-hover:text-green-800 transition-colors duration-300">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed text-lg font-light mb-6 group-hover:text-gray-700 transition-colors duration-300">
                    {step.desc}
                  </p>
                  <div className="space-y-3">
                    {step.features.map((feature, j) => (
                      <div key={j} className="flex items-center gap-3 text-sm text-gray-600 group-hover:text-gray-700 transition-colors duration-300">
                        <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 group-hover:bg-green-200 transition-colors duration-300">
                          <Check className="w-3 h-3 text-green-800" />
                        </div>
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_var(--tw-gradient-stops))] from-white via-green-50/60 to-gray-50" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_80%,_var(--tw-gradient-stops))] from-green-100/30 via-transparent to-transparent" />
        </div>
        
        <div className="max-w-4xl mx-auto px-8 text-center relative">
          <h2 className="text-6xl font-semibold text-gray-900 mb-6 tracking-tight hover:scale-105 transition-transform duration-300 inline-block cursor-default">
            Ready to protect your content?
          </h2>
          <p className="text-xl text-gray-600 mb-12 font-light">
            Get the same protection for your website in under 60 seconds
          </p>
          <button 
            onClick={() => navigate(user ? '/dashboard' : '/signup')} 
            className="px-10 py-5 bg-green-800 text-white text-lg font-medium rounded-full hover:bg-green-700 hover:shadow-2xl hover:scale-110 hover:-translate-y-2 transition-all duration-300 inline-flex items-center gap-3 group"
          >
            Get Started Free 
            <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform duration-300" />
          </button>
        </div>
      </section>

      
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
    </PageLayout>
  )
}
