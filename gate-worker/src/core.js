/**
 * Gate Worker Core Logic
 * ======================
 * Pure functions extracted for testability.
 * No I/O, no env dependencies — just logic.
 */

// ============================================================
// STATIC ASSET DETECTION
// ============================================================
export function isStaticAsset(pathname) {
  const staticExts = /\.(css|js|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|eot|otf|webp|avif|mp4|webm|pdf|map|txt|xml|json)$/i;
  return staticExts.test(pathname);
}

// ============================================================
// BOT DETECTION
// ============================================================
export function detectBot(request) {
  const ua = (request.headers.get("user-agent") || "").toLowerCase();
  const cf = request.cf || {};
  const headers = request.headers;
  let score = 0;
  const signals = [];

  // 0. Missing or empty User-Agent
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

  // 2. Cloudflare Bot Management score
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

  // 5. Missing sec-ch-ua (Client Hints)
  if (!headers.get("sec-ch-ua") && ua.includes("chrome/")) {
    score += 15;
    signals.push("missing_client_hints");
  }

  // 6. Known datacenter ASNs
  const datacenterASNs = [
    14061, 16276, 24940, 63949, 20473, 47583,
    16509, 14618, 15169, 396982, 8075,
  ];
  if (cf.asn && datacenterASNs.includes(cf.asn)) {
    score += 25;
    signals.push("datacenter_asn");
  }

  // 7. No referrer on non-homepage
  const referer = headers.get("referer");
  if (!referer && !request.url.endsWith("/")) {
    score += 5;
    signals.push("no_referer_deep_page");
  }

  // 8. Missing sec-fetch-mode
  if (!headers.get("sec-fetch-mode") && ua.includes("mozilla")) {
    score += 10;
    signals.push("missing_sec_fetch");
  }

  const confidence = Math.min(score, 100);
  const blockType = classifyBlockType(ua, signals);
  return { isBot: confidence >= 50, confidence, signals, blockType };
}

// ============================================================
// BLOCK TYPE CLASSIFICATION
// Obvious non-renderable bots get a hard 403. Bots that could
// plausibly pay (AI crawlers) get redirected to payment.
// ============================================================
const HTTP_LIBRARY_PATTERNS = [
  /^curl\//i, /^wget\//i, /^python-requests/i, /^python-urllib/i,
  /^httpx/i, /^aiohttp/i, /^go-http-client/i, /^java\//i,
  /^libwww/i, /^apache-httpclient/i, /^node-fetch/i, /^axios/i,
  /^got\//i, /^okhttp/i, /^PHP\//i, /^ruby/i, /^perl/i,
  /^scrapy/i, /^beautifulsoup/i, /^superagent/i,
];

const HEADLESS_PATTERNS = [
  /headlesschrome/i, /phantomjs/i, /puppeteer/i, /playwright/i, /selenium/i,
];

export function classifyBlockType(ua, signals) {
  // Empty UA — not a browser, can't render anything
  if (!ua || ua.length === 0) return "hard_block";

  // HTTP libraries — can't render a payment page
  for (const pattern of HTTP_LIBRARY_PATTERNS) {
    if (pattern.test(ua)) return "hard_block";
  }

  // Headless browsers — automated, should not get payment option
  for (const pattern of HEADLESS_PATTERNS) {
    if (pattern.test(ua)) return "hard_block";
  }

  // Datacenter IP + bot UA = scraping infrastructure, not a user
  if (signals.includes("datacenter_asn") && signals.includes("ua_bot_pattern")) {
    return "hard_block";
  }

  // Everything else (GPTBot, ClaudeBot, etc.) could plausibly pay
  return "payment_redirect";
}

// ============================================================
// FINGERPRINT VALIDATION
// ============================================================
export function validateFingerprint(fingerprint) {
  const failures = [];

  if (fingerprint.webdriver) failures.push("webdriver");

  if (fingerprint.webgl) {
    const renderer = (fingerprint.webgl.r || "").toLowerCase();
    if (/swiftshader|llvmpipe|software|mesa offscreen|virtualbox|vmware/i.test(renderer)) {
      failures.push("headless_webgl");
    }
  }

  if (!fingerprint.canvas || fingerprint.canvas.length < 20) failures.push("missing_canvas");
  if (fingerprint.sw === 0 || fingerprint.sh === 0) failures.push("zero_screen");
  if (!fingerprint.webgl) failures.push("missing_webgl");
  if (!fingerprint.lang) failures.push("missing_language");
  if (fingerprint.cores === 0) failures.push("zero_cores");

  const suspiciousScreen = (fingerprint.sw === 800 && fingerprint.sh === 600) ||
                            (fingerprint.sw === 1024 && fingerprint.sh === 768);
  const noPlugins = !fingerprint.plugins || fingerprint.plugins.length === 0;
  if (suspiciousScreen && noPlugins) failures.push("headless_screen_no_plugins");

  return { valid: failures.length === 0, failures };
}

// ============================================================
// BEHAVIORAL VALIDATION
// ============================================================
export function validateBehavior(behavior) {
  if (!behavior) return { valid: true, failures: [] };
  const failures = [];

  if (behavior.mouse > 5 && behavior.moveVarianceX === 0 && behavior.moveVarianceY === 0) {
    failures.push("linear_mouse_movement");
  }

  return { valid: failures.length === 0, failures };
}

// ============================================================
// HUMAN CONFIDENCE SCORING
// Determines how strongly a visitor proved they're human based
// on behavioral signals collected during the challenge page.
// ============================================================
export function computeHumanConfidence(behavior) {
  if (!behavior) return "weak";

  const hasMouseActivity = behavior.mouse > 10;
  const hasTouchActivity = behavior.touch > 3;
  const hasInteraction = hasMouseActivity || hasTouchActivity;
  const hasVariance = behavior.moveVarianceX > 100 || behavior.moveVarianceY > 100 || hasTouchActivity;
  const hasTimeOnPage = behavior.timeOnPage > 2000;
  const hasScroll = behavior.scroll > 0;

  if (hasInteraction && hasVariance && hasTimeOnPage && hasScroll) return "strong";
  if (hasInteraction || hasTimeOnPage) return "moderate";
  return "weak";
}

// ============================================================
// COOKIE HELPERS
// ============================================================
export function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(";").forEach(part => {
    const [key, ...val] = part.trim().split("=");
    if (key) cookies[key.trim()] = val.join("=").trim();
  });
  return cookies;
}

// ============================================================
// CRYPTO HELPERS
// ============================================================
export async function hmacSHA256(data, secret) {
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

export async function sha256Short(input) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return btoa(String.fromCharCode(...new Uint8Array(buf).slice(0, 12)));
}

export function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let res = 0;
  for (let i = 0; i < a.length; i++) res |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return res === 0;
}

export function ipTo24(ip) {
  if (!ip || !ip.includes(".")) return null;
  return ip.split(".").slice(0, 3).join(".") + ".0/24";
}
