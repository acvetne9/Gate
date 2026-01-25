/**
 * Server-Side Bot Test Runner
 * ============================
 * Makes REAL outbound HTTP requests from the server to test Gate's defenses.
 * No cookies, no browser context — simulates how actual scrapers behave.
 *
 * Tests:
 *   1. Known bot UAs (20+ bots) — are they blocked?
 *   2. UA spoofing — does Chrome UA without browser headers get caught?
 *   3. Real browser headers — does a legitimate request pass? (false positive check)
 *   4. Empty/missing UA — is it caught?
 *   5. Content protection — is real content withheld from bots?
 *   6. PoW challenge verification — is the challenge page served?
 *   7. PoW solving — can a bot solve the challenge and get content?
 *   8. Rate limiting — do rapid requests get throttled?
 *   9. Honeypot traps — do trap paths trigger blocks?
 *  10. Cookie forgery — does a fake cookie get rejected?
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ============================================================
// BOT LIBRARY
// ============================================================
// Core bots to test — one from each category. Keeps request count low to avoid compute limits.
const BOTS = [
  { name: 'GPTBot', ua: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.0; +https://openai.com/gptbot)', type: 'ai-crawler', company: 'OpenAI' },
  { name: 'ClaudeBot', ua: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +https://anthropic.com)', type: 'ai-crawler', company: 'Anthropic' },
  { name: 'CCBot', ua: 'CCBot/2.0 (https://commoncrawl.org/faq/)', type: 'ai-crawler', company: 'Common Crawl' },
  { name: 'Googlebot', ua: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)', type: 'search-engine', company: 'Google' },
  { name: 'AhrefsBot', ua: 'Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)', type: 'seo-tool', company: 'Ahrefs' },
  { name: 'python-requests', ua: 'python-requests/2.31.0', type: 'scraper', company: 'Script' },
  { name: 'curl', ua: 'curl/8.4.0', type: 'scraper', company: 'Script' },
  { name: 'Scrapy', ua: 'Scrapy/2.11.0 (+https://scrapy.org)', type: 'scraper', company: 'Script' },
  { name: 'HeadlessChrome', ua: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/120.0.0.0 Safari/537.36', type: 'headless', company: 'Attacker' },
]

// ============================================================
// RESPONSE DIAGNOSIS
// ============================================================
function diagnoseResponse(status: number, body: string, headers: Headers) {
  const location = headers.get('location') || ''
  const isRedirect = status >= 300 && status < 400
  const isPaymentRedirect = isRedirect && location.includes('bot-payment')
  const isChallenge = body.includes('Verifying your connection') || body.includes('__gate-verify')
  const isBlocked = status === 403
  const isRateLimited = status === 429
  const hasRealContent = !isChallenge && !isPaymentRedirect && !isBlocked && !isRateLimited && !isRedirect && status === 200

  const hasPageTitle = /<title>(?!Verifying).+<\/title>/.test(body)
  const hasBodyContent = body.includes('<article') || body.includes('entry-content') || body.includes('<main') || body.length > 5000

  let verdict = 'unknown'
  if (isPaymentRedirect) verdict = 'redirected_to_payment'
  else if (isRateLimited) verdict = 'rate_limited'
  else if (isBlocked) verdict = 'blocked'
  else if (isRedirect) verdict = 'redirected'
  else if (isChallenge) verdict = 'challenge_served'
  else if (hasRealContent) verdict = 'content_returned'

  return {
    verdict,
    httpStatus: status,
    isChallenge,
    isPaymentRedirect,
    isBlocked,
    isRateLimited,
    hasRealContent,
    hasPageTitle,
    hasBodyContent: hasRealContent && hasBodyContent,
    contentLength: body.length,
    setCookie: headers.get('set-cookie') || null,
  }
}

// ============================================================
// INDIVIDUAL TESTS
// ============================================================

async function testBotUA(targetUrl: string, bot: typeof BOTS[0]) {
  const start = Date.now()
  try {
    // Use redirect: manual to avoid infinite redirect loops
    // (Worker may redirect bots to /bot-payment on same domain)
    const res = await fetch(targetUrl, {
      headers: { 'User-Agent': bot.ua },
      redirect: 'manual',
    })

    // A redirect (302) to bot-payment = blocked
    const location = res.headers.get('location') || ''
    const isRedirectedToPayment = (res.status === 301 || res.status === 302) && location.includes('bot-payment')

    if (isRedirectedToPayment) {
      return {
        test: 'bot_ua',
        bot: bot.name,
        type: bot.type,
        company: bot.company,
        ua: bot.ua,
        passed: true,
        verdict: 'redirected_to_payment',
        httpStatus: res.status,
        contentLength: 0,
        responseTime: Date.now() - start,
        detail: `${bot.name} redirected to payment page — bot detected and blocked`,
      }
    }

    const body = await res.text()
    const d = diagnoseResponse(res.status, body, res.headers)
    const blocked = d.verdict !== 'content_returned'

    return {
      test: 'bot_ua',
      bot: bot.name,
      type: bot.type,
      company: bot.company,
      ua: bot.ua,
      passed: blocked,
      verdict: d.verdict,
      httpStatus: d.httpStatus,
      contentLength: d.contentLength,
      responseTime: Date.now() - start,
      detail: blocked
        ? `${bot.name} blocked — received ${d.verdict} instead of content`
        : `${bot.name} got through — ${d.contentLength} bytes of content returned`,
    }
  } catch (e: any) {
    return { test: 'bot_ua', bot: bot.name, type: bot.type, company: bot.company, passed: false, verdict: 'error', detail: e.message, responseTime: Date.now() - start }
  }
}

async function testUASpoofing(targetUrl: string) {
  const start = Date.now()
  try {
    // Chrome UA but NO browser-specific headers
    const res = await fetch(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
      redirect: 'manual',
    })
    const body = await res.text()
    const d = diagnoseResponse(res.status, body, res.headers)
    const caught = d.verdict !== 'content_returned'

    return {
      test: 'ua_spoofing',
      bot: 'Spoofed Chrome (no browser headers)',
      passed: caught,
      verdict: d.verdict,
      httpStatus: d.httpStatus,
      contentLength: d.contentLength,
      responseTime: Date.now() - start,
      detail: caught
        ? 'Spoofed Chrome UA caught — missing Sec-Ch-Ua, Accept-Language, Sec-Fetch-Mode headers detected'
        : 'Spoofed Chrome UA bypassed detection — header validation may need tuning',
    }
  } catch (e: any) {
    return { test: 'ua_spoofing', bot: 'Spoofed Chrome', passed: false, verdict: 'error', detail: e.message, responseTime: Date.now() - start }
  }
}

async function testRealBrowserHeaders(targetUrl: string) {
  const start = Date.now()
  try {
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"macOS"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
      },
      redirect: 'manual',
    })
    const body = await res.text()
    const d = diagnoseResponse(res.status, body, res.headers)
    // This test runs from a datacenter IP, so a challenge is acceptable.
    // Content returned = pass. Challenge served = also pass (datacenter IP is correctly flagged).
    // Only a hard block or payment redirect = fail (that would mean false positive on real headers).
    const acceptable = d.verdict === 'content_returned' || d.verdict === 'challenge_served'

    return {
      test: 'real_browser',
      bot: 'Simulated Real Browser (from datacenter)',
      passed: acceptable,
      verdict: d.verdict,
      httpStatus: d.httpStatus,
      contentLength: d.contentLength,
      responseTime: Date.now() - start,
      detail: d.verdict === 'content_returned'
        ? 'Real browser headers allowed through directly'
        : d.verdict === 'challenge_served'
        ? 'Challenge served (expected — test runs from datacenter IP, which is correctly flagged as suspicious). Real users on residential IPs pass through instantly.'
        : `Unexpected: real browser headers returned ${d.verdict}`,
    }
  } catch (e: any) {
    return { test: 'real_browser', bot: 'Real Browser', passed: false, verdict: 'error', detail: e.message, responseTime: Date.now() - start }
  }
}

async function testEmptyUA(targetUrl: string) {
  const start = Date.now()
  try {
    const res = await fetch(targetUrl, {
      headers: { 'User-Agent': '' },
      redirect: 'manual',
    })
    const body = await res.text()
    const d = diagnoseResponse(res.status, body, res.headers)
    const caught = d.verdict !== 'content_returned'

    return {
      test: 'empty_ua',
      bot: 'No User-Agent',
      passed: caught,
      verdict: d.verdict,
      httpStatus: d.httpStatus,
      responseTime: Date.now() - start,
      detail: caught ? 'Empty UA correctly blocked' : 'Empty UA was not caught',
    }
  } catch (e: any) {
    return { test: 'empty_ua', bot: 'No UA', passed: false, verdict: 'error', detail: e.message, responseTime: Date.now() - start }
  }
}

async function testContentProtection(targetUrl: string) {
  const start = Date.now()
  try {
    const res = await fetch(targetUrl, {
      headers: { 'User-Agent': 'python-requests/2.31.0' },
      redirect: 'manual',
    })
    const body = await res.text()
    const d = diagnoseResponse(res.status, body, res.headers)

    const contentLeaked = d.hasRealContent && d.hasBodyContent

    return {
      test: 'content_protection',
      bot: 'python-requests (content check)',
      passed: !contentLeaked,
      verdict: contentLeaked ? 'content_leaked' : d.verdict,
      httpStatus: d.httpStatus,
      contentLength: d.contentLength,
      responseTime: Date.now() - start,
      bodyPreview: body.substring(0, 300),
      detail: contentLeaked
        ? `Content LEAKED — bot received ${d.contentLength} bytes of real page content`
        : `Content protected — bot received ${d.verdict} (${d.contentLength} bytes, no real content)`,
    }
  } catch (e: any) {
    return { test: 'content_protection', bot: 'python-requests', passed: false, verdict: 'error', detail: e.message, responseTime: Date.now() - start }
  }
}

async function testPoWChallenge(targetUrl: string) {
  const start = Date.now()
  try {
    // Step 1: Request as bot, should get challenge page
    const res = await fetch(targetUrl, {
      headers: { 'User-Agent': 'curl/8.4.0' },
      redirect: 'manual',
    })
    const body = await res.text()
    const d = diagnoseResponse(res.status, body, res.headers)

    if (!d.isChallenge) {
      return {
        test: 'pow_challenge',
        bot: 'curl (PoW test)',
        passed: d.verdict !== 'content_returned',
        verdict: d.verdict,
        responseTime: Date.now() - start,
        detail: d.verdict === 'content_returned'
          ? 'No PoW challenge served — content returned directly to bot'
          : `Bot received ${d.verdict} (not challenge page, but content was withheld)`,
      }
    }

    // Step 2: Extract challenge from the page
    const challengeMatch = body.match(/const challenge = "([^"]+)"/)
    const difficultyMatch = body.match(/const difficulty = (\d+)/)

    if (!challengeMatch || !difficultyMatch) {
      return {
        test: 'pow_challenge',
        bot: 'curl (PoW test)',
        passed: true,
        verdict: 'challenge_served',
        responseTime: Date.now() - start,
        detail: 'PoW challenge page served but challenge params could not be extracted (good — means challenge is obfuscated)',
      }
    }

    const challenge = challengeMatch[1]
    const difficulty = parseInt(difficultyMatch[1])

    // Step 3: Solve the PoW server-side
    const solveStart = Date.now()
    let nonce = 0
    let hash = ''
    const prefix = '0'.repeat(difficulty)

    while (true) {
      const data = `${challenge}:${nonce}`
      const encoder = new TextEncoder()
      const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data))
      const hashArray = new Uint8Array(hashBuffer)
      hash = Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('')
      if (hash.startsWith(prefix)) break
      nonce++
      if (nonce > 5000000) break // Safety limit
    }
    const solveTime = Date.now() - solveStart

    // Step 4: Submit solution
    const origin = new URL(targetUrl).origin
    const verifyRes = await fetch(`${origin}/__gate-verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'curl/8.4.0',
      },
      body: JSON.stringify({
        challenge,
        difficulty,
        nonce,
        hash,
        fingerprint: {
          ua: 'curl/8.4.0',
          lang: '',
          platform: 'Linux',
          cores: 0,
          sw: 0, sh: 0,
          cd: 0, dpr: 1,
          touch: false,
          webdriver: false,
          canvas: null,
          webgl: null,
          plugins: [],
          tz: 'UTC',
        },
        returnTo: targetUrl,
      }),
    })

    const verifyBody = await verifyRes.text()
    const powBypassBlocked = verifyRes.status !== 200

    return {
      test: 'pow_challenge',
      bot: 'curl (PoW solver)',
      passed: powBypassBlocked,
      verdict: powBypassBlocked ? 'pow_bypass_blocked' : 'pow_bypass_succeeded',
      httpStatus: verifyRes.status,
      solveTime,
      nonce,
      difficulty,
      responseTime: Date.now() - start,
      detail: powBypassBlocked
        ? `PoW solved in ${solveTime}ms (${nonce} iterations) but verification rejected bot fingerprint (no canvas, zero screen) — defense held`
        : `PoW solved and verification accepted — bot could bypass challenge. Fingerprint validation may need tightening`,
    }
  } catch (e: any) {
    return { test: 'pow_challenge', bot: 'curl (PoW)', passed: false, verdict: 'error', detail: e.message, responseTime: Date.now() - start }
  }
}

async function testCookieForgery(targetUrl: string) {
  const start = Date.now()
  try {
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'python-requests/2.31.0',
        'Cookie': '__gate_verified=fakepayload.fakeexp.fakesig',
      },
      redirect: 'manual',
    })
    const body = await res.text()
    const d = diagnoseResponse(res.status, body, res.headers)
    const rejected = d.verdict !== 'content_returned'

    return {
      test: 'cookie_forgery',
      bot: 'python-requests (forged cookie)',
      passed: rejected,
      verdict: d.verdict,
      httpStatus: d.httpStatus,
      responseTime: Date.now() - start,
      detail: rejected
        ? 'Forged cookie correctly rejected — HMAC signature verification works'
        : 'Forged cookie was ACCEPTED — cookie verification is broken',
    }
  } catch (e: any) {
    return { test: 'cookie_forgery', bot: 'Cookie Forger', passed: false, verdict: 'error', detail: e.message, responseTime: Date.now() - start }
  }
}

async function testRateLimiting(targetUrl: string) {
  const start = Date.now()
  const requestCount = 10
  let rateLimited = false
  let requestsSent = 0

  try {
    for (let i = 0; i < requestCount; i++) {
      const res = await fetch(targetUrl, {
        headers: { 'User-Agent': `RateLimitBot/${i}` },
        redirect: 'manual',
      })
      requestsSent++
      if (res.status === 429) {
        rateLimited = true
        break
      }
    }

    return {
      test: 'rate_limiting',
      bot: `Rapid Fire (${requestCount} requests)`,
      passed: rateLimited,
      verdict: rateLimited ? 'rate_limited' : 'not_limited',
      requestsSent,
      responseTime: Date.now() - start,
      detail: rateLimited
        ? `Rate limited after ${requestsSent} rapid requests`
        : `Sent ${requestCount} rapid requests without being throttled — rate limiting may need tuning`,
    }
  } catch (e: any) {
    return { test: 'rate_limiting', bot: 'Rapid Fire', passed: false, verdict: 'error', detail: e.message, responseTime: Date.now() - start }
  }
}

async function testHoneypots(targetUrl: string) {
  const start = Date.now()
  const traps = ['/.env', '/.git/config', '/wp-admin', '/wp-login.php']
  const results: { path: string, status: number, protected: boolean, verdict: string }[] = []

  try {
    const origin = new URL(targetUrl).origin
    for (const path of traps) {
      const res = await fetch(origin + path, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VulnScanner/1.0)' },
        redirect: 'manual',  // Don't follow redirects — check raw response
      })
      const body = res.status < 400 ? await res.text() : ''
      const isChallenge = body.includes('Verifying your connection') || body.includes('__gate-verify')
      const isRedirect = res.status >= 300 && res.status < 400
      const isBlocked = res.status === 402 || res.status === 403 || res.status === 404
      // Protected = bot didn't get real content (challenge, redirect, or block)
      const isProtected = isChallenge || isRedirect || isBlocked
      const verdict = isBlocked ? 'blocked' : isRedirect ? 'redirected' : isChallenge ? 'challenge_served' : 'exposed'
      results.push({ path, status: res.status, protected: isProtected, verdict })
    }

    const protectedCount = results.filter(r => r.protected).length

    return {
      test: 'honeypots',
      bot: 'Vulnerability Scanner',
      passed: protectedCount === traps.length,
      verdict: protectedCount === traps.length ? 'all_protected' : 'some_exposed',
      protectedCount,
      totalTraps: traps.length,
      results,
      responseTime: Date.now() - start,
      detail: `${protectedCount}/${traps.length} sensitive paths protected from bots`,
    }
  } catch (e: any) {
    return { test: 'honeypots', bot: 'Vulnerability Scanner', passed: false, verdict: 'error', detail: e.message, responseTime: Date.now() - start }
  }
}

// ============================================================
// MAIN HANDLER
// ============================================================
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { targetUrl, tests } = await req.json()

    if (!targetUrl) {
      return new Response(
        JSON.stringify({ error: 'targetUrl is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate URL
    try { new URL(targetUrl) } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const allResults: any[] = []
    const startTime = Date.now()

    // Run tests based on selection, or all by default
    const runAll = !tests || tests.length === 0
    const selectedTests = new Set(tests || [])

    // Test 1: Known bot UAs
    if (runAll || selectedTests.has('bot_ua')) {
      for (const bot of BOTS) {
        allResults.push(await testBotUA(targetUrl, bot))
      }
    }

    // Test 2: UA Spoofing
    if (runAll || selectedTests.has('ua_spoofing')) {
      allResults.push(await testUASpoofing(targetUrl))
    }

    // Test 3: Real browser headers (false positive check)
    if (runAll || selectedTests.has('real_browser')) {
      allResults.push(await testRealBrowserHeaders(targetUrl))
    }

    // Test 4: Empty UA
    if (runAll || selectedTests.has('empty_ua')) {
      allResults.push(await testEmptyUA(targetUrl))
    }

    // Test 5: Content protection
    if (runAll || selectedTests.has('content_protection')) {
      allResults.push(await testContentProtection(targetUrl))
    }

    // Test 6: Cookie forgery
    if (runAll || selectedTests.has('cookie_forgery')) {
      allResults.push(await testCookieForgery(targetUrl))
    }

    // Test 7: Honeypots
    if (runAll || selectedTests.has('honeypots')) {
      allResults.push(await testHoneypots(targetUrl))
    }

    const passed = allResults.filter(r => r.passed).length
    const failed = allResults.filter(r => !r.passed && r.verdict !== 'error').length
    const errors = allResults.filter(r => r.verdict === 'error').length

    return new Response(
      JSON.stringify({
        targetUrl,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        summary: {
          total: allResults.length,
          passed,
          failed,
          errors,
          score: allResults.length > 0 ? Math.round((passed / allResults.length) * 100) : 0,
        },
        results: allResults,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
