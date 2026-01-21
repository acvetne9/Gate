/**
 * Behavior Layer Detection
 * ========================
 * Analyzes request patterns and behaviors that distinguish bots from humans:
 * - Request rate limiting and burst detection
 * - Access pattern analysis (sequential vs random)
 * - Session behavior anomalies
 * - Timing analysis
 * - Path traversal patterns
 *
 * Bots exhibit predictable, machine-like behavior patterns.
 */

// ============================================
// Rate Limiting Configuration
// ============================================

const RATE_LIMITS = {
  // Per IP limits
  ip: {
    windowSec: 60,           // 1 minute window
    maxRequests: 60,         // 60 req/min normal
    burstThreshold: 20,      // 20 req in 10 sec = burst
    burstWindowSec: 10,
  },

  // Per IP+UA combination (more granular)
  session: {
    windowSec: 60,
    maxRequests: 100,
  },

  // Global endpoint limits
  endpoint: {
    windowSec: 60,
    maxRequests: 1000,
  },
};

// ============================================
// Behavioral Pattern Signatures
// ============================================

const BOT_BEHAVIOR_PATTERNS = {
  // Sequential crawling (hitting pages in order)
  sequentialAccess: {
    threshold: 5,  // 5 sequential paths = suspicious
    pattern: /\/(page|item|product|article)\/\d+$/,
  },

  // Aggressive resource fetching
  resourceHoarding: {
    threshold: 50,  // 50 resources in quick succession
    resourcePatterns: [/\.(css|js|png|jpg|gif|svg|woff)/],
  },

  // API hammering
  apiAbuse: {
    threshold: 30,  // 30 API calls per minute
    patterns: [/\/api\//, /\/v\d+\//, /\.json$/],
  },

  // Form submission spam
  formSpam: {
    threshold: 10,  // 10 POSTs in a minute
    methods: ['POST', 'PUT'],
  },

  // Login/auth probing
  authProbing: {
    threshold: 5,
    patterns: [/\/login/, /\/auth/, /\/signin/, /\/register/],
  },
};

// ============================================
// Suspicious Path Patterns
// ============================================

const SUSPICIOUS_PATHS = [
  // Admin/config probing
  /\/admin/i,
  /\/wp-admin/i,
  /\/phpmyadmin/i,
  /\/\.env/,
  /\/config\./,
  /\/\.git/,
  /\/\.svn/,
  /\/backup/i,
  /\/dump/i,

  // Vulnerability scanning
  /\/etc\/passwd/,
  /\/proc\/self/,
  /\.\.\//,         // Path traversal
  /%2e%2e/i,        // Encoded traversal
  /union\s+select/i,
  /<script/i,

  // Common CMS/framework probing
  /\/xmlrpc\.php/,
  /\/wp-content\/uploads/,
  /\/vendor\//,
  /\/node_modules\//,
];

// ============================================
// Main Behavior Analysis Function
// ============================================

/**
 * Analyze request behavior patterns
 * @param {Request} request - Incoming request
 * @param {Object} env - Environment bindings (with KV for rate tracking)
 * @returns {Object} Behavior analysis result
 */
export async function analyzeBehaviorLayer(request, env) {
  const signals = [];
  let riskScore = 0;

  const ip = request.headers.get('cf-connecting-ip') || '';
  const url = new URL(request.url);
  const path = url.pathname;

  // ----------------------------------------
  // 1. Rate Limiting Check
  // ----------------------------------------
  const rateResult = await checkRateLimits(ip, request, env);
  signals.push(...rateResult.signals);
  riskScore += rateResult.risk;

  // ----------------------------------------
  // 2. Access Pattern Analysis
  // ----------------------------------------
  const patternResult = await analyzeAccessPatterns(ip, path, env);
  signals.push(...patternResult.signals);
  riskScore += patternResult.risk;

  // ----------------------------------------
  // 3. Request Timing Analysis
  // ----------------------------------------
  const timingResult = await analyzeRequestTiming(ip, env);
  signals.push(...timingResult.signals);
  riskScore += timingResult.risk;

  // ----------------------------------------
  // 4. Suspicious Path Detection
  // ----------------------------------------
  const pathResult = analyzeSuspiciousPaths(path, url.search);
  signals.push(...pathResult.signals);
  riskScore += pathResult.risk;

  // ----------------------------------------
  // 5. Session Behavior Analysis
  // ----------------------------------------
  const sessionResult = await analyzeSessionBehavior(request, env);
  signals.push(...sessionResult.signals);
  riskScore += sessionResult.risk;

  // ----------------------------------------
  // 6. Referrer Analysis
  // ----------------------------------------
  const referrerResult = analyzeReferrer(request, url);
  signals.push(...referrerResult.signals);
  riskScore += referrerResult.risk;

  return {
    layer: 'behavior',
    riskScore: Math.min(riskScore, 100),
    signals,
    metadata: {
      path,
      method: request.method,
      ip: ip.substring(0, 8) + '...', // Partial for logging
    }
  };
}

// ============================================
// Rate Limiting Implementation
// ============================================

/**
 * Check various rate limits using KV for state
 */
async function checkRateLimits(ip, request, env) {
  const signals = [];
  let risk = 0;

  const now = Math.floor(Date.now() / 1000);
  const ipKey = `rate:ip:${hashString(ip)}`;

  try {
    // Get current rate data
    const rateData = await env.TOKENS.get(ipKey, { type: 'json' }) || {
      count: 0,
      windowStart: now,
      recentTimestamps: [],
    };

    // Reset window if expired
    if (now - rateData.windowStart > RATE_LIMITS.ip.windowSec) {
      rateData.count = 0;
      rateData.windowStart = now;
      rateData.recentTimestamps = [];
    }

    // Increment count
    rateData.count++;
    rateData.recentTimestamps.push(now);

    // Keep only recent timestamps for burst detection
    rateData.recentTimestamps = rateData.recentTimestamps.filter(
      ts => now - ts < RATE_LIMITS.ip.burstWindowSec
    );

    // Check for rate limit exceeded
    if (rateData.count > RATE_LIMITS.ip.maxRequests) {
      signals.push({
        type: 'rate-limit-exceeded',
        severity: 'high',
        detail: `${rateData.count} requests in ${RATE_LIMITS.ip.windowSec}s (limit: ${RATE_LIMITS.ip.maxRequests})`
      });
      risk += 30;
    } else if (rateData.count > RATE_LIMITS.ip.maxRequests * 0.7) {
      signals.push({
        type: 'rate-limit-warning',
        severity: 'medium',
        detail: `High request rate: ${rateData.count}/${RATE_LIMITS.ip.maxRequests}`
      });
      risk += 15;
    }

    // Check for burst behavior
    if (rateData.recentTimestamps.length > RATE_LIMITS.ip.burstThreshold) {
      signals.push({
        type: 'burst-detected',
        severity: 'high',
        detail: `${rateData.recentTimestamps.length} requests in ${RATE_LIMITS.ip.burstWindowSec}s (burst threshold: ${RATE_LIMITS.ip.burstThreshold})`
      });
      risk += 25;
    }

    // Store updated rate data
    await env.TOKENS.put(ipKey, JSON.stringify(rateData), {
      expirationTtl: RATE_LIMITS.ip.windowSec * 2
    });

  } catch (error) {
    console.error('Rate limit check error:', error);
  }

  return { signals, risk };
}

// ============================================
// Access Pattern Analysis
// ============================================

/**
 * Analyze patterns in path access
 */
async function analyzeAccessPatterns(ip, path, env) {
  const signals = [];
  let risk = 0;

  const patternKey = `pattern:${hashString(ip)}`;

  try {
    const patternData = await env.TOKENS.get(patternKey, { type: 'json' }) || {
      paths: [],
      timestamps: [],
      apiCalls: 0,
      formSubmits: 0,
    };

    // Add current path
    patternData.paths.push(path);
    patternData.timestamps.push(Date.now());

    // Keep last 100 paths
    if (patternData.paths.length > 100) {
      patternData.paths = patternData.paths.slice(-100);
      patternData.timestamps = patternData.timestamps.slice(-100);
    }

    // Check for sequential numeric access (crawling pattern)
    const numericPaths = patternData.paths.filter(p =>
      BOT_BEHAVIOR_PATTERNS.sequentialAccess.pattern.test(p)
    );

    if (numericPaths.length >= BOT_BEHAVIOR_PATTERNS.sequentialAccess.threshold) {
      // Check if they're actually sequential
      const numbers = numericPaths.map(p => {
        const match = p.match(/\/(\d+)$/);
        return match ? parseInt(match[1], 10) : null;
      }).filter(n => n !== null);

      let sequentialCount = 0;
      for (let i = 1; i < numbers.length; i++) {
        if (numbers[i] === numbers[i - 1] + 1) {
          sequentialCount++;
        }
      }

      if (sequentialCount >= 3) {
        signals.push({
          type: 'sequential-crawling',
          severity: 'high',
          detail: `Detected ${sequentialCount} sequential page accesses (crawling pattern)`
        });
        risk += 25;
      }
    }

    // Check for API hammering
    const apiPaths = patternData.paths.filter(p =>
      BOT_BEHAVIOR_PATTERNS.apiAbuse.patterns.some(pattern => pattern.test(p))
    );

    if (apiPaths.length > BOT_BEHAVIOR_PATTERNS.apiAbuse.threshold) {
      signals.push({
        type: 'api-abuse',
        severity: 'high',
        detail: `${apiPaths.length} API calls detected (threshold: ${BOT_BEHAVIOR_PATTERNS.apiAbuse.threshold})`
      });
      risk += 20;
    }

    // Check path diversity (bots often have low diversity)
    const uniquePaths = new Set(patternData.paths);
    const diversityRatio = uniquePaths.size / patternData.paths.length;

    if (patternData.paths.length > 20 && diversityRatio < 0.3) {
      signals.push({
        type: 'low-path-diversity',
        severity: 'medium',
        detail: `Path diversity ratio: ${(diversityRatio * 100).toFixed(1)}% (possible targeted scraping)`
      });
      risk += 15;
    }

    // Store updated pattern data
    await env.TOKENS.put(patternKey, JSON.stringify(patternData), {
      expirationTtl: 600 // 10 minutes
    });

  } catch (error) {
    console.error('Pattern analysis error:', error);
  }

  return { signals, risk };
}

// ============================================
// Request Timing Analysis
// ============================================

/**
 * Analyze timing between requests (bots are often too regular)
 */
async function analyzeRequestTiming(ip, env) {
  const signals = [];
  let risk = 0;

  const timingKey = `timing:${hashString(ip)}`;

  try {
    const timingData = await env.TOKENS.get(timingKey, { type: 'json' }) || {
      timestamps: [],
    };

    const now = Date.now();
    timingData.timestamps.push(now);

    // Keep last 50 timestamps
    if (timingData.timestamps.length > 50) {
      timingData.timestamps = timingData.timestamps.slice(-50);
    }

    // Calculate intervals between requests
    if (timingData.timestamps.length >= 10) {
      const intervals = [];
      for (let i = 1; i < timingData.timestamps.length; i++) {
        intervals.push(timingData.timestamps[i] - timingData.timestamps[i - 1]);
      }

      // Calculate statistics
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variance = intervals.reduce((sum, i) => sum + Math.pow(i - avgInterval, 2), 0) / intervals.length;
      const stdDev = Math.sqrt(variance);
      const coefficientOfVariation = stdDev / avgInterval;

      // Bots often have very consistent timing (low CV)
      if (coefficientOfVariation < 0.1 && avgInterval < 5000) {
        signals.push({
          type: 'robotic-timing',
          severity: 'high',
          detail: `Request timing too regular (CV: ${(coefficientOfVariation * 100).toFixed(1)}%, avg: ${avgInterval}ms)`
        });
        risk += 25;
      }

      // Check for exactly regular intervals (very suspicious)
      const roundedIntervals = intervals.map(i => Math.round(i / 100) * 100);
      const uniqueRounded = new Set(roundedIntervals);

      if (uniqueRounded.size <= 2 && intervals.length > 10) {
        signals.push({
          type: 'metronomic-requests',
          severity: 'critical',
          detail: 'Requests at exactly regular intervals (machine behavior)'
        });
        risk += 35;
      }

      // Check for inhuman speed (less than 100ms between requests)
      const fastRequests = intervals.filter(i => i < 100).length;
      if (fastRequests > intervals.length * 0.5) {
        signals.push({
          type: 'inhuman-speed',
          severity: 'high',
          detail: `${fastRequests}/${intervals.length} requests under 100ms apart`
        });
        risk += 30;
      }
    }

    await env.TOKENS.put(timingKey, JSON.stringify(timingData), {
      expirationTtl: 300 // 5 minutes
    });

  } catch (error) {
    console.error('Timing analysis error:', error);
  }

  return { signals, risk };
}

// ============================================
// Suspicious Path Detection
// ============================================

/**
 * Check for security scanning / probing patterns
 */
function analyzeSuspiciousPaths(path, queryString) {
  const signals = [];
  let risk = 0;

  // Check path against suspicious patterns
  for (const pattern of SUSPICIOUS_PATHS) {
    if (pattern.test(path) || pattern.test(queryString)) {
      signals.push({
        type: 'suspicious-path',
        severity: 'critical',
        detail: `Path matches security probe pattern: ${pattern}`
      });
      risk += 30;
      break; // One match is enough
    }
  }

  // Check for overly long paths (buffer overflow attempts)
  if (path.length > 500) {
    signals.push({
      type: 'path-too-long',
      severity: 'high',
      detail: `Path length ${path.length} chars (possible overflow attempt)`
    });
    risk += 20;
  }

  // Check for null bytes (injection attempt)
  if (path.includes('\x00') || path.includes('%00')) {
    signals.push({
      type: 'null-byte-injection',
      severity: 'critical',
      detail: 'Null byte in path (injection attempt)'
    });
    risk += 40;
  }

  // Check for excessive path depth
  const pathSegments = path.split('/').filter(Boolean);
  if (pathSegments.length > 15) {
    signals.push({
      type: 'deep-path',
      severity: 'medium',
      detail: `Path has ${pathSegments.length} segments (unusual depth)`
    });
    risk += 10;
  }

  return { signals, risk };
}

// ============================================
// Session Behavior Analysis
// ============================================

/**
 * Analyze behavior within a session
 */
async function analyzeSessionBehavior(request, env) {
  const signals = [];
  let risk = 0;

  // Check for missing expected browser behaviors

  // 1. No cookies on repeat visit (might indicate no JS/cookie support)
  const cookies = request.headers.get('cookie') || '';
  const hasPreviousVisit = cookies.includes('__pw_') || cookies.includes('_ga');

  // 2. Check Referer header patterns
  // Real browsing usually has a mix of:
  // - Direct (no referer)
  // - Same-site (internal navigation)
  // - External (from search engines, social media)

  // 3. Check for AJAX indicators on non-AJAX requests
  const xRequestedWith = request.headers.get('x-requested-with');
  const acceptsHtml = (request.headers.get('accept') || '').includes('text/html');

  if (xRequestedWith === 'XMLHttpRequest' && acceptsHtml) {
    signals.push({
      type: 'ajax-html-mismatch',
      severity: 'medium',
      detail: 'XMLHttpRequest with HTML Accept header (unusual)'
    });
    risk += 10;
  }

  return { signals, risk };
}

// ============================================
// Referrer Analysis
// ============================================

/**
 * Analyze the Referer header for anomalies
 */
function analyzeReferrer(request, url) {
  const signals = [];
  let risk = 0;

  const referer = request.headers.get('referer');

  if (!referer) {
    // No referer - could be direct access, privacy settings, or bot
    // Not strongly indicative on its own
    return { signals, risk };
  }

  try {
    const refererUrl = new URL(referer);

    // Check for self-referencing (some bots do this incorrectly)
    if (refererUrl.pathname === url.pathname && refererUrl.origin === url.origin) {
      signals.push({
        type: 'self-referer',
        severity: 'low',
        detail: 'Request references itself as referer'
      });
      risk += 5;
    }

    // Check for suspicious referer domains
    const suspiciousReferers = [
      /semrush/i, /ahrefs/i, /majestic/i, // SEO tools
      /moz\.com/i,
      /localhost/i, /127\.0\.0\.1/, // Local testing
    ];

    for (const pattern of suspiciousReferers) {
      if (pattern.test(refererUrl.hostname)) {
        signals.push({
          type: 'suspicious-referer',
          severity: 'medium',
          detail: `Referer from known bot/tool domain: ${refererUrl.hostname}`
        });
        risk += 15;
        break;
      }
    }

  } catch (e) {
    // Invalid referer URL
    signals.push({
      type: 'invalid-referer',
      severity: 'medium',
      detail: 'Malformed Referer header'
    });
    risk += 10;
  }

  return { signals, risk };
}

// ============================================
// Utility Functions
// ============================================

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

// ============================================
// Rate Limit Enforcement
// ============================================

/**
 * Check if request should be rate limited (called separately for enforcement)
 */
export async function shouldRateLimit(ip, env) {
  const ipKey = `rate:ip:${hashString(ip)}`;
  const rateData = await env.TOKENS.get(ipKey, { type: 'json' });

  if (!rateData) return { limited: false };

  const now = Math.floor(Date.now() / 1000);

  // Check if in current window and over limit
  if (now - rateData.windowStart < RATE_LIMITS.ip.windowSec) {
    if (rateData.count > RATE_LIMITS.ip.maxRequests * 1.5) {
      return {
        limited: true,
        retryAfter: RATE_LIMITS.ip.windowSec - (now - rateData.windowStart)
      };
    }
  }

  return { limited: false };
}
