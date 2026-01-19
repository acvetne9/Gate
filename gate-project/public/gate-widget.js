/**
 * Gate Protection Widget v3.0
 * Simple bot protection for any website - just add one line!
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  QUICK START (1 line of code):                                         │
 * │                                                                         │
 * │  <script src="https://security-gate.lovable.app/gate-widget.js"          │
 * │          data-api-key="YOUR_API_KEY"></script>                          │
 * │                                                                         │
 * │  That's it! Place in <head> for best protection.                        │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Features:
 * - Blocks AI scrapers (GPTBot, ClaudeBot, etc.)
 * - Detects headless browsers (Puppeteer, Playwright)
 * - Fingerprint validation (catches spoofed requests)
 * - Timing analysis (detects impossibly fast requests)
 * - Proof-of-work challenges for suspicious traffic
 * - Anti-replay tokens (single-use, 60-second expiry)
 *
 * For server-side protection (catches non-JS bots), use gate-server-gate.html
 */

(function() {
  'use strict';

  // Configuration
  const config = {
    apiKey: null,
    supabaseUrl: 'https://bakzzkadgmyvvvnpuvki.supabase.co',
    checkEndpoint: '/functions/v1/check-access'
  };

  // Record page load time for timing analysis
  const pageLoadTimestamp = Date.now();

  // Initialize from script tag attributes
  function init() {
    const script = document.currentScript || document.querySelector('script[data-api-key]');

    if (!script) {
      console.error('[Gate] Widget script not found');
      return;
    }

    config.apiKey = script.getAttribute('data-api-key');
    config.supabaseUrl = script.getAttribute('data-supabase-url') || config.supabaseUrl;

    if (!config.apiKey) {
      console.error('[Gate] API key is required. Add data-api-key attribute to the script tag.');
      return;
    }

    console.log('[Gate] Widget initialized');
    checkAccess();
  }

  // Generate browser fingerprint
  function generateFingerprint() {
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screen: {
        width: window.screen.width,
        height: window.screen.height,
        colorDepth: window.screen.colorDepth
      },
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      canvas: getCanvasFingerprint(),
      plugins: Array.from(navigator.plugins || []).map(p => p.name),
      webgl: getWebGLFingerprint()
    };
  }

  // Canvas fingerprinting
  function getCanvasFingerprint() {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Gate Protection', 2, 2);
      return canvas.toDataURL().slice(-50);
    } catch (e) {
      return null;
    }
  }

  // WebGL fingerprinting
  function getWebGLFingerprint() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) return null;

      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (!debugInfo) return null;

      return {
        vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
        renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
      };
    } catch (e) {
      return null;
    }
  }

  // Solve proof-of-work challenge (SHA-256 with leading zeros)
  async function solveProofOfWork(challenge, difficulty) {
    const requiredPrefix = '0'.repeat(difficulty);
    let nonce = 0;

    while (true) {
      const data = `${challenge}:${nonce}`;
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
      const hashArray = new Uint8Array(hashBuffer);
      const hashHex = Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('');

      if (hashHex.startsWith(requiredPrefix)) {
        return { challenge, nonce, hash: hashHex };
      }
      nonce++;

      // Yield to prevent blocking UI (every 1000 iterations)
      if (nonce % 1000 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      // Safety limit
      if (nonce > 10000000) {
        throw new Error('POW timeout');
      }
    }
  }

  // Redeem login token by POSTing to origin /auth/redeem in a hidden iframe
  function redeemLoginToken(loginToken) {
    try {
      const iframeName = 'gate-redeem-iframe'
      let iframe = document.getElementById(iframeName)
      if (!iframe) {
        iframe = document.createElement('iframe')
        iframe.style.display = 'none'
        iframe.id = iframeName
        iframe.name = iframeName
        document.body.appendChild(iframe)
      }

      const form = document.createElement('form')
      form.style.display = 'none'
      form.method = 'POST'
      form.action = `${window.location.origin}/auth/redeem`
      form.target = iframeName

      const input = document.createElement('input')
      input.type = 'hidden'
      input.name = 'login_token'
      input.value = loginToken
      form.appendChild(input)

      document.body.appendChild(form)
      form.submit()

      // Wait a short time for cookie to be set, then reload to pick up session
      setTimeout(() => {
        try { window.location.reload() } catch (e) { /* ignore */ }
      }, 700)
    } catch (e) {
      console.error('[Gate] redeemLoginToken error', e)
    }
  }

  // Check access with backend
  async function checkAccess(powSolution = null) {
    try {
      const requestBody = {
        apiKey: config.apiKey,
        requestToken: true,
        requestLogin: true,
        page: window.location.pathname,
        fullUrl: window.location.href,
        userAgent: navigator.userAgent,
        fingerprint: generateFingerprint(),
        referrer: document.referrer,
        pageLoadTimestamp: pageLoadTimestamp
      };

      // Include POW solution if provided
      if (powSolution) {
        requestBody.powSolution = powSolution;
      }

      const response = await fetch(`${config.supabaseUrl}${config.checkEndpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const result = await response.json();

      // Handle POW challenge
      if (result.status === 'pow_required' && result.powChallenge) {
        console.log('[Gate] Solving proof-of-work challenge...');
        try {
          const solution = await solveProofOfWork(result.powChallenge.challenge, result.powChallenge.difficulty);
          console.log('[Gate] POW solved, retrying...');
          return checkAccess(solution);
        } catch (e) {
          console.error('[Gate] Failed to solve POW:', e);
        }
      }
        // If we received a short-lived access token, fetch premium fragment
        if (result.allowed && result.accessToken) {
          try {
            const fragResp = await fetch(`${config.supabaseUrl}/functions/v1/fetch-premium?token=${encodeURIComponent(result.accessToken)}`)
            const frag = await fragResp.json()
            if (frag && frag.ok && frag.content) {
              const wrapper = document.createElement('div')
              wrapper.id = 'gate-premium'
              wrapper.innerHTML = frag.content
              document.body.insertBefore(wrapper, document.body.firstChild)
              return
            }
          } catch (e) {
            console.error('[Gate] Failed to fetch premium fragment', e)
          }
        }

        // If we received a login token, attempt SPA-friendly redemption:
        // 1) dispatch a CustomEvent on window for host listeners
        // 2) postMessage the token to window
        // 3) fallback: POST directly to /auth/redeem with credentials included (sets HttpOnly cookie)
        if (result.loginToken) {
          try {
            const token = result.loginToken

            // 1) CustomEvent for same-page listeners
            try {
              window.dispatchEvent(new CustomEvent('gate:login', { detail: { loginToken: token } }))
            } catch (e) {
              // ignore
            }

            // 2) postMessage for cross-context listeners
            try {
              window.postMessage({ gateLoginToken: token }, window.location.origin)
            } catch (e) {
              // ignore
            }

            // 3) direct redemption via fetch as a fallback (include credentials so Set-Cookie works)
            try {
              fetch('/auth/redeem', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ login_token: token }),
                credentials: 'include'
              }).then(res => {
                if (!res.ok) {
                  console.warn('[Gate] Redeem fallback failed', res.status)
                } else {
                  try { window.location.reload() } catch (e) { /* ignore */ }
                }
              }).catch(e => {
                console.error('[Gate] Redeem fetch error', e)
              })
            } catch (e) {
              console.error('[Gate] Failed to redeem login token', e)
            }
          } catch (e) {
            console.error('[Gate] Login token handling error', e)
          }
        }

        if (!result.allowed && result.showGatewall) {
          showGatewall(result.gateConfig);
        }
    } catch (error) {
      console.error('[Gate] Error checking access:', error);
    }
  }

  // Show gate overlay
  function showGatewall(config) {
    const overlay = document.createElement('div');
    overlay.id = 'gate-gate';
    overlay.innerHTML = `
      <style>
        #gate-gate {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.95);
          z-index: 999999;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: system-ui, -apple-system, sans-serif;
        }
        #gate-gate-content {
          background: white;
          border: 3px solid black;
          padding: 40px;
          max-width: 520px;
          text-align: center;
        }
        #gate-gate h2 {
          font-size: 24px;
          margin: 0 0 16px 0;
          font-weight: bold;
        }
        #gate-gate p {
          font-size: 16px;
          color: #666;
          margin: 0 0 24px 0;
          line-height: 1.5;
        }
        #gate-gate-button {
          background: black;
          color: white;
          border: none;
          padding: 14px 40px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        #gate-gate-button:hover {
          opacity: 0.8;
        }
        #gate-gate-url {
          background: #f5f5f5;
          border: 1px solid #ddd;
          padding: 10px 14px;
          margin-top: 20px;
          font-family: monospace;
          font-size: 12px;
          color: #333;
          word-break: break-all;
        }
        #gate-gate-divider {
          border-top: 1px solid #eee;
          margin: 20px 0;
        }
      </style>
      <div id="gate-gate-content">
        <h2>${config.title || 'Content Protected'}</h2>
        <p>${config.message || 'This content requires payment to access.'}</p>
        <button id="gate-gate-button" onclick="window.location.href='${config.paymentUrl}'">
          ${config.buttonText || 'Continue to Payment'}
        </button>
        <div id="gate-gate-divider"></div>
        <div style="font-size: 13px; color: #666; margin-bottom: 6px;">Or visit directly:</div>
        <div id="gate-gate-url">${config.paymentUrl || (location.origin + '/bot-payment')}</div>
      </div>
    `;

    document.body.appendChild(overlay);
  }

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose global API
  window.Gate = {
    version: '3.0.0',
    checkAccess: checkAccess,
    solveProofOfWork: solveProofOfWork
  };
})();
