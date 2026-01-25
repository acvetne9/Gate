export interface BotLog {
  timestamp: string
  requestId?: string
  bot: string
  botType?: string
  company?: string
  userAgent: string
  page: string
  targetUrl?: string
  status: 'blocked' | 'scraped' | 'allowed' | 'error' | 'not_found'
  statusCode?: number
  responseTime?: number
  decision_reason: string
  riskScore?: number
  scrapedContent?: string | null
  contentLength?: number
  targetFetched?: boolean
  evasionUsed?: string[]
  detectionReasons?: string[]
  type?: string
  ip?: string
  error?: string | null
}

export interface AttackStats {
  totalRequests: number
  blockedRequests: number
  scrapedRequests: number
  errorRequests: number
  botsByType: Record<string, number>
  avgResponseTime: number
}

export interface AttackResult {
  targetUrl: string
  timestamp: string
  pattern?: string
  duration: number
  summary: {
    total: number
    blocked: number
    scraped: number
    errors: number
  }
  results: BotLog[]
}

export interface AttackOptions {
  botTypes?: string[]
  maxBots?: number
  pattern?: string
  parallel?: boolean
}

export class AttackOrchestrator {
  constructor(targetUrl: string, apiEndpoint: string, apiKey: string, skipGateCheck?: boolean)
  launchAttack(onLogCallback?: (log: BotLog) => void): Promise<BotLog[]>
  launchComprehensiveAttack(onLogCallback?: (log: BotLog) => void, options?: AttackOptions): Promise<AttackResult>
  getAttackLogs(): BotLog[]
  clearLogs(): void
  getStats(): AttackStats
  static getBotCategories(): string[]
  static getAttackPatterns(): string[]
  static getAllBots(): Array<{ name: string; userAgent: string; company: string; type: string }>
}
