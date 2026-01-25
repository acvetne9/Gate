// Attack Orchestrator - Coordinates bot attacks for security testing
import { AdvancedBot, BOT_SIGNATURES, ALL_BOTS, ATTACK_PATTERNS, launchAttack } from './advancedBots.js'
import { ScraperBot } from './scraperBot.js'

export class AttackOrchestrator {
  constructor(targetUrl, apiEndpoint, apiKey, skipGateCheck = false) {
    this.targetUrl = targetUrl
    this.apiEndpoint = apiEndpoint
    this.apiKey = apiKey
    this.skipGateCheck = skipGateCheck
    this.attackLogs = []
    this.isAttacking = false

    // Initialize bots using the consolidated bot library
    this.bots = this.initializeBots()
  }

  initializeBots() {
    const bots = []

    // Add ScraperBot (kept separate for its unique page analysis)
    bots.push(new ScraperBot(this.targetUrl, this.apiEndpoint, this.apiKey, this.skipGateCheck))

    // Add AI crawler bots from consolidated library
    const aiCrawlers = ['GPTBot', 'ClaudeBot', 'CCBot', 'PerplexityBot']
    aiCrawlers.forEach(name => {
      const config = ALL_BOTS.find(b => b.name === name)
      if (config) {
        bots.push(new AdvancedBot({
          ...config,
          apiEndpoint: this.apiEndpoint,
        }))
      }
    })

    return bots
  }

  async launchAttack(onLogCallback) {
    if (this.isAttacking) {
      console.log('Attack already in progress')
      return
    }

    this.isAttacking = true
    this.attackLogs = []

    console.log('Launching bot attack simulation...')

    // Launch all bots in parallel
    const attackPromises = this.bots.map(async (bot) => {
      try {
        // Handle both ScraperBot and AdvancedBot
        if (bot instanceof ScraperBot) {
          const logs = await bot.attack()
          logs.forEach(log => {
            this.attackLogs.push(log)
            if (onLogCallback) onLogCallback(log)
          })
          return logs
        } else {
          // AdvancedBot - single scrape
          const log = await bot.scrape(this.targetUrl)
          this.attackLogs.push(log)
          if (onLogCallback) onLogCallback(log)
          return [log]
        }
      } catch (error) {
        console.error(`Bot ${bot.name} failed:`, error)
        return []
      }
    })

    await Promise.all(attackPromises)

    this.isAttacking = false
    console.log(`Attack complete! Total requests: ${this.attackLogs.length}`)

    return this.attackLogs
  }

  // Launch comprehensive attack using all bots with evasion
  async launchComprehensiveAttack(onLogCallback, options = {}) {
    const result = await launchAttack(this.targetUrl, {
      botTypes: options.botTypes || ['aiCrawlers', 'scrapers', 'headlessBrowsers'],
      maxBots: options.maxBots || 25,
      pattern: options.pattern || 'stealthCrawl',
      parallel: options.parallel ?? true,
      onLog: (log) => {
        this.attackLogs.push(log)
        if (onLogCallback) onLogCallback(log)
      },
    })

    return result
  }

  getAttackLogs() {
    return this.attackLogs
  }

  clearLogs() {
    this.attackLogs = []
  }

  getStats() {
    return {
      totalRequests: this.attackLogs.length,
      blockedRequests: this.attackLogs.filter(log => log.status === 'blocked').length,
      scrapedRequests: this.attackLogs.filter(log => log.status === 'scraped').length,
      errorRequests: this.attackLogs.filter(log => log.status === 'error').length,
      botsByType: this.attackLogs.reduce((acc, log) => {
        acc[log.bot] = (acc[log.bot] || 0) + 1
        return acc
      }, {}),
      avgResponseTime: this.attackLogs.length > 0
        ? Math.round(this.attackLogs.reduce((sum, log) => sum + (log.responseTime || 0), 0) / this.attackLogs.length)
        : 0,
    }
  }

  // Get available bot categories
  static getBotCategories() {
    return Object.keys(BOT_SIGNATURES)
  }

  // Get available attack patterns
  static getAttackPatterns() {
    return Object.keys(ATTACK_PATTERNS)
  }

  // Get all available bots
  static getAllBots() {
    return ALL_BOTS
  }
}
