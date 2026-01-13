// Bot Identification Service
// Comprehensive bot identification using user agent, reverse DNS, and IP data

import { identifyBot, type BotPattern } from './botKnowledgeBase'
import { getIpIntelligence } from './whoisService'
import type { BotIdentity, WhoisData } from './supabase'

export interface EnhancedBotData {
  botIdentity: BotIdentity | null
  whoisData: WhoisData | null
  reverseDns: string | null
  networkType: string
  hostingProvider?: string
  confidence: number // 0-1 scale
}

/**
 * Comprehensive bot identification
 * Combines user agent analysis, reverse DNS, WHOIS data, and IP intelligence
 */
export async function identifyBotComprehensive(
  userAgent: string,
  ip: string,
  networkOrg?: string
): Promise<EnhancedBotData> {
  try {
    // Get IP intelligence (WHOIS + reverse DNS)
    const ipIntel = await getIpIntelligence(ip, networkOrg)

    // Identify bot from knowledge base
    const botPattern = identifyBot(
      userAgent,
      ipIntel.reverseDns || undefined,
      ip
    )

    if (!botPattern) {
      // Unknown bot - return basic data
      return {
        botIdentity: null,
        whoisData: ipIntel.whoisData,
        reverseDns: ipIntel.reverseDns,
        networkType: ipIntel.networkType,
        hostingProvider: ipIntel.hostingProvider,
        confidence: 0
      }
    }

    // Calculate confidence score
    const confidence = calculateConfidence(botPattern, ipIntel.reverseDns, userAgent)

    // Build bot identity object
    const botIdentity: BotIdentity = {
      name: botPattern.name,
      company: botPattern.company,
      type: botPattern.type,
      purpose: botPattern.purpose,
      isLegitimate: botPattern.isLegitimate,
      respectsRobotsTxt: botPattern.respectsRobotsTxt,
      docsUrl: botPattern.docsUrl,
      verified: confidence > 0.7 // High confidence = verified
    }

    return {
      botIdentity,
      whoisData: ipIntel.whoisData,
      reverseDns: ipIntel.reverseDns,
      networkType: ipIntel.networkType,
      hostingProvider: ipIntel.hostingProvider,
      confidence
    }
  } catch (error) {
    console.error('Bot identification failed:', error)
    return {
      botIdentity: null,
      whoisData: null,
      reverseDns: null,
      networkType: 'unknown',
      confidence: 0
    }
  }
}

/**
 * Calculate confidence score for bot identification
 * Returns 0-1 where 1 is highest confidence
 */
function calculateConfidence(
  botPattern: BotPattern,
  reverseDns: string | null,
  userAgent: string
): number {
  let confidence = 0.5 // Base confidence for user agent match

  // User agent match (already confirmed)
  const userAgentMatch = botPattern.userAgentPatterns.some(pattern =>
    pattern.test(userAgent)
  )
  if (userAgentMatch) confidence += 0.3

  // Reverse DNS verification
  if (reverseDns && botPattern.reverseDnsPatterns) {
    const dnsMatch = botPattern.reverseDnsPatterns.some(pattern =>
      pattern.test(reverseDns)
    )
    if (dnsMatch) {
      confidence += 0.4 // High weight for DNS verification
    } else {
      confidence -= 0.2 // Penalty for DNS mismatch on verified bots
    }
  }

  // Verification method consideration
  if (botPattern.verificationMethod === 'combined' && reverseDns && botPattern.reverseDnsPatterns) {
    // Already handled above
  } else if (botPattern.verificationMethod === 'user-agent') {
    // User agent only - moderate confidence
    confidence = Math.min(confidence, 0.7)
  }

  // Clamp to 0-1 range
  return Math.max(0, Math.min(1, confidence))
}

/**
 * Quick bot check (user agent only, no network calls)
 * Useful for fast initial detection
 */
export function quickBotCheck(userAgent: string): {
  isBot: boolean
  botName?: string
  botType?: string
} {
  const botPattern = identifyBot(userAgent)

  if (!botPattern) {
    return { isBot: false }
  }

  return {
    isBot: true,
    botName: botPattern.name,
    botType: botPattern.type
  }
}

/**
 * Check if a bot is legitimate based on identification
 */
export function isLegitimateBot(botIdentity: BotIdentity | null): boolean {
  return botIdentity?.isLegitimate === true && (botIdentity.verified === true)
}

/**
 * Get human-readable bot description
 */
export function getBotDescription(botIdentity: BotIdentity | null): string {
  if (!botIdentity || !botIdentity.name) {
    return 'Unknown bot or automated traffic'
  }

  const legitimacy = botIdentity.isLegitimate ? 'Legitimate' : 'Suspicious'
  const verification = botIdentity.verified ? 'Verified' : 'Unverified'

  return `${legitimacy} ${botIdentity.type} - ${botIdentity.name} by ${botIdentity.company} (${verification})`
}

/**
 * Determine if bot should be allowed based on policy
 */
export function shouldAllowBot(
  botIdentity: BotIdentity | null,
  policy: {
    allowLegitimate: boolean
    allowSearchEngines: boolean
    allowAITraining: boolean
    allowMonitoring: boolean
  }
): boolean {
  if (!botIdentity) return false

  // Always block if not legitimate
  if (!botIdentity.isLegitimate || !botIdentity.verified) {
    return false
  }

  // Check type-based policies
  switch (botIdentity.type) {
    case 'search-engine':
      return policy.allowSearchEngines
    case 'ai-training':
      return policy.allowAITraining
    case 'monitoring':
      return policy.allowMonitoring
    case 'social-media':
      return policy.allowLegitimate
    case 'seo':
      return policy.allowLegitimate
    default:
      return false
  }
}
