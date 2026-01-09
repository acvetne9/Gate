// Comprehensive Bot Attack Log Component
// Shows full attack details with honest, transparent information
// Used by both PublicDemoPage and BotTestingPage for consistency

interface AttackFlowStep {
  step: number
  action: string
  timestamp: string
  detail: string
  targetFetched?: boolean
  blockedBy?: string
  detectionReasons?: string[]
  contentLength?: number
  wordCount?: number
}

interface BotAttackLogData {
  timestamp: string
  bot?: string
  botName?: string
  userAgent?: string
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
  attackFlow?: AttackFlowStep[]
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
  scrapedContent?: string
}

interface BotAttackLogProps {
  log: BotAttackLogData
  showScrapedContent?: boolean
}

export function BotAttackLog({ log, showScrapedContent = true }: BotAttackLogProps) {
  const botName = log.bot || log.botName || 'Unknown Bot'
  const targetUrl = log.targetUrl || log.page || '/'
  const riskScore = log.riskScore || log.risk_score || 0
  const targetFetched = log.targetFetched ?? log.blockDetails?.targetFetched ?? null

  return (
    <div className="mb-4 hover:bg-gray-800/50 p-3 rounded transition-colors duration-200 border-l-2 border-gray-700">
      {/* Header: Bot name → Target URL */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="text-gray-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
        <span className="text-cyan-400 font-semibold">{botName}</span>
        <span className="text-gray-600">→</span>
        <span className="text-yellow-400 break-all">{targetUrl}</span>
        <span className={`ml-auto px-2 py-0.5 rounded text-xs ${
          log.status === 'blocked' ? 'bg-red-900/50 text-red-400' :
          log.status === 'allowed' || log.status === 'scraped' ? 'bg-orange-900/50 text-orange-400' :
          'bg-gray-700 text-gray-400'
        }`}>
          {log.status?.toUpperCase()}
        </span>
      </div>

      {/* Attack flow steps - COMPREHENSIVE */}
      {log.attackFlow && log.attackFlow.length > 0 && (
        <div className="ml-4 mb-2">
          {log.attackFlow.map((step, j) => (
            <div key={j} className="text-xs mb-1">
              <span className={`
                ${step.action === 'BLOCKED' ? 'text-red-400' : ''}
                ${step.action === 'SCRAPED' ? 'text-orange-400' : ''}
                ${step.action === 'ERROR' ? 'text-yellow-400' : ''}
                ${step.action === 'INIT' ? 'text-blue-400' : ''}
                ${step.action === 'SEND' ? 'text-cyan-400' : ''}
                ${step.action === 'RESPONSE' ? 'text-green-400' : ''}
                ${!['BLOCKED', 'SCRAPED', 'ERROR', 'INIT', 'SEND', 'RESPONSE'].includes(step.action) ? 'text-gray-400' : ''}
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

      {/* HONEST outcome display */}
      <div className="ml-4 mt-2 text-xs">
        {log.status === 'blocked' ? (
          <div className="text-red-400 bg-red-900/20 p-3 rounded border border-red-900/50">
            <div className="font-semibold text-sm mb-2">❌ BLOCKED BY GATE</div>

            {/* HONEST: Target was NOT fetched */}
            <div className="bg-green-900/30 text-green-400 p-2 rounded mb-2 border border-green-800/50">
              <span className="font-medium">Target NOT contacted:</span> The bot was intercepted by Gate
              before any request was sent to {targetUrl}
            </div>

            {log.blockDetails && (
              <div className="text-gray-400 space-y-1">
                <div><span className="text-gray-500">Detected as:</span> {log.blockDetails.detectedAs}</div>
                <div><span className="text-gray-500">Blocked by:</span> {log.blockDetails.blockedBy}</div>
                {log.blockDetails.detectionReasons && log.blockDetails.detectionReasons.length > 0 && (
                  <div>
                    <span className="text-gray-500">Detection reasons:</span>
                    <ul className="list-disc list-inside ml-2">
                      {log.blockDetails.detectionReasons.map((reason, i) => (
                        <li key={i}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="text-gray-500 mt-2">
              Risk Score: <span className="text-red-400">{(riskScore * 100).toFixed(0)}%</span>
            </div>
          </div>
        ) : (log.status === 'allowed' || log.status === 'scraped') ? (
          <div className="text-orange-400 bg-orange-900/20 p-3 rounded border border-orange-900/50">
            <div className="font-semibold text-sm mb-2">⚠️ CONTENT SCRAPED - SITE VULNERABLE</div>

            {/* HONEST: Target WAS fetched */}
            <div className="bg-red-900/30 text-red-400 p-2 rounded mb-2 border border-red-800/50">
              <span className="font-medium">Target WAS contacted:</span> The bot evaded detection and
              successfully retrieved content from {targetUrl}
            </div>

            {log.contentCaptured && (
              <>
                <div className="text-gray-400 mt-2">
                  <span className="text-gray-500">Retrieved:</span> {log.contentCaptured.fullLength} bytes ({log.contentCaptured.wordCount} words)
                </div>
                {showScrapedContent && log.contentCaptured.snippet && (
                  <div className="text-gray-500 mt-2 bg-gray-800 p-2 rounded border border-gray-700 max-h-32 overflow-y-auto">
                    <div className="text-gray-400 text-xs mb-1">Content preview (leaked data):</div>
                    "{log.contentCaptured.snippet}..."
                  </div>
                )}
              </>
            )}

            <div className="text-gray-500 mt-2">
              Risk Score: <span className="text-orange-400">{(riskScore * 100).toFixed(0)}%</span>
            </div>
          </div>
        ) : (
          <div className="text-yellow-400 bg-yellow-900/20 p-3 rounded border border-yellow-900/50">
            <div className="font-semibold">⚠️ {log.status?.toUpperCase() || 'ERROR'}</div>
            <div className="text-gray-400 mt-1">{log.reason || log.decision_reason || 'Unknown error'}</div>
          </div>
        )}
      </div>

      {/* Show full scraped content if available */}
      {showScrapedContent && log.scrapedContent && (log.status === 'allowed' || log.status === 'scraped') && (
        <div className="ml-4 mt-3 p-3 bg-gray-800 border border-orange-700 rounded">
          <div className="text-orange-400 font-medium text-xs mb-2">
            ⚠️ Full Scraped Content (LEAKED DATA):
          </div>
          <div className="text-gray-300 text-xs leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
            {log.scrapedContent}
          </div>
        </div>
      )}

      {/* Show blocked bot response if available */}
      {showScrapedContent && log.scrapedContent && log.status === 'blocked' && (
        <div className="ml-4 mt-3 p-3 bg-gray-800 border border-green-700 rounded">
          <div className="text-green-400 font-medium text-xs mb-2">
            ✓ Bot Response (No content leaked):
          </div>
          <div className="text-gray-400 text-xs leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto">
            {log.scrapedContent}
          </div>
        </div>
      )}

      {/* Gate correlation */}
      {(log.gateLogId || log.gateRequestId || log.requestId) && (
        <div className="ml-4 mt-2 pt-2 border-t border-gray-800 text-xs text-gray-500">
          {log.gateLogId && <span>Gate Log: <span className="font-mono">{log.gateLogId}</span></span>}
          {log.gateRequestId && <span className="ml-4">Request: <span className="font-mono">{log.gateRequestId.substring(0, 16)}</span></span>}
        </div>
      )}
    </div>
  )
}

export default BotAttackLog
