/**
 * Intelligence Layer Detection
 * ============================
 * Leverages threat intelligence and historical data:
 * - Known bot IP addresses and ranges
 * - User-Agent blocklists
 * - Threat intelligence feeds (AbuseIPDB, etc.)
 * - Historical attack patterns
 * - Honeypot data
 *
 * This layer uses external data and accumulated knowledge.
 */

// ============================================
// Known Malicious IP Ranges (Sample)
// ============================================
// Maintain your own list or integrate with threat feeds

const BLOCKED_IP_RANGES = [
  // Example ranges - replace with real data
  // Format: { start: 'x.x.x.x', end: 'x.x.x.x', reason: 'description' }
];

// ============================================
// Known Bot User-Agent Strings
// ============================================
// Exact matches or patterns that are definitively bots

const KNOWN_BOT_USER_AGENTS = [
  // AI Training Bots
  { pattern: /GPTBot/i, name: 'GPTBot', company: 'OpenAI', type: 'ai-crawler' },
  { pattern: /ClaudeBot/i, name: 'ClaudeBot', company: 'Anthropic', type: 'ai-crawler' },
  { pattern: /Claude-Web/i, name: 'Claude-Web', company: 'Anthropic', type: 'ai-crawler' },
  { pattern: /CCBot/i, name: 'CCBot', company: 'Common Crawl', type: 'ai-crawler' },
  { pattern: /Google-Extended/i, name: 'Google-Extended', company: 'Google', type: 'ai-crawler' },
  { pattern: /Bytespider/i, name: 'Bytespider', company: 'ByteDance', type: 'ai-crawler' },
  { pattern: /PerplexityBot/i, name: 'PerplexityBot', company: 'Perplexity', type: 'ai-crawler' },
  { pattern: /Applebot-Extended/i, name: 'Applebot-Extended', company: 'Apple', type: 'ai-crawler' },
  { pattern: /anthropic-ai/i, name: 'Anthropic-AI', company: 'Anthropic', type: 'ai-crawler' },
  { pattern: /cohere-ai/i, name: 'Cohere-AI', company: 'Cohere', type: 'ai-crawler' },
  { pattern: /Diffbot/i, name: 'Diffbot', company: 'Diffbot', type: 'ai-crawler' },

  // Search Engines
  { pattern: /Googlebot/i, name: 'Googlebot', company: 'Google', type: 'search-engine' },
  { pattern: /bingbot/i, name: 'Bingbot', company: 'Microsoft', type: 'search-engine' },
  { pattern: /Baiduspider/i, name: 'Baiduspider', company: 'Baidu', type: 'search-engine' },
  { pattern: /YandexBot/i, name: 'YandexBot', company: 'Yandex', type: 'search-engine' },
  { pattern: /DuckDuckBot/i, name: 'DuckDuckBot', company: 'DuckDuckGo', type: 'search-engine' },
  { pattern: /Sogou/i, name: 'Sogou Spider', company: 'Sogou', type: 'search-engine' },
  { pattern: /Exabot/i, name: 'Exabot', company: 'Exalead', type: 'search-engine' },

  // Social Media / Preview
  { pattern: /facebookexternalhit/i, name: 'Facebook', company: 'Meta', type: 'social-preview' },
  { pattern: /Twitterbot/i, name: 'Twitterbot', company: 'X/Twitter', type: 'social-preview' },
  { pattern: /LinkedInBot/i, name: 'LinkedInBot', company: 'LinkedIn', type: 'social-preview' },
  { pattern: /Slackbot/i, name: 'Slackbot', company: 'Slack', type: 'social-preview' },
  { pattern: /TelegramBot/i, name: 'TelegramBot', company: 'Telegram', type: 'social-preview' },
  { pattern: /WhatsApp/i, name: 'WhatsApp', company: 'Meta', type: 'social-preview' },
  { pattern: /Discordbot/i, name: 'Discordbot', company: 'Discord', type: 'social-preview' },
  { pattern: /Pinterest/i, name: 'Pinterestbot', company: 'Pinterest', type: 'social-preview' },

  // SEO Tools
  { pattern: /SemrushBot/i, name: 'SemrushBot', company: 'Semrush', type: 'seo-tool' },
  { pattern: /AhrefsBot/i, name: 'AhrefsBot', company: 'Ahrefs', type: 'seo-tool' },
  { pattern: /MJ12bot/i, name: 'MJ12bot', company: 'Majestic', type: 'seo-tool' },
  { pattern: /DotBot/i, name: 'DotBot', company: 'Moz', type: 'seo-tool' },
  { pattern: /Screaming Frog/i, name: 'Screaming Frog', company: 'Screaming Frog', type: 'seo-tool' },
  { pattern: /rogerbot/i, name: 'Rogerbot', company: 'Moz', type: 'seo-tool' },

  // Monitoring
  { pattern: /UptimeRobot/i, name: 'UptimeRobot', company: 'UptimeRobot', type: 'monitoring' },
  { pattern: /Pingdom/i, name: 'Pingdom', company: 'Pingdom', type: 'monitoring' },
  { pattern: /Site24x7/i, name: 'Site24x7', company: 'Zoho', type: 'monitoring' },
  { pattern: /StatusCake/i, name: 'StatusCake', company: 'StatusCake', type: 'monitoring' },
  { pattern: /DatadogSynthetics/i, name: 'Datadog', company: 'Datadog', type: 'monitoring' },
  { pattern: /NewRelicPinger/i, name: 'NewRelic', company: 'New Relic', type: 'monitoring' },

  // Scrapers / Malicious (block or charge)
  { pattern: /MauiBot/i, name: 'MauiBot', company: 'Unknown', type: 'scraper', malicious: true },
  { pattern: /PetalBot/i, name: 'PetalBot', company: 'Aspiegel', type: 'scraper' },
  { pattern: /BLEXBot/i, name: 'BLEXBot', company: 'WebMeUp', type: 'scraper' },
  { pattern: /DataForSeoBot/i, name: 'DataForSeoBot', company: 'DataForSEO', type: 'scraper' },
  { pattern: /serpstatbot/i, name: 'SerpstatBot', company: 'Serpstat', type: 'scraper' },

  // Generic Bot Indicators
  { pattern: /bot/i, name: 'Generic Bot', company: 'Unknown', type: 'generic' },
  { pattern: /crawler/i, name: 'Generic Crawler', company: 'Unknown', type: 'generic' },
  { pattern: /spider/i, name: 'Generic Spider', company: 'Unknown', type: 'generic' },
  { pattern: /scraper/i, name: 'Generic Scraper', company: 'Unknown', type: 'generic' },

  // HTTP Libraries (not browsers)
  { pattern: /^python-requests/i, name: 'Python Requests', company: 'OSS', type: 'http-library' },
  { pattern: /^python-urllib/i, name: 'Python urllib', company: 'OSS', type: 'http-library' },
  { pattern: /^Go-http-client/i, name: 'Go HTTP', company: 'OSS', type: 'http-library' },
  { pattern: /^Java\//i, name: 'Java HTTP', company: 'Oracle', type: 'http-library' },
  { pattern: /^curl\//i, name: 'curl', company: 'OSS', type: 'http-library' },
  { pattern: /^wget\//i, name: 'wget', company: 'GNU', type: 'http-library' },
  { pattern: /^axios\//i, name: 'axios', company: 'OSS', type: 'http-library' },
  { pattern: /^node-fetch/i, name: 'node-fetch', company: 'OSS', type: 'http-library' },
  { pattern: /^httpx/i, name: 'HTTPX', company: 'OSS', type: 'http-library' },
  { pattern: /^aiohttp/i, name: 'aiohttp', company: 'OSS', type: 'http-library' },
  { pattern: /^okhttp/i, name: 'OkHttp', company: 'Square', type: 'http-library' },
  { pattern: /^Apache-HttpClient/i, name: 'Apache HttpClient', company: 'Apache', type: 'http-library' },
  { pattern: /^libwww-perl/i, name: 'LWP', company: 'Perl', type: 'http-library' },
  { pattern: /^PHP\//i, name: 'PHP', company: 'OSS', type: 'http-library' },
  { pattern: /^Ruby/i, name: 'Ruby HTTP', company: 'OSS', type: 'http-library' },

  // Headless Browsers
  { pattern: /HeadlessChrome/i, name: 'Headless Chrome', company: 'Google', type: 'headless' },
  { pattern: /PhantomJS/i, name: 'PhantomJS', company: 'OSS', type: 'headless' },
  { pattern: /Puppeteer/i, name: 'Puppeteer', company: 'Google', type: 'headless' },
  { pattern: /Playwright/i, name: 'Playwright', company: 'Microsoft', type: 'headless' },
];

// ============================================
// Honeypot Trap Paths
// ============================================
// Paths that real users would never access

const HONEYPOT_PATHS = [
  '/.env',
  '/.git/config',
  '/wp-login.php',
  '/admin/config.php',
  '/phpmyadmin',
  '/backup.sql',
  '/database.sql',
  '/.aws/credentials',
  '/config/database.yml',
  '/server-status',
  '/.htaccess',
  '/.htpasswd',
  '/xmlrpc.php',
  '/wp-admin/install.php',
  '/setup.php',
  '/install.php',
];

// ============================================
// Main Intelligence Analysis Function
// ============================================

/**
 * Analyze request using threat intelligence
 * @param {Request} request - Incoming request
 * @param {Object} env - Environment bindings
 * @returns {Object} Intelligence analysis result
 */
export async function analyzeIntelligenceLayer(request, env) {
  const signals = [];
  let riskScore = 0;

  const ip = request.headers.get('cf-connecting-ip') || '';
  const userAgent = request.headers.get('user-agent') || '';
  const url = new URL(request.url);
  const path = url.pathname;

  // ----------------------------------------
  // 1. Known Bot User-Agent Matching
  // ----------------------------------------
  const uaResult = matchKnownBot(userAgent);
  if (uaResult.match) {
    signals.push({
      type: 'known-bot-ua',
      severity: uaResult.match.malicious ? 'critical' : 'info',
      detail: `Identified as ${uaResult.match.name} (${uaResult.match.company}) - ${uaResult.match.type}`,
      botInfo: uaResult.match,
    });
    riskScore += uaResult.match.malicious ? 40 : 10;
  }

  // ----------------------------------------
  // 2. IP Blocklist Check
  // ----------------------------------------
  const ipBlockResult = await checkIPBlocklist(ip, env);
  if (ipBlockResult.blocked) {
    signals.push({
      type: 'blocked-ip',
      severity: 'critical',
      detail: `IP is blocklisted: ${ipBlockResult.reason}`
    });
    riskScore += 50;
  }

  // ----------------------------------------
  // 3. Honeypot Detection
  // ----------------------------------------
  const honeypotResult = checkHoneypot(path);
  if (honeypotResult.triggered) {
    signals.push({
      type: 'honeypot-triggered',
      severity: 'critical',
      detail: `Accessed honeypot path: ${path}`
    });
    riskScore += 60;

    // Record this IP as suspicious
    await recordSuspiciousIP(ip, 'honeypot', env);
  }

  // ----------------------------------------
  // 4. External Threat Intelligence
  // ----------------------------------------
  if (env.ABUSEIPDB_API_KEY) {
    const threatResult = await queryThreatIntelligence(ip, env);
    signals.push(...threatResult.signals);
    riskScore += threatResult.risk;
  }

  // ----------------------------------------
  // 5. Historical Behavior Check
  // ----------------------------------------
  const historyResult = await checkHistoricalBehavior(ip, env);
  signals.push(...historyResult.signals);
  riskScore += historyResult.risk;

  // ----------------------------------------
  // 6. Real-time Blocklist Lookup
  // ----------------------------------------
  const realtimeResult = await checkRealtimeBlocklists(ip, env);
  signals.push(...realtimeResult.signals);
  riskScore += realtimeResult.risk;

  return {
    layer: 'intelligence',
    riskScore: Math.min(riskScore, 100),
    signals,
    botInfo: uaResult.match || null,
    metadata: {
      knownBot: !!uaResult.match,
      botType: uaResult.match?.type,
    }
  };
}

// ============================================
// Known Bot User-Agent Matching
// ============================================

function matchKnownBot(userAgent) {
  if (!userAgent) {
    return { match: null };
  }

  for (const bot of KNOWN_BOT_USER_AGENTS) {
    if (bot.pattern.test(userAgent)) {
      return { match: bot };
    }
  }

  return { match: null };
}

// ============================================
// IP Blocklist Check
// ============================================

async function checkIPBlocklist(ip, env) {
  // Check local KV blocklist
  const blockKey = `blocklist:${ip}`;
  const blockData = await env.TOKENS.get(blockKey, { type: 'json' });

  if (blockData) {
    return {
      blocked: true,
      reason: blockData.reason || 'Previously blocked',
      blockedAt: blockData.blockedAt
    };
  }

  // Check static IP ranges
  for (const range of BLOCKED_IP_RANGES) {
    if (ipInRange(ip, range.start, range.end)) {
      return {
        blocked: true,
        reason: range.reason
      };
    }
  }

  return { blocked: false };
}

function ipInRange(ip, start, end) {
  const ipNum = ipToNumber(ip);
  const startNum = ipToNumber(start);
  const endNum = ipToNumber(end);
  return ipNum >= startNum && ipNum <= endNum;
}

function ipToNumber(ip) {
  const parts = ip.split('.');
  if (parts.length !== 4) return 0;
  return parts.reduce((sum, part, i) => sum + (parseInt(part, 10) << (24 - i * 8)), 0) >>> 0;
}

// ============================================
// Honeypot Detection
// ============================================

function checkHoneypot(path) {
  const normalizedPath = path.toLowerCase();

  for (const honeypot of HONEYPOT_PATHS) {
    if (normalizedPath === honeypot || normalizedPath.startsWith(honeypot)) {
      return { triggered: true, path: honeypot };
    }
  }

  return { triggered: false };
}

// ============================================
// Record Suspicious IP
// ============================================

async function recordSuspiciousIP(ip, reason, env) {
  const key = `suspicious:${ip}`;
  const existing = await env.TOKENS.get(key, { type: 'json' }) || {
    reasons: [],
    firstSeen: Date.now(),
    count: 0
  };

  existing.reasons.push({ reason, timestamp: Date.now() });
  existing.count++;
  existing.lastSeen = Date.now();

  // Keep for 24 hours
  await env.TOKENS.put(key, JSON.stringify(existing), {
    expirationTtl: 86400
  });

  // If multiple suspicious actions, add to blocklist
  if (existing.count >= 3) {
    await blockIP(ip, 'Multiple suspicious activities', env);
  }
}

async function blockIP(ip, reason, env) {
  const blockKey = `blocklist:${ip}`;
  await env.TOKENS.put(blockKey, JSON.stringify({
    reason,
    blockedAt: Date.now()
  }), {
    expirationTtl: 86400 * 7 // Block for 7 days
  });
}

// ============================================
// External Threat Intelligence
// ============================================

async function queryThreatIntelligence(ip, env) {
  const signals = [];
  let risk = 0;

  // Check cache first
  const cacheKey = `threat:${ip}`;
  const cached = await env.TOKENS.get(cacheKey, { type: 'json' });

  if (cached && Date.now() - cached.timestamp < 3600000) { // 1 hour cache
    return { signals: cached.signals, risk: cached.risk };
  }

  try {
    // AbuseIPDB integration
    const response = await fetch(
      `https://api.abuseipdb.com/api/v2/check?ipAddress=${encodeURIComponent(ip)}&maxAgeInDays=90`,
      {
        headers: {
          'Key': env.ABUSEIPDB_API_KEY,
          'Accept': 'application/json'
        }
      }
    );

    if (response.ok) {
      const data = await response.json();
      const result = data.data;

      if (result.abuseConfidenceScore > 80) {
        signals.push({
          type: 'threat-intel-high',
          severity: 'critical',
          detail: `AbuseIPDB confidence: ${result.abuseConfidenceScore}% (${result.totalReports} reports)`
        });
        risk += 40;
      } else if (result.abuseConfidenceScore > 50) {
        signals.push({
          type: 'threat-intel-medium',
          severity: 'high',
          detail: `AbuseIPDB confidence: ${result.abuseConfidenceScore}% (${result.totalReports} reports)`
        });
        risk += 25;
      } else if (result.abuseConfidenceScore > 20) {
        signals.push({
          type: 'threat-intel-low',
          severity: 'medium',
          detail: `AbuseIPDB confidence: ${result.abuseConfidenceScore}%`
        });
        risk += 10;
      }

      if (result.isTor) {
        signals.push({
          type: 'tor-network',
          severity: 'high',
          detail: 'IP is a Tor exit node'
        });
        risk += 20;
      }

      if (result.isPublicProxy) {
        signals.push({
          type: 'public-proxy',
          severity: 'high',
          detail: 'IP is a known public proxy'
        });
        risk += 20;
      }

      // Cache the result
      await env.TOKENS.put(cacheKey, JSON.stringify({
        signals,
        risk,
        timestamp: Date.now()
      }), {
        expirationTtl: 3600 // 1 hour
      });
    }

  } catch (error) {
    console.error('Threat intelligence query failed:', error);
  }

  return { signals, risk };
}

// ============================================
// Historical Behavior Check
// ============================================

async function checkHistoricalBehavior(ip, env) {
  const signals = [];
  let risk = 0;

  const suspiciousKey = `suspicious:${ip}`;
  const history = await env.TOKENS.get(suspiciousKey, { type: 'json' });

  if (history) {
    if (history.count >= 5) {
      signals.push({
        type: 'repeat-offender',
        severity: 'critical',
        detail: `${history.count} previous suspicious activities from this IP`
      });
      risk += 35;
    } else if (history.count >= 2) {
      signals.push({
        type: 'prior-suspicious',
        severity: 'high',
        detail: `${history.count} previous suspicious activities`
      });
      risk += 20;
    }
  }

  return { signals, risk };
}

// ============================================
// Real-time Blocklist Lookup
// ============================================

async function checkRealtimeBlocklists(ip, env) {
  const signals = [];
  let risk = 0;

  // DNS-based blocklist checks (DNSBL)
  // These are fast and free but have rate limits
  const dnsbls = [
    // Uncomment to enable - be aware of rate limits
    // { zone: 'zen.spamhaus.org', name: 'Spamhaus' },
    // { zone: 'bl.spamcop.net', name: 'SpamCop' },
  ];

  // For now, we rely on cached threat intelligence
  // Full DNSBL implementation would require more infrastructure

  return { signals, risk };
}

// ============================================
// Bot Policy Functions
// ============================================

/**
 * Determine how to handle a known bot based on policy
 */
export function getBotPolicy(botInfo, sitePolicy = {}) {
  const {
    allowSearchEngines = true,
    allowSocialPreviews = true,
    allowAICrawlers = false, // Charge by default
    allowSeoTools = false,
    allowMonitoring = true,
    chargeUnknownBots = true,
  } = sitePolicy;

  if (!botInfo) {
    return chargeUnknownBots ? 'charge' : 'allow';
  }

  switch (botInfo.type) {
    case 'search-engine':
      return allowSearchEngines ? 'allow' : 'charge';

    case 'social-preview':
      return allowSocialPreviews ? 'allow' : 'charge';

    case 'ai-crawler':
      return allowAICrawlers ? 'allow' : 'charge';

    case 'seo-tool':
      return allowSeoTools ? 'allow' : 'charge';

    case 'monitoring':
      return allowMonitoring ? 'allow' : 'charge';

    case 'scraper':
      return botInfo.malicious ? 'block' : 'charge';

    case 'headless':
    case 'http-library':
      return 'charge';

    case 'generic':
    default:
      return chargeUnknownBots ? 'charge' : 'allow';
  }
}

/**
 * Get human-readable bot description
 */
export function getBotDescription(botInfo) {
  if (!botInfo) {
    return 'Unknown automated traffic';
  }

  const typeDescriptions = {
    'ai-crawler': 'AI Training Crawler',
    'search-engine': 'Search Engine Crawler',
    'social-preview': 'Social Media Preview Bot',
    'seo-tool': 'SEO Analysis Tool',
    'monitoring': 'Uptime Monitoring Service',
    'scraper': 'Web Scraper',
    'headless': 'Headless Browser',
    'http-library': 'HTTP Client Library',
    'generic': 'Bot/Crawler',
  };

  const typeDesc = typeDescriptions[botInfo.type] || 'Bot';
  return `${botInfo.name} by ${botInfo.company} (${typeDesc})`;
}
