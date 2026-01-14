// Proxy endpoint to scrape pages server-side (bypasses CORS)
// ALL requests through this endpoint are treated as bot scraping attempts
// Real humans use browsers directly - they don't call this API
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Known bot user agent patterns
const KNOWN_BOT_PATTERNS = [
  // AI Training Bots
  { pattern: /GPTBot/i, type: 'ai-crawler', company: 'OpenAI' },
  { pattern: /ChatGPT-User/i, type: 'ai-crawler', company: 'OpenAI' },
  { pattern: /ClaudeBot/i, type: 'ai-crawler', company: 'Anthropic' },
  { pattern: /Claude-Web/i, type: 'ai-crawler', company: 'Anthropic' },
  { pattern: /anthropic-ai/i, type: 'ai-crawler', company: 'Anthropic' },
  { pattern: /CCBot/i, type: 'ai-crawler', company: 'Common Crawl' },
  { pattern: /Google-Extended/i, type: 'ai-crawler', company: 'Google' },
  { pattern: /Gemini/i, type: 'ai-crawler', company: 'Google' },
  { pattern: /GoogleOther/i, type: 'ai-crawler', company: 'Google' },
  { pattern: /PerplexityBot/i, type: 'ai-crawler', company: 'Perplexity' },
  { pattern: /Bytespider/i, type: 'ai-crawler', company: 'ByteDance' },
  { pattern: /Amazonbot/i, type: 'ai-crawler', company: 'Amazon' },
  { pattern: /FacebookBot/i, type: 'ai-crawler', company: 'Meta' },
  { pattern: /Meta-ExternalAgent/i, type: 'ai-crawler', company: 'Meta' },
  { pattern: /cohere-ai/i, type: 'ai-crawler', company: 'Cohere' },
  { pattern: /AI2Bot/i, type: 'ai-crawler', company: 'AI2' },
  { pattern: /Diffbot/i, type: 'ai-crawler', company: 'Diffbot' },
  { pattern: /Applebot/i, type: 'ai-crawler', company: 'Apple' },
  // Search Engines
  { pattern: /Googlebot/i, type: 'search-engine', company: 'Google' },
  { pattern: /bingbot/i, type: 'search-engine', company: 'Microsoft' },
  { pattern: /Baiduspider/i, type: 'search-engine', company: 'Baidu' },
  { pattern: /YandexBot/i, type: 'search-engine', company: 'Yandex' },
  // SEO Tools
  { pattern: /SemrushBot/i, type: 'seo-tool', company: 'Semrush' },
  { pattern: /AhrefsBot/i, type: 'seo-tool', company: 'Ahrefs' },
  { pattern: /MJ12bot/i, type: 'seo-tool', company: 'Majestic' },
  // Scrapers/Libraries
  { pattern: /curl\//i, type: 'scraper', company: 'curl' },
  { pattern: /wget\//i, type: 'scraper', company: 'wget' },
  { pattern: /python-requests/i, type: 'scraper', company: 'Python' },
  { pattern: /scrapy/i, type: 'scraper', company: 'Scrapy' },
  { pattern: /axios/i, type: 'scraper', company: 'Axios' },
  { pattern: /node-fetch/i, type: 'scraper', company: 'Node.js' },
  { pattern: /Go-http-client/i, type: 'scraper', company: 'Go' },
  { pattern: /aiohttp/i, type: 'scraper', company: 'Python' },
  { pattern: /httpx/i, type: 'scraper', company: 'Python' },
  // Headless Browsers
  { pattern: /HeadlessChrome/i, type: 'headless', company: 'Puppeteer/Playwright' },
  { pattern: /PhantomJS/i, type: 'headless', company: 'PhantomJS' },
  { pattern: /Puppeteer/i, type: 'headless', company: 'Google' },
  { pattern: /Playwright/i, type: 'headless', company: 'Microsoft' },
]

// Detect bot from user agent
function detectBot(userAgent: string): {
  isKnownBot: boolean
  botName: string
  botType: string
  company: string
  riskScore: number
  reasons: string[]
} {
  const reasons: string[] = []

  if (!userAgent) {
    return {
      isKnownBot: true,
      botName: 'Unknown',
      botType: 'scraper',
      company: 'Unknown',
      riskScore: 0.90,
      reasons: ['No user-agent provided']
    }
  }

  // Check known bot patterns
  for (const bot of KNOWN_BOT_PATTERNS) {
    const match = userAgent.match(bot.pattern)
    if (match) {
      reasons.push(`Known bot signature: ${match[0]}`)
      return {
        isKnownBot: true,
        botName: match[0],
        botType: bot.type,
        company: bot.company,
        riskScore: 0.95,
        reasons
      }
    }
  }

  // Check for generic bot keywords
  if (/bot|crawler|spider|scraper/i.test(userAgent)) {
    const match = userAgent.match(/bot|crawler|spider|scraper/i)
    reasons.push(`Generic bot keyword: ${match?.[0]}`)
    return {
      isKnownBot: true,
      botName: 'Generic-Bot',
      botType: 'scraper',
      company: 'Unknown',
      riskScore: 0.80,
      reasons
    }
  }

  // Not a known bot, but using scrape API = suspicious
  // Real humans don't call scrape-page directly
  reasons.push('Using scrape-page API (not a browser)')
  reasons.push('Possible UA spoofing')
  return {
    isKnownBot: false,
    botName: 'Evasive-Scraper',
    botType: 'evasive',
    company: 'Unknown',
    riskScore: 0.70,
    reasons
  }
}

// Log request to database - HONEST logging
async function logRequest(
  supabase: any,
  data: {
    requestId: string
    url: string
    userAgent: string
    botDetection: any
    status: 'blocked' | 'allowed'
    targetFetched: boolean  // Did we actually contact the target URL?
    contentLength?: number
    clientIp: string
  }
): Promise<string | null> {
  try {
    // Use demo site for bot attack logs
    const { data: demoSite } = await supabase
      .from('sites')
      .select('id, customer_id')
      .eq('api_key', 'pk_live_demo_gateprotect_2024')
      .single()

    if (!demoSite) {
      console.log('[scrape-page] Demo site not found, skipping log')
      return null
    }

    // Build HONEST decision reason
    let decision_reason: string
    if (data.status === 'blocked') {
      decision_reason = `BLOCKED: ${data.botDetection.botName} detected. ` +
        `Target (${data.url}) was NOT contacted. ` +
        `Bot intercepted by Gate before reaching destination.`
    } else {
      decision_reason = `SCRAPED: Evasive bot evaded detection. ` +
        `Target (${data.url}) WAS contacted. ` +
        `Retrieved ${data.contentLength || 0} bytes of content.`
    }

    const logEntry = {
      site_id: demoSite.id,
      customer_id: demoSite.customer_id,
      ip: data.clientIp,
      user_agent: data.userAgent,
      page: new URL(data.url).pathname,
      type: 'bot',
      status: data.status,
      risk_score: data.botDetection.riskScore,
      decision_reason: decision_reason,
      detection_data: {
        // Correlation
        requestId: data.requestId,

        // HONEST: What actually happened
        targetFetched: data.targetFetched,
        targetUrl: data.url,
        blockedBy: data.targetFetched ? null : 'gate',

        // Bot info
        botName: data.botDetection.botName,
        botType: data.botDetection.botType,
        company: data.botDetection.company,
        isKnownBot: data.botDetection.isKnownBot,
        reasons: data.botDetection.reasons,

        // Content info (if scraped)
        contentLength: data.contentLength || null
      },
      fingerprint: {
        userAgent: data.userAgent,
        source: 'scrape-page-api',
        requestId: data.requestId
      }
    }

    const { data: inserted } = await supabase.from('request_logs').insert(logEntry).select('id').single()
    console.log(`[scrape-page] Logged: ${data.botDetection.botName} -> ${data.status}, targetFetched: ${data.targetFetched} (requestId: ${data.requestId})`)
    return inserted?.id || null
  } catch (err) {
    console.error('[scrape-page] Log error:', err)
    return null
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'

  // Initialize Supabase client for logging
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const { url, userAgent, requestId } = await req.json()

    // Generate request ID if not provided (for correlation with bot-side logs)
    const correlationId = requestId || `gate_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`

    if (!url) {
      return new Response(JSON.stringify({ error: 'URL is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ALL requests through this API are bot attempts
    // Real humans use browsers, not this scrape endpoint
    const botDetection = detectBot(userAgent || '')

    // Block known bots completely
    if (botDetection.isKnownBot) {
      console.log(`[scrape-page] BLOCKED: ${botDetection.botName} (${botDetection.botType}) [${correlationId}]`)

      // Log the blocked attempt - HONEST: target was NOT fetched
      const logId = await logRequest(supabase, {
        requestId: correlationId,
        url,
        userAgent: userAgent || '',
        botDetection,
        status: 'blocked',
        targetFetched: false,  // HONEST: We did NOT contact the target URL
        clientIp
      })

      return new Response(
        JSON.stringify({
          success: false,
          blocked: true,
          blockedBy: 'gate',  // Blocked by Gate, NOT by target site
          targetFetched: false,  // Target URL was never contacted
          requestId: correlationId,
          gateLogId: logId,
          botDetection: {
            botName: botDetection.botName,
            botType: botDetection.botType,
            company: botDetection.company,
            riskScore: botDetection.riskScore,
            reasons: botDetection.reasons
          },
          message: `Gate blocked ${botDetection.botName} before reaching target. No request sent to ${url}.`
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Evasive bot (spoofed UA) - let them scrape but log it
    // This shows the difference between blocked vs evasive bots
    console.log(`[scrape-page] EVASIVE BOT: ${userAgent?.substring(0, 50)}...`)
    // Fetch the page server-side (no CORS restrictions)
    // Note: fetch() follows redirects automatically
    const response = await fetch(url, {
      headers: {
        'User-Agent': userAgent || 'Mozilla/5.0 (compatible; GateBot/1.0)',
      },
      signal: AbortSignal.timeout(10000),
      redirect: 'follow' // Explicitly follow redirects
    })

    const html = await response.text()
    const actualUrl = response.url // Final URL after redirects

    // ENHANCED: Detect Single Page Application (SPA) page markers
    // SPAs load different JavaScript bundles per page, which proves which page was accessed
    let pageIdentifier = 'unknown'
    let pageProof = ''

    // Extract ALL Next.js page scripts and filter out _app (the generic wrapper)
    const allPageScripts = html.match(/pages\/([^-]+)-[a-f0-9]+\.js/g) || []
    const pageSpecificScripts = allPageScripts
      .map(script => {
        const match = script.match(/pages\/([^-]+)-/)
        return match ? match[1] : null
      })
      .filter(name => name && name !== '_app') // Skip _app wrapper

    if (pageSpecificScripts.length > 0) {
      pageIdentifier = pageSpecificScripts[0] || 'unknown' // e.g., "assets", "index", "dashboard"
      pageProof = `✓ Next.js page: "${pageIdentifier}" (detected from ${allPageScripts.length} scripts: ${allPageScripts.join(', ')})`
    } else if (allPageScripts.length > 0) {
      // Fallback if only _app found
      pageIdentifier = '_app_only'
      pageProof = `⚠️ Only _app wrapper found - may be error page or redirect`
    }

    // ========== META TAGS ANALYSIS ==========
    const metaTags: any = {}

    // Page title
    const titleMatch = html.match(/<title>([^<]+)<\/title>/)
    metaTags.title = titleMatch ? titleMatch[1] : 'No title'

    // Meta description
    const descMatch = html.match(/<meta name="description" content="([^"]+)"/)
    metaTags.description = descMatch ? descMatch[1] : null

    // OpenGraph tags
    const ogTitle = html.match(/<meta property="og:title" content="([^"]+)"/)
    const ogDesc = html.match(/<meta property="og:description" content="([^"]+)"/)
    const ogImage = html.match(/<meta property="og:image" content="([^"]+)"/)
    const ogType = html.match(/<meta property="og:type" content="([^"]+)"/)
    metaTags.og = {
      title: ogTitle ? ogTitle[1] : null,
      description: ogDesc ? ogDesc[1] : null,
      image: ogImage ? ogImage[1] : null,
      type: ogType ? ogType[1] : null
    }

    // Twitter Card
    const twitterCard = html.match(/<meta name="twitter:card" content="([^"]+)"/)
    const twitterTitle = html.match(/<meta name="twitter:title" content="([^"]+)"/)
    metaTags.twitter = {
      card: twitterCard ? twitterCard[1] : null,
      title: twitterTitle ? twitterTitle[1] : null
    }

    // Canonical URL
    const canonicalMatch = html.match(/<link rel="canonical" href="([^"]+)"/)
    metaTags.canonical = canonicalMatch ? canonicalMatch[1] : null

    // ========== RESOURCE ANALYSIS ==========
    const resources = {
      scripts: (html.match(/<script[^>]*src=/g) || []).length,
      styles: (html.match(/<link[^>]*rel="stylesheet"/g) || []).length,
      images: (html.match(/<img[^>]*src=/g) || []).length,
      fonts: (html.match(/fonts\.googleapis\.com|fonts\.gstatic\.com/g) || []).length
    }

    // ========== THIRD-PARTY SERVICES DETECTION ==========
    const services = []
    if (html.includes('stripe.com')) services.push('Stripe')
    if (html.includes('amplitude.com')) services.push('Amplitude Analytics')
    if (html.includes('plausible.io')) services.push('Plausible Analytics')
    if (html.includes('google-analytics.com') || html.includes('gtag')) services.push('Google Analytics')
    if (html.includes('supabase.co')) services.push('Supabase')
    if (html.includes('cloudinary.com')) services.push('Cloudinary')
    if (html.includes('vercel')) services.push('Vercel')

    // ========== GATE PROTECTION DETECTION ==========
    // Check for Gate protection scripts in the HTML
    // CRITICAL: If gate.js or gate-protection-v3.js is present, the site is protected
    // Server-side crawlers bypass JS execution, so we must detect the script itself
    const hasGateScript =
      html.includes('gate.js') ||
      html.includes('gate-protection') ||
      html.includes('gate-protect') ||
      html.includes('security-gate.lovable.app') ||
      html.includes('data-gate-protect') ||
      html.includes('data-api-key') && html.includes('gate') ||
      html.includes('GateProtection') ||
      html.includes('check-access');

    // Check for Gate gate indicators in the HTML
    const gateIndicators = {
      // CRITICAL: Gate protection script detected - site is protected even if we can read HTML
      hasGateScript: hasGateScript,

      // Gate-specific markers
      hasGateGate: html.includes('gate-gate') || html.includes('GateGate'),
      hasGateWidget: html.includes('gate-widget') || html.includes('GateWidget'),
      hasGateModal: html.includes('gate-modal') || html.includes('GateModal'),
      hasGateOverlay: html.includes('gate-overlay') || html.includes('GateOverlay'),

      // Common gate text patterns (case-insensitive check)
      hasPaymentRequired: /payment\s*required/i.test(html),
      hasSubscribePrompt: /subscribe\s*(to\s*)?(access|continue|read)/i.test(html),
      hasGateText: /gate|pay\s*wall/i.test(html),
      hasBotDetected: /bot\s*(detected|blocked)|automated\s*(access|request)/i.test(html),
      hasAccessDenied: /access\s*denied|blocked|restricted/i.test(html),

      // Gate-specific UI elements
      hasGateButton: html.includes('Pay to Access') || html.includes('Subscribe Now') || html.includes('Unlock Content'),
      hasGatePricing: /\$\d+(\.\d{2})?\s*(\/\s*)?(month|year|mo|yr)/i.test(html),

      // Check for blur/overlay effects commonly used by gates
      hasBlurEffect: /blur\s*\(\s*\d+/i.test(html) || html.includes('backdrop-blur'),
      hasOverlayDiv: /class="[^"]*overlay[^"]*"/i.test(html) && /position:\s*fixed/i.test(html),
    }

    // Determine if gate is blocking content
    // CRITICAL: If Gate protection script is present, the site IS protected
    // Even though we can read the HTML, a real bot would be blocked by the JS protection
    const gateScore = Object.values(gateIndicators).filter(Boolean).length
    const isGateBlocking = gateIndicators.hasGateScript || gateScore >= 2 || gateIndicators.hasGateGate || gateIndicators.hasGateWidget || gateIndicators.hasBotDetected

    // Build gate detection reasons
    const gateReasons: string[] = []
    if (gateIndicators.hasGateScript) gateReasons.push('🛡️ Gate protection script detected - requires JS execution & POW')
    if (gateIndicators.hasGateGate) gateReasons.push('Gate gate element detected')
    if (gateIndicators.hasGateWidget) gateReasons.push('Gate widget detected')
    if (gateIndicators.hasGateModal) gateReasons.push('Gate modal detected')
    if (gateIndicators.hasBotDetected) gateReasons.push('Bot detection message found')
    if (gateIndicators.hasPaymentRequired) gateReasons.push('Payment required text')
    if (gateIndicators.hasSubscribePrompt) gateReasons.push('Subscribe prompt detected')
    if (gateIndicators.hasAccessDenied) gateReasons.push('Access denied message')
    if (gateIndicators.hasBlurEffect) gateReasons.push('Content blur effect detected')
    if (gateIndicators.hasGateButton) gateReasons.push('Pay/Subscribe button detected')
    if (gateIndicators.hasGatePricing) gateReasons.push('Pricing displayed')

    // ========== NEXT.JS DATA EXTRACTION ==========
    // Extract __NEXT_DATA__ which contains page props and initial state
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/)
    let nextData: any = null
    if (nextDataMatch) {
      try {
        nextData = JSON.parse(nextDataMatch[1])
      } catch (e) {
        // Invalid JSON
      }
    }

    // Build comprehensive page proof
    if (canonicalMatch) {
      pageProof += ` | Canonical: ${canonicalMatch[1]}`
    }

    // Extract text snippet (remove HTML tags)
    let text = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim()

    // For SPAs, HTML has minimal text - add explanation
    let snippet = ''
    if (isGateBlocking) {
      // Gate detected - clearly indicate this with payment instructions
      snippet = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
      snippet += `🚫 ACCESS BLOCKED - GATE PROTECTION ACTIVE\n`
      snippet += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`

      if (gateIndicators.hasGateScript) {
        snippet += `⚠️  This site uses Gate Protection with mandatory Proof-of-Work.\n\n`
        snippet += `🔒 PROTECTION MECHANISM:\n`
        snippet += `   • Server-side crawlers: Page appears blank (CSS opacity:0)\n`
        snippet += `   • Headless browsers: Must solve SHA-256 POW challenge (~2-3s)\n`
        snippet += `   • After POW: Bot fingerprinting detects & blocks automation\n`
        snippet += `   • Detected bots: Redirected to payment page\n\n`
        snippet += `📝 NOTE: This test used server-side fetch which bypasses JS.\n`
        snippet += `   Real browser bots would be blocked by the JS protection.\n\n`
      } else {
        snippet += `This content is protected by Gate.\n`
        snippet += `Automated access requires a paid subscription.\n\n`
      }

      snippet += `📋 Detection reasons:\n`
      gateReasons.forEach(reason => {
        snippet += `   • ${reason}\n`
      })
      snippet += `\n🔒 Gate score: ${gateScore}/10 indicators matched\n\n`
      snippet += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
      snippet += `💳 TO ACCESS THIS CONTENT:\n`
      snippet += `   Subscribe at: https://security-gate.lovable.app/bot-payment\n`
      snippet += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`
      snippet += `--- Raw HTML preview (would be hidden/blocked for real bots) ---\n`
      snippet += text.substring(0, 200) + (text.length > 200 ? '...' : '')
    } else if (text.length < 100 && pageIdentifier !== 'unknown') {
      snippet = `[SPA Detected] This is a Single Page Application - actual content loads via JavaScript after page load. The HTML shell contains minimal text (${text.length} chars). Page identifier "${pageIdentifier}" proves which page was requested. Shell content: ${text}`
    } else {
      snippet = text.substring(0, 800) + (text.length > 800 ? '...' : '')
    }

    // Build comprehensive page analysis
    const pageAnalysis = {
      pageIdentifier,
      pageType: metaTags.og?.type || 'website',
      description: metaTags.og?.description || metaTags.description || 'No description',
      resources: resources,
      services: services,
      hasNextData: !!nextData,
      nextDataKeys: nextData ? Object.keys(nextData) : [],
      // Gate detection
      isGateBlocking: isGateBlocking,
      gateScore: gateScore,
      gateReasons: gateReasons,
      gateIndicators: gateIndicators
    }

    // Log the scrape attempt
    // If Gate protection is detected, mark as blocked (even though HTML was fetched)
    // because real bots would be blocked by the JS protection
    const effectiveStatus = gateIndicators.hasGateScript ? 'blocked' : 'allowed'

    const logId = await logRequest(supabase, {
      requestId: correlationId,
      url,
      userAgent: userAgent || '',
      botDetection: gateIndicators.hasGateScript
        ? { ...botDetection, reasons: [...botDetection.reasons, 'Gate protection script detected - would block real bots'], riskScore: 0.95 }
        : botDetection,
      status: effectiveStatus,
      targetFetched: true,  // We did fetch HTML, but Gate protection would block real bots
      contentLength: html.length,
      clientIp
    })

    return new Response(
      JSON.stringify({
        success: !gateIndicators.hasGateScript,  // Not successful if Gate protected
        blocked: gateIndicators.hasGateScript,  // Blocked by Gate protection
        blockedBy: gateIndicators.hasGateScript ? 'gate' : null,
        statusCode: response.status,
        snippet: snippet,
        contentLength: html.length,
        actualUrl: actualUrl,
        redirected: actualUrl !== url,
        pageTitle: metaTags.title,
        pageIdentifier: pageIdentifier,
        pageProof: pageProof,
        // Request correlation
        requestId: correlationId,
        gateLogId: logId,
        // Gate protection status
        gateProtected: gateIndicators.hasGateScript,
        gateProtectionNote: gateIndicators.hasGateScript
          ? 'Site uses Gate JS protection with mandatory POW. Real bots would be blocked.'
          : null,
        // Gate detection (top-level for easy access)
        isGateBlocking: isGateBlocking,
        gateScore: gateScore,
        gateReasons: gateReasons,
        // Comprehensive page analysis
        metaTags: metaTags,
        pageAnalysis: pageAnalysis
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
