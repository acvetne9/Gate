/**
 * Gate Protection Worker v3.0
 * ===========================
 * Production reverse proxy for bot access control.
 *
 * Deploy in front of any site via DNS (CNAME to this worker).
 * Content is NEVER forwarded to the client until verification passes.
 *
 * Flow:
 *   1. Request arrives
 *   2. Check for valid signed challenge cookie → if valid, forward to origin
 *   3. Run bot detection (UA, CF bot score, TLS, ASN, headers)
 *   4. If human-like → serve JS challenge page (PoW + fingerprint)
 *   5. Challenge solved → set signed cookie, redirect back
 *   6. If bot detected → redirect to payment page
 *   7. If paid token present → verify signature + subscription → forward
 *
 * Env vars required:
 *   CHALLENGE_SECRET  - HMAC key for signing challenge cookies
 *   TOKEN_SECRET      - HMAC key for paid access tokens
 *   ORIGIN_HOST       - Origin server hostname
 *   ORIGIN_SECRET     - Secret header sent to origin for verification
 *   STRIPE_API_KEY    - Stripe secret key
 *   STRIPE_WEBHOOK_SECRET - Stripe webhook signing secret
 *   GATE_PAYMENT_URL       - Bot payment page URL (default: https://securitygate.app/bot-payment)
 *
 * KV Namespaces:
 *   RATE_LIMIT        - Rate limiting counters
 *   ATTEMPTS          - Token storage for paid bots
 *
 * Durable Objects:
 *   TOKEN_DO          - Atomic token consumption
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Static assets pass through without challenge (images, CSS, JS, fonts)
    if (isStaticAsset(url.pathname)) {
      return forwardToOrigin(request, env);
    }

    // Bot payment page must be accessible to bots (they're redirected here to pay)
    if (url.pathname.startsWith("/bot-payment")) {
      return forwardToOrigin(request, env);
    }

    try {
      // Stripe webhook endpoint
      if (url.pathname === "/__stripe-webhook" && request.method === "POST") {
        return handleStripeWebhook(request, env, ctx);
      }

      // Challenge solution endpoint
      if (url.pathname === "/__gate-verify" && request.method === "POST") {
        return handleChallengeResponse(request, env);
      }

      // Stats API endpoint — returns request counts from KV
      if (url.pathname === "/__gate-stats") {
        if (request.method === "OPTIONS") {
          return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS", "Access-Control-Allow-Headers": "*", "Access-Control-Max-Age": "86400" } });
        }
        return handleStatsRequest(env);
      }

      // Rate limiting (KV-backed, persists across isolates)
      const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "unknown";
      const rateLimited = await checkRateLimit(ip, env);
      if (rateLimited) {
        ctx.waitUntil(incrementStats(env, 'rate_limited'));
        return new Response("Too Many Requests", {
          status: 429,
          headers: { "Retry-After": "60", "Content-Type": "text/plain" }
        });
      }

      // Check for valid signed challenge cookie (humans who already passed)
      const cookieValid = await verifyChallengeCookie(request, env);
      if (cookieValid) {
        ctx.waitUntil(incrementStats(env, 'humans_allowed'));

        // Per-page content token: if request has __gate_content_token, serve raw content
        // Otherwise, serve page with content stripped and a loader script injected
        if (url.searchParams.has("__gate_content_token")) {
          return handleContentTokenRequest(request, url, env);
        }

        return forwardWithContentProtection(request, env, url);
      }

      // Check for paid bot token
      const paidToken = request.headers.get("x-paid-token") || getTokenFromCookie(request);
      if (paidToken) {
        const tokenResult = await handlePaidAccess(paidToken, request, env, ctx);
        if (tokenResult) return tokenResult;
      }

      // Run bot detection
      const detection = detectBot(request);

      // Definite bot → redirect to payment (no challenge, just block)
      if (detection.isBot && detection.confidence >= 80) {
        ctx.waitUntil(Promise.all([logRequest(ip, request, detection, "blocked", env), incrementStats(env, 'bots_blocked')]));
        return redirectToPayment(url, "bot_detected", detection);
      }

      // Everyone else must solve a PoW challenge to prove they're a real browser.
      // Difficulty scales with suspicion: higher score = harder challenge.
      const difficulty = detection.confidence >= 50 ? 6 : 4;
      const statCategory = detection.confidence >= 50 ? 'bots_challenged' : 'humans_challenged';
      ctx.waitUntil(incrementStats(env, statCategory));
      return serveChallengePage(request, env, { difficulty, returnTo: url.toString() });

    } catch (err) {
      console.error("Worker error:", err);
      // Fail open — forward to origin rather than blocking
      return forwardToOrigin(request, env);
    }
  }
};

/* ============================================================
   REQUEST STATS (KV-backed counters)
   Tracks total requests, bots blocked, humans allowed, etc.
============================================================ */
async function incrementStats(env, category) {
  if (!env.RATE_LIMIT) return;
  try {
    // Update running totals (single KV key, never expires)
    const totalsRaw = await env.RATE_LIMIT.get("stats:totals", { type: "json" });
    const totals = totalsRaw || {};
    totals[category] = (totals[category] || 0) + 1;
    totals._total = (totals._total || 0) + 1;
    await env.RATE_LIMIT.put("stats:totals", JSON.stringify(totals));
  } catch {}
}

async function handleStatsRequest(env) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "*",
    "Content-Type": "application/json",
    "Cache-Control": "public, max-age=10",
  };

  if (!env.RATE_LIMIT) {
    return new Response(JSON.stringify({ totalRequests: 0, totals: {} }), { headers });
  }

  try {
    // Single KV read — fast
    const totals = await env.RATE_LIMIT.get("stats:totals", { type: "json" }) || {};
    const totalRequests = totals._total || 0;

    return new Response(JSON.stringify({ totalRequests, totals }), { headers });
  } catch (e) {
    return new Response(JSON.stringify({ totalRequests: 0, totals: {}, error: e.message }), { status: 500, headers });
  }
}

/* ============================================================
   STATIC ASSET DETECTION
   Let images/CSS/JS/fonts pass without challenge
============================================================ */
function isStaticAsset(pathname) {
  const staticExts = /\.(css|js|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|eot|otf|webp|avif|mp4|webm|pdf|map|txt|xml|json)$/i;
  return staticExts.test(pathname);
}

/* ============================================================
   BOT DETECTION
   Multi-signal scoring: UA, CF bot score, TLS, ASN, headers
============================================================ */
function detectBot(request) {
  const ua = (request.headers.get("user-agent") || "").toLowerCase();
  const cf = request.cf || {};
  const headers = request.headers;
  let score = 0;
  const signals = [];

  // 0. Missing or empty User-Agent — no real browser omits this
  if (!ua || ua.length === 0) {
    score += 60;
    signals.push("empty_user_agent");
  }

  // 1. User-Agent patterns (known bots)
  const botPatterns = [
    /gptbot|chatgpt/i, /claudebot|claude-web|anthropic/i,
    /googlebot|google-extended|googleother/i, /bingbot/i,
    /ccbot|cohere/i, /perplexitybot/i, /bytespider/i,
    /amazonbot/i, /facebookbot|meta-external/i,
    /scrapy|beautifulsoup/i, /semrushbot|ahrefsbot/i,
    /curl|wget|python-requests|python-urllib|httpx|aiohttp/i,
    /go-http-client|java\/|libwww|apache-httpclient/i,
    /node-fetch|axios|got\/|superagent/i,
    /headlesschrome|phantomjs|puppeteer|playwright|selenium/i,
    /bot|crawler|spider|scraper|fetcher/i,
  ];

  for (const pattern of botPatterns) {
    if (pattern.test(ua)) {
      score += 50;
      signals.push("ua_bot_pattern");
      break;
    }
  }

  // 2. Cloudflare Bot Management score (if available)
  if (cf.botManagement && typeof cf.botManagement.score === "number") {
    const cfBotScore = 100 - cf.botManagement.score;
    score += cfBotScore * 0.5;
    if (cfBotScore > 50) signals.push("cf_bot_score_high");
  }

  // 3. TLS fingerprint missing
  if (!cf.tlsClientAuth && !cf.tlsVersion) {
    score += 15;
    signals.push("no_tls_info");
  }

  // 4. Missing standard browser headers
  if (!headers.get("accept-language")) {
    score += 20;
    signals.push("no_accept_language");
  }
  if (!headers.get("accept")) {
    score += 15;
    signals.push("no_accept");
  }
  const acceptHeader = headers.get("accept") || "";
  if (acceptHeader && !acceptHeader.includes("text/html") && !acceptHeader.includes("*/*")) {
    score += 10;
    signals.push("non_browser_accept");
  }

  // 5. Missing or suspicious sec-ch-ua (Client Hints)
  if (!headers.get("sec-ch-ua") && ua.includes("chrome/")) {
    score += 15;
    signals.push("missing_client_hints");
  }

  // 6. Known datacenter ASNs
  const datacenterASNs = [
    14061, 16276, 24940, 63949, 20473, 47583, // DigitalOcean, OVH, Hetzner, Linode, Vultr, Hostinger
    16509, 14618, // AWS
    15169, 396982, // Google Cloud
    8075, // Microsoft Azure
  ];
  if (cf.asn && datacenterASNs.includes(cf.asn)) {
    score += 25;
    signals.push("datacenter_asn");
  }

  // 7. No referrer on non-homepage requests
  const referer = headers.get("referer");
  if (!referer && !request.url.endsWith("/")) {
    score += 5;
    signals.push("no_referer_deep_page");
  }

  // 8. Connection header patterns (HTTP clients often differ)
  if (!headers.get("sec-fetch-mode") && ua.includes("mozilla")) {
    score += 10;
    signals.push("missing_sec_fetch");
  }

  const confidence = Math.min(score, 100);
  return {
    isBot: confidence >= 50,
    confidence,
    signals,
  };
}

/* ============================================================
   CHALLENGE COOKIE - SIGNED HMAC (replaces trivial cf_clearance)
============================================================ */
/**
 * Verify challenge cookie AND check page rate limit.
 * Returns false if cookie is invalid OR the visitor has accessed too many pages.
 * A human reads ~5-10 pages per session. A scraper reads thousands.
 */
async function verifyChallengeCookie(request, env) {
  const cookies = parseCookies(request.headers.get("cookie") || "");
  const token = cookies["__gate_verified"];
  if (!token) return false;

  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const [payloadB64, expB64, sig] = parts;

    // Verify HMAC signature
    const expectedSig = await hmacSHA256(`${payloadB64}.${expB64}`, env.CHALLENGE_SECRET);
    if (!timingSafeEqual(sig, expectedSig)) return false;

    // Check expiration (10 minute TTL)
    const exp = parseInt(atob(expB64), 10);
    if (Date.now() > exp) return false;

    const payload = JSON.parse(atob(payloadB64));

    // Verify IP binding
    const ip = request.headers.get("cf-connecting-ip") || "";
    const currentIpHash = await sha256Short(ip);
    if (payload.ip !== currentIpHash) return false;

    // Verify UA binding
    const currentUaHash = await sha256Short(request.headers.get("user-agent") || "");
    if (payload.ua !== currentUaHash) return false;

    // Page rate limit: max 30 unique pages per 10-minute window
    // A human browsing normally hits 5-10 pages. A scraper hits hundreds.
    if (env.RATE_LIMIT) {
      const pageKey = `pages:${currentIpHash}`;
      try {
        const stored = await env.RATE_LIMIT.get(pageKey, { type: "json" });
        const pageCount = (stored || 0) + 1;

        if (pageCount > 30) {
          // Too many pages — force re-verification
          return false;
        }

        await env.RATE_LIMIT.put(pageKey, JSON.stringify(pageCount), { expirationTtl: 600 });
      } catch {}
    }

    return true;
  } catch {
    return false;
  }
}

async function createChallengeCookie(request, env) {
  const ip = request.headers.get("cf-connecting-ip") || "";
  const ipHash = await sha256Short(ip);
  const uaHash = await sha256Short(request.headers.get("user-agent") || "");
  const ttl = 86400 * 1000; // 24 hours — once human, always human

  const payload = { ip: ipHash, ua: uaHash };
  const payloadB64 = btoa(JSON.stringify(payload));
  const expB64 = btoa(String(Date.now() + ttl));
  const sig = await hmacSHA256(`${payloadB64}.${expB64}`, env.CHALLENGE_SECRET);

  const cookieValue = `${payloadB64}.${expB64}.${sig}`;
  return `__gate_verified=${cookieValue}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400`;
}

/* ============================================================
   CHALLENGE PAGE
   Serves an HTML page with inline JS that:
   1. Solves a Proof-of-Work (SHA-256 with leading zeros)
   2. Collects browser fingerprint
   3. Posts solution to /__gate-verify
   4. On success, receives signed cookie and redirects back
============================================================ */
function serveChallengePage(request, env, { difficulty = 4, returnTo = "/" }) {
  const challenge = crypto.randomUUID();
  const turnstileSiteKey = env.TURNSTILE_SITE_KEY || "";
  const hasTurnstile = turnstileSiteKey.length > 0;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verifying your connection</title>
  ${hasTurnstile ? '<script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" async defer></script>' : ''}
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#f8fafc;display:flex;align-items:center;justify-content:center;min-height:100vh}
    .container{text-align:center;padding:48px}
    .spinner{width:40px;height:40px;border:3px solid #e2e8f0;border-top-color:#3b82f6;border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 24px}
    @keyframes spin{to{transform:rotate(360deg)}}
    h1{font-size:20px;color:#1e293b;margin-bottom:8px}
    p{font-size:14px;color:#64748b}
    .error{color:#dc2626;display:none;margin-top:16px}
  </style>
</head>
<body>
  <div class="container">
    <div class="spinner" id="spinner"></div>
    <h1>Verifying your connection</h1>
    <p id="status">This takes a moment...</p>
    <p class="error" id="error"></p>
    <div id="turnstile-container" style="display:flex;justify-content:center;margin-top:16px"></div>
  </div>
  <script>
    (async function() {
      var challenge = "${challenge}";
      var difficulty = ${difficulty};
      var returnTo = decodeURIComponent("${encodeURIComponent(returnTo)}");
      var turnstileSiteKey = "${turnstileSiteKey}";
      var startTime = Date.now();

      // ========== BEHAVIORAL TRACKING ==========
      // Bots don't move mice, scroll, or interact. Humans do — even on a loading page.
      var behavior = { mouse: 0, scroll: 0, touch: 0, keys: 0, clicks: 0, moveX: [], moveY: [], timing: [] };
      var lastMove = 0;

      document.addEventListener("mousemove", function(e) {
        behavior.mouse++;
        var now = Date.now();
        if (now - lastMove > 50) {
          behavior.moveX.push(e.clientX);
          behavior.moveY.push(e.clientY);
          behavior.timing.push(now - startTime);
          lastMove = now;
        }
      });
      document.addEventListener("scroll", function() { behavior.scroll++; });
      document.addEventListener("touchstart", function() { behavior.touch++; });
      document.addEventListener("keydown", function() { behavior.keys++; });
      document.addEventListener("click", function() { behavior.clicks++; });

      function getBehaviorSummary() {
        // Compute movement variance (bots have zero or perfectly linear movement)
        var xVar = variance(behavior.moveX);
        var yVar = variance(behavior.moveY);
        var timingVar = variance(behavior.timing.slice(-10));
        return {
          mouse: behavior.mouse,
          scroll: behavior.scroll,
          touch: behavior.touch,
          keys: behavior.keys,
          clicks: behavior.clicks,
          moveVarianceX: Math.round(xVar),
          moveVarianceY: Math.round(yVar),
          timingVariance: Math.round(timingVar),
          timeOnPage: Date.now() - startTime,
          samples: behavior.moveX.length,
        };
      }

      function variance(arr) {
        if (arr.length < 2) return 0;
        var mean = arr.reduce(function(a,b){return a+b},0) / arr.length;
        return arr.reduce(function(s,v){return s + (v-mean)*(v-mean)},0) / arr.length;
      }

      // ========== FINGERPRINT COLLECTION ==========
      function getFingerprint() {
        var canvas = document.createElement("canvas");
        var ctx = canvas.getContext("2d");
        ctx.textBaseline = "top";
        ctx.font = "14px Arial";
        ctx.fillText("gate", 2, 2);
        var canvasFp = canvas.toDataURL().slice(0, 80);

        var webgl = null;
        try {
          var gl = document.createElement("canvas").getContext("webgl");
          if (gl) webgl = { r: gl.getParameter(gl.RENDERER), v: gl.getParameter(gl.VENDOR) };
        } catch(e) {}

        return {
          ua: navigator.userAgent,
          lang: navigator.language,
          langs: navigator.languages ? Array.from(navigator.languages) : [],
          platform: navigator.platform,
          cores: navigator.hardwareConcurrency || 0,
          mem: navigator.deviceMemory || 0,
          tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
          sw: screen.width, sh: screen.height,
          cd: screen.colorDepth, dpr: window.devicePixelRatio || 1,
          touch: "ontouchstart" in window,
          webdriver: !!navigator.webdriver,
          canvas: canvasFp, webgl: webgl,
          plugins: Array.from(navigator.plugins || []).slice(0,5).map(function(p){return p.name}),
        };
      }

      // ========== POW SOLVER ==========
      async function solvePoW(ch, diff) {
        var prefix = "0".repeat(diff);
        var nonce = 0;
        while (true) {
          var data = ch + ":" + nonce;
          var buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
          var hex = Array.from(new Uint8Array(buf)).map(function(b){return b.toString(16).padStart(2,"0")}).join("");
          if (hex.startsWith(prefix)) return { nonce: nonce, hash: hex };
          nonce++;
          if (nonce % 50000 === 0) await new Promise(function(r){setTimeout(r,0)});
        }
      }

      // ========== TURNSTILE ==========
      function getTurnstileToken() {
        if (!turnstileSiteKey || typeof turnstile === "undefined") return Promise.resolve(null);
        return new Promise(function(resolve) {
          turnstile.render("#turnstile-container", {
            sitekey: turnstileSiteKey,
            callback: function(token) { resolve(token); },
            "error-callback": function() { resolve(null); },
            appearance: "interaction-only",
          });
        });
      }

      // ========== MAIN FLOW ==========
      try {
        var fingerprint = getFingerprint();

        if (fingerprint.webdriver) {
          document.getElementById("error").textContent = "Automated browser detected.";
          document.getElementById("error").style.display = "block";
          document.getElementById("spinner").style.display = "none";
          return;
        }

        document.getElementById("status").textContent = "Solving challenge...";
        var pow = await solvePoW(challenge, difficulty);

        // Wait for Turnstile (if enabled)
        var turnstileToken = null;
        if (turnstileSiteKey) {
          document.getElementById("status").textContent = "Final verification...";
          turnstileToken = await getTurnstileToken();
        }

        document.getElementById("status").textContent = "Verifying...";
        var res = await fetch("/__gate-verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            challenge: challenge,
            difficulty: difficulty,
            nonce: pow.nonce,
            hash: pow.hash,
            fingerprint: fingerprint,
            behavior: getBehaviorSummary(),
            turnstileToken: turnstileToken,
            returnTo: returnTo,
          }),
        });

        if (res.ok) {
          window.location.href = returnTo;
        } else {
          var err = await res.text();
          document.getElementById("error").textContent = err || "Verification failed.";
          document.getElementById("error").style.display = "block";
          document.getElementById("spinner").style.display = "none";
        }
      } catch(e) {
        document.getElementById("error").textContent = "Connection error. Please refresh.";
        document.getElementById("error").style.display = "block";
        document.getElementById("spinner").style.display = "none";
      }
    })();
  </script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html;charset=UTF-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    }
  });
}

/* ============================================================
   CHALLENGE VERIFICATION ENDPOINT
   Validates PoW solution + fingerprint, issues signed cookie
============================================================ */
async function handleChallengeResponse(request, env) {
  try {
    const body = await request.json();
    const { challenge, difficulty, nonce, hash, fingerprint, behavior, turnstileToken, returnTo } = body;

    if (!challenge || !hash || nonce === undefined || !fingerprint) {
      return new Response("Invalid request", { status: 400 });
    }

    // All verification failures redirect to payment page
    const payUrl = returnTo || request.headers.get("referer") || "/";
    const paymentRedirectUrl = `${new URL(request.url).origin}/bot-payment?return=${encodeURIComponent(payUrl)}&reason=verification_failed`;

    // Verify PoW
    const data = `${challenge}:${nonce}`;
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
    const computed = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
    const prefix = "0".repeat(difficulty || 4);

    if (!computed.startsWith(prefix) || computed !== hash) {
      return Response.redirect(paymentRedirectUrl, 302);
    }

    // ---- FINGERPRINT VALIDATION ----
    // Each check catches a different class of automation tool.
    // Stealth plugins can spoof some of these, but spoofing ALL consistently is hard.

    // 1. Webdriver flag (Selenium, basic Puppeteer)
    if (fingerprint.webdriver) {
      return Response.redirect(paymentRedirectUrl, 302);
    }

    // 2. Headless WebGL renderers (SwiftShader = Chrome headless default)
    if (fingerprint.webgl) {
      const renderer = (fingerprint.webgl.r || "").toLowerCase();
      if (/swiftshader|llvmpipe|software|mesa offscreen|virtualbox|vmware/i.test(renderer)) {
        return Response.redirect(paymentRedirectUrl, 302);
      }
    }

    // 3. Missing canvas fingerprint (headless often fails to render)
    if (!fingerprint.canvas || fingerprint.canvas.length < 20) {
      return Response.redirect(paymentRedirectUrl, 302);
    }

    // 4. Zero screen dimensions (headless default)
    if (fingerprint.sw === 0 || fingerprint.sh === 0) {
      return Response.redirect(paymentRedirectUrl, 302);
    }

    // 5. Missing WebGL entirely (real browsers always have it)
    if (!fingerprint.webgl) {
      return Response.redirect(paymentRedirectUrl, 302);
    }

    // 6. No language set (real browsers always report a language)
    if (!fingerprint.lang) {
      return Response.redirect(paymentRedirectUrl, 302);
    }

    // 7. Zero hardware concurrency (real devices have at least 1 core)
    if (fingerprint.cores === 0) {
      return Response.redirect(paymentRedirectUrl, 302);
    }

    // 8. No plugins AND no touch AND headless screen size (800x600, 1024x768)
    const suspiciousScreen = (fingerprint.sw === 800 && fingerprint.sh === 600) ||
                              (fingerprint.sw === 1024 && fingerprint.sh === 768);
    const noPlugins = !fingerprint.plugins || fingerprint.plugins.length === 0;
    if (suspiciousScreen && noPlugins) {
      return Response.redirect(paymentRedirectUrl, 302);
    }

    // 9. Challenge replay protection — each challenge UUID can only be used once
    if (env.RATE_LIMIT) {
      const challengeKey = `challenge:${challenge}`;
      const used = await env.RATE_LIMIT.get(challengeKey);
      if (used) {
        return Response.redirect(paymentRedirectUrl, 302);
      }
      await env.RATE_LIMIT.put(challengeKey, "1", { expirationTtl: 600 });
    }

    // ---- BEHAVIORAL VALIDATION ----
    // Bots solve PoW and submit with zero interaction.
    // Real humans at least wait while watching the spinner.
    // Failures redirect to payment page — if you fail the challenge, you pay.
    if (behavior) {
      // Check mouse movement variance — bots have perfectly linear or zero movement
      if (behavior.mouse > 5 && behavior.moveVarianceX === 0 && behavior.moveVarianceY === 0) {
        return Response.redirect(paymentRedirectUrl, 302);
      }
    }
    // Missing behavioral data is OK — mobile users and fast connections may not generate much

    // ---- TURNSTILE VALIDATION ----
    // If Turnstile is configured, verify the token with Cloudflare
    if (env.TURNSTILE_SECRET_KEY) {
      if (!turnstileToken) {
        return Response.redirect(paymentRedirectUrl, 302);
      }

      const turnstileRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `secret=${encodeURIComponent(env.TURNSTILE_SECRET_KEY)}&response=${encodeURIComponent(turnstileToken)}&remoteip=${encodeURIComponent(request.headers.get("cf-connecting-ip") || "")}`,
      });

      const turnstileResult = await turnstileRes.json();
      if (!turnstileResult.success) {
        return Response.redirect(paymentRedirectUrl, 302);
      }
    }

    // Issue signed cookie
    const cookie = await createChallengeCookie(request, env);

    return new Response("OK", {
      status: 200,
      headers: {
        "Set-Cookie": cookie,
        "Content-Type": "text/plain",
      }
    });
  } catch (err) {
    console.error("Challenge verification error:", err);
    return new Response("Verification error", { status: 500 });
  }
}

/* ============================================================
   PAID ACCESS VERIFICATION
   For bots that have purchased access via Stripe
============================================================ */
async function handlePaidAccess(token, request, env, ctx) {
  const verified = await verifyTokenSignature(token, env.TOKEN_SECRET);
  if (!verified.ok) {
    return redirectToPayment(new URL(request.url), "bad_signature", {});
  }

  const payload = verified.payload;

  // Check expiration
  if (Date.now() > payload.exp) {
    return redirectToPayment(new URL(request.url), "token_expired", {});
  }

  // Verify subscription is active
  const subscriptionActive = await verifyStripeSubscription(payload.customerId, env);
  if (!subscriptionActive) {
    return redirectToPayment(new URL(request.url), "inactive_subscription", {});
  }

  // If using Durable Objects for atomic token consumption
  if (payload.do_id && env.TOKEN_DO) {
    const binding = await extractBinding(request);
    const id = env.TOKEN_DO.idFromString(payload.do_id);
    const stub = env.TOKEN_DO.get(id);

    const consumeRes = await stub.fetch("https://consume", {
      method: "POST",
      body: JSON.stringify({
        binding,
        path: new URL(request.url).pathname,
        method: request.method,
        now: Date.now(),
      }),
    });

    const consumeResult = await consumeRes.json();
    if (!consumeResult.ok) {
      return redirectToPayment(new URL(request.url), consumeResult.reason, {});
    }
  }

  // Track usage asynchronously
  ctx.waitUntil(trackUsage(payload.customerId, env));

  // Forward to origin
  return forwardToOrigin(request, env);
}

/* ============================================================
   RATE LIMITING (KV-backed, persists across worker isolates)
============================================================ */
async function checkRateLimit(ip, env) {
  if (!env.RATE_LIMIT) return false; // Skip if KV not configured

  const key = `rl:${ip}`;
  const now = Math.floor(Date.now() / 1000);
  const windowSize = 60; // 1 minute window
  const maxRequests = 60; // 60 requests per minute

  try {
    const stored = await env.RATE_LIMIT.get(key, { type: "json" });
    if (!stored || now - stored.ts > windowSize) {
      await env.RATE_LIMIT.put(key, JSON.stringify({ count: 1, ts: now }), { expirationTtl: windowSize * 2 });
      return false;
    }

    if (stored.count >= maxRequests) return true;

    await env.RATE_LIMIT.put(key, JSON.stringify({ count: stored.count + 1, ts: stored.ts }), { expirationTtl: windowSize * 2 });
    return false;
  } catch {
    return false; // Fail open on KV errors
  }
}

/* ============================================================
   REQUEST LOGGING (async, non-blocking)
============================================================ */
async function logRequest(ip, request, detection, status, env) {
  if (!env.RATE_LIMIT) return; // Use same KV for logging
  const key = `log:${ip}:${Date.now()}`;
  const entry = {
    ip,
    ua: request.headers.get("user-agent") || "",
    url: request.url,
    confidence: detection.confidence,
    signals: detection.signals,
    status,
    ts: Date.now(),
  };
  try {
    await env.RATE_LIMIT.put(key, JSON.stringify(entry), { expirationTtl: 86400 });
  } catch {}
}

/* ============================================================
   TOKEN VERIFICATION
============================================================ */
async function verifyTokenSignature(token, secret) {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return { ok: false };
    const [payloadB64, sig] = parts;

    const expectedSig = await hmacSHA256(payloadB64, secret);
    if (!timingSafeEqual(sig, expectedSig)) return { ok: false };

    const payloadJson = atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(payloadJson);
    return { ok: true, payload };
  } catch {
    return { ok: false };
  }
}

/* ============================================================
   REQUEST BINDING (for Durable Object token verification)
============================================================ */
async function extractBinding(request) {
  const ip = request.headers.get("cf-connecting-ip") || "";
  const ua = request.headers.get("user-agent") || "";
  return {
    ipPrefix: ipTo24(ip),
    uaHash: await sha256Short(ua),
    tlsFp: (request.cf || {}).tlsClientAuth || null,
  };
}

function ipTo24(ip) {
  if (!ip || !ip.includes(".")) return null;
  return ip.split(".").slice(0, 3).join(".") + ".0/24";
}

/* ============================================================
   STRIPE SUBSCRIPTION VERIFICATION
============================================================ */
const ALLOWED_PRODUCTS = [
  "prod_TiQr8gEqB8Q6Km",
  "prod_TiQsIG6aaOSikC"
];

async function verifyStripeSubscription(customerId, env) {
  try {
    const res = await fetch(`https://api.stripe.com/v1/subscriptions?customer=${customerId}&status=all`, {
      headers: { "Authorization": `Bearer ${env.STRIPE_API_KEY}` },
    });
    const data = await res.json();
    if (!data.data || data.data.length === 0) return false;

    return data.data.some(sub =>
      ["active", "trialing"].includes(sub.status) &&
      sub.items.data.some(item => ALLOWED_PRODUCTS.includes(item.price.product))
    );
  } catch {
    return false;
  }
}

/* ============================================================
   USAGE TRACKING
============================================================ */
async function trackUsage(customerId, env) {
  try {
    const res = await fetch(`https://api.stripe.com/v1/subscriptions?customer=${customerId}&status=all`, {
      headers: { "Authorization": `Bearer ${env.STRIPE_API_KEY}` },
    });
    const data = await res.json();
    if (!data.data) return;

    for (const sub of data.data) {
      if (!["active", "trialing"].includes(sub.status)) continue;
      for (const item of sub.items.data) {
        if (!ALLOWED_PRODUCTS.includes(item.price.product)) continue;
        await fetch(`https://api.stripe.com/v1/subscription_items/${item.id}/usage_records`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.STRIPE_API_KEY}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: `quantity=1&timestamp=${Math.floor(Date.now() / 1000)}&action=increment`,
        });
      }
    }
  } catch {}
}

/* ============================================================
   STRIPE WEBHOOK HANDLER
============================================================ */
async function handleStripeWebhook(request, env, ctx) {
  const sigHeader = request.headers.get("stripe-signature");
  const body = await request.text();

  if (!(await verifyStripeSignature(body, sigHeader, env.STRIPE_WEBHOOK_SECRET))) {
    return new Response("Invalid signature", { status: 400 });
  }

  const event = JSON.parse(body);

  if (!["checkout.session.completed", "customer.subscription.updated"].includes(event.type)) {
    return new Response("ignored");
  }

  const session = event.data.object;
  const meta = session.metadata || {};

  // Token expiration: 5 min
  const exp = Date.now() + 5 * 60 * 1000;

  // Durable Object token creation
  if (env.TOKEN_DO && meta.binding) {
    const id = env.TOKEN_DO.newUniqueId();
    const stub = env.TOKEN_DO.get(id);
    await stub.fetch("https://init", {
      method: "POST",
      body: JSON.stringify({
        exp,
        binding: JSON.parse(meta.binding),
        path: meta.path || "/",
        method: meta.method || "GET",
        sessionId: session.id,
        customerId: session.customer,
      }),
    });

    const payload = { do_id: id.toString(), exp, customerId: session.customer };
    const payloadB64 = btoa(JSON.stringify(payload)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const sig = await hmacSHA256(payloadB64, env.TOKEN_SECRET);

    if (env.ATTEMPTS) {
      await env.ATTEMPTS.put(session.id, `${payloadB64}.${sig}`, { expirationTtl: 300 });
    }
  }

  return new Response("ok");
}

async function verifyStripeSignature(payload, sigHeader, secret) {
  if (!sigHeader) return false;
  try {
    const parts = Object.fromEntries(sigHeader.split(",").map(p => { const [k, ...v] = p.split("="); return [k, v.join("=")]; }));
    const timestamp = parts.t;
    const sig = parts.v1;
    if (Math.abs(Date.now() / 1000 - parseInt(timestamp)) > 300) return false;
    const expected = await hmacSHA256(`${timestamp}.${payload}`, secret);
    return timingSafeEqual(sig, expected);
  } catch {
    return false;
  }
}

/* ============================================================
   ORIGIN FORWARDING
============================================================ */
async function forwardToOrigin(request, env) {
  const url = new URL(request.url);
  if (env.ORIGIN_HOST) url.hostname = env.ORIGIN_HOST;

  const headers = new Headers(request.headers);
  headers.delete("x-paid-token");
  if (env.ORIGIN_SECRET) {
    headers.set("x-origin-auth", env.ORIGIN_SECRET);
  }

  return fetch(new Request(url, {
    method: request.method,
    headers,
    body: request.body,
  }));
}

/* ============================================================
   PER-PAGE CONTENT PROTECTION
   Even after challenge verification, content is not in the initial HTML.
   The Worker fetches the origin page, strips the <main>/<article> content,
   replaces it with a loader that fetches content via a signed token.
   This means even if a cookie is stolen, view-source shows no content.
============================================================ */
async function forwardWithContentProtection(request, env, url) {
  const originResponse = await forwardToOrigin(request, env);

  // Only protect HTML pages (not API calls, JSON, etc.)
  const contentType = originResponse.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) {
    return originResponse;
  }

  const html = await originResponse.text();

  // Generate a signed per-page content token
  const pagePath = url.pathname;
  const ip = request.headers.get("cf-connecting-ip") || "";
  const tokenData = { p: pagePath, ip: await sha256Short(ip), exp: Date.now() + 60000 }; // 60 second TTL
  const tokenB64 = btoa(JSON.stringify(tokenData));
  const tokenSig = await hmacSHA256(tokenB64, env.CHALLENGE_SECRET);
  const contentToken = `${tokenB64}.${tokenSig}`;

  // Inject a content loader script before </body>
  // This script will fetch the actual content using the token
  const loaderScript = `
<script>
(function(){
  var token = "${contentToken}";
  var containers = document.querySelectorAll("main, article, [role='main'], .content, .entry-content, .post-content");
  if (containers.length === 0) return; // No content container found — SPA or non-article page
  containers.forEach(function(el) {
    var placeholder = document.createElement("div");
    placeholder.innerHTML = '<div style="padding:20px;text-align:center;color:#94a3b8">Loading content...</div>';
    el.parentNode.replaceChild(placeholder, el);
    fetch(window.location.pathname + "?__gate_content_token=" + encodeURIComponent(token))
      .then(function(r) { return r.text(); })
      .then(function(html) {
        var temp = document.createElement("div");
        temp.innerHTML = html;
        var newContent = temp.querySelector("main, article, [role='main'], .content, .entry-content, .post-content");
        if (newContent) {
          placeholder.parentNode.replaceChild(newContent, placeholder);
        } else {
          placeholder.innerHTML = html;
        }
      })
      .catch(function() { placeholder.innerHTML = '<div style="padding:20px;color:#ef4444">Failed to load content.</div>'; });
  });
})();
</script>`;

  // Strip main content from the HTML and inject the loader
  let protectedHtml = html;

  // Try to strip content from common wrappers
  const contentPatterns = [
    /(<main[^>]*>)([\s\S]*?)(<\/main>)/i,
    /(<article[^>]*>)([\s\S]*?)(<\/article>)/i,
    /(<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>)([\s\S]*?)(<\/div>)/i,
    /(<div[^>]*class="[^"]*post-content[^"]*"[^>]*>)([\s\S]*?)(<\/div>)/i,
  ];

  let contentStripped = false;
  for (const pattern of contentPatterns) {
    if (pattern.test(protectedHtml)) {
      protectedHtml = protectedHtml.replace(pattern, '$1<div style="padding:20px;text-align:center;color:#94a3b8">Loading...</div>$3');
      contentStripped = true;
      break;
    }
  }

  // Inject the loader script
  protectedHtml = protectedHtml.replace("</body>", loaderScript + "</body>");

  return new Response(protectedHtml, {
    status: originResponse.status,
    headers: originResponse.headers,
  });
}

async function handleContentTokenRequest(request, url, env) {
  const token = url.searchParams.get("__gate_content_token");
  if (!token) {
    return new Response("Missing token", { status: 403 });
  }

  // Verify token signature
  const parts = token.split(".");
  if (parts.length !== 2) {
    return new Response("Invalid token", { status: 403 });
  }

  const [tokenB64, tokenSig] = parts;
  const expectedSig = await hmacSHA256(tokenB64, env.CHALLENGE_SECRET);
  if (!timingSafeEqual(tokenSig, expectedSig)) {
    return new Response("Invalid token signature", { status: 403 });
  }

  // Decode and validate
  const tokenData = JSON.parse(atob(tokenB64));

  // Check expiration (60 seconds)
  if (Date.now() > tokenData.exp) {
    return new Response("Token expired", { status: 403 });
  }

  // Check IP binding
  const ip = request.headers.get("cf-connecting-ip") || "";
  const ipHash = await sha256Short(ip);
  if (tokenData.ip !== ipHash) {
    return new Response("Token IP mismatch", { status: 403 });
  }

  // Check path binding
  if (tokenData.p !== url.pathname) {
    return new Response("Token path mismatch", { status: 403 });
  }

  // Token valid — fetch and return the real content from origin
  // Remove the token param so origin doesn't see it
  url.searchParams.delete("__gate_content_token");
  return forwardToOrigin(request, env);
}

/* ============================================================
   PAYMENT REDIRECT
============================================================ */
function redirectToPayment(url, reason, detection) {
  const gateBase = "https://securitygate.app/bot-payment";
  const pay = new URL(gateBase);
  pay.searchParams.set("return_to", url.toString());
  pay.searchParams.set("reason", reason);
  if (detection && detection.confidence) {
    pay.searchParams.set("confidence", String(detection.confidence));
  }
  return Response.redirect(pay.toString(), 302);
}

/* ============================================================
   CRYPTO HELPERS
============================================================ */
async function hmacSHA256(data, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function sha256Short(input) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return btoa(String.fromCharCode(...new Uint8Array(buf).slice(0, 12)));
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let res = 0;
  for (let i = 0; i < a.length; i++) res |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return res === 0;
}

/* ============================================================
   COOKIE HELPERS
============================================================ */
function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(";").forEach(part => {
    const [key, ...val] = part.trim().split("=");
    if (key) cookies[key.trim()] = val.join("=").trim();
  });
  return cookies;
}

function getTokenFromCookie(request) {
  const cookies = parseCookies(request.headers.get("cookie") || "");
  return cookies["__gate_paid_token"] || null;
}

/* ============================================================
   DURABLE OBJECT FOR TOKEN CONSUMPTION
============================================================ */
export class TokenDO {
  constructor(state) {
    this.state = state;
  }

  async fetch(req) {
    const url = new URL(req.url);
    const jsonReq = await req.json().catch(() => ({}));

    if (url.pathname === "/init") {
      const { exp, binding, path, method, sessionId, customerId } = jsonReq;
      return this.state.storage.transaction(async (tx) => {
        if (await tx.get("issued")) return jsonResponse({ ok: true });
        await tx.put("issued", true);
        await tx.put("exp", exp);
        await tx.put("binding", binding);
        await tx.put("path", path);
        await tx.put("method", method);
        await tx.put("sessionId", sessionId);
        await tx.put("customerId", customerId);
        await tx.put("usage", 0);
        return jsonResponse({ ok: true });
      });
    }

    if (url.pathname === "/consume") {
      return this.state.storage.transaction(async (tx) => {
        const storedExp = await tx.get("exp");
        if (!storedExp) return jsonResponse({ ok: false, reason: "used" });

        if (jsonReq.now > storedExp) {
          await tx.deleteAll();
          return jsonResponse({ ok: false, reason: "expired" });
        }

        const storedBinding = await tx.get("binding");
        const storedPath = await tx.get("path");
        const storedMethod = await tx.get("method");

        if (jsonReq.path !== storedPath || jsonReq.method !== storedMethod ||
            !bindingsMatch(storedBinding, jsonReq.binding)) {
          return jsonResponse({ ok: false, reason: "binding_mismatch" });
        }

        await tx.put("usage", (await tx.get("usage")) + 1);
        return jsonResponse({ ok: true });
      });
    }

    return new Response("Not found", { status: 404 });
  }
}

function bindingsMatch(a, b) {
  if (!a || !b) return false;
  return a.ipPrefix === b.ipPrefix && a.uaHash === b.uaHash;
}

function jsonResponse(obj) {
  return new Response(JSON.stringify(obj), { headers: { "content-type": "application/json" } });
}
