/**
 * Gate Protection System v3.0
 * Comprehensive bot detection and gate enforcement
 *
 * STRATEGIES IMPLEMENTED:
 * 1. Server-side gate (CSS-based, shows by default)
 * 2. JS-required content loading
 * 3. Behavioral challenge system
 * 4. Honeypot trap detection
 * 5. Content obfuscation/decoding
 * 6. Advanced fingerprinting
 * 7. Rate limiting detection
 *
 * IMPORTANT: Place this script in the <head> section, NOT before </body>
 * This ensures the gate loads immediately before content renders.
 *
 * Usage:
 * <head>
 *   <script src="gate-protection-v3.js" data-api-key="YOUR_API_KEY"></script>
 * </head>
 * <body>
 *   <main data-gate-protect>Your protected content</main>
 * </body>
 */

(function() {
  'use strict';

  // ============================================
  // CONFIGURATION
  // ============================================
  const config = {
    apiKey: null,
    supabaseUrl: 'https://bakzzkadgmyvvvnpuvki.supabase.co',
    checkEndpoint: '/functions/v1/check-access',
    botPaymentUrl: null,
    debug: false
  };

  // ============================================
  // BEHAVIORAL TRACKING
  // ============================================
  const behavior = {
    mouseMovements: 0,
    mousePath: [],
    clicks: 0,
    scrollEvents: 0,
    scrollDepth: 0,
    keyPresses: 0,
    touchEvents: 0,
    timeOnPage: 0,
    pageLoadTime: Date.now(),
    focusChanges: 0,
    hasInteracted: false,
    interactionTimestamp: null,
    // Advanced behavioral metrics
    mouseSpeed: [],
    clickPatterns: [],
    scrollPatterns: []
  };

  // Track mouse movements
  let lastMousePos = { x: 0, y: 0, time: Date.now() };
  document.addEventListener('mousemove', function(e) {
    behavior.mouseMovements++;
    behavior.hasInteracted = true;
    if (!behavior.interactionTimestamp) {
      behavior.interactionTimestamp = Date.now();
    }

    // Track mouse path (sample every 10th movement)
    if (behavior.mouseMovements % 10 === 0) {
      const now = Date.now();
      const distance = Math.sqrt(
        Math.pow(e.clientX - lastMousePos.x, 2) +
        Math.pow(e.clientY - lastMousePos.y, 2)
      );
      const timeDiff = now - lastMousePos.time;
      const speed = timeDiff > 0 ? distance / timeDiff : 0;

      behavior.mouseSpeed.push(speed);
      behavior.mousePath.push({ x: e.clientX, y: e.clientY, t: now });

      // Keep only last 50 samples
      if (behavior.mousePath.length > 50) behavior.mousePath.shift();
      if (behavior.mouseSpeed.length > 50) behavior.mouseSpeed.shift();

      lastMousePos = { x: e.clientX, y: e.clientY, time: now };
    }
  });

  // Track clicks
  document.addEventListener('click', function(e) {
    behavior.clicks++;
    behavior.hasInteracted = true;
    if (!behavior.interactionTimestamp) {
      behavior.interactionTimestamp = Date.now();
    }
    behavior.clickPatterns.push({
      x: e.clientX,
      y: e.clientY,
      t: Date.now(),
      target: e.target.tagName
    });
    if (behavior.clickPatterns.length > 20) behavior.clickPatterns.shift();
  });

  // Track scrolling
  document.addEventListener('scroll', function() {
    behavior.scrollEvents++;
    behavior.hasInteracted = true;
    if (!behavior.interactionTimestamp) {
      behavior.interactionTimestamp = Date.now();
    }

    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    behavior.scrollDepth = Math.max(behavior.scrollDepth, (scrollTop / docHeight) * 100);

    behavior.scrollPatterns.push({
      position: scrollTop,
      t: Date.now()
    });
    if (behavior.scrollPatterns.length > 30) behavior.scrollPatterns.shift();
  });

  // Track keyboard
  document.addEventListener('keydown', function() {
    behavior.keyPresses++;
    behavior.hasInteracted = true;
    if (!behavior.interactionTimestamp) {
      behavior.interactionTimestamp = Date.now();
    }
  });

  // Track touch events (mobile)
  document.addEventListener('touchstart', function() {
    behavior.touchEvents++;
    behavior.hasInteracted = true;
    if (!behavior.interactionTimestamp) {
      behavior.interactionTimestamp = Date.now();
    }
  });

  // Track focus changes
  document.addEventListener('visibilitychange', function() {
    behavior.focusChanges++;
  });

  // Update time on page
  setInterval(function() {
    behavior.timeOnPage = Math.round((Date.now() - behavior.pageLoadTime) / 1000);
  }, 1000);

  // ============================================
  // HONEYPOT SYSTEM
  // ============================================
  const honeypot = {
    triggered: false,
    triggerReason: null
  };

  function createHoneypots() {
    // Create invisible honeypot links that only bots would follow
    const honeypotLinks = [
      { href: '/.gate/trap/pricing', text: 'Special Pricing' },
      { href: '/.gate/trap/admin', text: 'Admin Panel' },
      { href: '/.gate/trap/api', text: 'API Access' },
      { href: '/.gate/trap/download', text: 'Download Content' }
    ];

    const container = document.createElement('div');
    container.id = 'gate-honeypot-container';
    container.setAttribute('aria-hidden', 'true');
    container.style.cssText = `
      position: absolute;
      left: -9999px;
      top: -9999px;
      width: 1px;
      height: 1px;
      overflow: hidden;
      opacity: 0;
      pointer-events: none;
    `;

    honeypotLinks.forEach(function(link) {
      const a = document.createElement('a');
      a.href = link.href;
      a.textContent = link.text;
      a.addEventListener('click', function(e) {
        e.preventDefault();
        honeypot.triggered = true;
        honeypot.triggerReason = 'honeypot_link_clicked';
        log('Honeypot triggered: link clicked - redirecting');
        const paymentUrl = 'https://security-gate.lovable.app/bot-payment?reason=honeypot_link&return=' + encodeURIComponent(window.location.href);
        location.replace(paymentUrl);
      });
      container.appendChild(a);
    });

    // Create honeypot form field
    const form = document.createElement('form');
    form.style.cssText = container.style.cssText;
    const input = document.createElement('input');
    input.type = 'text';
    input.name = 'gate_hp_field';
    input.id = 'gate_hp_field';
    input.tabIndex = -1;
    input.autocomplete = 'off';
    input.addEventListener('input', function() {
      honeypot.triggered = true;
      honeypot.triggerReason = 'honeypot_field_filled';
      log('Honeypot triggered: field filled - redirecting');
      const paymentUrl = 'https://security-gate.lovable.app/bot-payment?reason=honeypot_field&return=' + encodeURIComponent(window.location.href);
      location.replace(paymentUrl);
    });
    form.appendChild(input);
    container.appendChild(form);

    document.body.appendChild(container);
  }

  // ============================================
  // CONTENT OBFUSCATION
  // ============================================
  const obfuscation = {
    key: null,
    originalContent: new Map()
  };

  // Simple XOR-based obfuscation (for demo - use stronger encryption in production)
  function obfuscateContent(text, key) {
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return btoa(result);
  }

  function deobfuscateContent(encoded, key) {
    try {
      const decoded = atob(encoded);
      let result = '';
      for (let i = 0; i < decoded.length; i++) {
        result += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
      }
      return result;
    } catch (e) {
      return null;
    }
  }

  // Find and protect content marked with data-gate-protect
  function protectContent() {
    const protectedElements = document.querySelectorAll('[data-gate-protect]');

    protectedElements.forEach(function(el, index) {
      const content = el.innerHTML;
      const elementId = 'gate-protected-' + index;

      // Store original content
      obfuscation.originalContent.set(elementId, content);

      // Replace with placeholder
      el.setAttribute('data-gate-id', elementId);
      el.innerHTML = `
        <div class="gate-content-placeholder" style="
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: gate-shimmer 1.5s infinite;
          min-height: 100px;
          border-radius: 4px;
        "></div>
      `;
    });

    // Add shimmer animation
    if (protectedElements.length > 0) {
      const style = document.createElement('style');
      style.textContent = `
        @keyframes gate-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `;
      document.head.appendChild(style);
    }
  }

  function revealContent() {
    obfuscation.originalContent.forEach(function(content, elementId) {
      const el = document.querySelector('[data-gate-id="' + elementId + '"]');
      if (el) {
        el.innerHTML = content;
        el.removeAttribute('data-gate-id');
      }
    });
  }

  // ============================================
  // FINGERPRINTING (Enhanced)
  // ============================================
  function generateFingerprint() {
    const fp = {
      // Basic
      userAgent: navigator.userAgent,
      language: navigator.language,
      languages: navigator.languages ? Array.from(navigator.languages) : [navigator.language],
      platform: navigator.platform,
      vendor: navigator.vendor,
      cookieEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack,
      // Chrome object detection (headless often lacks this)
      hasChrome: !!(window.chrome && (window.chrome.runtime || window.chrome.loadTimes)),

      // Screen
      screen: {
        width: window.screen.width,
        height: window.screen.height,
        availWidth: window.screen.availWidth,
        availHeight: window.screen.availHeight,
        colorDepth: window.screen.colorDepth,
        pixelDepth: window.screen.pixelDepth,
        devicePixelRatio: window.devicePixelRatio
      },

      // Time
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timezoneOffset: new Date().getTimezoneOffset(),

      // Hardware
      hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemory: navigator.deviceMemory,
      maxTouchPoints: navigator.maxTouchPoints,

      // Canvas
      canvas: getCanvasFingerprint(),

      // WebGL
      webgl: getWebGLFingerprint(),

      // Audio
      audio: getAudioFingerprint(),

      // Fonts
      fonts: detectFonts(),

      // Plugins
      plugins: Array.from(navigator.plugins || []).map(function(p) { return p.name; }),

      // Storage
      hasLocalStorage: testStorage('localStorage'),
      hasSessionStorage: testStorage('sessionStorage'),
      hasIndexedDB: !!window.indexedDB,

      // Features
      hasWebRTC: !!window.RTCPeerConnection,
      hasWebGL: !!document.createElement('canvas').getContext('webgl'),
      hasWebGL2: !!document.createElement('canvas').getContext('webgl2'),

      // Bot indicators
      webdriver: navigator.webdriver,
      phantom: !!window._phantom || !!window.phantom,
      nightmare: !!window.__nightmare,
      selenium: !!window._selenium || !!window._Selenium_IDE_Recorder,
      puppeteer: !!window.__puppeteer_evaluation_script__,

      // Automation indicators
      automationControlled: navigator.webdriver ||
        !!window.callPhantom ||
        !!window._phantom ||
        !!window.domAutomation ||
        !!window.domAutomationController
    };

    return fp;
  }

  function getCanvasFingerprint() {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 50;
      const ctx = canvas.getContext('2d');

      // Text with specific font
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('Gate Protection v3', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('Bot Detection', 4, 17);

      // Geometric shapes
      ctx.beginPath();
      ctx.arc(50, 25, 10, 0, Math.PI * 2);
      ctx.fill();

      return canvas.toDataURL().slice(-100);
    } catch (e) {
      return null;
    }
  }

  function getWebGLFingerprint() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) return null;

      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');

      return {
        vendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
        renderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
        version: gl.getParameter(gl.VERSION),
        shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
        maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
        maxVertexAttribs: gl.getParameter(gl.MAX_VERTEX_ATTRIBS)
      };
    } catch (e) {
      return null;
    }
  }

  function getAudioFingerprint() {
    try {
      const AudioContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      if (!AudioContext) return null;

      const context = new AudioContext(1, 44100, 44100);
      const oscillator = context.createOscillator();
      const compressor = context.createDynamicsCompressor();

      oscillator.type = 'triangle';
      oscillator.frequency.value = 10000;

      compressor.threshold.value = -50;
      compressor.knee.value = 40;
      compressor.ratio.value = 12;
      compressor.attack.value = 0;
      compressor.release.value = 0.25;

      oscillator.connect(compressor);
      compressor.connect(context.destination);
      oscillator.start(0);
      context.startRendering();

      return 'audio_supported';
    } catch (e) {
      return null;
    }
  }

  function detectFonts() {
    const baseFonts = ['monospace', 'sans-serif', 'serif'];
    const testFonts = [
      'Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Verdana',
      'Georgia', 'Comic Sans MS', 'Impact', 'Lucida Console'
    ];

    const detected = [];
    const testString = 'mmmmmmmmmmlli';
    const testSize = '72px';

    const span = document.createElement('span');
    span.style.position = 'absolute';
    span.style.left = '-9999px';
    span.style.fontSize = testSize;
    span.innerHTML = testString;
    document.body.appendChild(span);

    const defaultWidths = {};
    baseFonts.forEach(function(font) {
      span.style.fontFamily = font;
      defaultWidths[font] = span.offsetWidth;
    });

    testFonts.forEach(function(font) {
      baseFonts.forEach(function(baseFont) {
        span.style.fontFamily = '"' + font + '",' + baseFont;
        if (span.offsetWidth !== defaultWidths[baseFont]) {
          detected.push(font);
        }
      });
    });

    document.body.removeChild(span);
    return [...new Set(detected)];
  }

  function testStorage(type) {
    try {
      const storage = window[type];
      const x = '__gate_test__';
      storage.setItem(x, x);
      storage.removeItem(x);
      return true;
    } catch (e) {
      return false;
    }
  }

  // ============================================
  // BOT DETECTION ANALYSIS
  // ============================================
  function analyzeBehavior() {
    const timeOnPage = behavior.timeOnPage;
    const score = {
      value: 0,
      reasons: [],
      isBot: false
    };

    // Check 1: No mouse movement after significant time
    if (timeOnPage > 5 && behavior.mouseMovements < 3) {
      score.value += 30;
      score.reasons.push('no_mouse_movement');
    }

    // Check 2: No scroll events on long page
    const isLongPage = document.body.scrollHeight > window.innerHeight * 1.5;
    if (isLongPage && timeOnPage > 10 && behavior.scrollEvents < 1) {
      score.value += 20;
      score.reasons.push('no_scroll_on_long_page');
    }

    // Check 3: Instant interaction (too fast for human)
    if (behavior.interactionTimestamp) {
      const reactionTime = behavior.interactionTimestamp - behavior.pageLoadTime;
      if (reactionTime < 100) { // Less than 100ms is suspicious
        score.value += 40;
        score.reasons.push('instant_interaction');
      }
    }

    // Check 4: Perfectly linear mouse movement (bot pattern)
    if (behavior.mousePath.length > 10) {
      const isLinear = checkLinearMovement(behavior.mousePath);
      if (isLinear) {
        score.value += 35;
        score.reasons.push('linear_mouse_movement');
      }
    }

    // Check 5: Consistent mouse speed (humans vary)
    if (behavior.mouseSpeed.length > 5) {
      const speedVariance = calculateVariance(behavior.mouseSpeed);
      if (speedVariance < 0.01) { // Very consistent = suspicious
        score.value += 25;
        score.reasons.push('consistent_mouse_speed');
      }
    }

    // Check 6: No interaction at all after timeout
    if (timeOnPage > 15 && !behavior.hasInteracted) {
      score.value += 50;
      score.reasons.push('no_interaction');
    }

    // Check 7: Honeypot triggered
    if (honeypot.triggered) {
      score.value += 100;
      score.reasons.push(honeypot.triggerReason);
    }

    score.isBot = score.value >= 50;
    return score;
  }

  function checkLinearMovement(path) {
    if (path.length < 5) return false;

    // Check if points roughly form a straight line
    let linearCount = 0;
    for (let i = 2; i < path.length; i++) {
      const expectedX = path[i-2].x + (path[i-1].x - path[i-2].x) * 2;
      const expectedY = path[i-2].y + (path[i-1].y - path[i-2].y) * 2;
      const actualX = path[i].x;
      const actualY = path[i].y;

      const deviation = Math.sqrt(Math.pow(expectedX - actualX, 2) + Math.pow(expectedY - actualY, 2));
      if (deviation < 10) linearCount++;
    }

    return linearCount / (path.length - 2) > 0.8;
  }

  function calculateVariance(arr) {
    const mean = arr.reduce(function(a, b) { return a + b; }, 0) / arr.length;
    const squaredDiffs = arr.map(function(x) { return Math.pow(x - mean, 2); });
    return squaredDiffs.reduce(function(a, b) { return a + b; }, 0) / arr.length;
  }

  // ============================================
  // GATE DISPLAY
  // ============================================
  function showGatewall(options) {
    options = options || {};

    // Remove any existing gate first
    const existing = document.getElementById('gate-gate-overlay');
    if (existing) existing.remove();

    const paymentUrl = options.paymentUrl || config.botPaymentUrl ||
      location.origin + '/bot-payment?apiKey=' + encodeURIComponent(config.apiKey) +
      '&page=' + encodeURIComponent(window.location.pathname) +
      '&return=' + encodeURIComponent(window.location.href);

    const overlay = document.createElement('div');
    overlay.id = 'gate-gate-overlay';
    overlay.innerHTML = `
      <style>
        #gate-gate-overlay {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          background: rgba(0, 0, 0, 0.97) !important;
          z-index: 2147483647 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        }
        #gate-gate-modal {
          background: white !important;
          border: 3px solid black !important;
          padding: 48px !important;
          max-width: 560px !important;
          width: 90% !important;
          text-align: center !important;
          box-shadow: 0 25px 50px rgba(0,0,0,0.5) !important;
        }
        #gate-gate-modal h2 {
          font-size: 28px !important;
          margin: 0 0 16px 0 !important;
          font-weight: 800 !important;
          color: #000 !important;
        }
        #gate-gate-modal p {
          font-size: 16px !important;
          color: #444 !important;
          margin: 0 0 24px 0 !important;
          line-height: 1.6 !important;
        }
        #gate-gate-modal .gate-btn {
          background: black !important;
          color: white !important;
          border: none !important;
          padding: 16px 48px !important;
          font-size: 16px !important;
          font-weight: 700 !important;
          cursor: pointer !important;
          transition: all 0.2s !important;
          text-decoration: none !important;
          display: inline-block !important;
        }
        #gate-gate-modal .gate-btn:hover {
          background: #333 !important;
          transform: translateY(-2px) !important;
        }
        #gate-gate-modal .gate-url-box {
          background: #f5f5f5 !important;
          border: 1px solid #ddd !important;
          padding: 12px 16px !important;
          margin: 20px 0 !important;
          font-family: monospace !important;
          font-size: 13px !important;
          color: #333 !important;
          word-break: break-all !important;
        }
        #gate-gate-modal .gate-reason {
          font-size: 12px !important;
          color: #888 !important;
          margin-top: 20px !important;
        }
        #gate-gate-modal .gate-divider {
          border-top: 1px solid #eee !important;
          margin: 24px 0 !important;
        }
      </style>
      <div id="gate-gate-modal">
        <h2>${options.title || 'Automated Access Detected'}</h2>
        <p>${options.message || 'This content is protected. Automated access requires a valid subscription.'}</p>
        <a href="${paymentUrl}" class="gate-btn">
          ${options.buttonText || 'Subscribe for Access'}
        </a>
        <div class="gate-divider"></div>
        <div style="font-size: 14px; color: #666; margin-bottom: 8px;">Or visit directly:</div>
        <div class="gate-url-box">
          ${paymentUrl}
        </div>
        <div class="gate-reason">
          ${options.reason ? 'Detection: ' + options.reason : 'Protected by Gate'}
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Also blur the content behind
    document.body.style.overflow = 'hidden';
    const mainContent = document.querySelector('main, article, .content, #content, #main');
    if (mainContent) {
      mainContent.style.filter = 'blur(10px)';
      mainContent.style.userSelect = 'none';
      mainContent.style.pointerEvents = 'none';
    }

    log('Gate displayed', options);
  }

  function hideGate() {
    const overlay = document.getElementById('gate-gate-overlay');
    if (overlay) overlay.remove();

    document.body.style.overflow = '';
    const mainContent = document.querySelector('main, article, .content, #content, #main');
    if (mainContent) {
      mainContent.style.filter = '';
      mainContent.style.userSelect = '';
      mainContent.style.pointerEvents = '';
    }
  }

  // ============================================
  // PROOF-OF-WORK SOLVER
  // ============================================
  async function solvePow(challenge, difficulty) {
    log('Solving PoW challenge, difficulty:', difficulty);
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
        log('PoW solved, nonce:', nonce);
        return { challenge: challenge, nonce: nonce, hash: hex };
      }
      nonce++;

      // Yield to main thread every 10k iterations to avoid blocking UI
      if (nonce % 10000 === 0) {
        await new Promise(function(r) { setTimeout(r, 0); });
      }
    }
  }

  // ============================================
  // SERVER COMMUNICATION
  // ============================================
  async function checkAccess(powSolution) {
    const fingerprint = generateFingerprint();
    const behaviorData = {
      mouseMovements: behavior.mouseMovements,
      scrollEvents: behavior.scrollEvents,
      clicks: behavior.clicks,
      timeOnPage: behavior.timeOnPage,
      hasInteracted: behavior.hasInteracted
    };

    var requestBody = {
      apiKey: config.apiKey,
      page: window.location.pathname,
      fullUrl: window.location.href,
      userAgent: navigator.userAgent,
      fingerprint: fingerprint,
      behavior: behaviorData,
      referrer: document.referrer,
      honeypotTriggered: honeypot.triggered,
      pageLoadTimestamp: behavior.pageLoadTime
    };

    if (powSolution) {
      requestBody.powSolution = powSolution;
    }

    try {
      const response = await fetch(config.supabaseUrl + config.checkEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const result = await response.json();

      // Handle PoW challenge - solve it and retry
      if (result.status === 'pow_required' && result.powChallenge) {
        log('PoW challenge received, solving...');
        var solution = await solvePow(result.powChallenge.challenge, result.powChallenge.difficulty);
        return checkAccess(solution);
      }

      if (result.allowed === false || result.showGatewall) {
        // HARD REDIRECT for bots - no CSS tricks, actual redirect
        const paymentUrl = result.paymentUrl || result.gateConfig?.paymentUrl ||
          ('https://security-gate.lovable.app/bot-payment?reason=' + encodeURIComponent(result.reason || 'bot_detected') +
           '&return=' + encodeURIComponent(window.location.href));
        log('Bot detected, redirecting to:', paymentUrl);
        location.replace(paymentUrl);
        return { allowed: false, redirected: true };
      } else {
        // Access granted - reveal protected content
        hideGate();
        revealContent();
        log('Access granted');
      }

      return result;
    } catch (error) {
      console.error('[Gate] Error checking access:', error);
      // On error, show gate (fail closed) - don't give free access on network manipulation
      showGatewall({
        title: 'Verification Failed',
        message: 'Unable to verify access. Please refresh the page to try again.',
        buttonText: 'Refresh',
        reason: 'network_error'
      });
      return { allowed: false, error: error.message };
    }
  }

  // ============================================
  // INITIALIZATION
  // ============================================
  function log() {
    if (config.debug) {
      console.log.apply(console, ['[Gate]'].concat(Array.from(arguments)));
    }
  }

  function init() {
    const script = document.currentScript || document.querySelector('script[data-api-key]');

    if (!script) {
      console.error('[Gate] Widget script not found');
      return;
    }

    config.apiKey = script.getAttribute('data-api-key');
    config.supabaseUrl = script.getAttribute('data-supabase-url') || config.supabaseUrl;
    config.botPaymentUrl = script.getAttribute('data-payment-url');
    config.debug = script.hasAttribute('data-debug');

    if (!config.apiKey) {
      console.error('[Gate] API key is required. Add data-api-key attribute to the script tag.');
      return;
    }

    log('Gate Protection v3 initializing...');

    // Step 1: Create honeypots
    createHoneypots();
    log('Honeypots created');

    // Step 2: Protect content
    protectContent();
    log('Content protected');

    // Step 3: Run behavioral challenge
    // Wait for behavioral data to accumulate, then check
    setTimeout(function() {
      const behaviorScore = analyzeBehavior();
      log('Behavior analysis:', behaviorScore);

      if (behaviorScore.isBot) {
        // Definite bot detected from behavior - HARD REDIRECT
        const reason = behaviorScore.reasons.join(', ');
        const paymentUrl = 'https://security-gate.lovable.app/bot-payment?reason=' + encodeURIComponent(reason) +
          '&return=' + encodeURIComponent(window.location.href);
        log('Bot behavior detected, redirecting to:', paymentUrl);
        location.replace(paymentUrl);
        return;
      } else {
        // Check with server
        checkAccess();
      }
    }, 3000); // Wait 3 seconds to gather behavioral data

    log('Gate Protection v3 initialized');
  }

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ============================================
  // PUBLIC API
  // ============================================
  window.GateProtection = {
    version: '3.0.0',
    checkAccess: checkAccess,
    showGatewall: showGatewall,
    hideGate: hideGate,
    getBehavior: function() { return behavior; },
    getFingerprint: generateFingerprint,
    analyzeBehavior: analyzeBehavior,
    revealContent: revealContent
  };

})();
