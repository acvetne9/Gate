(function() {
  // Configuration - customers get from dashboard
  const SITE_ID = 'site_xxxxx'
  const API_KEY = 'pk_live_xxxxx'
  const API_URL = 'https://xxxxx.supabase.co/functions/v1/check-access'

  // Collect browser fingerprint
  function collectFingerprint() {
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      canvas: hasCanvas(),
      webgl: hasWebGL(),
      webdriver: navigator.webdriver,
      headless: /HeadlessChrome/.test(navigator.userAgent),
      timing: {
        pageLoadTime: performance.now()
      }
    }
  }

  function hasCanvas() {
    try {
      const canvas = document.createElement('canvas')
      return !!(canvas.getContext && canvas.getContext('2d'))
    } catch (e) {
      return false
    }
  }

  function hasWebGL() {
    try {
      const canvas = document.createElement('canvas')
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    } catch (e) {
      return false
    }
  }

  // Check access with backend
  async function checkAccess() {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          siteId: SITE_ID,
          apiKey: API_KEY,
          page: window.location.pathname,
          userAgent: navigator.userAgent,
          fingerprint: collectFingerprint()
        })
      })

      const result = await response.json()

      if (!result.allowed) {
        if (result.showGatewall) {
          showGatewall(result.gateConfig)
        } else {
          console.warn('Access blocked:', result.reason)
        }
      }
    } catch (error) {
      console.error('Gate check failed:', error)
    }
  }

  function showGatewall(config) {
    // Create gate overlay
    const overlay = document.createElement('div')
    overlay.style.cssText = `
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
    `

    const modal = document.createElement('div')
    modal.style.cssText = `
      background: white;
      padding: 40px;
      border-radius: 12px;
      max-width: 500px;
      text-align: center;
    `

    modal.innerHTML = `
      <h2 style="font-size: 24px; margin-bottom: 16px; color: #111;">
        ${config.message || 'Subscribe to Continue'}
      </h2>
      <p style="color: #666; margin-bottom: 24px;">
        Get unlimited access to premium content
      </p>
      <button onclick="window.location.href='/subscribe'" style="
        background: #2563eb;
        color: white;
        border: none;
        padding: 12px 32px;
        border-radius: 8px;
        font-size: 16px;
        cursor: pointer;
      ">
        Subscribe Now
      </button>
    `

    overlay.appendChild(modal)
    document.body.appendChild(overlay)
  }

  // Run check on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAccess)
  } else {
    checkAccess()
  }
})()
