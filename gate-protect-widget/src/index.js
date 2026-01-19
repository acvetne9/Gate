/**
 * Gate Protection Widget v1.3.0
 * Embeddable JavaScript widget for content protection
 *
 * NEW in v1.3.0:
 * - SIMPLIFIED: Now only requires API key (no site ID needed!)
 * - Backend automatically validates using API key
 * - Easier integration and setup
 *
 * Previous features:
 * - Enhanced bot detection with detailed analysis
 * - Comprehensive bot identification (name, vendor, version, category)
 * - Headless browser detection
 * - Detailed access attempt logging
 * - Comprehensive logging system
 * - Debug mode for troubleshooting
 * - Performance metrics
 * - Error tracking
 *
 * Usage:
 * <script
 *   src="https://cdn.jsdelivr.net/npm/gate-protect-widget@1/dist/gate-widget.min.js"
 *   data-api-key="YOUR_API_KEY"
 *   data-api-url="https://your-project.supabase.co/functions/v1"
 *   data-debug="true"
 *   async
 * ></script>
 */

(function() {
  'use strict';
  
  // Get configuration from script tag
  const script = document.currentScript || document.querySelector('script[data-api-key]');
  if (!script) {
    console.error('[Gate] Script tag not found');
    return;
  }
  
  // Default SEO-friendly bot allowlist
  const DEFAULT_ALLOWED_BOTS = [
    'googlebot',           // Google Search
    'bingbot',             // Bing Search
    'slurp',               // Yahoo
    'duckduckbot',         // DuckDuckGo
    'baiduspider',         // Baidu
    'yandexbot',           // Yandex
    'facebookexternalhit', // Facebook previews
    'twitterbot',          // Twitter cards
    'linkedinbot',         // LinkedIn previews
    'slackbot',            // Slack previews
    'telegrambot',         // Telegram previews
    'whatsapp',            // WhatsApp previews
    'discordbot',          // Discord previews
    'pinterestbot',        // Pinterest
    'redditbot',           // Reddit
    'applebot'             // Apple Spotlight
  ];
  
  const config = {
    apiKey: script.dataset.apiKey || script.getAttribute('data-api-key'),
    apiUrl: script.dataset.apiUrl || script.getAttribute('data-api-url'),
    mode: script.dataset.mode || 'auto',
    seoSafe: script.dataset.seoSafe !== 'false',
    allowBots: script.dataset.allowBots || null,
    protectBody: script.dataset.protectBody !== 'false',
    debug: script.dataset.debug === 'true' || script.dataset.debug === '1'
  };
  
  // Logging system
  const logger = {
    sessionId: 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    logs: [],
    startTime: performance.now(),
    
    log(level, message, data = {}) {
      const timestamp = new Date().toISOString();
      const elapsed = Math.round(performance.now() - this.startTime);
      
      const logEntry = {
        timestamp,
        elapsed,
        level,
        message,
        data,
        sessionId: this.sessionId
      };
      
      this.logs.push(logEntry);
      
      // Console output with color coding
      const prefix = '[GateProtect]';
      const timeInfo = config.debug ? ` [+${elapsed}ms]` : '';
      
      switch(level) {
        case 'info':
          console.log(`%c${prefix}${timeInfo} ${message}`, 'color: #3b82f6', data);
          break;
        case 'success':
          console.log(`%c${prefix}${timeInfo} ✓ ${message}`, 'color: #10b981; font-weight: bold', data);
          break;
        case 'warn':
          console.warn(`${prefix}${timeInfo} ⚠ ${message}`, data);
          break;
        case 'error':
          console.error(`${prefix}${timeInfo} ✗ ${message}`, data);
          break;
        case 'debug':
          if (config.debug) {
            console.log(`%c${prefix}${timeInfo} [DEBUG] ${message}`, 'color: #8b5cf6', data);
          }
          break;
      }
      
      // Keep only last 100 logs in memory
      if (this.logs.length > 100) {
        this.logs.shift();
      }
    },
    
    info(message, data) { this.log('info', message, data); },
    success(message, data) { this.log('success', message, data); },
    warn(message, data) { this.log('warn', message, data); },
    error(message, data) { this.log('error', message, data); },
    debug(message, data) { this.log('debug', message, data); },
    
    // Get all logs
    getAll() {
      return [...this.logs];
    },
    
    // Export logs as JSON
    export() {
      return JSON.stringify({
        sessionId: this.sessionId,
        config: {
          mode: config.mode,
          seoSafe: config.seoSafe,
          protectBody: config.protectBody,
          debug: config.debug
        },
        userAgent: navigator.userAgent,
        page: window.location.href,
        logs: this.logs,
        performance: {
          totalTime: Math.round(performance.now() - this.startTime),
          memory: performance.memory ? {
            used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + 'MB',
            total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024) + 'MB'
          } : 'N/A'
        }
      }, null, 2);
    },
    
    // Clear all logs
    clear() {
      this.logs = [];
      console.clear();
      this.info('Logs cleared');
    }
  };
  
  // Parse allowlist
  let allowedBots = [];
  if (config.seoSafe) {
    allowedBots = [...DEFAULT_ALLOWED_BOTS];
  }
  if (config.allowBots) {
    const customBots = config.allowBots.split(',').map(b => b.trim().toLowerCase());
    allowedBots = [...allowedBots, ...customBots];
    logger.info('Custom allowlist added', { bots: customBots });
  }
  
  // Validate configuration
  logger.info('Initializing Gate Protection Widget', {
    version: '1.3.0',
    mode: config.mode,
    seoSafe: config.seoSafe,
    protectBody: config.protectBody,
    debug: config.debug,
    allowedBotsCount: allowedBots.length
  });

  if (!config.apiKey) {
    logger.error('Missing required API key. Add data-api-key attribute to the script tag.', {
      hasApiKey: !!config.apiKey
    });
    return;
  }

  if (!config.apiUrl) {
    logger.error('Missing required API URL. Add data-api-url attribute to the script tag.', {
      hasApiUrl: !!config.apiUrl
    });
    return;
  }

  logger.success('Configuration validated');
  
  if (config.seoSafe) {
    logger.info('SEO-safe mode enabled', { allowedBots: allowedBots.length });
  }
  
  // Performance tracking
  const perf = {
    marks: {},
    
    mark(name) {
      this.marks[name] = performance.now();
      logger.debug(`Performance mark: ${name}`, { time: Math.round(this.marks[name]) + 'ms' });
    },
    
    measure(name, startMark) {
      const duration = Math.round(performance.now() - this.marks[startMark]);
      logger.debug(`Performance: ${name}`, { duration: duration + 'ms' });
      return duration;
    }
  };
  
  perf.mark('init_start');
  
  // Analyze user agent to extract bot details
  function analyzeBotUserAgent(ua) {
    const analysis = {
      name: 'Unknown',
      category: 'Unknown',
      version: 'Unknown',
      vendor: 'Unknown',
      isLikelyBot: false,
      indicators: []
    };
    
    const uaLower = ua.toLowerCase();
    
    // Bot detection patterns with detailed info
    const botPatterns = [
      { pattern: /googlebot\/(\d+\.\d+)/i, name: 'Googlebot', category: 'Search Engine', vendor: 'Google' },
      { pattern: /bingbot\/(\d+\.\d+)/i, name: 'Bingbot', category: 'Search Engine', vendor: 'Microsoft' },
      { pattern: /slurp/i, name: 'Yahoo Slurp', category: 'Search Engine', vendor: 'Yahoo' },
      { pattern: /duckduckbot\/(\d+\.\d+)/i, name: 'DuckDuckBot', category: 'Search Engine', vendor: 'DuckDuckGo' },
      { pattern: /baiduspider\/(\d+\.\d+)/i, name: 'Baiduspider', category: 'Search Engine', vendor: 'Baidu' },
      { pattern: /yandexbot\/(\d+\.\d+)/i, name: 'YandexBot', category: 'Search Engine', vendor: 'Yandex' },
      { pattern: /facebookexternalhit\/(\d+\.\d+)/i, name: 'Facebook External Hit', category: 'Social Media Crawler', vendor: 'Meta' },
      { pattern: /twitterbot\/(\d+\.\d+)/i, name: 'Twitterbot', category: 'Social Media Crawler', vendor: 'Twitter/X' },
      { pattern: /linkedinbot\/(\d+\.\d+)/i, name: 'LinkedInBot', category: 'Social Media Crawler', vendor: 'LinkedIn' },
      { pattern: /slackbot/i, name: 'Slackbot', category: 'Chat Platform Crawler', vendor: 'Slack' },
      { pattern: /telegrambot/i, name: 'TelegramBot', category: 'Chat Platform Crawler', vendor: 'Telegram' },
      { pattern: /whatsapp/i, name: 'WhatsApp', category: 'Chat Platform Crawler', vendor: 'Meta' },
      { pattern: /discordbot/i, name: 'Discordbot', category: 'Chat Platform Crawler', vendor: 'Discord' },
      { pattern: /pinterest/i, name: 'Pinterest Bot', category: 'Social Media Crawler', vendor: 'Pinterest' },
      { pattern: /redditbot/i, name: 'Reddit Bot', category: 'Social Media Crawler', vendor: 'Reddit' },
      { pattern: /applebot\/(\d+\.\d+)/i, name: 'Applebot', category: 'Search Engine', vendor: 'Apple' },
      { pattern: /bot|crawler|spider|scraper/i, name: 'Generic Bot', category: 'Automated Tool', vendor: 'Unknown' }
    ];
    
    for (const bot of botPatterns) {
      const match = ua.match(bot.pattern);
      if (match) {
        analysis.name = bot.name;
        analysis.category = bot.category;
        analysis.vendor = bot.vendor;
        analysis.version = match[1] || 'Unknown';
        analysis.isLikelyBot = true;
        analysis.indicators.push(`Matched pattern: ${bot.pattern}`);
        break;
      }
    }
    
    // Additional bot indicators
    if (uaLower.includes('bot')) analysis.indicators.push('Contains "bot" keyword');
    if (uaLower.includes('crawler')) analysis.indicators.push('Contains "crawler" keyword');
    if (uaLower.includes('spider')) analysis.indicators.push('Contains "spider" keyword');
    if (uaLower.includes('scraper')) analysis.indicators.push('Contains "scraper" keyword');
    if (navigator.webdriver) analysis.indicators.push('WebDriver detected');
    if (!uaLower.includes('mozilla')) analysis.indicators.push('No Mozilla signature');
    
    // Check for headless browsers
    if (uaLower.includes('headless')) {
      analysis.indicators.push('Headless browser detected');
      analysis.category = 'Headless Browser';
      analysis.isLikelyBot = true;
    }
    if (uaLower.includes('phantom')) {
      analysis.indicators.push('PhantomJS detected');
      analysis.name = 'PhantomJS';
      analysis.category = 'Headless Browser';
      analysis.isLikelyBot = true;
    }
    
    return analysis;
  }
  
  // Check if current request is from allowed bot
  function isAllowedBot() {
    perf.mark('allowlist_check_start');
    const ua = navigator.userAgent.toLowerCase();
    const fullUA = navigator.userAgent;
    
    // Extract detailed bot information
    const botAnalysis = analyzeBotUserAgent(fullUA);
    
    logger.debug('Checking user agent against allowlist', { 
      userAgent: fullUA,
      userAgentLower: ua,
      allowlistSize: allowedBots.length,
      botAnalysis: botAnalysis
    });
    
    for (const bot of allowedBots) {
      if (ua.includes(bot)) {
        perf.measure('Allowlist check complete', 'allowlist_check_start');
        logger.success('Allowed bot detected - Access granted', { 
          matchedBot: bot,
          botName: botAnalysis.name,
          botCategory: botAnalysis.category,
          botVersion: botAnalysis.version,
          botVendor: botAnalysis.vendor,
          fullUserAgent: fullUA,
          ipInfo: 'Not available in browser',
          referrer: document.referrer || 'Direct',
          pageAccessed: window.location.href,
          timestamp: new Date().toISOString(),
          sessionId: logger.sessionId
        });
        return true;
      }
    }
    
    perf.measure('Allowlist check complete', 'allowlist_check_start');
    logger.debug('Not in allowlist, will verify with server', {
      suspectedBot: botAnalysis.isLikelyBot,
      botIndicators: botAnalysis.indicators,
      userAgent: fullUA
    });
    return false;
  }
  
  // Browser fingerprinting
  function generateFingerprint() {
    perf.mark('fingerprint_start');
    logger.debug('Generating browser fingerprint');
    
    const fingerprint = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      hardwareConcurrency: navigator.hardwareConcurrency || 0,
      deviceMemory: navigator.deviceMemory || 0,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      screen: {
        width: window.screen.width,
        height: window.screen.height,
        colorDepth: window.screen.colorDepth,
        pixelRatio: window.devicePixelRatio || 1
      },
      timing: { pageLoadTime: Math.round(performance.now()) },
      webdriver: navigator.webdriver || false,
      canvas: getCanvasFingerprint(),
      webgl: getWebGLFingerprint(),
      touchSupport: 'ontouchstart' in window,
      plugins: getPluginsList()
    };
    
    perf.measure('Fingerprint generated', 'fingerprint_start');
    logger.debug('Fingerprint complete', {
      hasCanvas: !!fingerprint.canvas,
      hasWebGL: !!fingerprint.webgl,
      pluginCount: fingerprint.plugins.length,
      webdriver: fingerprint.webdriver
    });
    
    return fingerprint;
  }
  
  function getCanvasFingerprint() {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        logger.warn('Canvas context unavailable');
        return null;
      }
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('GateProtect', 2, 2);
      const result = canvas.toDataURL().substring(0, 100);
      logger.debug('Canvas fingerprint generated', { length: result.length });
      return result;
    } catch (e) {
      logger.error('Canvas fingerprint failed', { error: e.message });
      return null;
    }
  }
  
  function getWebGLFingerprint() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl');
      if (!gl) {
        logger.warn('WebGL context unavailable');
        return null;
      }
      const result = { 
        renderer: gl.getParameter(gl.RENDERER), 
        vendor: gl.getParameter(gl.VENDOR) 
      };
      logger.debug('WebGL fingerprint generated', result);
      return result;
    } catch (e) {
      logger.error('WebGL fingerprint failed', { error: e.message });
      return null;
    }
  }
  
  function getPluginsList() {
    try {
      const plugins = Array.from(navigator.plugins || []).map(p => p.name).slice(0, 5);
      logger.debug('Plugins enumerated', { count: plugins.length });
      return plugins;
    } catch (e) {
      logger.error('Plugin enumeration failed', { error: e.message });
      return [];
    }
  }
  
  // Proof-of-Work solver
  async function solvePow(challenge, difficulty) {
    logger.info('Solving PoW challenge', { difficulty });
    const prefix = '0'.repeat(difficulty);
    let nonce = 0;

    while (true) {
      const data = challenge + ':' + nonce;
      const msgBuffer = new TextEncoder().encode(data);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = new Uint8Array(hashBuffer);
      let hex = '';
      for (let i = 0; i < hashArray.length; i++) {
        hex += hashArray[i].toString(16).padStart(2, '0');
      }

      if (hex.startsWith(prefix)) {
        logger.success('PoW solved', { nonce });
        return { challenge: challenge, nonce: nonce, hash: hex };
      }
      nonce++;

      // Yield to main thread every 10k iterations
      if (nonce % 10000 === 0) {
        await new Promise(function(r) { setTimeout(r, 0); });
      }
    }
  }

  // API call to Supabase Edge Function
  async function checkAccess(powSolution) {
    perf.mark('api_call_start');
    const fullUA = navigator.userAgent;
    const botAnalysis = analyzeBotUserAgent(fullUA);
    
    logger.info('Calling API for access check', { 
      endpoint: config.apiUrl + '/check-access',
      botDetection: {
        isLikelyBot: botAnalysis.isLikelyBot,
        botName: botAnalysis.name,
        botCategory: botAnalysis.category
      }
    });
    
    try {
      const requestData = {
        apiKey: config.apiKey,
        page: window.location.pathname,
        fullUrl: window.location.href,
        userAgent: fullUA,
        fingerprint: generateFingerprint(),
        referrer: document.referrer,
        allowedBots: allowedBots,
        botAnalysis: botAnalysis,
        pageLoadTimestamp: performance.timeOrigin || Date.now(),
        accessAttempt: {
          timestamp: new Date().toISOString(),
          sessionId: logger.sessionId,
          pageTitle: document.title,
          protocol: window.location.protocol,
          hostname: window.location.hostname
        }
      };

      if (powSolution) {
        requestData.powSolution = powSolution;
      }

      logger.debug('API request payload with bot analysis', {
        page: requestData.page,
        hasFingerprint: !!requestData.fingerprint,
        allowedBotsCount: requestData.allowedBots.length,
        botAnalysis: {
          name: botAnalysis.name,
          category: botAnalysis.category,
          vendor: botAnalysis.vendor,
          version: botAnalysis.version,
          isLikelyBot: botAnalysis.isLikelyBot,
          indicators: botAnalysis.indicators
        }
      });
      
      const response = await fetch(config.apiUrl + '/check-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });
      
      const apiDuration = perf.measure('API call complete', 'api_call_start');
      
      if (!response.ok) {
        logger.error('API returned error status', { 
          status: response.status,
          statusText: response.statusText,
          duration: apiDuration + 'ms',
          botInfo: {
            name: botAnalysis.name,
            category: botAnalysis.category,
            userAgent: fullUA
          }
        });
        return { allowed: false, reason: 'API error', showGatewall: true };
      }
      
      const result = await response.json();

      // Handle PoW challenge - solve it and retry
      if (result.status === 'pow_required' && result.powChallenge) {
        logger.info('PoW challenge received, solving...');
        const solution = await solvePow(result.powChallenge.challenge, result.powChallenge.difficulty);
        return checkAccess(solution);
      }

      logger.success('API response received', {
        allowed: result.allowed,
        status: result.status,
        showGatewall: result.showGatewall,
        reason: result.reason,
        duration: apiDuration + 'ms',
        visitorInfo: {
          type: botAnalysis.isLikelyBot ? 'Bot' : 'Human',
          botName: botAnalysis.name,
          botCategory: botAnalysis.category,
          botVendor: botAnalysis.vendor,
          botVersion: botAnalysis.version,
          userAgent: fullUA
        }
      });
      
      // Log detailed access decision
      if (result.allowed) {
        logger.info('Access granted - Detailed breakdown', {
          visitor: botAnalysis.isLikelyBot ? 'Bot' : 'Human',
          botDetails: botAnalysis.isLikelyBot ? {
            name: botAnalysis.name,
            category: botAnalysis.category,
            vendor: botAnalysis.vendor,
            version: botAnalysis.version,
            indicators: botAnalysis.indicators
          } : null,
          decision: result.status,
          reason: result.reason,
          page: window.location.pathname,
          referrer: document.referrer || 'Direct'
        });
      } else {
        logger.warn('Access denied - Detailed breakdown', {
          visitor: botAnalysis.isLikelyBot ? 'Bot' : 'Human',
          botDetails: botAnalysis.isLikelyBot ? {
            name: botAnalysis.name,
            category: botAnalysis.category,
            vendor: botAnalysis.vendor,
            version: botAnalysis.version,
            indicators: botAnalysis.indicators
          } : null,
          decision: result.status,
          reason: result.reason,
          page: window.location.pathname,
          referrer: document.referrer || 'Direct',
          blockedAt: new Date().toISOString()
        });
      }
      
      return result;
    } catch (error) {
      const apiDuration = perf.measure('API call failed', 'api_call_start');
      logger.error('Network error during API call', { 
        error: error.message,
        stack: error.stack,
        duration: apiDuration + 'ms',
        botInfo: {
          isLikelyBot: botAnalysis.isLikelyBot,
          name: botAnalysis.name,
          userAgent: fullUA
        }
      });
      return { allowed: false, reason: 'Network error', showGatewall: true };
    }
  }
  
  // Create gate modal
  function createGateModal(cfg) {
    if (document.getElementById('gate-protect-modal')) {
      logger.warn('Gate modal already exists, skipping creation');
      return;
    }
    
    perf.mark('modal_create_start');
    logger.info('Creating gate modal', { type: cfg.type || 'hard' });
    
    const html = `
        <div class="gate-icon">🤖</div>
        <h2 id="gate-title">Access Denied</h2>
        <p>${cfg.message || 'Automated access is not permitted.'}</p>
      `;
    
    const modal = document.createElement('div');
    modal.id = 'gate-protect-modal';
    modal.innerHTML = `<div class="gate-overlay"><div class="gate-content">${html}</div></div>`;
    
    // Add styles
    if (!document.getElementById('gate-styles')) {
      const style = document.createElement('style');
      style.id = 'gate-styles';
      style.textContent = `
        #gate-protect-modal{position:fixed;top:0;left:0;width:100%;height:100%;z-index:999999;animation:fadeIn .3s}
        .gate-overlay{position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.85);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:20px}
        .gate-content{background:#fff;border-radius:16px;padding:48px 40px;max-width:500px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.3);animation:slideUp .3s}
        .gate-icon{font-size:64px;margin-bottom:24px}
        #gate-title{font-size:28px;font-weight:700;color:#1a1a1a;margin:0 0 16px 0}
        .gate-content p{font-size:16px;color:#666;line-height:1.6;margin:0 0 24px 0}
        .gate-btn{display:block;width:100%;padding:16px 32px;border:none;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer;transition:all .2s;margin-bottom:12px}
        .gate-btn.primary{background:#3b82f6;color:#fff}
        .gate-btn.primary:hover{background:#2563eb;transform:translateY(-1px)}
        .gate-btn.secondary{background:transparent;color:#666;border:2px solid #e5e7eb}
        .gate-btn.secondary:hover{background:#f9fafb}
        .footer{margin-top:24px;font-size:14px;color:#666}
        .footer a{color:#3b82f6;text-decoration:none}
        .footer a:hover{text-decoration:underline}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
      `;
      document.head.appendChild(style);
      logger.debug('Gate styles injected');
    }
    
    document.body.appendChild(modal);
    
    perf.measure('Modal created', 'modal_create_start');
    logger.success('Gate modal displayed');
  }
  
  // Blur protected content
  function blurContent() {
    perf.mark('blur_start');
    let elements = [];
    
    if (config.protectBody) {
      elements = [document.body];
      logger.info('Protecting entire page (body element)');
    } else {
      const contentSelectors = [
        'main', 'article', '[role="main"]', '.content',
        '.post-content', '.article-content', '.entry-content',
        '#content', '#main-content'
      ];
      
      logger.debug('Searching for content elements', { selectors: contentSelectors });
      
      for (const selector of contentSelectors) {
        const el = document.querySelector(selector);
        if (el) {
          elements = [el];
          logger.info('Content element found', { selector });
          break;
        }
      }
      
      if (elements.length === 0) {
        elements = [document.body];
        logger.warn('No content elements found, protecting body as fallback');
      }
    }
    
    // Apply protection
    let protectionCount = 0;
    elements.forEach(el => {
      el.style.filter = 'blur(8px)';
      el.style.userSelect = 'none';
      el.style.pointerEvents = 'none';
      
      // Prevent copying
      el.addEventListener('copy', (e) => {
        e.preventDefault();
        logger.debug('Copy attempt blocked');
      });
      el.addEventListener('cut', (e) => {
        e.preventDefault();
        logger.debug('Cut attempt blocked');
      });
      el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        logger.debug('Context menu blocked');
      });
      
      protectionCount++;
    });
    
    perf.measure('Content blurred', 'blur_start');
    logger.success('Content protection applied', {
      elementsProtected: protectionCount,
      protectionType: config.protectBody ? 'body' : 'selective'
    });
  }
  
  // Initialize
  async function init() {
    if (document.readyState === 'loading') {
      logger.debug('DOM not ready, waiting for DOMContentLoaded');
      document.addEventListener('DOMContentLoaded', init);
      return;
    }
    
    logger.info('DOM ready, starting protection sequence');
    
    if (config.mode === 'never') {
      logger.warn('Widget disabled (mode=never)');
      return;
    }
    
    // Pre-check: If this is an allowed bot, skip protection entirely
    if (isAllowedBot()) {
      logger.success('Allowed bot detected, skipping all protection');
      return;
    }
    
    if (config.mode === 'always') {
      logger.info('Force mode enabled (mode=always)');
      blurContent();
      createGateModal({ type: 'hard' });
      return;
    }
    
    const result = await checkAccess();
    logger.info('Access check decision received', {
      allowed: result.allowed,
      status: result.status,
      showGatewall: result.showGatewall
    });
    
    // Enhanced logging for bot access attempts
    const botAnalysis = analyzeBotUserAgent(navigator.userAgent);
    const accessLog = {
      timestamp: new Date().toISOString(),
      sessionId: logger.sessionId,
      page: {
        url: window.location.href,
        pathname: window.location.pathname,
        title: document.title,
        referrer: document.referrer || 'Direct'
      },
      visitor: {
        type: botAnalysis.isLikelyBot ? 'Bot' : 'Human',
        userAgent: navigator.userAgent,
        bot: botAnalysis.isLikelyBot ? {
          name: botAnalysis.name,
          category: botAnalysis.category,
          vendor: botAnalysis.vendor,
          version: botAnalysis.version,
          indicators: botAnalysis.indicators,
          inAllowlist: allowedBots.some(bot => navigator.userAgent.toLowerCase().includes(bot))
        } : null
      },
      decision: {
        allowed: result.allowed,
        status: result.status,
        reason: result.reason,
        showGatewall: result.showGatewall
      }
    };

    if (!result.allowed && result.status === 'payment_required') {
      logger.warn('Payment required for bot access', { 
        ...accessLog,
        paymentUrl: result.paymentUrl,
        message: 'Bot requires paid access to view content'
      });
      // Redirect bot to payment page
      if (result.paymentUrl) {
        window.location.href = result.paymentUrl;
      } else {
        blurContent();
        createGateModal({ type: 'bot-blocked', message: result.reason });
      }
    } else if (!result.allowed && result.status === 'blocked') {
      logger.warn('Access blocked', { 
        ...accessLog,
        blockReason: result.reason
      });
      blurContent();
      createGateModal({ type: 'bot-blocked', message: result.reason });
    } else {
      logger.success('Access granted, no protection applied', accessLog);
    }
    
    const totalTime = perf.measure('Initialization complete', 'init_start');
    logger.success('GateProtect initialization complete', {
      totalTime: totalTime + 'ms'
    });
  }
  
  init();
  
  // Public API
  window.GateProtect = {
    version: '1.3.0',
    
    checkAccess: checkAccess,
    
    reload: () => {
      logger.info('Manual reload() called');
      init();
    },
    
    config: config,
    allowedBots: allowedBots,
    
    // Logging API
    logs: {
      getAll: () => logger.getAll(),
      export: () => logger.export(),
      clear: () => logger.clear(),
      download: () => {
        const data = logger.export();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gate-logs-${logger.sessionId}.json`;
        a.click();
        URL.revokeObjectURL(url);
        logger.info('Logs downloaded');
      }
    },
    
    // Debug helpers
    debug: {
      enable: () => {
        config.debug = true;
        logger.success('Debug mode enabled');
      },
      disable: () => {
        config.debug = false;
        logger.info('Debug mode disabled');
      },
      status: () => {
        console.table({
          'Version': window.GateProtect.version,
          'Session ID': logger.sessionId,
          'Mode': config.mode,
          'SEO Safe': config.seoSafe,
          'Protect Body': config.protectBody,
          'Debug Mode': config.debug,
          'Allowed Bots': allowedBots.length,
          'Total Logs': logger.logs.length,
          'Uptime': Math.round(performance.now() - logger.startTime) + 'ms'
        });
      }
    }
  };
  
  logger.success('Public API initialized', {
    methods: Object.keys(window.GateProtect)
  });
  
})();