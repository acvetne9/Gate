/**
 * Browser Layer Detection
 * =======================
 * Verifies requests come from real browsers with JavaScript execution:
 * - JavaScript challenge (proof-of-work)
 * - Browser API verification
 * - Canvas/WebGL fingerprinting
 * - DOM environment checks
 *
 * This layer issues challenges that headless browsers and HTTP clients fail.
 */

// ============================================
// Challenge Configuration
// ============================================

const CHALLENGE_CONFIG = {
  // Challenge difficulty (iterations for proof-of-work)
  difficulty: 3, // Number of leading zeros required in hash

  // Challenge validity duration (ms)
  challengeTTL: 60000, // 1 minute to solve

  // Solution validity duration (ms)
  solutionTTL: 3600000, // 1 hour after solving

  // Cookie name for storing solution
  cookieName: '__pw_verified',

  // Challenge page path
  challengePath: '/__challenge',
};

// ============================================
// Challenge Issuance
// ============================================

/**
 * Check if request has valid challenge solution
 * @param {Request} request - Incoming request
 * @param {Object} env - Environment bindings
 * @returns {Object} { verified: boolean, needsChallenge: boolean }
 */
export async function checkBrowserChallenge(request, env) {
  // Check for solution cookie
  const cookies = parseCookies(request.headers.get('cookie') || '');
  const solutionToken = cookies[CHALLENGE_CONFIG.cookieName];

  if (solutionToken) {
    // Verify the solution token
    const isValid = await verifySolutionToken(solutionToken, env);
    if (isValid) {
      return { verified: true, needsChallenge: false };
    }
  }

  // Check for challenge response in URL (after solving)
  const url = new URL(request.url);
  const challengeResponse = url.searchParams.get('__pw_response');

  if (challengeResponse) {
    const verification = await verifyChallengeResponse(challengeResponse, env);
    if (verification.valid) {
      // Issue solution token
      const token = await issueSolutionToken(request, env);
      return {
        verified: true,
        needsChallenge: false,
        setCookie: `${CHALLENGE_CONFIG.cookieName}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${CHALLENGE_CONFIG.solutionTTL / 1000}`
      };
    }
  }

  return { verified: false, needsChallenge: true };
}

/**
 * Generate and serve the JavaScript challenge page
 */
export async function serveChallengeePage(request, env) {
  const url = new URL(request.url);
  const returnTo = url.searchParams.get('return_to') || '/';

  // Generate challenge
  const challenge = await generateChallenge(env);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verifying your browser...</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      background: white;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
      text-align: center;
      max-width: 400px;
    }
    .spinner {
      width: 50px;
      height: 50px;
      border: 4px solid #e0e0e0;
      border-top-color: #667eea;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    h1 { font-size: 20px; color: #333; margin-bottom: 10px; }
    p { color: #666; font-size: 14px; }
    .progress { margin-top: 20px; }
    .progress-bar {
      height: 4px;
      background: #e0e0e0;
      border-radius: 2px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: #667eea;
      width: 0%;
      transition: width 0.3s;
    }
    .status { margin-top: 10px; font-size: 12px; color: #999; }
    .error { color: #e53e3e; margin-top: 20px; display: none; }
    noscript .container { background: #fee; }
  </style>
</head>
<body>
  <noscript>
    <div class="container">
      <h1>JavaScript Required</h1>
      <p>Please enable JavaScript to access this site.</p>
    </div>
  </noscript>

  <div class="container" id="main">
    <div class="spinner"></div>
    <h1>Verifying your browser</h1>
    <p>This won't take long...</p>
    <div class="progress">
      <div class="progress-bar"><div class="progress-fill" id="progress"></div></div>
    </div>
    <div class="status" id="status">Initializing...</div>
    <div class="error" id="error">Verification failed. Please refresh the page.</div>
  </div>

  <script>
    (async function() {
      const challenge = ${JSON.stringify(challenge)};
      const returnTo = ${JSON.stringify(returnTo)};
      const difficulty = ${CHALLENGE_CONFIG.difficulty};

      const progress = document.getElementById('progress');
      const status = document.getElementById('status');
      const error = document.getElementById('error');

      try {
        // ========================================
        // Phase 1: Environment Verification
        // ========================================
        status.textContent = 'Checking browser environment...';
        progress.style.width = '10%';

        const envCheck = await verifyEnvironment();
        if (!envCheck.valid) {
          throw new Error('Environment check failed: ' + envCheck.reason);
        }

        // ========================================
        // Phase 2: Collect Browser Fingerprint
        // ========================================
        status.textContent = 'Collecting browser data...';
        progress.style.width = '30%';

        const fingerprint = await collectFingerprint();

        // ========================================
        // Phase 3: Solve Proof-of-Work Challenge
        // ========================================
        status.textContent = 'Solving challenge...';
        progress.style.width = '50%';

        const solution = await solveChallenge(challenge.nonce, difficulty);
        progress.style.width = '80%';

        // ========================================
        // Phase 4: Submit Solution
        // ========================================
        status.textContent = 'Submitting verification...';
        progress.style.width = '90%';

        const response = {
          challengeId: challenge.id,
          nonce: challenge.nonce,
          solution: solution,
          fingerprint: fingerprint,
          timestamp: Date.now()
        };

        // Encode and redirect with solution
        const encoded = btoa(JSON.stringify(response));
        const targetUrl = new URL(returnTo, window.location.origin);
        targetUrl.searchParams.set('__pw_response', encoded);

        progress.style.width = '100%';
        status.textContent = 'Redirecting...';

        window.location.href = targetUrl.toString();

      } catch (e) {
        console.error('Challenge failed:', e);
        error.style.display = 'block';
        error.textContent = 'Verification failed: ' + e.message;
      }
    })();

    // ========================================
    // Environment Verification Functions
    // ========================================

    async function verifyEnvironment() {
      const checks = [];

      // Check 1: Window and document exist properly
      if (typeof window === 'undefined' || typeof document === 'undefined') {
        return { valid: false, reason: 'No window/document' };
      }

      // Check 2: Navigator exists with expected properties
      if (!navigator || !navigator.userAgent) {
        return { valid: false, reason: 'Invalid navigator' };
      }

      // Check 3: Check for headless indicators
      if (navigator.webdriver === true) {
        return { valid: false, reason: 'WebDriver detected' };
      }

      // Check 4: Check for automation properties
      const automationProps = [
        'callPhantom', '__phantomas', '_phantom', 'phantom',
        '__nightmare', 'domAutomation', 'domAutomationController',
        '_Selenium_IDE_Recorder', '_selenium', 'calledSelenium',
        '__webdriver_script_fn', '__driver_evaluate', '__webdriver_evaluate',
        '__fxdriver_evaluate', '__driver_unwrapped', '__webdriver_unwrapped',
        '__fxdriver_unwrapped', '__selenium_unwrapped', '__webdriver_script_func',
        'webdriver', '$cdc_', '$wdc_'
      ];

      for (const prop of automationProps) {
        if (window[prop] || document[prop]) {
          return { valid: false, reason: 'Automation property: ' + prop };
        }
      }

      // Check 5: Verify Chrome/Chromium specific objects match UA
      const isChrome = /Chrome/.test(navigator.userAgent);
      if (isChrome && !window.chrome) {
        return { valid: false, reason: 'Chrome UA without chrome object' };
      }

      // Check 6: Check for consistent screen dimensions
      if (screen.width === 0 || screen.height === 0) {
        return { valid: false, reason: 'Invalid screen dimensions' };
      }

      // Check 7: Plugins array exists (headless often has none)
      // Note: Modern browsers may have empty plugins for privacy
      // if (navigator.plugins.length === 0 && !navigator.userAgent.includes('Firefox')) {
      //   checks.push({ name: 'plugins', suspicious: true });
      // }

      // Check 8: Languages array
      if (!navigator.languages || navigator.languages.length === 0) {
        return { valid: false, reason: 'No languages' };
      }

      // Check 9: Check for permission API (modern browsers have this)
      if (!navigator.permissions) {
        checks.push({ name: 'permissions', suspicious: true });
      }

      // Check 10: Notification API exists
      if (typeof Notification === 'undefined') {
        checks.push({ name: 'notifications', suspicious: true });
      }

      return { valid: true, checks };
    }

    // ========================================
    // Fingerprint Collection
    // ========================================

    async function collectFingerprint() {
      const fp = {};

      // Screen info
      fp.screen = {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth,
        pixelRatio: window.devicePixelRatio
      };

      // Navigator info
      fp.navigator = {
        userAgent: navigator.userAgent,
        language: navigator.language,
        languages: navigator.languages?.slice(0, 5),
        platform: navigator.platform,
        hardwareConcurrency: navigator.hardwareConcurrency,
        deviceMemory: navigator.deviceMemory,
        maxTouchPoints: navigator.maxTouchPoints
      };

      // Timezone
      fp.timezone = {
        offset: new Date().getTimezoneOffset(),
        name: Intl.DateTimeFormat().resolvedOptions().timeZone
      };

      // Canvas fingerprint (simple hash)
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 200;
        canvas.height = 50;
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillStyle = '#f60';
        ctx.fillRect(0, 0, 100, 50);
        ctx.fillStyle = '#069';
        ctx.fillText('Browser Test', 2, 15);
        ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
        ctx.fillText('Browser Test', 4, 17);
        fp.canvas = hashCode(canvas.toDataURL());
      } catch (e) {
        fp.canvas = 'error';
      }

      // WebGL info
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl) {
          fp.webgl = {
            vendor: gl.getParameter(gl.VENDOR),
            renderer: gl.getParameter(gl.RENDERER),
            version: gl.getParameter(gl.VERSION)
          };
          const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
          if (debugInfo) {
            fp.webgl.unmaskedVendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
            fp.webgl.unmaskedRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
          }
        }
      } catch (e) {
        fp.webgl = 'error';
      }

      // Audio context fingerprint
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        fp.audio = {
          sampleRate: audioCtx.sampleRate,
          state: audioCtx.state
        };
        audioCtx.close();
      } catch (e) {
        fp.audio = 'error';
      }

      // Hash the entire fingerprint
      fp.hash = hashCode(JSON.stringify(fp));

      return fp;
    }

    // ========================================
    // Proof-of-Work Challenge Solver
    // ========================================

    async function solveChallenge(nonce, difficulty) {
      const prefix = '0'.repeat(difficulty);
      let counter = 0;
      const maxIterations = 10000000;

      while (counter < maxIterations) {
        const data = nonce + ':' + counter;
        const hash = await sha256(data);

        if (hash.startsWith(prefix)) {
          return { counter, hash };
        }

        counter++;

        // Yield to prevent blocking UI
        if (counter % 10000 === 0) {
          await new Promise(r => setTimeout(r, 0));
        }
      }

      throw new Error('Challenge timeout');
    }

    async function sha256(message) {
      const msgBuffer = new TextEncoder().encode(message);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    function hashCode(str) {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return hash.toString(16);
    }
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Frame-Options': 'DENY',
    }
  });
}

// ============================================
// Challenge Generation & Verification
// ============================================

async function generateChallenge(env) {
  const nonce = generateNonce();
  const id = generateNonce();

  const challenge = {
    id,
    nonce,
    createdAt: Date.now(),
    expiresAt: Date.now() + CHALLENGE_CONFIG.challengeTTL,
  };

  // Store challenge in KV
  await env.TOKENS.put(
    `challenge:${id}`,
    JSON.stringify(challenge),
    { expirationTtl: Math.ceil(CHALLENGE_CONFIG.challengeTTL / 1000) }
  );

  return challenge;
}

async function verifyChallengeResponse(encodedResponse, env) {
  try {
    const response = JSON.parse(atob(encodedResponse));

    // Retrieve challenge from KV
    const challengeKey = `challenge:${response.challengeId}`;
    const challengeData = await env.TOKENS.get(challengeKey);

    if (!challengeData) {
      return { valid: false, reason: 'Challenge expired or not found' };
    }

    const challenge = JSON.parse(challengeData);

    // Verify nonce matches
    if (response.nonce !== challenge.nonce) {
      return { valid: false, reason: 'Nonce mismatch' };
    }

    // Verify proof-of-work solution
    const expectedPrefix = '0'.repeat(CHALLENGE_CONFIG.difficulty);
    const data = response.nonce + ':' + response.solution.counter;
    const hash = await sha256(data);

    if (!hash.startsWith(expectedPrefix)) {
      return { valid: false, reason: 'Invalid proof-of-work' };
    }

    if (response.solution.hash !== hash) {
      return { valid: false, reason: 'Hash mismatch' };
    }

    // Verify fingerprint exists and has expected structure
    if (!response.fingerprint || !response.fingerprint.hash) {
      return { valid: false, reason: 'Missing fingerprint' };
    }

    // Delete challenge to prevent reuse
    await env.TOKENS.delete(challengeKey);

    return { valid: true, fingerprint: response.fingerprint };

  } catch (error) {
    console.error('Challenge verification error:', error);
    return { valid: false, reason: 'Verification error' };
  }
}

// ============================================
// Solution Token Management
// ============================================

async function issueSolutionToken(request, env) {
  const ip = request.headers.get('cf-connecting-ip') || '';
  const ua = request.headers.get('user-agent') || '';

  const tokenData = {
    ip: hashString(ip),
    ua: hashString(ua),
    createdAt: Date.now(),
    expiresAt: Date.now() + CHALLENGE_CONFIG.solutionTTL,
  };

  // Sign the token
  const payload = btoa(JSON.stringify(tokenData));
  const signature = await signPayload(payload, env.TOKEN_SECRET);

  return `${payload}.${signature}`;
}

async function verifySolutionToken(token, env) {
  try {
    const [payload, signature] = token.split('.');

    if (!payload || !signature) {
      return false;
    }

    // Verify signature
    const expectedSignature = await signPayload(payload, env.TOKEN_SECRET);
    if (signature !== expectedSignature) {
      return false;
    }

    // Decode and check expiration
    const tokenData = JSON.parse(atob(payload));
    if (Date.now() > tokenData.expiresAt) {
      return false;
    }

    return true;

  } catch (error) {
    return false;
  }
}

// ============================================
// Utility Functions
// ============================================

function generateNonce() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;

  cookieHeader.split(';').forEach(cookie => {
    const [name, value] = cookie.trim().split('=');
    if (name && value) {
      cookies[name] = value;
    }
  });

  return cookies;
}

async function sha256(message) {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

async function signPayload(payload, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBytes = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(payload)
  );

  return btoa(String.fromCharCode(...new Uint8Array(signatureBytes)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}
