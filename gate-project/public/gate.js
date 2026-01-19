/**
 * Gate Protection v3.1 - 1 line, maximum protection
 * <script src="/gate.js" data-key="YOUR_KEY"></script>
 *
 * PROTECTION LEVELS:
 * 1. CSS opacity:0 - hides content until verified (basic)
 * 2. POW challenge - requires computation (blocks mass scraping)
 * 3. Encrypted content - use data-gate-encrypted for maximum protection
 */
(function(){
  var API='https://bakzzkadgmyvvvnpuvki.supabase.co/functions/v1/check-access';
  var PAY='https://security-gate.lovable.app/bot-payment'; // Gate platform payment page
  var T=Date.now();
  var S=document.currentScript;
  var K=S&&S.getAttribute('data-key');

  // Inject CSS immediately (hide body until verified)
  var style=document.createElement('style');
  style.textContent='body{opacity:0!important}body.gate-ok{opacity:1!important;transition:opacity .15s}[data-gate-encrypted]{font-family:monospace;color:#999;font-size:10px;word-break:break-all}';
  (document.head||document.documentElement).appendChild(style);

  // XOR decrypt function (matches gate-encrypt.html)
  function xorDecrypt(encoded, key) {
    try {
      var decoded = decodeURIComponent(escape(atob(encoded.trim())));
      var result = '';
      for (var i = 0; i < decoded.length; i++) {
        result += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
      }
      return result;
    } catch (e) {
      return null;
    }
  }

  // Decrypt all protected content elements
  function decryptContent() {
    if (!K) return;
    var derivedKey = K + '_gate_protection_2024';
    var elements = document.querySelectorAll('[data-gate-encrypted]');
    for (var i = 0; i < elements.length; i++) {
      var el = elements[i];
      var encrypted = el.textContent.trim();
      var decrypted = xorDecrypt(encrypted, derivedKey);
      if (decrypted) {
        el.innerHTML = decrypted;
        el.removeAttribute('data-gate-encrypted');
      }
    }
  }

  function ok(){
    // Decrypt any encrypted content
    decryptContent();
    // Show the page
    if(document.body)document.body.classList.add('gate-ok');
    else document.addEventListener('DOMContentLoaded',function(){decryptContent();document.body.classList.add('gate-ok')});
  }

  // No API key = allow (for testing)
  if(!K){ok();return}

  // Quick bot checks
  if(navigator.webdriver||window._phantom||window.__nightmare){
    location.replace(PAY+'?r=automation&ret='+encodeURIComponent(location.href));
    return;
  }

  function fp(){
    var f={
      userAgent:navigator.userAgent,
      language:navigator.language,
      languages:navigator.languages?[].slice.call(navigator.languages):[navigator.language],
      platform:navigator.platform,
      screen:{width:screen.width,height:screen.height},
      timezone:Intl.DateTimeFormat().resolvedOptions().timeZone,
      plugins:[].slice.call(navigator.plugins||[]).map(function(p){return p.name}),
      // Headless detection
      webdriver:navigator.webdriver,
      hasChrome:!!(window.chrome&&(window.chrome.runtime||window.chrome.loadTimes)),
      hasWebRTC:!!window.RTCPeerConnection,
      phantom:!!window._phantom||!!window.phantom,
      nightmare:!!window.__nightmare,
      selenium:!!window._selenium,
      puppeteer:!!window.__puppeteer_evaluation_script__,
      automationControlled:navigator.webdriver||!!window.domAutomation||!!window.domAutomationController
    };
    try{
      var c=document.createElement('canvas'),x=c.getContext('2d');
      x.font='14px Arial';x.fillText('Gate',0,14);
      f.canvas=c.toDataURL();
    }catch(e){f.canvas=null}
    try{
      var g=document.createElement('canvas').getContext('webgl');
      var d=g&&g.getExtension('WEBGL_debug_renderer_info');
      f.webgl=d?{vendor:g.getParameter(d.UNMASKED_VENDOR_WEBGL),renderer:g.getParameter(d.UNMASKED_RENDERER_WEBGL)}:null;
    }catch(e){f.webgl=null}
    return f;
  }

  // Behavioral tracking
  var behavior={mouseMovements:0,scrollEvents:0,clicks:0,keystrokes:0,timeOnPage:0};
  document.addEventListener('mousemove',function(){behavior.mouseMovements++});
  document.addEventListener('scroll',function(){behavior.scrollEvents++});
  document.addEventListener('click',function(){behavior.clicks++});
  document.addEventListener('keydown',function(){behavior.keystrokes++});

  function solvePow(ch,diff,cb){
    var pre=Array(diff+1).join('0'),n=0;
    (function attempt(){
      crypto.subtle.digest('SHA-256',new TextEncoder().encode(ch+':'+n)).then(function(buf){
        var h=[].map.call(new Uint8Array(buf),function(b){return b.toString(16).padStart(2,'0')}).join('');
        if(h.indexOf(pre)===0)cb({challenge:ch,nonce:n,hash:h});
        else{n++;n%1000===0?setTimeout(attempt,0):attempt()}
      });
    })();
  }

  function check(powSolution){
    behavior.timeOnPage=Date.now()-T;
    var body={apiKey:K,page:location.pathname,userAgent:navigator.userAgent,fingerprint:fp(),pageLoadTimestamp:T,behavior:behavior};
    if(powSolution)body.powSolution=powSolution;

    fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
      .then(function(r){return r.json()})
      .then(function(r){
        // Invalid API key or paused site = allow access (fail open)
        if(r.reason==='Invalid API key'||r.status==='paused'){
          ok();
          return;
        }
        if(r.status==='pow_required'&&r.powChallenge){
          solvePow(r.powChallenge.challenge,r.powChallenge.difficulty,check);
        }else if(!r.allowed&&(r.status==='payment_required'||r.showGatewall)){
          // Use server's paymentUrl if provided, otherwise fallback to local /bot-payment
          var url=r.paymentUrl||r.gateConfig&&r.gateConfig.paymentUrl||PAY;
          location.replace(url);
        }else{
          ok();
        }
      })
      .catch(function(){ok()}); // Fail open on network error
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',function(){check()});
  }else{
    check();
  }
})();
