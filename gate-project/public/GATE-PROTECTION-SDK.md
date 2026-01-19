# Gate Protection SDK v3.0

Comprehensive bot detection and gate enforcement system.

## Overview

Gate Protection implements 6 layered defense strategies to catch ALL bots and direct them to the payment page:

1. **Server-Side Gate** - Shows gate by default (catches non-JS bots)
2. **JS-Required Content** - Content only loads after verification
3. **Edge Middleware** - Detects bots before serving content
4. **Honeypot Traps** - Invisible links that only bots follow
5. **Behavioral Challenges** - Analyzes mouse, scroll, interaction patterns
6. **Content Obfuscation** - Encodes content until verification passes

## Quick Start

### Option 1: Full Protection (Recommended)

Add this to your HTML `<head>`:

```html
<script src="https://security-gate.lovable.app/gate-protection-v3.js"
        data-api-key="YOUR_API_KEY"
        async></script>
```

Mark protected content:

```html
<main data-gate-protect>
  Your protected content here...
</main>
```

### Option 2: Server-Side Only

Include the server-side gate template in your HTML:

```html
<head>
  <!-- Include Gate server-side gate -->
  <?php include 'gate-server-gate.html'; ?>

  <!-- OR inline the styles/script -->
</head>
<body>
  <main class="gate-content-protected">
    Your content here...
  </main>
</body>
```

### Option 3: Edge Middleware (Next.js/Vercel)

Create `middleware.ts`:

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Import detection logic from gate-middleware.js
const BOT_USER_AGENTS = ['GPTBot', 'ClaudeBot', 'CCBot', /* ... */];

function detectBot(userAgent: string) {
  for (const bot of BOT_USER_AGENTS) {
    if (userAgent.toLowerCase().includes(bot.toLowerCase())) {
      return { isBot: true, botName: bot };
    }
  }
  return { isBot: false };
}

export function middleware(request: NextRequest) {
  const userAgent = request.headers.get('user-agent') || '';
  const detection = detectBot(userAgent);

  if (detection.isBot) {
    // Redirect bots to payment page
    return NextResponse.redirect(
      new URL(`/bot-payment?return=${encodeURIComponent(request.url)}`, request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

## Files Included

| File | Purpose |
|------|---------|
| `gate-protection-v3.js` | Full client-side protection SDK |
| `gate-middleware.js` | Server-side/edge detection logic |
| `gate-server-gate.html` | Server-rendered gate template |
| `gate-widget.js` | Legacy simple widget (v2) |

## API Reference

### Client-Side API

```javascript
// Check if GateProtection is loaded
if (window.GateProtection) {
  // Manual access check
  const result = await GateProtection.checkAccess();

  // Get current behavior data
  const behavior = GateProtection.getBehavior();

  // Get browser fingerprint
  const fingerprint = GateProtection.getFingerprint();

  // Analyze behavior score
  const analysis = GateProtection.analyzeBehavior();

  // Manually show/hide gate
  GateProtection.showGatewall({ title: 'Custom Title' });
  GateProtection.hideGate();

  // Reveal protected content
  GateProtection.revealContent();
}
```

### Server-Side Detection

```javascript
const { detectBot, generateGateHTML } = require('./gate-middleware.js');

// In your server handler
app.use((req, res, next) => {
  const detection = detectBot(req);

  if (detection.action === 'redirect_payment') {
    return res.redirect('/bot-payment');
  }

  if (detection.action === 'block') {
    return res.status(402).send(generateGateHTML({
      paymentUrl: '/bot-payment',
      returnUrl: req.url
    }));
  }

  next();
});
```

## Detection Strategies

### 1. User Agent Analysis

Checks against 60+ known bot user agents:
- AI crawlers (GPTBot, ClaudeBot, CCBot)
- Search engines (Googlebot, Bingbot)
- SEO tools (AhrefsBot, SemrushBot)
- Scrapers (curl, wget, python-requests)
- Headless browsers (PhantomJS, Puppeteer)

### 2. Browser Fingerprinting

Detects headless browsers via:
- `navigator.webdriver` flag
- Missing canvas/WebGL support
- No browser plugins
- Invalid screen dimensions
- Missing language/timezone

### 3. Behavioral Analysis

Tracks human interaction:
- Mouse movements and speed
- Scroll events and depth
- Click patterns
- Time on page
- Interaction timing

Bot indicators:
- No mouse movement after 5 seconds
- No scroll on long pages
- Instant interaction (< 100ms)
- Linear/robotic mouse paths
- Consistent mouse speed (no variance)

### 4. Honeypot Traps

Creates invisible links that only bots follow:
- Hidden pricing links
- Fake admin URLs
- API probes
- Security test paths

Any access = confirmed bot → immediate block.

### 5. Content Obfuscation

Protected content is:
- Hidden by default (blur/placeholder)
- Only revealed after verification
- Can be encrypted (XOR + base64)
- Loaded dynamically via API

### 6. IP Blocking

Bots that trigger honeypots or repeatedly fail verification:
- Added to `blocked_ips` table
- Blocked for 24 hours
- Cannot access any protected content

## Configuration Options

### Script Attributes

```html
<script src="gate-protection-v3.js"
  data-api-key="YOUR_API_KEY"
  data-supabase-url="https://your-project.supabase.co"
  data-payment-url="/custom-payment-page"
  data-debug
></script>
```

| Attribute | Description |
|-----------|-------------|
| `data-api-key` | Required. Your Gate API key |
| `data-supabase-url` | Optional. Custom Supabase URL |
| `data-payment-url` | Optional. Custom payment page |
| `data-debug` | Enable console logging |

### Server-Side Options

```javascript
generateGateHTML({
  paymentUrl: '/bot-payment',
  returnUrl: '/original-page',
  reason: 'bot_detected',
  confidence: 0.95,
  showDebug: true,
  requestId: 'abc123'
});
```

## Integration Examples

### React/Next.js

```jsx
// pages/_app.js
import Script from 'next/script';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Script
        src="https://security-gate.lovable.app/gate-protection-v3.js"
        data-api-key={process.env.NEXT_PUBLIC_GATE_API_KEY}
        strategy="afterInteractive"
      />
      <Component {...pageProps} />
    </>
  );
}
```

### WordPress

```php
// functions.php
function add_gate_protection() {
  wp_enqueue_script(
    'gate-protection',
    'https://security-gate.lovable.app/gate-protection-v3.js',
    array(),
    '3.0.0',
    true
  );
  wp_script_add_data('gate-protection', 'data-api-key', 'YOUR_API_KEY');
}
add_action('wp_enqueue_scripts', 'add_gate_protection');
```

### Express.js

```javascript
const express = require('express');
const { detectBot, generateGateHTML } = require('./gate-middleware');

const app = express();

// Gate protection middleware
app.use((req, res, next) => {
  const detection = detectBot(req);

  if (detection.isBot && detection.confidence >= 0.8) {
    return res.status(402).send(generateGateHTML({
      paymentUrl: '/bot-payment',
      returnUrl: req.originalUrl
    }));
  }

  next();
});

app.listen(3000);
```

## Troubleshooting

### Gate shows for real users

- Check behavioral thresholds (may be too aggressive)
- Verify fingerprint collection works
- Check for VPN/Tor blocking real users

### Bots bypassing protection

- Ensure JS is required for content
- Add server-side detection
- Enable honeypot traps
- Check bot user agent list is current

### Console errors

- Verify API key is correct
- Check Supabase URL is accessible
- Enable debug mode for detailed logs

## Support

- Documentation: https://security-gate.lovable.app/docs
- API Reference: https://security-gate.lovable.app/api
- Support: support@security-gate.lovable.app
