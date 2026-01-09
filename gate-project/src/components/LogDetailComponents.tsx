import { ReactNode } from 'react'
import { X } from 'lucide-react'

// Types for log data
export interface LogData {
  id?: string
  timestamp: string
  ip: string
  type?: string
  status?: string
  page?: string
  risk_score?: number
  decision_reason?: string
  user_agent?: string
  sites?: { name?: string; domain?: string }
  user_profiles?: { email?: string; name?: string }
  detection_data?: {
    isBot?: boolean
    type?: string
    riskScore?: number
    reasons?: string[]
    whois_data?: {
      city?: string
      region?: string
      country?: string
      isp?: string
      orgName?: string
      asn?: string
      latitude?: number
      longitude?: number
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
    platform?: string
    timezone?: string
    language?: string
    screen?: { width?: number; height?: number; pixelRatio?: number }
    deviceMemory?: number
    hardwareConcurrency?: number
    webgl?: { vendor?: string; renderer?: string }
    plugins?: string[]
    webdriver?: boolean
    touchSupport?: boolean
    timing?: { pageLoadTime?: number }
    hash?: string
    canvas?: string
    languages?: string[]
    hasWebdriver?: boolean
    hasHeadless?: boolean
  }
  // Top-level fields (for AdminDashboard)
  bot_identity?: any
  whois_data?: any
  device?: any
  request?: any
  behavior?: any
  threatIntel?: any
  riskScore?: number
  confidence?: number
  riskBreakdown?: Record<string, number>
  riskFactors?: string[]
}

// Modal wrapper
interface LogDetailModalProps {
  log: LogData | null
  onClose: () => void
  children: ReactNode
  title?: string
}

export function LogDetailModal({ log, onClose, children, title = 'Request Details' }: LogDetailModalProps) {
  if (!log) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto relative"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">{title}</h2>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
              <X className="w-6 h-6 text-gray-500" />
            </button>
          </div>
          <div className="space-y-6">
            {children}
          </div>
          <div className="mt-8 flex justify-end">
            <button onClick={onClose} className="px-6 py-3 bg-green-800 text-white rounded-full hover:bg-green-700 hover:shadow-xl transition-all duration-300">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Section container
interface LogDetailSectionProps {
  title: string
  icon?: string
  children: ReactNode
  show?: boolean
}

export function LogDetailSection({ title, icon, children, show = true }: LogDetailSectionProps) {
  if (!show) return null

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <h3 className="text-lg font-bold mb-3">{icon && `${icon} `}{title}</h3>
      {children}
    </div>
  )
}

// Field display
interface LogDetailFieldProps {
  label: string
  value?: ReactNode
  mono?: boolean
  colSpan?: number
  small?: boolean
}

export function LogDetailField({ label, value, mono, colSpan, small }: LogDetailFieldProps) {
  if (value === undefined || value === null) return null

  return (
    <div className={colSpan ? `col-span-${colSpan}` : ''}>
      <label className="text-xs font-bold text-gray-700">{label}</label>
      <div className={`text-sm mt-1 p-2 bg-white border border-gray-200 rounded ${mono ? 'font-mono' : ''} ${small ? 'text-xs' : ''}`}>
        {value}
      </div>
    </div>
  )
}

// Badge display
interface LogDetailBadgeProps {
  children: ReactNode
  variant?: 'success' | 'danger' | 'warning' | 'info' | 'neutral'
}

export function LogDetailBadge({ children, variant = 'neutral' }: LogDetailBadgeProps) {
  const variantClasses = {
    success: 'bg-green-100 text-green-800 border-green-300',
    danger: 'bg-red-100 text-red-800 border-red-300',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    info: 'bg-blue-100 text-blue-800 border-blue-300',
    neutral: 'bg-gray-100 text-gray-700 border-gray-300',
  }

  return (
    <span className={`px-2 py-0.5 text-xs font-medium border rounded ${variantClasses[variant]}`}>
      {children}
    </span>
  )
}

// Risk score display
interface RiskScoreProps {
  score: number
}

export function RiskScore({ score }: RiskScoreProps) {
  const color = score > 0.7 ? 'text-red-600' : score > 0.4 ? 'text-yellow-600' : 'text-green-600'
  return <span className={`font-bold ${color}`}>{(score * 100).toFixed(0)}%</span>
}

// Status display
interface StatusBadgeProps {
  status: string
  type?: 'status' | 'type'
}

export function StatusBadge({ status, type = 'status' }: StatusBadgeProps) {
  const isNegative = type === 'status' ? status === 'blocked' : status === 'bot'
  return (
    <span className={`font-bold ${isNegative ? 'text-red-600' : 'text-green-600'}`}>
      {status?.toUpperCase()}
    </span>
  )
}

// Pre-built sections for common log data

export function BasicInfoSection({ log, showCustomer }: { log: LogData; showCustomer?: boolean }) {
  return (
    <LogDetailSection title="Basic Information">
      <div className={`grid ${showCustomer ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3'} gap-4`}>
        <LogDetailField label="Timestamp" value={new Date(log.timestamp).toLocaleString()} mono />
        {showCustomer && log.user_profiles?.email && (
          <LogDetailField label="Customer" value={log.user_profiles.email} />
        )}
        <LogDetailField label="Site" value={log.sites?.name || 'Unknown'} />
        <LogDetailField label="IP Address" value={log.ip} mono />
        <LogDetailField label="Type" value={<StatusBadge status={log.type || ''} type="type" />} />
        <LogDetailField label="Status" value={<StatusBadge status={log.status || ''} type="status" />} />
        <div className="col-span-2 md:col-span-3">
          <LogDetailField label="Page" value={log.page} mono />
        </div>
      </div>
    </LogDetailSection>
  )
}

export function LocationSection({ log }: { log: LogData }) {
  const whois = log.detection_data?.whois_data
  if (!whois) return null

  return (
    <LogDetailSection title="Location & Network Information" icon="📍">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <LogDetailField label="City" value={whois.city || 'Unknown'} />
        <LogDetailField label="Region" value={whois.region || 'Unknown'} />
        <LogDetailField label="Country" value={whois.country || 'Unknown'} />
        <LogDetailField label="Timezone" value={log.fingerprint?.timezone || 'Unknown'} />
        <div className="col-span-2">
          <LogDetailField label="ISP / Organization" value={whois.isp || whois.orgName || 'Unknown'} />
        </div>
        <LogDetailField label="ASN" value={whois.asn || 'Unknown'} mono small />
        {whois.latitude && whois.longitude && (
          <LogDetailField
            label="Coordinates"
            value={`${whois.latitude.toFixed(4)}, ${whois.longitude.toFixed(4)}`}
            mono
            small
          />
        )}
      </div>
    </LogDetailSection>
  )
}

export function RiskAnalysisSection({ log }: { log: LogData }) {
  const riskScore = log.riskScore || log.risk_score || 0

  return (
    <LogDetailSection title="Risk Analysis" icon="⚠️">
      <div className="grid grid-cols-2 gap-4">
        <LogDetailField label="Risk Score" value={<RiskScore score={riskScore} />} />
        <LogDetailField label="Decision Reason" value={log.decision_reason || 'N/A'} />
      </div>
    </LogDetailSection>
  )
}

export function DetectionAnalysisSection({ log }: { log: LogData }) {
  const detection = log.detection_data
  if (!detection) return null

  return (
    <LogDetailSection title="Detection Analysis" icon="🔍">
      <div className="grid grid-cols-3 gap-4">
        <LogDetailField
          label="Bot Detection"
          value={
            <span className={`font-bold ${detection.isBot ? 'text-red-600' : 'text-green-600'}`}>
              {detection.isBot ? '🤖 Bot Detected' : '✓ Human'}
            </span>
          }
        />
        <LogDetailField label="Detection Type" value={detection.type?.toUpperCase() || 'N/A'} />
        <LogDetailField label="Detection Risk Score" value={<RiskScore score={detection.riskScore || 0} />} />
        {detection.reasons && detection.reasons.length > 0 && (
          <div className="col-span-3">
            <label className="text-xs font-bold text-gray-700">Detection Reasons</label>
            <div className="text-sm mt-1 p-2 bg-white border border-gray-200 rounded flex gap-2 flex-wrap">
              {detection.reasons.map((reason, i) => (
                <LogDetailBadge key={i} variant="danger">{reason}</LogDetailBadge>
              ))}
            </div>
          </div>
        )}
      </div>
    </LogDetailSection>
  )
}

export function BotIdentitySection({ log }: { log: LogData }) {
  const botIdentity = log.bot_identity || log.detection_data?.bot_identity
  if (!botIdentity || Object.keys(botIdentity).length === 0) return null

  return (
    <LogDetailSection title="Bot Identity" icon="🤖">
      <div className="grid grid-cols-2 gap-4">
        {botIdentity.name && (
          <LogDetailField
            label="Bot Name"
            value={
              <span className="font-semibold">
                {botIdentity.name}
                {botIdentity.verified && <LogDetailBadge variant="success">✓ Verified</LogDetailBadge>}
              </span>
            }
          />
        )}
        {botIdentity.company && <LogDetailField label="Company/Owner" value={botIdentity.company} />}
        {botIdentity.type && (
          <LogDetailField
            label="Bot Type"
            value={<LogDetailBadge variant="info">{botIdentity.type.replace('-', ' ')}</LogDetailBadge>}
          />
        )}
        {botIdentity.isLegitimate !== undefined && (
          <LogDetailField
            label="Legitimacy"
            value={
              botIdentity.isLegitimate
                ? <LogDetailBadge variant="success">✓ Legitimate</LogDetailBadge>
                : <LogDetailBadge variant="danger">⚠ Suspicious</LogDetailBadge>
            }
          />
        )}
        {botIdentity.purpose && (
          <div className="col-span-2">
            <LogDetailField label="Purpose" value={botIdentity.purpose} />
          </div>
        )}
        {botIdentity.respectsRobotsTxt !== undefined && (
          <LogDetailField
            label="Robots.txt Compliance"
            value={
              botIdentity.respectsRobotsTxt
                ? <span className="text-green-700">✓ Respects robots.txt</span>
                : <span className="text-red-700">✗ Ignores robots.txt</span>
            }
          />
        )}
        {botIdentity.docsUrl && (
          <LogDetailField
            label="Documentation"
            value={
              <a href={botIdentity.docsUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-mono text-xs">
                {botIdentity.docsUrl}
              </a>
            }
          />
        )}
      </div>
    </LogDetailSection>
  )
}

export function WhoisSection({ log }: { log: LogData }) {
  const whois = log.whois_data || log.detection_data?.whois_data
  if (!whois || Object.keys(whois).length === 0) return null

  return (
    <LogDetailSection title="WHOIS Information" icon="📋">
      <div className="grid grid-cols-2 gap-4">
        {whois.orgName && <LogDetailField label="Organization" value={whois.orgName} />}
        {whois.country && <LogDetailField label="Country" value={whois.country} />}
        {whois.netRange && <LogDetailField label="Network Range" value={whois.netRange} mono small />}
        {whois.description && <LogDetailField label="Description" value={whois.description} />}
        {whois.abuseEmail && <LogDetailField label="Abuse Contact" value={whois.abuseEmail} mono small />}
        {whois.registrationDate && (
          <LogDetailField label="Registration Date" value={new Date(whois.registrationDate).toLocaleDateString()} />
        )}
      </div>
    </LogDetailSection>
  )
}

export function DeviceBrowserSection({ log }: { log: LogData }) {
  const device = log.device || log.detection_data?.device
  if (!device) return null

  return (
    <LogDetailSection title="Device & Browser" icon="💻">
      <div className="grid grid-cols-3 gap-4">
        <LogDetailField label="Browser" value={`${device.browser || ''} ${device.browserVersion || ''}`} />
        <LogDetailField label="Operating System" value={`${device.os || ''} ${device.osVersion || ''}`} />
        <LogDetailField label="Device Type" value={`${device.deviceType || ''} ${device.isMobile ? '(Mobile)' : ''}`} />
        {device.screenResolution && <LogDetailField label="Screen Resolution" value={device.screenResolution} />}
      </div>
    </LogDetailSection>
  )
}

export function RequestMetadataSection({ log }: { log: LogData }) {
  const request = log.request || log.detection_data?.request
  if (!request) return null

  return (
    <LogDetailSection title="Request Metadata" icon="📡">
      <div className="grid grid-cols-4 gap-4">
        {request.method && <LogDetailField label="Method" value={request.method} mono />}
        {request.protocol && <LogDetailField label="Protocol" value={request.protocol} mono />}
        {request.tlsVersion && <LogDetailField label="TLS Version" value={request.tlsVersion} mono />}
        {request.statusCode && <LogDetailField label="Status Code" value={request.statusCode} mono />}
        {request.responseTime && <LogDetailField label="Response Time" value={`${request.responseTime}ms`} />}
        {request.bytesSent && <LogDetailField label="Bytes Sent" value={request.bytesSent.toLocaleString()} />}
        <div className="col-span-2">
          <LogDetailField label="Referrer" value={request.referrer || 'None'} mono />
        </div>
      </div>
    </LogDetailSection>
  )
}

export function BehavioralSignalsSection({ log }: { log: LogData }) {
  const behavior = log.behavior || log.detection_data?.behavior
  if (!behavior) return null

  return (
    <LogDetailSection title="Behavioral Signals" icon="📊">
      <div className="grid grid-cols-3 gap-4">
        {behavior.requestsLast24h !== undefined && <LogDetailField label="Requests (24h)" value={behavior.requestsLast24h} />}
        {behavior.requestsLastHour !== undefined && <LogDetailField label="Requests (1h)" value={behavior.requestsLastHour} />}
        {behavior.avgTimeBetweenRequests && <LogDetailField label="Avg Time Between Requests" value={behavior.avgTimeBetweenRequests} />}
        {behavior.pagesVisited !== undefined && <LogDetailField label="Pages Visited" value={behavior.pagesVisited} />}
        {behavior.sessionDuration && <LogDetailField label="Session Duration" value={behavior.sessionDuration} />}
        {behavior.mouseMovements !== undefined && <LogDetailField label="Mouse Movements" value={behavior.mouseMovements} />}
        {behavior.keyboardEvents !== undefined && <LogDetailField label="Keyboard Events" value={behavior.keyboardEvents} />}
        {behavior.scrollEvents !== undefined && <LogDetailField label="Scroll Events" value={behavior.scrollEvents} />}
        {behavior.clickEvents !== undefined && <LogDetailField label="Click Events" value={behavior.clickEvents} />}
      </div>
    </LogDetailSection>
  )
}

export function BrowserFingerprintSection({ log }: { log: LogData }) {
  const fp = log.fingerprint
  if (!fp) return null

  return (
    <LogDetailSection title="Browser Fingerprint" icon="🔍">
      <div className="grid grid-cols-3 gap-4">
        {fp.platform && <LogDetailField label="Platform" value={fp.platform} />}
        {fp.timezone && <LogDetailField label="Timezone" value={fp.timezone} />}
        {fp.language && <LogDetailField label="Language" value={fp.language} />}
        {fp.screen && (
          <LogDetailField
            label="Screen"
            value={`${fp.screen.width}x${fp.screen.height} @${fp.screen.pixelRatio}x`}
            mono
          />
        )}
        {fp.deviceMemory && <LogDetailField label="Device Memory" value={`${fp.deviceMemory} GB`} />}
        {fp.hardwareConcurrency && <LogDetailField label="CPU Cores" value={fp.hardwareConcurrency} />}
        {fp.webgl && (
          <div className="col-span-2">
            <LogDetailField label="WebGL Renderer" value={`${fp.webgl.vendor} - ${fp.webgl.renderer}`} mono small />
          </div>
        )}
        {fp.plugins && fp.plugins.length > 0 && (
          <div className="col-span-3">
            <label className="text-xs font-bold text-gray-700">Browser Plugins ({fp.plugins.length})</label>
            <div className="text-sm mt-1 p-2 bg-white border border-gray-200 rounded flex gap-2 flex-wrap">
              {fp.plugins.map((plugin, i) => (
                <LogDetailBadge key={i} variant="neutral">{plugin}</LogDetailBadge>
              ))}
            </div>
          </div>
        )}
        <div className="col-span-3">
          <label className="text-xs font-bold text-gray-700">Automation Detection</label>
          <div className="text-sm mt-1 p-2 bg-white border border-gray-200 rounded flex gap-2 flex-wrap">
            {fp.webdriver && <LogDetailBadge variant="danger">⚠️ Webdriver Detected</LogDetailBadge>}
            {fp.touchSupport && <LogDetailBadge variant="success">Touch Supported</LogDetailBadge>}
            {!fp.webdriver && <LogDetailBadge variant="success">✓ No Automation Detected</LogDetailBadge>}
          </div>
        </div>
        {fp.timing?.pageLoadTime && <LogDetailField label="Page Load Time" value={`${fp.timing.pageLoadTime}ms`} />}
      </div>
    </LogDetailSection>
  )
}

export function FingerprintDetailsSection({ log }: { log: LogData }) {
  const fp = log.fingerprint
  if (!fp) return null

  return (
    <LogDetailSection title="Fingerprint Details" icon="🔐">
      <div className="grid grid-cols-2 gap-4">
        {fp.hash && <LogDetailField label="Hash" value={fp.hash} mono />}
        {fp.canvas && <LogDetailField label="Canvas" value={fp.canvas} mono />}
        {fp.languages && <LogDetailField label="Languages" value={fp.languages.join(', ')} />}
        <div className="col-span-2">
          <label className="text-xs font-bold text-gray-700">Detection Flags</label>
          <div className="text-sm mt-1 p-2 bg-white border border-gray-200 rounded flex gap-2 flex-wrap">
            {fp.hasWebdriver && <LogDetailBadge variant="danger">Webdriver</LogDetailBadge>}
            {fp.hasHeadless && <LogDetailBadge variant="danger">Headless</LogDetailBadge>}
            {!fp.hasWebdriver && !fp.hasHeadless && <span className="text-gray-500">None</span>}
          </div>
        </div>
      </div>
    </LogDetailSection>
  )
}

export function ThreatIntelligenceSection({ log }: { log: LogData }) {
  const threat = log.threatIntel || log.detection_data?.threatIntel
  if (!threat) return null

  return (
    <LogDetailSection title="Threat Intelligence" icon="🛡️">
      <div className="grid grid-cols-3 gap-4">
        <LogDetailField
          label="Threat Level"
          value={
            <span className={`font-bold ${threat.threatLevel === 'high' ? 'text-red-600' : threat.threatLevel === 'medium' ? 'text-yellow-600' : 'text-green-600'}`}>
              {threat.threatLevel?.toUpperCase()}
            </span>
          }
        />
        {threat.category && <LogDetailField label="Category" value={threat.category} />}
        {threat.reputation && <LogDetailField label="Reputation" value={threat.reputation} />}
        {threat.previousBlocks !== undefined && <LogDetailField label="Previous Blocks" value={threat.previousBlocks} />}
        {threat.firstSeen && <LogDetailField label="First Seen" value={new Date(threat.firstSeen).toLocaleDateString()} mono />}
        {threat.lastSeen && <LogDetailField label="Last Seen" value={new Date(threat.lastSeen).toLocaleDateString()} mono />}
        <div className="col-span-3">
          <label className="text-xs font-bold text-gray-700">Flags</label>
          <div className="text-sm mt-1 p-2 bg-white border border-gray-200 rounded flex gap-2 flex-wrap">
            {threat.knownMalicious && <LogDetailBadge variant="danger">Malicious</LogDetailBadge>}
            {threat.inBlocklist && <LogDetailBadge variant="warning">Blocklist</LogDetailBadge>}
            {!threat.knownMalicious && !threat.inBlocklist && <span className="text-gray-500">None</span>}
          </div>
        </div>
      </div>
    </LogDetailSection>
  )
}

export function UserAgentSection({ log }: { log: LogData }) {
  return (
    <LogDetailSection title="User Agent" icon="🔤">
      <div className="text-xs p-3 bg-white border border-gray-200 rounded font-mono break-all text-gray-700">
        {log.user_agent || 'N/A'}
      </div>
    </LogDetailSection>
  )
}

// Complete log details modal with all sections
export function CompleteLogDetails({ log, showCustomer }: { log: LogData; showCustomer?: boolean }) {
  return (
    <>
      <BasicInfoSection log={log} showCustomer={showCustomer} />
      <LocationSection log={log} />
      <RiskAnalysisSection log={log} />
      <DetectionAnalysisSection log={log} />
      <BotIdentitySection log={log} />
      <WhoisSection log={log} />
      <DeviceBrowserSection log={log} />
      <RequestMetadataSection log={log} />
      <BehavioralSignalsSection log={log} />
      <BrowserFingerprintSection log={log} />
      <FingerprintDetailsSection log={log} />
      <ThreatIntelligenceSection log={log} />
      <UserAgentSection log={log} />
    </>
  )
}
