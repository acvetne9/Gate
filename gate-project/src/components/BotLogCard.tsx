// Shared component for displaying bot attack logs
// Used by both PublicDemoPage (demo) and LogsPage (admin)

interface BotLogData {
  timestamp: string
  bot?: string
  botName?: string
  userAgent?: string
  user_agent?: string
  page?: string
  targetUrl?: string
  status: string
  riskScore?: number
  risk_score?: number
  reason?: string
  decision_reason?: string
  targetFetched?: boolean
  gateLogId?: string
  gateRequestId?: string
  requestId?: string
  blockDetails?: {
    blockedBy: string
    targetFetched: boolean
    detectedAs: string
    detectionReasons: string[]
    riskScore: number
  }
  contentCaptured?: {
    fullLength: number
    snippet: string
    wordCount: number
  }
  attackFlow?: Array<{
    step: number
    action: string
    timestamp: string
    detail: string
    targetFetched?: boolean
  }>
  detection_data?: {
    targetFetched?: boolean
    blockedBy?: string | null
    botName?: string
    reasons?: string[]
    contentLength?: number | null
  }
}

interface BotLogCardProps {
  log: BotLogData
  variant?: 'terminal' | 'card'  // terminal = dark bg, card = light bg
  showAttackFlow?: boolean
}

export function BotLogCard({ log, variant = 'card', showAttackFlow = true }: BotLogCardProps) {
  const isTerminal = variant === 'terminal'
  const botName = log.bot || log.botName || log.detection_data?.botName || 'Unknown Bot'
  const riskScore = log.riskScore || log.risk_score || 0
  const targetFetched = log.targetFetched ?? log.blockDetails?.targetFetched ?? log.detection_data?.targetFetched ?? null
  const decisionReason = log.decision_reason || log.reason || ''
  const page = log.page || log.targetUrl || '/'

  if (isTerminal) {
    return (
      <div className={`p-3 rounded border ${log.status === 'blocked' ? 'border-red-800 bg-red-900/10' : log.status === 'allowed' ? 'border-green-800 bg-green-900/10' : 'border-orange-800 bg-orange-900/10'}`}>
        {/* Header row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <span className="text-gray-500 text-xs">
              {new Date(log.timestamp).toLocaleTimeString('en-US', { hour12: false })}
            </span>
            <span className="text-yellow-400 font-semibold">{botName}</span>
            <span className={`px-2 py-0.5 rounded text-xs ${
              log.status === 'blocked' ? 'bg-red-900/50 text-red-400' :
              log.status === 'allowed' ? 'bg-green-900/50 text-green-400' :
              'bg-orange-900/50 text-orange-400'
            }`}>
              {log.status?.toUpperCase()}
            </span>
          </div>
          <span className={riskScore > 0.7 ? 'text-red-400' : riskScore > 0.4 ? 'text-yellow-400' : 'text-green-400'}>
            Risk: {(riskScore * 100).toFixed(0)}%
          </span>
        </div>

        {/* Decision reason - HONEST */}
        <div className={`text-xs mb-2 ${
          decisionReason.startsWith('BLOCKED') ? 'text-red-400' :
          decisionReason.startsWith('SCRAPED') ? 'text-orange-400' :
          'text-gray-400'
        }`}>
          {decisionReason}
        </div>

        {/* Target fetched indicator - KEY HONEST INFO */}
        {targetFetched !== null && (
          <div className="text-xs mb-2">
            <span className="text-gray-600">Target fetched:</span>{' '}
            <span className={targetFetched ? 'text-orange-400 font-semibold' : 'text-green-400 font-semibold'}>
              {targetFetched ? 'YES (content leaked)' : 'NO (blocked before contact)'}
            </span>
          </div>
        )}

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-gray-600">Target:</span>{' '}
            <span className="text-cyan-400">{page}</span>
          </div>
          <div>
            <span className="text-gray-600">Request ID:</span>{' '}
            <span className="text-gray-500">{(log.gateRequestId || log.requestId || '-').substring(0, 16)}</span>
          </div>
          {log.blockDetails && (
            <>
              <div>
                <span className="text-gray-600">Detected as:</span>{' '}
                <span className="text-red-400">{log.blockDetails.detectedAs}</span>
              </div>
              <div>
                <span className="text-gray-600">Blocked by:</span>{' '}
                <span className="text-gray-400">{log.blockDetails.blockedBy}</span>
              </div>
            </>
          )}
          {log.contentCaptured && (
            <div className="col-span-2">
              <span className="text-gray-600">Content leaked:</span>{' '}
              <span className="text-orange-400">{log.contentCaptured.fullLength} bytes ({log.contentCaptured.wordCount} words)</span>
            </div>
          )}
        </div>

        {/* Attack flow steps - terminal variant */}
        {showAttackFlow && log.attackFlow && log.attackFlow.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-800">
            <div className="text-xs text-gray-500 mb-1">Attack Flow:</div>
            {log.attackFlow.map((step, i) => (
              <div key={i} className="text-xs ml-2 mb-0.5">
                <span className={`
                  ${step.action === 'BLOCKED' ? 'text-red-400' : ''}
                  ${step.action === 'SCRAPED' ? 'text-orange-400' : ''}
                  ${step.action === 'ERROR' ? 'text-yellow-400' : ''}
                  ${step.action === 'INIT' ? 'text-blue-400' : ''}
                  ${step.action === 'SEND' ? 'text-cyan-400' : ''}
                  ${step.action === 'RESPONSE' ? 'text-green-400' : ''}
                `}>
                  [{step.action}] {step.detail}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Gate Log ID for correlation */}
        {log.gateLogId && (
          <div className="mt-2 pt-2 border-t border-gray-800 text-xs">
            <span className="text-gray-600">Gate Log ID:</span>{' '}
            <span className="text-gray-500 font-mono">{log.gateLogId}</span>
          </div>
        )}
      </div>
    )
  }

  // Card variant (light background)
  return (
    <div className={`p-4 rounded-lg border ${
      log.status === 'blocked' ? 'border-red-200 bg-red-50' :
      log.status === 'allowed' ? 'border-orange-200 bg-orange-50' :
      'border-gray-200 bg-gray-50'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-gray-500 text-sm">
            {new Date(log.timestamp).toLocaleTimeString()}
          </span>
          <span className="font-semibold text-gray-900">{botName}</span>
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            log.status === 'blocked' ? 'bg-red-100 text-red-700' :
            log.status === 'allowed' ? 'bg-orange-100 text-orange-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {log.status?.toUpperCase()}
          </span>
        </div>
        <div className={`text-sm font-medium ${
          riskScore > 0.7 ? 'text-red-600' : riskScore > 0.4 ? 'text-yellow-600' : 'text-green-600'
        }`}>
          {(riskScore * 100).toFixed(0)}% risk
        </div>
      </div>

      {/* Decision reason - PROMINENT */}
      <div className={`text-sm mb-3 p-2 rounded ${
        decisionReason.startsWith('BLOCKED') ? 'bg-red-100 text-red-800' :
        decisionReason.startsWith('SCRAPED') ? 'bg-orange-100 text-orange-800' :
        'bg-gray-100 text-gray-700'
      }`}>
        {decisionReason}
      </div>

      {/* Target fetched - KEY INFO */}
      {targetFetched !== null && (
        <div className={`text-sm mb-3 p-2 rounded flex items-center gap-2 ${
          targetFetched ? 'bg-orange-100' : 'bg-green-100'
        }`}>
          <span className={targetFetched ? 'text-orange-700' : 'text-green-700'}>
            {targetFetched ? '⚠️ Target URL was contacted - content may have leaked' : '✓ Target URL was NOT contacted - blocked before reaching destination'}
          </span>
        </div>
      )}

      {/* Attack flow steps */}
      {showAttackFlow && log.attackFlow && log.attackFlow.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="text-xs text-gray-500 mb-2">Attack Flow:</div>
          {log.attackFlow.map((step, i) => (
            <div key={i} className="text-xs text-gray-600 ml-2 mb-1">
              <span className={`
                ${step.action === 'BLOCKED' ? 'text-red-600' : ''}
                ${step.action === 'SCRAPED' ? 'text-orange-600' : ''}
                ${step.action === 'ERROR' ? 'text-gray-600' : ''}
              `}>
                {step.action === 'BLOCKED' && '❌ '}
                {step.action === 'SCRAPED' && '⚠️ '}
                {step.action === 'ERROR' && '⚠️ '}
                {step.action === 'INIT' && '→ '}
                {step.action === 'SEND' && '→ '}
                {step.action === 'RESPONSE' && '← '}
                {step.detail}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Gate correlation */}
      {log.gateLogId && (
        <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
          Gate Log ID: <span className="font-mono">{log.gateLogId}</span>
        </div>
      )}
    </div>
  )
}

// Export for use in both pages
export default BotLogCard
