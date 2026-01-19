/**
 * Gate Protection v3.0 - Minimal Bot Blocker
 *
 * USAGE (1 line):
 * <script src="https://security-gate.lovable.app/gate-protect.js" data-api-key="YOUR_KEY"></script>
 *
 * That's it. Bots get redirected to payment. Humans see nothing.
 */
(function() {
  'use strict';

  var GATE_API = 'https://bakzzkadgmyvvvnpuvki.supabase.co/functions/v1/check-access';
  var PAYMENT_URL = location.origin + '/bot-payment';
  var PAGE_LOAD = Date.now();

  // Get API key from script tag
  var script = document.currentScript || document.querySelector('script[data-api-key]');
  var apiKey = script && script.getAttribute('data-api-key');
  if (!apiKey) { console.error('[Gate] Missing data-api-key'); return; }

  // Quick local bot checks
  if (navigator.webdriver || window._phantom || window.__nightmare || window._selenium) {
    redirect('automation_detected');
    return;
  }

  // Fingerprint
  function fingerprint() {
    var fp = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      languages: navigator.languages,
      platform: navigator.platform,
      screen: { width: screen.width, height: screen.height, colorDepth: screen.colorDepth },
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      plugins: Array.from(navigator.plugins || []).map(function(p) { return p.name; })
    };
    try {
      var c = document.createElement('canvas');
      var ctx = c.getContext('2d');
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Gate', 2, 2);
      fp.canvas = c.toDataURL();
    } catch (e) { fp.canvas = null; }
    try {
      var gl = document.createElement('canvas').getContext('webgl');
      var dbg = gl && gl.getExtension('WEBGL_debug_renderer_info');
      fp.webgl = dbg ? { vendor: gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL), renderer: gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) } : null;
    } catch (e) { fp.webgl = null; }
    return fp;
  }

  // Redirect bot to payment
  function redirect(reason) {
    var url = PAYMENT_URL + '?reason=' + encodeURIComponent(reason) + '&return=' + encodeURIComponent(location.href);
    location.replace(url);
  }

  // Solve POW challenge
  function solvePow(challenge, difficulty, cb) {
    var prefix = '0'.repeat(difficulty);
    var nonce = 0;
    function attempt() {
      crypto.subtle.digest('SHA-256', new TextEncoder().encode(challenge + ':' + nonce)).then(function(buf) {
        var hash = Array.from(new Uint8Array(buf)).map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
        if (hash.indexOf(prefix) === 0) cb({ challenge: challenge, nonce: nonce, hash: hash });
        else { nonce++; nonce % 1000 === 0 ? setTimeout(attempt, 0) : attempt(); }
      });
    }
    attempt();
  }

  // Check access
  function check(pow) {
    var body = { apiKey: apiKey, page: location.pathname, userAgent: navigator.userAgent, fingerprint: fingerprint(), pageLoadTimestamp: PAGE_LOAD };
    if (pow) body.powSolution = pow;

    fetch(GATE_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function(r) { return r.json(); })
      .then(function(res) {
        if (res.status === 'pow_required' && res.powChallenge) {
          solvePow(res.powChallenge.challenge, res.powChallenge.difficulty, check);
        } else if (!res.allowed && res.status === 'payment_required') {
          redirect(res.reason || 'bot_detected');
        }
        // Human or allowed bot - do nothing, let them browse
      })
      .catch(function() { /* fail open for humans */ });
  }

  // Run when DOM ready
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function() { check(); });
  else check();
})();
