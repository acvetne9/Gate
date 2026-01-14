import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Input validation schema with behavioral data
const CheckAccessSchema = z.object({
  apiKey: z.string().min(1).max(100),
  requestLogin: z.boolean().optional().default(false),
  requestToken: z.boolean().optional().default(false),
  page: z.string().max(2000).optional().default('/'),
  userAgent: z.string().max(1000).optional().default(''),
  fingerprint: z.record(z.unknown()).optional().default({}),
  // Behavioral data from client
  behavior: z.object({
    mouseMovements: z.number().optional(),
    scrollEvents: z.number().optional(),
    clicks: z.number().optional(),
    keystrokes: z.number().optional(),
    timeOnPage: z.number().optional(),
    hasInteracted: z.boolean().optional()
  }).optional().default({}),
  // Honeypot trigger flag
  honeypotTriggered: z.boolean().optional().default(false),
  referrer: z.string().max(2000).optional().default(''),
  // Timing: when the page started loading (client timestamp)
  pageLoadTimestamp: z.number().optional(),
  // Proof of work solution (for suspicious requests)
  powSolution: z.object({
    challenge: z.string(),
    nonce: z.number(),
    hash: z.string()
  }).optional()
})

// Minimal base64url for JWT creation
function base64urlFromString(str: string) {
  const b = new TextEncoder()
  const bytes = b.encode(str)
  // Use btoa on a binary string
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function signJwt(header: Record<string, unknown>, payload: Record<string, unknown>, secret: string) {
  const headerStr = JSON.stringify(header)
  const payloadStr = JSON.stringify(payload)
  const unsigned = `${base64urlFromString(headerStr)}.${base64urlFromString(payloadStr)}`
  const enc = new TextEncoder()
  const key = enc.encode(secret)
  const data = enc.encode(unsigned)
  const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, data)
  const sigArr = new Uint8Array(signature as ArrayBuffer)
  let binary = ''
  for (let i = 0; i < sigArr.byteLength; i++) binary += String.fromCharCode(sigArr[i])
  return `${unsigned}.${btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`
}

// Rate limiting
const rateLimitMap = new Map<string, { count: number, resetAt: number }>()

function checkRateLimit(identifier: string): boolean {
  const now = Date.now()
  const limit = rateLimitMap.get(identifier)
  
  if (!limit || now > limit.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + 60000 })
    return true
  }
  
  if (limit.count >= 100) return false
  limit.count++
  return true
}

// Sanitize string input to prevent XSS
function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .substring(0, 2000)
}

// Enhanced known bot list
const KNOWN_BOTS = [
  // AI Training Bots - COMPREHENSIVE LIST
  'GPTBot', 'ChatGPT-User', 'ChatGPT', 'OpenAI',
  'ClaudeBot', 'Claude-Web', 'anthropic-ai', 'Anthropic',
  'Gemini', 'Google-Extended', 'GoogleOther', 'Google-InspectionTool',
  'CCBot', 'cohere-ai', 'Cohere',
  'PerplexityBot', 'Perplexity',
  'Amazonbot', 'Amazon-Bot',
  'FacebookBot', 'Meta-ExternalAgent', 'Meta-ExternalFetcher',
  'Bytespider', 'ByteDance',
  'Applebot-Extended', 'Applebot',
  'YouBot', 'you.com',
  'AI2Bot', 'Ai2Bot-Dolma',
  'Diffbot', 'img2dataset',
  'omgili', 'omgilibot',
  'Timpibot', 'PetalBot',
  'Scrapy', 'DataForSeoBot',
  // Search Engines
  'Googlebot', 'bingbot', 'Baiduspider', 'YandexBot', 'DuckDuckBot',
  'Slurp', 'Sogou', 'Exabot', 'facebot', 'ia_archiver',
  // SEO Tools
  'SemrushBot', 'AhrefsBot', 'MJ12bot', 'DotBot', 'rogerbot',
  'MojeekBot', 'linkdexbot', 'BLEXBot',
  // Scrapers & HTTP clients
  'curl', 'wget', 'python-requests', 'python-urllib', 'python-httpx',
  'scrapy', 'axios', 'node-fetch', 'got/', 'superagent',
  'Go-http-client', 'Java/', 'libwww', 'HttpClient', 'Apache-HttpClient',
  'aiohttp', 'httpx', 'requests/', 'urllib', 'http.rb',
  'Ruby', 'Perl', 'PHP/', 'okhttp', 'Dart',
  // Headless Browsers
  'HeadlessChrome', 'PhantomJS', 'Puppeteer', 'Playwright', 'Selenium',
  'SlimerJS', 'CasperJS', 'Nightmare',
  // Monitoring & Testing
  'UptimeRobot', 'Pingdom', 'Site24x7', 'StatusCake',
  'NewRelicPinger', 'Datadog', 'Zabbix',
  // Generic patterns (matched case-insensitively)
  'bot', 'crawler', 'spider', 'scraper', 'fetcher', 'archiver'
]

// Timing analysis - detect requests that come impossibly fast
function analyzeRequestTiming(pageLoadTimestamp: number | undefined, serverTimestamp: number): {
  score: number
  reasons: string[]
} {
  let score = 0
  const reasons: string[] = []

  if (!pageLoadTimestamp) {
    // No timestamp provided - slightly suspicious but could be old widget
    score += 0.1
    reasons.push('no_page_load_timestamp')
    return { score, reasons }
  }

  const clientToServerDelta = serverTimestamp - pageLoadTimestamp

  // If client timestamp is in the future (clock skew or spoofed), suspicious
  if (clientToServerDelta < -5000) {
    score += 0.4
    reasons.push('future_timestamp')
  }

  // If request came faster than 100ms after "page load", likely spoofed
  // (real browsers need time for DOM parsing, fingerprinting, etc.)
  if (clientToServerDelta >= 0 && clientToServerDelta < 100) {
    score += 0.5
    reasons.push('impossibly_fast_request')
  }

  // If request came between 100-300ms, still very fast (suspicious)
  if (clientToServerDelta >= 100 && clientToServerDelta < 300) {
    score += 0.3
    reasons.push('very_fast_request')
  }

  return { score: Math.min(score, 1.0), reasons }
}

// Proof of work verification
async function verifyProofOfWork(
  challenge: string,
  nonce: number,
  providedHash: string,
  difficulty: number = 4
): Promise<boolean> {
  try {
    const data = `${challenge}:${nonce}`
    const encoder = new TextEncoder()
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data))
    const hashArray = new Uint8Array(hashBuffer)
    const hashHex = Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('')

    // Check if hash starts with required number of zeros
    const requiredPrefix = '0'.repeat(difficulty)
    return hashHex.startsWith(requiredPrefix) && hashHex === providedHash
  } catch {
    return false
  }
}

// Generate a proof of work challenge
function generatePowChallenge(difficulty: number = 4): { challenge: string, difficulty: number } {
  const challenge = crypto.randomUUID()
  return { challenge, difficulty } // 4 leading zeros = ~65k iterations, 5 = ~1M iterations
}

// Fingerprint validation - detect spoofed/fake fingerprints and HEADLESS BROWSERS
function validateFingerprint(fingerprint: Record<string, unknown>): {
  score: number
  reasons: string[]
} {
  let score = 0
  const reasons: string[] = []

  // ===========================================
  // HEADLESS BROWSER DETECTION (HIGH PRIORITY)
  // ===========================================

  // Check for webdriver flag (most headless browsers set this)
  if (fingerprint.webdriver === true || fingerprint.automationControlled === true) {
    score += 0.9
    reasons.push('webdriver_detected')
  }

  // Check for headless indicators in fingerprint
  if (fingerprint.phantom || fingerprint.nightmare || fingerprint.selenium || fingerprint.puppeteer) {
    score += 0.9
    reasons.push('automation_framework_detected')
  }

  // Check for missing chrome object (headless often lacks this)
  if (fingerprint.hasChrome === false && fingerprint.userAgent?.toString().includes('Chrome')) {
    score += 0.5
    reasons.push('chrome_without_chrome_object')
  }

  // Check for headless-specific WebGL renderers
  const webgl = fingerprint.webgl as { vendor?: string, renderer?: string } | undefined
  if (webgl && typeof webgl === 'object') {
    const renderer = (webgl.renderer || '').toLowerCase()
    const vendor = (webgl.vendor || '').toLowerCase()

    // SwiftShader, llvmpipe, and software renderers indicate headless
    const headlessRenderers = ['swiftshader', 'llvmpipe', 'software', 'virtualbox', 'vmware', 'mesa']
    for (const hr of headlessRenderers) {
      if (renderer.includes(hr) || vendor.includes(hr)) {
        score += 0.8
        reasons.push('headless_webgl_renderer')
        break
      }
    }
  }

  // Check for zero or very few plugins (headless often has none)
  const fpPlugins = fingerprint.plugins
  if (Array.isArray(fpPlugins) && fpPlugins.length === 0) {
    score += 0.4
    reasons.push('zero_plugins')
  }

  // Check for default headless screen dimensions
  const fpScreen = fingerprint.screen as { width?: number, height?: number } | undefined
  if (fpScreen) {
    const sw = fpScreen.width || 0
    const sh = fpScreen.height || 0
    // Common headless defaults: 800x600, 1024x768, 1920x1080 with exact match
    if ((sw === 800 && sh === 600) || (sw === 1024 && sh === 768)) {
      score += 0.3
      reasons.push('default_headless_dimensions')
    }
  }

  // Check for missing or empty languages array
  const fpLanguages = fingerprint.languages as string[] | undefined
  if (!fpLanguages || (Array.isArray(fpLanguages) && fpLanguages.length === 0)) {
    score += 0.3
    reasons.push('missing_languages')
  }

  // Check for missing features that real browsers have
  if (fingerprint.hasWebRTC === false) {
    score += 0.2
    reasons.push('missing_webrtc')
  }

  // ===========================================
  // ADDITIONAL FINGERPRINT VALIDATION
  // ===========================================

  // Canvas fingerprint validation
  const canvas = fingerprint.canvas as string | undefined
  if (canvas) {
    // Real canvas fingerprints from toDataURL() are long base64 strings or end with specific patterns
    // Fake ones are often short strings like "test123"
    if (typeof canvas === 'string' && canvas.length < 20 && !canvas.startsWith('data:')) {
      score += 0.4
      reasons.push('suspicious_canvas_fingerprint')
    }
  } else {
    // Missing canvas is suspicious
    score += 0.3
    reasons.push('missing_canvas')
  }

  // Screen validation - check for unrealistic values
  if (fpScreen) {
    const width = fpScreen.width || 0
    const height = fpScreen.height || 0

    // Unrealistic screen sizes (too small or obviously fake round numbers)
    if (width > 0 && height > 0) {
      // Check for suspiciously "perfect" dimensions that aren't common
      const commonWidths = [1920, 1366, 1536, 1440, 1280, 2560, 3840, 1680, 1600, 1024, 768, 375, 390, 414, 428, 360, 412]
      const isCommonWidth = commonWidths.some(cw => Math.abs(width - cw) < 50)

      if (!isCommonWidth && width % 100 === 0 && height % 100 === 0) {
        // Perfectly round numbers that aren't common resolutions
        score += 0.2
        reasons.push('uncommon_screen_dimensions')
      }
    }
  }

  // Additional WebGL validation
  if (webgl) {
    const wglVendor = webgl.vendor || ''
    const wglRenderer = webgl.renderer || ''

    // Known real GPU vendors
    const realVendors = ['Intel', 'NVIDIA', 'AMD', 'Apple', 'Qualcomm', 'ARM', 'Google', 'Microsoft']
    const hasRealVendor = realVendors.some(v => wglVendor.includes(v))

    // If vendor is provided but doesn't match known vendors, suspicious
    if (wglVendor && wglVendor.length > 0 && wglVendor.length < 30 && !hasRealVendor) {
      score += 0.3
      reasons.push('unknown_webgl_vendor')
    }

    // Very short renderer strings are suspicious (real ones are descriptive)
    if (wglRenderer && wglRenderer.length > 0 && wglRenderer.length < 10) {
      score += 0.2
      reasons.push('suspicious_webgl_renderer')
    }
  }

  // Timezone validation - should be valid IANA timezone
  const timezone = fingerprint.timezone as string | undefined
  if (timezone) {
    // Valid timezones contain '/' (e.g., "America/Los_Angeles") or are short like "UTC"
    if (!timezone.includes('/') && timezone !== 'UTC' && timezone.length > 5) {
      score += 0.2
      reasons.push('invalid_timezone_format')
    }
  }

  // Language validation
  const language = fingerprint.language as string | undefined
  const languages = fingerprint.languages as string[] | undefined
  if (language) {
    // Valid language codes follow patterns like "en", "en-US", "zh-CN"
    const validLangPattern = /^[a-z]{2}(-[A-Z]{2})?$/
    if (!validLangPattern.test(language) && language !== 'en-US' && language.length < 2) {
      score += 0.2
      reasons.push('invalid_language_format')
    }
  }

  // Plugins validation
  const plugins = fingerprint.plugins
  if (plugins !== undefined) {
    if (Array.isArray(plugins)) {
      // Check for fake plugin names (too short or suspicious)
      const suspiciousPlugins = plugins.filter((p: unknown) => {
        if (typeof p === 'string') {
          return p.length < 3 || p === 'PDF' || p === 'test'
        }
        return false
      })
      if (suspiciousPlugins.length > 0 && plugins.length <= 2) {
        score += 0.15
        reasons.push('suspicious_plugin_names')
      }
    }
  }

  return { score: Math.min(score, 1.0), reasons }
}

// Behavioral analysis
function analyzeBehavior(behavior: Record<string, unknown>, timeOnPage: number): {
  isBot: boolean
  score: number
  reasons: string[]
} {
  let score = 0
  const reasons: string[] = []

  const mouseMovements = (behavior.mouseMovements as number) || 0
  const scrollEvents = (behavior.scrollEvents as number) || 0
  const clicks = (behavior.clicks as number) || 0
  const hasInteracted = (behavior.hasInteracted as boolean) || false

  // No interaction after 5+ seconds
  if (timeOnPage >= 5 && !hasInteracted) {
    score += 40
    reasons.push('no_interaction_after_5s')
  }

  // No mouse movement after 3+ seconds
  if (timeOnPage >= 3 && mouseMovements < 5) {
    score += 30
    reasons.push('minimal_mouse_movement')
  }

  // No scroll on page (assuming time elapsed)
  if (timeOnPage >= 10 && scrollEvents < 1) {
    score += 20
    reasons.push('no_scroll_after_10s')
  }

  // Perfect interaction (too robotic - same numbers)
  if (mouseMovements > 0 && mouseMovements === clicks) {
    score += 25
    reasons.push('robotic_interaction_pattern')
  }

  return {
    isBot: score >= 50,
    score,
    reasons
  }
}

// Bot detection with behavioral analysis
function detectBot(
  userAgent: string,
  fingerprint: Record<string, unknown>,
  behavior: Record<string, unknown> = {},
  honeypotTriggered: boolean = false,
  pageLoadTimestamp?: number
): {
  isBot: boolean
  type: string
  riskScore: number
  reasons: string[]
  requiresPow?: boolean
} {
  let riskScore = 0
  const reasons: string[] = []
  let type = 'human'

  // CRITICAL: Honeypot triggered = definite bot
  if (honeypotTriggered) {
    return {
      isBot: true,
      type: 'bot',
      riskScore: 1.0,
      reasons: ['honeypot_triggered']
    }
  }

  // Timing analysis - detect impossibly fast requests
  const serverTimestamp = Date.now()
  const timingAnalysis = analyzeRequestTiming(pageLoadTimestamp, serverTimestamp)
  if (timingAnalysis.score > 0) {
    riskScore += timingAnalysis.score
    reasons.push(...timingAnalysis.reasons.map(r => `timing:${r}`))
  }

  // Known bots by user agent
  for (const bot of KNOWN_BOTS) {
    if (userAgent.toLowerCase().includes(bot.toLowerCase())) {
      riskScore += 0.9
      reasons.push(`known_bot:${bot}`)
      type = 'bot'
      break
    }
  }

  // Automation detection
  if (fingerprint.webdriver === true) {
    riskScore += 0.8
    reasons.push('webdriver_detected')
    type = 'scraper'
  }

  if (fingerprint.phantom === true || fingerprint.nightmare === true) {
    riskScore += 0.9
    reasons.push('headless_browser')
    type = 'scraper'
  }

  if (fingerprint.selenium === true || fingerprint.puppeteer === true) {
    riskScore += 0.85
    reasons.push('automation_framework')
    type = 'scraper'
  }

  if (fingerprint.automationControlled === true) {
    riskScore += 0.9
    reasons.push('browser_automation_controlled')
    type = 'scraper'
  }

  // Missing browser features
  if (!fingerprint.canvas || fingerprint.canvas === 'null' || fingerprint.canvas === null) {
    riskScore += 0.4
    reasons.push('canvas_missing')
  }

  if (!fingerprint.webgl || fingerprint.webgl === null) {
    riskScore += 0.4
    reasons.push('webgl_missing')
  }

  // Suspicious screen/device
  const screen = fingerprint.screen as { width?: number, height?: number } | undefined
  if (screen && (screen.width === 0 || screen.height === 0)) {
    riskScore += 0.5
    reasons.push('invalid_screen_dimensions')
  }

  // No plugins
  const plugins = fingerprint.plugins as unknown[] | undefined
  if (plugins && Array.isArray(plugins) && plugins.length === 0) {
    riskScore += 0.2
    reasons.push('no_plugins')
  }

  // Missing languages
  if (!fingerprint.languages && !fingerprint.language) {
    riskScore += 0.3
    reasons.push('no_language')
  }

  // Fingerprint validation - detect spoofed/fake fingerprints
  const fingerprintValidation = validateFingerprint(fingerprint)
  if (fingerprintValidation.score > 0) {
    riskScore += fingerprintValidation.score
    reasons.push(...fingerprintValidation.reasons.map(r => `fingerprint:${r}`))
    if (fingerprintValidation.score >= 0.5) {
      type = 'suspicious'
    }
  }

  // Behavioral analysis
  const timeOnPage = (behavior.timeOnPage as number) || 0
  if (timeOnPage >= 3) {
    const behaviorAnalysis = analyzeBehavior(behavior, timeOnPage)
    if (behaviorAnalysis.isBot) {
      riskScore += behaviorAnalysis.score / 100
      reasons.push(...behaviorAnalysis.reasons.map(r => `behavior:${r}`))
      if (riskScore < 0.7) {
        type = 'suspicious'
      }
    }
  }

  // Determine if proof-of-work should be required for borderline cases
  const requiresPow = riskScore >= 0.4 && riskScore < 0.7

  return {
    isBot: riskScore > 0.6,
    type,
    riskScore: Math.min(riskScore, 1.0),
    reasons,
    requiresPow
  }
}

// Check if IP is blocked
async function isIpBlocked(supabase: any, ip: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('blocked_ips')
      .select('ip')
      .eq('ip', ip)
      .gt('blocked_until', new Date().toISOString())
      .single()

    return !!data
  } catch {
    return false
  }
}


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const clientIp = req.headers.get('x-forwarded-for') || 'unknown'

    // Rate limiting
    if (!checkRateLimit(clientIp)) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
      )
    }

    // Parse and validate input
    let rawBody: unknown
    try {
      rawBody = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const validationResult = CheckAccessSchema.safeParse(rawBody)
    if (!validationResult.success) {
      console.error('Validation error:', validationResult.error.errors)
      return new Response(
        JSON.stringify({ error: 'Invalid request parameters', details: validationResult.error.errors }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const { apiKey, requestToken, page, userAgent, fingerprint, behavior, honeypotTriggered, referrer, pageLoadTimestamp, powSolution } = validationResult.data

    // Sanitize string inputs
    const sanitizedPage = sanitizeString(page)
    const sanitizedUserAgent = sanitizeString(userAgent)
    const sanitizedReferrer = sanitizeString(referrer)

    // Verify proof-of-work if provided
    let powVerified = false
    if (powSolution) {
      powVerified = await verifyProofOfWork(
        powSolution.challenge,
        powSolution.nonce,
        powSolution.hash
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Check if IP is blocked (from honeypot or previous violations)
    const ipBlocked = await isIpBlocked(supabaseClient, clientIp)
    if (ipBlocked) {
      console.log(`[Gate] Blocked IP attempted access: ${clientIp}`)
      return new Response(
        JSON.stringify({
          allowed: false,
          status: 'blocked',
          reason: 'IP address is blocked',
          showGatewall: true,
          gateConfig: {
            type: 'blocked',
            title: 'Access Denied',
            message: 'Your IP address has been blocked due to previous violations.',
            paymentUrl: '/bot-payment?blocked=true'
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    // Validate site using only API key (don't filter by status so "paused" sites can be handled)
    const { data: site, error: siteError } = await supabaseClient
      .from('sites')
      .select('*')
      .eq('api_key', apiKey)
      .single()

    if (siteError || !site) {
      return new Response(
        JSON.stringify({ allowed: false, reason: 'Invalid API key' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // If the site is paused, short-circuit: allow all traffic and do not enforce gate
    if (site.status === 'paused') {
      // Log the paused access attempt for visibility
      try {
        await supabaseClient.from('request_logs').insert({
          site_id: site.id,
          customer_id: site.customer_id,
          ip: clientIp,
          user_agent: sanitizedUserAgent,
          page: sanitizedPage,
          type: 'system',
          status: 'allowed',
          detection_data: { paused: true },
          fingerprint: { ...fingerprint, visitorId: String(fingerprint.canvas || fingerprint.userAgent || clientIp) },
          risk_score: 0,
          decision_reason: 'Site is paused by owner - Gate disabled'
        })
      } catch (e) {
        console.error('Failed to log paused site access:', e)
      }

      return new Response(
        JSON.stringify({
          allowed: true,
          status: 'paused',
          showGatewall: false,
          reason: 'Site protection is paused by site owner'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // (demo short-circuit removed) normal flow continues

    // Run enhanced bot detection with behavioral analysis and timing
    const detection = detectBot(sanitizedUserAgent, fingerprint, behavior, honeypotTriggered, pageLoadTimestamp)

    // Generate visitor ID from fingerprint
    const visitorId = String(fingerprint.canvas || fingerprint.userAgent || clientIp)

    // Check if bot is allowed (DEFAULT: Block all bots except those in allowlist)
    const allowedBots = site.config?.allowedBots || []
    const isAllowedBot = allowedBots.some((bot: string) => sanitizedUserAgent.toLowerCase().includes(bot.toLowerCase()))

    // ===========================================
    // MANDATORY PROOF-OF-WORK FOR ALL VISITORS
    // ===========================================
    // Every visitor must solve POW - makes mass scraping computationally expensive
    if (!powVerified && !isAllowedBot) {
      // Difficulty: 4 = ~65k iterations (~0.5s), 5 = ~1M iterations (~2-3s)
      const difficulty = detection.isBot ? 5 : 4
      const powChallenge = generatePowChallenge(difficulty)

      // Log asynchronously (don't block response)
      supabaseClient.from('request_logs').insert({
        site_id: site.id,
        customer_id: site.customer_id,
        ip: clientIp,
        user_agent: sanitizedUserAgent,
        page: sanitizedPage,
        type: detection.isBot ? 'bot' : 'visitor',
        status: 'pow_required',
        detection_data: { riskScore: detection.riskScore, reasons: detection.reasons },
        fingerprint,
        risk_score: detection.riskScore,
        decision_reason: 'Mandatory POW challenge'
      }).then(() => {}).catch(() => {})

      return new Response(
        JSON.stringify({
          allowed: false,
          status: 'pow_required',
          reason: 'Verification required',
          showGatewall: false,
          powChallenge
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POW verified - but still check if bot
    detection.reasons.push('pow_verified')

    // If bot detected and NOT in allowed list, require payment
    if (detection.isBot && !isAllowedBot) {
      // Log bot detection
      await supabaseClient.from('request_logs').insert({
        site_id: site.id,
        customer_id: site.customer_id,
        ip: clientIp,
        user_agent: sanitizedUserAgent,
        page: sanitizedPage,
        type: detection.type,
        status: 'challenged',
        detection_data: detection,
        fingerprint,
        risk_score: detection.riskScore,
        decision_reason: 'Bot detected - payment required for access'
      })

      // Construct payment URL - always redirect to Gate platform
      const referer = req.headers.get('referer') || ''
      const paymentUrl = `https://security-gate.lovable.app/bot-payment?apiKey=${encodeURIComponent(apiKey)}&page=${encodeURIComponent(sanitizedPage)}&return=${encodeURIComponent(referer || sanitizedPage)}`

      return new Response(
        JSON.stringify({
          allowed: false,
          status: 'payment_required',
          reason: 'Bot detected. Payment required for access.',
          showGatewall: true,
          paymentUrl,
          gateConfig: {
            type: 'bot-payment',
            title: 'Bot Access Payment Required',
            message: 'This content is protected. Bots must pay to access.',
            paymentUrl
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If bot is allowed (e.g., SEO crawler), allow and log
    if (detection.isBot && isAllowedBot) {
      await supabaseClient.from('request_logs').insert({
        site_id: site.id,
        customer_id: site.customer_id,
        ip: clientIp,
        user_agent: sanitizedUserAgent,
        page: sanitizedPage,
        type: 'bot',
        status: 'allowed',
        detection_data: detection,
        fingerprint,
        risk_score: detection.riskScore,
        decision_reason: 'Allowed bot (SEO crawler)'
      })

      // Optionally issue short-lived token for allowed access
          if (requestToken) {
        try {
          const signingKey = Deno.env.get('SIGNING_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
          if (signingKey) {
            const jti = crypto.randomUUID()
            const exp = Math.floor(Date.now() / 1000) + 60 // 60s
            const token = await signJwt({ alg: 'HS256', typ: 'JWT' }, { site_id: site.id, origin: req.headers.get('origin') || '', page: sanitizedPage, exp, jti }, signingKey)
              try {
                await supabaseClient.from('request_logs').insert({
                  site_id: site.id,
                  customer_id: site.customer_id,
                  ip: clientIp,
                  user_agent: sanitizedUserAgent,
                  page: sanitizedPage,
                  type: 'token_issued',
                  status: 'token_issued',
                  detection_data: { tokenIssued: true, jti },
                  fingerprint,
                  risk_score: detection.riskScore,
                  decision_reason: 'Token issued for allowed bot'
                })
              } catch (e) {
                console.error('Failed to log token issuance', e)
              }

              // Optionally also issue a one-time login token if requested
              const responseBody: any = { allowed: true, status: 'allowed', showGatewall: false, reason: 'Allowed bot', accessToken: token }
              if ((validationResult.data as any).requestLogin) {
                try {
                  const jtiLogin = crypto.randomUUID()
                  const expLogin = Math.floor(Date.now() / 1000) + 60
                  const loginToken = await signJwt({ alg: 'HS256', typ: 'JWT' }, { site_id: site.id, origin: req.headers.get('origin') || '', page: sanitizedPage, exp: expLogin, jti: jtiLogin, type: 'login' }, signingKey)
                  responseBody.loginToken = loginToken
                } catch (e) {
                  console.error('Login token issuance failed:', e)
                }
              }

              return new Response(
                JSON.stringify(responseBody),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              )
          }
        } catch (e) {
          console.error('Token issuance failed:', e)
        }
      }

      return new Response(
        JSON.stringify({ allowed: true, status: 'allowed', showGatewall: false, reason: 'Allowed bot' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Human verified - always allow access
    await supabaseClient.from('request_logs').insert({
      site_id: site.id,
      customer_id: site.customer_id,
      ip: clientIp,
      user_agent: sanitizedUserAgent,
      page: sanitizedPage,
      type: 'human',
      status: 'allowed',
      detection_data: detection,
      fingerprint: { ...fingerprint, visitorId },
      risk_score: detection.riskScore,
      decision_reason: 'Human verified'
    })

    const responseBody: any = { allowed: true, status: 'allowed', showGatewall: false, reason: 'Human verified' }

    if (requestToken) {
      try {
        const signingKey = Deno.env.get('SIGNING_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
        if (signingKey) {
          const jti = crypto.randomUUID()
          const exp = Math.floor(Date.now() / 1000) + 60
          const token = await signJwt({ alg: 'HS256', typ: 'JWT' }, { site_id: site.id, origin: req.headers.get('origin') || '', page: sanitizedPage, exp, jti }, signingKey)
          responseBody.accessToken = token
        }
      } catch (e) {
        console.error('Token issuance failed:', e)
      }
    }

    return new Response(
      JSON.stringify(responseBody),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Error:', error?.message || error, error?.stack || '')
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})