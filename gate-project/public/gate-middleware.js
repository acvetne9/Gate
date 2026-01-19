/**
 * Gate Edge Middleware
 * Server-side bot detection that runs BEFORE content is served
 *
 * For Vercel/Next.js, copy this to middleware.ts
 * For Cloudflare Workers, adapt to their format
 * For Express/Node.js, use as middleware function
 *
 * This file provides the detection logic that can be adapted to any platform.
 */

// ============================================
// BOT DETECTION PATTERNS
// ============================================
const BOT_USER_AGENTS = [
  // AI Training Bots
  'GPTBot', 'ChatGPT-User', 'CCBot', 'Google-Extended', 'ClaudeBot',
  'Claude-Web', 'anthropic-ai', 'PerplexityBot', 'Amazonbot',
  'FacebookBot', 'Meta-ExternalAgent', 'Bytespider', 'Applebot-Extended',

  // Search Engine Crawlers
  'Googlebot', 'bingbot', 'Baiduspider', 'YandexBot', 'DuckDuckBot',
  'Slurp', 'ia_archiver', 'Sogou', 'Exabot',

  // SEO Tools
  'SemrushBot', 'AhrefsBot', 'MJ12bot', 'DotBot', 'MojeekBot',
  'Screaming Frog', 'rogerbot', 'DataForSeoBot',

  // Scrapers
  'curl', 'wget', 'python-requests', 'scrapy', 'axios', 'node-fetch',
  'Go-http-client', 'Java/', 'libwww', 'HttpClient', 'Apache-HttpClient',
  'python-urllib', 'aiohttp', 'httpx',

  // Headless Browsers
  'HeadlessChrome', 'PhantomJS', 'Puppeteer', 'Playwright',

  // Monitoring
  'UptimeRobot', 'Pingdom', 'Site24x7', 'StatusCake', 'DatadogSynthetics',
  'NewRelicPinger', 'Uptrends',

  // Other Known Bots
  'facebookexternalhit', 'Twitterbot', 'LinkedInBot', 'Slackbot',
  'TelegramBot', 'WhatsApp', 'Discordbot'
];

// Patterns that indicate automated access
const SUSPICIOUS_PATTERNS = [
  /bot/i, /crawl/i, /spider/i, /scrape/i, /fetch/i,
  /http/i, /archive/i, /index/i, /monitor/i
];

// Known datacenter/hosting IP ranges (simplified - use full list in production)
const DATACENTER_ASNS = [
  'Amazon', 'Google Cloud', 'Microsoft Azure', 'DigitalOcean',
  'Linode', 'Vultr', 'OVH', 'Hetzner', 'Cloudflare'
];

// ============================================
// DETECTION FUNCTIONS
// ============================================

/**
 * Analyze user agent for bot indicators
 */
function analyzeUserAgent(userAgent) {
  if (!userAgent) {
    return { isBot: true, confidence: 0.9, reason: 'missing_user_agent' };
  }

  const ua = userAgent.toLowerCase();

  // Check known bot user agents
  for (const bot of BOT_USER_AGENTS) {
    if (ua.includes(bot.toLowerCase())) {
      return { isBot: true, confidence: 0.95, reason: 'known_bot', botName: bot };
    }
  }

  // Check suspicious patterns
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(userAgent)) {
      return { isBot: true, confidence: 0.7, reason: 'suspicious_pattern' };
    }
  }

  // Check for missing browser indicators
  const hasBrowserIndicators =
    ua.includes('mozilla') &&
    (ua.includes('chrome') || ua.includes('firefox') || ua.includes('safari') || ua.includes('edge'));

  if (!hasBrowserIndicators) {
    return { isBot: true, confidence: 0.6, reason: 'no_browser_indicators' };
  }

  return { isBot: false, confidence: 0.1, reason: 'appears_human' };
}

/**
 * Analyze request headers for bot indicators
 */
function analyzeHeaders(headers) {
  const indicators = [];
  let botScore = 0;

  // Missing common browser headers
  if (!headers.get('accept-language')) {
    indicators.push('missing_accept_language');
    botScore += 20;
  }

  if (!headers.get('accept-encoding')) {
    indicators.push('missing_accept_encoding');
    botScore += 15;
  }

  if (!headers.get('accept')) {
    indicators.push('missing_accept');
    botScore += 15;
  }

  // Suspicious header combinations
  const accept = headers.get('accept') || '';
  if (accept === '*/*' && !headers.get('sec-fetch-mode')) {
    indicators.push('generic_accept_no_sec_headers');
    botScore += 25;
  }

  // Check for automation headers
  if (headers.get('x-puppeteer') || headers.get('x-playwright')) {
    indicators.push('automation_header');
    botScore += 50;
  }

  // Check sec-ch-ua (client hints)
  const secChUa = headers.get('sec-ch-ua');
  if (secChUa && secChUa.includes('HeadlessChrome')) {
    indicators.push('headless_chrome');
    botScore += 40;
  }

  return {
    isBot: botScore >= 40,
    score: botScore,
    indicators: indicators
  };
}

/**
 * Check if request matches honeypot patterns
 */
function checkHoneypotAccess(pathname) {
  const honeypotPaths = [
    '/.gate/trap/',
    '/wp-admin',
    '/admin.php',
    '/administrator',
    '/.env',
    '/.git',
    '/config.php',
    '/xmlrpc.php',
    '/wp-login.php'
  ];

  for (const path of honeypotPaths) {
    if (pathname.startsWith(path) || pathname === path) {
      return { isHoneypot: true, path: path };
    }
  }

  return { isHoneypot: false };
}

/**
 * Rate limiting check (requires external storage like Redis/KV)
 */
function checkRateLimit(ip, storage) {
  // This is a placeholder - implement with your storage solution
  // Example with Cloudflare KV or Vercel KV:
  // const requestCount = await storage.get(`rate:${ip}`)
  // return requestCount > 100 // 100 requests per minute

  return { exceeded: false, count: 0 };
}

// ============================================
// MAIN MIDDLEWARE FUNCTION
// ============================================

/**
 * Main detection function
 * Returns decision object with action to take
 */
function detectBot(request) {
  const userAgent = request.headers.get('user-agent') || '';
  const pathname = new URL(request.url).pathname;
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
             request.headers.get('cf-connecting-ip') ||
             request.headers.get('x-real-ip') ||
             'unknown';

  const result = {
    isBot: false,
    confidence: 0,
    reasons: [],
    action: 'allow', // 'allow', 'challenge', 'block', 'redirect_payment'
    ip: ip,
    userAgent: userAgent
  };

  // Check 1: Honeypot access
  const honeypotCheck = checkHoneypotAccess(pathname);
  if (honeypotCheck.isHoneypot) {
    result.isBot = true;
    result.confidence = 1.0;
    result.reasons.push('honeypot_access');
    result.action = 'redirect_payment';
    return result;
  }

  // Check 2: User agent analysis
  const uaAnalysis = analyzeUserAgent(userAgent);
  if (uaAnalysis.isBot) {
    result.isBot = true;
    result.confidence = Math.max(result.confidence, uaAnalysis.confidence);
    result.reasons.push(uaAnalysis.reason);
    if (uaAnalysis.botName) {
      result.botName = uaAnalysis.botName;
    }
  }

  // Check 3: Header analysis
  const headerAnalysis = analyzeHeaders(request.headers);
  if (headerAnalysis.isBot) {
    result.isBot = true;
    result.confidence = Math.max(result.confidence, headerAnalysis.score / 100);
    result.reasons.push(...headerAnalysis.indicators);
  }

  // Determine action based on confidence
  if (result.isBot) {
    if (result.confidence >= 0.8) {
      result.action = 'redirect_payment';
    } else if (result.confidence >= 0.5) {
      result.action = 'challenge';
    } else {
      result.action = 'challenge';
    }
  }

  return result;
}

/**
 * Generate server-side gate HTML
 */
function generateGateHTML(options = {}) {
  const paymentUrl = options.paymentUrl || '/bot-payment';
  const returnUrl = encodeURIComponent(options.returnUrl || '/');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Access Required - Gate Protection</title>
  <meta name="robots" content="noindex, nofollow">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #000;
      color: #fff;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      background: #fff;
      color: #000;
      border: 3px solid #000;
      padding: 48px;
      max-width: 500px;
      width: 90%;
      text-align: center;
    }
    h1 {
      font-size: 28px;
      font-weight: 800;
      margin-bottom: 16px;
    }
    p {
      font-size: 16px;
      color: #444;
      line-height: 1.6;
      margin-bottom: 32px;
    }
    .btn {
      display: inline-block;
      background: #000;
      color: #fff;
      padding: 16px 48px;
      font-size: 16px;
      font-weight: 700;
      text-decoration: none;
      transition: all 0.2s;
    }
    .btn:hover {
      background: #333;
      transform: translateY(-2px);
    }
    .footer {
      margin-top: 32px;
      font-size: 12px;
      color: #888;
    }
    .detection-info {
      background: #f5f5f5;
      padding: 16px;
      margin-top: 24px;
      font-size: 12px;
      color: #666;
      text-align: left;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Automated Access Detected</h1>
    <p>
      This content is protected by Gate. Automated access, including bots,
      scrapers, and AI crawlers, requires a valid subscription.
    </p>
    <a href="${paymentUrl}?return=${returnUrl}" class="btn">
      Subscribe for Access
    </a>
    <div class="footer">
      Protected by Gate &bull; <a href="https://security-gate.lovable.app" style="color:#888;">Learn more</a>
    </div>
    ${options.showDebug ? `
    <div class="detection-info">
      <strong>Detection Info:</strong><br>
      Reason: ${options.reason || 'automated_access'}<br>
      Confidence: ${options.confidence || 'high'}<br>
      Request ID: ${options.requestId || 'N/A'}
    </div>
    ` : ''}
  </div>
</body>
</html>`;
}

/**
 * Generate inline gate CSS (for injection into pages)
 */
function generateInlineGateCSS() {
  return `
<style id="gate-default-gate">
  /* Gate Protection: Default gate overlay */
  /* This shows by default and is removed by JS after verification */
  body::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.97);
    z-index: 2147483646;
  }
  body::after {
    content: 'Verifying access...';
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    padding: 48px;
    border: 3px solid black;
    font-family: system-ui, sans-serif;
    font-size: 18px;
    font-weight: 600;
    z-index: 2147483647;
  }
  /* Content is blurred by default */
  main, article, .content, #content, #main, [data-gate-protect] {
    filter: blur(10px);
    user-select: none;
    pointer-events: none;
  }
</style>
<noscript>
  <style>
    body::after {
      content: 'JavaScript is required to access this content. Please enable JavaScript or subscribe for API access.';
      white-space: pre-wrap;
      text-align: center;
      max-width: 400px;
    }
  </style>
</noscript>
`;
}

// ============================================
// PLATFORM-SPECIFIC EXPORTS
// ============================================

// For Vercel Edge Middleware (Next.js)
const vercelMiddleware = `
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Copy the detection functions here...

export function middleware(request: NextRequest) {
  const detection = detectBot(request);

  if (detection.action === 'redirect_payment') {
    const paymentUrl = new URL('/bot-payment', request.url);
    paymentUrl.searchParams.set('return', request.url);
    paymentUrl.searchParams.set('reason', detection.reasons.join(','));
    return NextResponse.redirect(paymentUrl);
  }

  if (detection.action === 'challenge') {
    // Return the page but with gate injected
    const response = NextResponse.next();
    // You would inject the gate HTML here
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
`;

// For Cloudflare Workers
const cloudflareWorker = `
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const detection = detectBot(request);

  if (detection.action === 'redirect_payment') {
    const paymentUrl = new URL('/bot-payment', request.url);
    paymentUrl.searchParams.set('return', request.url);
    return Response.redirect(paymentUrl.toString(), 302);
  }

  if (detection.action === 'block') {
    return new Response(generateGateHTML({
      paymentUrl: '/bot-payment',
      returnUrl: request.url,
      reason: detection.reasons.join(', ')
    }), {
      status: 402,
      headers: { 'Content-Type': 'text/html' }
    });
  }

  // Pass through to origin
  return fetch(request);
}
`;

// Export for Node.js/Express
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    detectBot,
    analyzeUserAgent,
    analyzeHeaders,
    checkHoneypotAccess,
    generateGateHTML,
    generateInlineGateCSS,
    BOT_USER_AGENTS,
    vercelMiddlewareTemplate: vercelMiddleware,
    cloudflareWorkerTemplate: cloudflareWorker
  };
}

// Export for ES modules
if (typeof window !== 'undefined') {
  window.GateMiddleware = {
    detectBot,
    analyzeUserAgent,
    analyzeHeaders,
    generateGateHTML,
    generateInlineGateCSS
  };
}
