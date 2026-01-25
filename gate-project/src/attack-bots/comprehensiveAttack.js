/**
 * Bot Attack Test Client
 * ======================
 * Calls the server-side run-bot-tests Edge Function which makes
 * real outbound HTTP requests with no cookies or browser context.
 */

const SUPABASE_URL = 'https://bakzzkadgmyvvvnpuvki.supabase.co'
const TEST_ENDPOINT = `${SUPABASE_URL}/functions/v1/run-bot-tests`

/**
 * Launch comprehensive server-side attack tests
 * @param {string} targetUrl - URL to test
 * @param {function} onLog - Callback for each test result (real-time updates)
 * @param {object} options - Test options
 */
export async function launchComprehensiveAttack(targetUrl, onLog = null, options = {}) {
  const startTime = Date.now()

  try {
    const response = await fetch(TEST_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUrl }),
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`Test server error: ${response.status} - ${errText}`)
    }

    const data = await response.json()

    // Emit results one at a time for real-time UI updates
    if (onLog && data.results) {
      for (const result of data.results) {
        const log = {
          timestamp: new Date().toISOString(),
          bot: result.bot || result.test,
          userAgent: result.ua || '',
          page: '/',
          type: 'bot',
          status: result.passed ? 'blocked' : (result.verdict === 'error' ? 'error' : 'allowed'),
          riskScore: result.passed ? 0.9 : 0.1,
          risk_score: result.passed ? 0.9 : 0.1,
          reason: result.detail || result.verdict,
          decision_reason: result.detail || result.verdict,
          request: { responseTime: result.responseTime || 0, statusCode: result.httpStatus || 0 },
          botType: result.type || 'test',
          botCompany: result.company || '',
          testName: result.test,
          testPassed: result.passed,
          verdict: result.verdict,
          ...result,
        }
        onLog(log)
        // Stagger log emissions to feel like real-time activity
        await new Promise(r => setTimeout(r, 200))
      }
    }

    return {
      targetUrl,
      timestamp: data.timestamp,
      duration: data.duration,
      summary: {
        total: data.summary.total,
        blocked: data.summary.passed,  // "passed" tests = bots that were blocked
        scraped: data.summary.failed,
        errors: data.summary.errors,
        passed: data.summary.passed,
        failed: data.summary.failed,
        score: data.summary.score,
        blockRate: data.summary.total > 0
          ? ((data.summary.passed / data.summary.total) * 100).toFixed(1)
          : '0',
      },
      results: data.results,
    }
  } catch (error) {
    if (onLog) {
      onLog({
        timestamp: new Date().toISOString(),
        bot: 'Test Runner',
        status: 'error',
        reason: error.message,
        decision_reason: error.message,
        testPassed: false,
        verdict: 'error',
        request: { responseTime: Date.now() - startTime },
      })
    }

    return {
      targetUrl,
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      summary: { total: 0, blocked: 0, scraped: 0, errors: 1, passed: 0, failed: 0, score: 0 },
      results: [],
    }
  }
}

/**
 * Compatibility class for existing demo page
 */
export class ComprehensiveAttackOrchestrator {
  constructor(targetUrl, options = {}) {
    this.targetUrl = targetUrl
    this.logs = []
    this.options = options
  }

  async launchAttack(onLogCallback) {
    const result = await launchComprehensiveAttack(this.targetUrl, onLogCallback, this.options)
    this.logs = result.results || []
    return this.logs
  }

  getStats() {
    return {
      total: this.logs.length,
      blocked: this.logs.filter(l => l.passed).length,
      allowed: this.logs.filter(l => !l.passed).length,
      errors: this.logs.filter(l => l.verdict === 'error').length,
    }
  }
}
