/**
 * Fingerprint Layer Detection
 * ===========================
 * Detects inconsistencies between claimed identity and actual characteristics:
 * - User-Agent vs actual browser features mismatch
 * - Header order anomalies
 * - Accept header inconsistencies
 * - Feature detection mismatches
 *
 * Bots often spoof User-Agent but fail to match all characteristics.
 */

// ============================================
// User-Agent Parsing Patterns
// ============================================

const UA_PATTERNS = {
  chrome: {
    pattern: /Chrome\/(\d+)/,
    requiredHeaders: ['sec-ch-ua', 'sec-ch-ua-mobile', 'sec-ch-ua-platform'],
    minVersion: 70, // Minimum expected modern version
    acceptPattern: /text\/html.*application\/xhtml\+xml.*application\/xml/,
  },
  firefox: {
    pattern: /Firefox\/(\d+)/,
    requiredHeaders: [],
    minVersion: 70,
    acceptPattern: /text\/html.*application\/xhtml\+xml/,
  },
  safari: {
    pattern: /Safari\/(\d+).*Version\/(\d+)/,
    requiredHeaders: [],
    minVersion: 13,
    acceptPattern: /text\/html.*application\/xhtml\+xml/,
  },
  edge: {
    pattern: /Edg\/(\d+)/,
    requiredHeaders: ['sec-ch-ua', 'sec-ch-ua-mobile', 'sec-ch-ua-platform'],
    minVersion: 79,
    acceptPattern: /text\/html.*application\/xhtml\+xml/,
  },
};

// ============================================
// Known Automation Tool Signatures
// ============================================

const AUTOMATION_SIGNATURES = {
  // Selenium WebDriver
  selenium: {
    uaPatterns: [/selenium/i, /webdriver/i],
    headerPatterns: [],
    jsProperties: ['webdriver', '__selenium'],
  },

  // Puppeteer/Playwright (Headless Chrome)
  puppeteer: {
    uaPatterns: [/HeadlessChrome/i, /puppeteer/i],
    headerPatterns: [],
    characteristics: {
      // Headless Chrome often has no plugins
      pluginsLength: 0,
      // Different languages array
      languagesLength: [0, 1],
    },
  },

  // PhantomJS
  phantom: {
    uaPatterns: [/PhantomJS/i],
    headerPatterns: [],
  },

  // curl/wget/HTTPie
  commandLine: {
    uaPatterns: [/^curl/i, /^wget/i, /^httpie/i, /^python-requests/i, /^axios/i],
    headerPatterns: [],
  },

  // Go http client
  golang: {
    uaPatterns: [/^Go-http-client/i, /^Go\//i],
    headerPatterns: [],
  },

  // Node.js HTTP clients
  nodejs: {
    uaPatterns: [/^node-fetch/i, /^node\//i, /^undici/i, /^got\//i],
    headerPatterns: [],
  },

  // Python libraries
  python: {
    uaPatterns: [/^python/i, /^aiohttp/i, /^httpx/i, /^scrapy/i],
    headerPatterns: [],
  },

  // Java libraries
  java: {
    uaPatterns: [/^Java\//i, /^Apache-HttpClient/i, /^okhttp/i],
    headerPatterns: [],
  },
};

// ============================================
// Header Order Analysis
// ============================================

// Real browsers have consistent header ordering
const BROWSER_HEADER_ORDERS = {
  chrome: [
    'host', 'connection', 'sec-ch-ua', 'sec-ch-ua-mobile', 'sec-ch-ua-platform',
    'upgrade-insecure-requests', 'user-agent', 'accept', 'sec-fetch-site',
    'sec-fetch-mode', 'sec-fetch-user', 'sec-fetch-dest', 'accept-encoding',
    'accept-language', 'cookie'
  ],
  firefox: [
    'host', 'user-agent', 'accept', 'accept-language', 'accept-encoding',
    'connection', 'upgrade-insecure-requests', 'cookie'
  ],
  safari: [
    'host', 'accept', 'sec-fetch-site', 'cookie', 'accept-language',
    'sec-fetch-mode', 'user-agent', 'accept-encoding', 'sec-fetch-dest'
  ],
};

// ============================================
// Main Fingerprint Analysis Function
// ============================================

/**
 * Analyze request fingerprint for inconsistencies
 * @param {Request} request - Incoming request
 * @param {Object} env - Environment bindings
 * @returns {Object} Fingerprint analysis result
 */
export async function analyzeFingerprintLayer(request, env) {
  const signals = [];
  let riskScore = 0;

  const headers = request.headers;
  const userAgent = headers.get('user-agent') || '';

  // ----------------------------------------
  // 1. User-Agent Analysis
  // ----------------------------------------
  const uaAnalysis = analyzeUserAgent(userAgent);
  signals.push(...uaAnalysis.signals);
  riskScore += uaAnalysis.risk;

  // ----------------------------------------
  // 2. Header Consistency Check
  // ----------------------------------------
  const headerAnalysis = analyzeHeaderConsistency(headers, uaAnalysis.browser);
  signals.push(...headerAnalysis.signals);
  riskScore += headerAnalysis.risk;

  // ----------------------------------------
  // 3. Accept Header Analysis
  // ----------------------------------------
  const acceptAnalysis = analyzeAcceptHeaders(headers, uaAnalysis.browser);
  signals.push(...acceptAnalysis.signals);
  riskScore += acceptAnalysis.risk;

  // ----------------------------------------
  // 4. Sec-CH-UA Analysis (Client Hints)
  // ----------------------------------------
  const clientHintsAnalysis = analyzeClientHints(headers, uaAnalysis);
  signals.push(...clientHintsAnalysis.signals);
  riskScore += clientHintsAnalysis.risk;

  // ----------------------------------------
  // 5. Automation Tool Detection
  // ----------------------------------------
  const automationAnalysis = detectAutomationTools(userAgent, headers);
  signals.push(...automationAnalysis.signals);
  riskScore += automationAnalysis.risk;

  // ----------------------------------------
  // 6. Header Order Analysis
  // ----------------------------------------
  const orderAnalysis = analyzeHeaderOrder(request, uaAnalysis.browser);
  signals.push(...orderAnalysis.signals);
  riskScore += orderAnalysis.risk;

  return {
    layer: 'fingerprint',
    riskScore: Math.min(riskScore, 100),
    signals,
    metadata: {
      browser: uaAnalysis.browser,
      browserVersion: uaAnalysis.version,
      platform: uaAnalysis.platform,
    }
  };
}

// ============================================
// User-Agent Analysis
// ============================================

function analyzeUserAgent(userAgent) {
  const signals = [];
  let risk = 0;
  let browser = null;
  let version = null;
  let platform = null;

  // Empty or very short UA
  if (!userAgent || userAgent.length < 20) {
    signals.push({
      type: 'ua-too-short',
      severity: 'high',
      detail: `User-Agent is ${userAgent?.length || 0} chars (suspicious)`
    });
    risk += 30;
    return { signals, risk, browser, version, platform };
  }

  // Detect browser type
  for (const [name, config] of Object.entries(UA_PATTERNS)) {
    const match = userAgent.match(config.pattern);
    if (match) {
      browser = name;
      version = parseInt(match[1], 10);
      break;
    }
  }

  // Check for very old browser versions (suspicious)
  if (browser && version) {
    const minVersion = UA_PATTERNS[browser]?.minVersion || 0;
    if (version < minVersion) {
      signals.push({
        type: 'ua-old-version',
        severity: 'medium',
        detail: `${browser} v${version} is suspiciously old (min expected: ${minVersion})`
      });
      risk += 15;
    }
  }

  // Detect platform
  if (/Windows NT/.test(userAgent)) {
    platform = 'windows';
  } else if (/Mac OS X/.test(userAgent)) {
    platform = 'macos';
  } else if (/Linux/.test(userAgent)) {
    platform = 'linux';
  } else if (/Android/.test(userAgent)) {
    platform = 'android';
  } else if (/iPhone|iPad/.test(userAgent)) {
    platform = 'ios';
  }

  // Check for impossible combinations
  if (browser === 'safari' && platform === 'windows') {
    signals.push({
      type: 'ua-impossible-combo',
      severity: 'high',
      detail: 'Safari on Windows is no longer supported'
    });
    risk += 25;
  }

  // Check for common spoofing patterns
  const spoofingPatterns = [
    { pattern: /Chrome.*Safari.*Firefox/, reason: 'Multiple browser names' },
    { pattern: /Linux.*Windows/, reason: 'Multiple OS names' },
    { pattern: /\(\s*\)/, reason: 'Empty parentheses' },
    { pattern: /Mozilla\/[0-4]\./, reason: 'Ancient Mozilla version' },
  ];

  for (const { pattern, reason } of spoofingPatterns) {
    if (pattern.test(userAgent)) {
      signals.push({
        type: 'ua-spoofing-pattern',
        severity: 'high',
        detail: reason
      });
      risk += 20;
    }
  }

  return { signals, risk, browser, version, platform };
}

// ============================================
// Header Consistency Analysis
// ============================================

function analyzeHeaderConsistency(headers, claimedBrowser) {
  const signals = [];
  let risk = 0;

  if (!claimedBrowser) {
    return { signals, risk };
  }

  const browserConfig = UA_PATTERNS[claimedBrowser];
  if (!browserConfig) {
    return { signals, risk };
  }

  // Check for required headers
  for (const requiredHeader of browserConfig.requiredHeaders) {
    if (!headers.get(requiredHeader)) {
      signals.push({
        type: 'missing-required-header',
        severity: 'medium',
        detail: `${claimedBrowser} should send "${requiredHeader}" header`
      });
      risk += 10;
    }
  }

  // Modern browsers always send these
  const universalHeaders = ['accept', 'accept-language', 'accept-encoding'];
  for (const header of universalHeaders) {
    if (!headers.get(header)) {
      signals.push({
        type: 'missing-universal-header',
        severity: 'high',
        detail: `Missing "${header}" header (all browsers send this)`
      });
      risk += 15;
    }
  }

  return { signals, risk };
}

// ============================================
// Accept Header Analysis
// ============================================

function analyzeAcceptHeaders(headers, claimedBrowser) {
  const signals = [];
  let risk = 0;

  const accept = headers.get('accept') || '';
  const acceptLanguage = headers.get('accept-language') || '';
  const acceptEncoding = headers.get('accept-encoding') || '';

  // Check Accept header format
  if (accept) {
    // Real browsers have complex Accept headers
    if (accept === '*/*') {
      signals.push({
        type: 'simple-accept',
        severity: 'medium',
        detail: 'Simple "*/*" Accept header (unusual for browsers)'
      });
      risk += 10;
    }

    // Check if matches expected browser pattern
    if (claimedBrowser) {
      const config = UA_PATTERNS[claimedBrowser];
      if (config?.acceptPattern && !config.acceptPattern.test(accept)) {
        signals.push({
          type: 'accept-mismatch',
          severity: 'low',
          detail: `Accept header doesn't match typical ${claimedBrowser} pattern`
        });
        risk += 5;
      }
    }
  }

  // Check Accept-Language
  if (acceptLanguage) {
    // Should have quality values for multiple languages
    if (!/;q=/.test(acceptLanguage) && acceptLanguage.includes(',')) {
      signals.push({
        type: 'lang-no-quality',
        severity: 'low',
        detail: 'Accept-Language has multiple values but no quality weights'
      });
      risk += 5;
    }

    // Check for overly simple language header
    if (/^[a-z]{2}$/.test(acceptLanguage)) {
      signals.push({
        type: 'lang-too-simple',
        severity: 'medium',
        detail: 'Overly simple Accept-Language (browsers include region codes)'
      });
      risk += 10;
    }
  }

  // Check Accept-Encoding
  if (acceptEncoding) {
    // Modern browsers support gzip, deflate, and usually br (brotli)
    if (!acceptEncoding.includes('gzip')) {
      signals.push({
        type: 'no-gzip',
        severity: 'medium',
        detail: 'No gzip in Accept-Encoding (all modern browsers support it)'
      });
      risk += 10;
    }
  }

  return { signals, risk };
}

// ============================================
// Client Hints Analysis
// ============================================

function analyzeClientHints(headers, uaAnalysis) {
  const signals = [];
  let risk = 0;

  // Only Chromium-based browsers send Client Hints
  const isChromium = ['chrome', 'edge'].includes(uaAnalysis.browser);

  if (!isChromium) {
    return { signals, risk };
  }

  const secChUa = headers.get('sec-ch-ua');
  const secChUaMobile = headers.get('sec-ch-ua-mobile');
  const secChUaPlatform = headers.get('sec-ch-ua-platform');

  // Chromium browsers (v89+) should send Client Hints
  if (uaAnalysis.version >= 89) {
    if (!secChUa) {
      signals.push({
        type: 'missing-client-hints',
        severity: 'high',
        detail: 'Chromium 89+ should send sec-ch-ua header'
      });
      risk += 20;
    }

    // Verify Client Hints match User-Agent
    if (secChUa && secChUaPlatform) {
      // Check for consistency
      const platformFromHints = secChUaPlatform.replace(/"/g, '').toLowerCase();
      const platformFromUa = uaAnalysis.platform;

      if (platformFromUa && platformFromHints) {
        const platformMap = {
          'windows': 'windows',
          'macos': 'macos',
          'linux': 'linux',
          'android': 'android',
        };

        if (platformMap[platformFromUa] !== platformFromHints &&
            platformFromHints !== 'unknown') {
          signals.push({
            type: 'client-hints-mismatch',
            severity: 'high',
            detail: `sec-ch-ua-platform "${platformFromHints}" doesn't match UA "${platformFromUa}"`
          });
          risk += 25;
        }
      }
    }
  }

  return { signals, risk };
}

// ============================================
// Automation Tool Detection
// ============================================

function detectAutomationTools(userAgent, headers) {
  const signals = [];
  let risk = 0;

  for (const [toolName, signature] of Object.entries(AUTOMATION_SIGNATURES)) {
    // Check UA patterns
    for (const pattern of signature.uaPatterns || []) {
      if (pattern.test(userAgent)) {
        signals.push({
          type: 'automation-tool-ua',
          severity: 'critical',
          detail: `User-Agent matches ${toolName} automation tool`
        });
        risk += 40;
      }
    }

    // Check header patterns
    for (const pattern of signature.headerPatterns || []) {
      for (const [name, value] of headers.entries()) {
        if (pattern.test(name) || pattern.test(value)) {
          signals.push({
            type: 'automation-tool-header',
            severity: 'critical',
            detail: `Header matches ${toolName} automation tool`
          });
          risk += 40;
        }
      }
    }
  }

  // Check for common automation headers
  const automationHeaders = [
    'x-puppeteer',
    'x-playwright',
    'x-selenium',
    'x-crawl',
    'x-scrape',
  ];

  for (const header of automationHeaders) {
    if (headers.get(header)) {
      signals.push({
        type: 'automation-header',
        severity: 'critical',
        detail: `Found automation header: ${header}`
      });
      risk += 35;
    }
  }

  return { signals, risk };
}

// ============================================
// Header Order Analysis
// ============================================

function analyzeHeaderOrder(request, claimedBrowser) {
  const signals = [];
  let risk = 0;

  // This is limited in Workers - we get headers as an iterator
  // In a full implementation, you'd compare against known patterns
  // Here we check for a few obvious issues

  const headers = request.headers;

  // Check if Host comes before User-Agent (most libraries do this wrong)
  // Note: In Workers, we can't reliably get header order
  // This is a placeholder for more sophisticated analysis

  // Check for unusual header presence/absence combinations
  const hasSecFetch = headers.get('sec-fetch-mode');
  const hasSecChUa = headers.get('sec-ch-ua');

  // If has sec-fetch but no sec-ch-ua on Chromium claim
  if (hasSecFetch && !hasSecChUa && claimedBrowser === 'chrome') {
    signals.push({
      type: 'inconsistent-sec-headers',
      severity: 'medium',
      detail: 'Has Sec-Fetch headers but missing Sec-CH-UA (Chromium inconsistency)'
    });
    risk += 15;
  }

  return { signals, risk };
}

// ============================================
// Fingerprint Comparison (for returning visitors)
// ============================================

/**
 * Compare current fingerprint with stored fingerprint
 * Useful for detecting fingerprint spoofing across requests
 */
export async function compareFingerprintHistory(currentFp, storedFp) {
  const changes = [];

  // Screen dimensions shouldn't change mid-session
  if (currentFp.screen?.width !== storedFp.screen?.width ||
      currentFp.screen?.height !== storedFp.screen?.height) {
    changes.push({ field: 'screen', severity: 'high' });
  }

  // Canvas fingerprint shouldn't change
  if (currentFp.canvas !== storedFp.canvas) {
    changes.push({ field: 'canvas', severity: 'high' });
  }

  // WebGL renderer shouldn't change
  if (currentFp.webgl?.renderer !== storedFp.webgl?.renderer) {
    changes.push({ field: 'webgl', severity: 'high' });
  }

  // Timezone shouldn't change
  if (currentFp.timezone?.name !== storedFp.timezone?.name) {
    changes.push({ field: 'timezone', severity: 'medium' });
  }

  return {
    hasChanges: changes.length > 0,
    changes,
    suspiciousChange: changes.some(c => c.severity === 'high')
  };
}
