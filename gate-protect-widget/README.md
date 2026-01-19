# 🛡️ Gate Protection Widget

JavaScript widget for monetizing bot traffic and protecting content from unauthorized AI scrapers.

## Quick Start

### 1. Get Your Credentials

1. Sign up at your Gate dashboard
2. Create a new site
3. Copy your **API Key** and **API URL**

### 2. Add Widget to Your Site

Copy this code and paste it before the closing `</body>` tag on your website:

```html
<script
  src="https://cdn.jsdelivr.net/npm/gate-protect-widget@1/dist/gate-widget.min.js"
  data-api-key="YOUR_API_KEY"
  data-api-url="YOUR_API_URL"
  async
></script>
```

**Required:**
- `data-api-key` - Your API key from Gate dashboard
- `data-api-url` - Your API endpoint URL from Gate dashboard

### 3. How It Works

The widget will automatically:
- ✅ **Allow all humans** - Zero friction for real visitors
- 💰 **Charge AI bots** - Require payment for access (you set the price)
- ✅ **Allow SEO bots** - Google, Bing, etc. for search indexing
- 📊 **Log everything** - View all traffic in your dashboard

---

## Business Model

**Gate lets you monetize bot traffic instead of just blocking it.**

### Two Plans:

| Plan | Price | Bot Pricing |
|------|-------|-------------|
| **Keeper** | Free Forever | Fixed $0.50 per bot request |
| **MAX** | $20/month | Custom pricing (you control the rate) |

### Revenue Flow:

1. **Bot visits your site** → Widget detects it
2. **Bot is challenged** → Redirected to payment page
3. **Bot pays** → Money goes to **your Stripe account**
4. **You keep 100%** → We don't take a cut of bot payments

---

## Default Behavior

| Visitor Type | Behavior |
|--------------|----------|
| 👤 **Humans** | ✅ Full access - no interruption |
| 🤖 **AI Bots** (GPTBot, ClaudeBot) | 💳 Payment required |
| 🔍 **SEO Bots** (Google, Bing) | ✅ Allowed for indexing |
| 🕷️ **Unknown Scrapers** | 💳 Payment required |

**Humans will NEVER see a gate** - this is bot-only protection.

---

## Configuration Options

Customize widget behavior with data attributes:

```html
<script
  src="https://cdn.jsdelivr.net/npm/gate-protect-widget@1/dist/gate-widget.min.js"
  data-api-key="YOUR_API_KEY"
  data-api-url="YOUR_API_URL"

  <!-- Optional Configuration -->
  data-debug="true"              <!-- Enable debug logging -->
  data-mode="auto"               <!-- auto | always | never -->
  data-seo-safe="true"           <!-- Allow search engine bots -->
  data-protect-body="true"       <!-- Protect entire page -->
  data-subscribe-url="/subscribe" <!-- Custom subscribe URL -->
  data-login-url="/login"        <!-- Custom login URL -->
  async
></script>
```

### Available Modes

- **`auto`** (default) - Automatically detect and challenge bots
- **`always`** - Always show gate (for testing)
- **`never`** - Disable widget entirely

---

## How It Works

### Request Flow:

1. **Widget loads** on your page
2. **Collects fingerprint** - Canvas, WebGL, plugins, screen, timezone
3. **Analyzes user agent** - Identifies bot patterns
4. **Calls API** - Sends data to Gate backend
5. **Backend decides**:
   - Human? → Allow access
   - Allowed bot (SEO)? → Allow access
   - AI bot/scraper? → Require payment
6. **Widget responds**:
   - If allowed: No interruption
   - If challenged: Redirect to payment page

### Bot Detection:

Gate uses multiple signals to detect bots:

- **User agent analysis** - Known bot signatures
- **Browser fingerprinting** - Canvas, WebGL uniqueness
- **Behavioral signals** - Mouse movements, scroll events
- **Network analysis** - Datacenter IPs, VPNs
- **Headless detection** - WebDriver, automation tools

---

## Allowed Bots (SEO-Safe)

These bots are allowed by default for search indexing:

- **Googlebot** (Google Search)
- **Bingbot** (Bing Search)
- **DuckDuckBot** (DuckDuckGo)
- **Baiduspider** (Baidu)
- **Yandexbot** (Yandex)
- **FacebookExternalHit** (Facebook previews)
- **TwitterBot** (Twitter cards)
- **LinkedInBot** (LinkedIn previews)
- **SlackBot** (Slack previews)

You can customize this list in your site settings.

---

## Blocked & Charged Bots

These bots are challenged to pay:

- **GPTBot** (OpenAI - ChatGPT training)
- **ClaudeBot** (Anthropic - Claude training)
- **CCBot** (Common Crawl - AI training data)
- **Cohere-AI** (Cohere training)
- **Scrapers** (curl, wget, python-requests, scrapy)
- **Unknown bots** (any automated tool not in allowlist)

---

## Testing the Widget

### View Logs

All requests are logged in your Gate dashboard:

1. Go to **Dashboard** → **Logs**
2. See real-time traffic
3. Filter by site, date, bot type
4. Export to CSV

### Debug in Browser Console

```javascript
// View current status
GateProtect.debug.status()

// View all logs
GateProtect.logs.getAll()

// Download logs as JSON
GateProtect.logs.download()

// Test gate display
GateProtect.showGatewall({ type: 'hard' })

// Hide gate
GateProtect.hideGatewall()

// Force recheck
GateProtect.reload()
```

### Test Bot Detection

```bash
# Normal request (allowed)
curl https://yoursite.com

# Bot request (challenged)
curl -A "GPTBot/1.0" https://yoursite.com

# SEO bot (allowed)
curl -A "Googlebot/2.1" https://yoursite.com
```

---

## API Reference

### JavaScript API

The widget exposes a global `GateProtect` object:

```javascript
window.GateProtect = {
  version: '1.3.0',

  // Manual controls
  showGatewall: (config) => {},
  hideGatewall: () => {},
  checkAccess: () => Promise,
  reload: () => {},

  // Configuration
  config: { apiKey, mode, seoSafe, ... },
  allowedBots: ['googlebot', 'bingbot', ...],

  // Logging
  logs: {
    getAll: () => Array,
    export: () => String,
    clear: () => void,
    download: () => void
  },

  // Debug helpers
  debug: {
    enable: () => void,
    disable: () => void,
    status: () => void
  }
}
```

---

## Stripe Setup (Receiving Bot Payments)

### Connect Your Stripe Account:

1. Go to **Billing** page in your Gate dashboard
2. Click **"Connect Stripe Account"**
3. Authorize with Stripe OAuth
4. Done! Bot payments now go to your account

### Important:

- **One Stripe account per Gate account** (not per site)
- All sites under your account send payments to same Stripe
- You receive 100% of bot payments
- Gate subscription billing is separate

---

## Troubleshooting

### Widget not loading?

Check browser console for errors:

```javascript
// Expected output:
[Gate] Widget initialized
[Gate] ✓ Configuration validated
[Gate] ✓ Access granted
```

### Error: "Missing required API key" or "Missing required API URL"?

Make sure you have both `data-api-key="..."` and `data-api-url="..."` in your script tag. Both are required.

### Getting "payment required" as a human?

This means your site has "Show Gate to Humans" enabled.

**To fix:**
1. Go to Dashboard → Configure Site
2. Uncheck "Show Gate to Humans"
3. Save

By default, only bots are challenged.

### Widget not blocking bots?

Test the API endpoint (replace `YOUR_API_URL` with your actual API URL):

```javascript
fetch('YOUR_API_URL', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    apiKey: 'YOUR_API_KEY',
    page: '/',
    userAgent: 'GPTBot/1.0',
    fingerprint: {},
    referrer: ''
  })
}).then(r => r.json()).then(console.log)
```

Expected response: `{ allowed: false, status: 'payment_required', paymentUrl: '...' }`

---

## Building from Source

```bash
# Install dependencies
npm install

# Build the widget
npm run build
```

Output:
- `dist/gate-widget.min.js` - Minified IIFE
- `dist/gate-widget.esm.js` - ESM module

---

## Publishing to npm

```bash
# Login to npm
npm login

# Publish (runs prepublishOnly build automatically)
npm publish --access public
```

---

## Support

- **Dashboard:** Access your dashboard to manage sites
- **Documentation:** See inline code documentation
- **Issues:** Report bugs via GitHub issues

---

## License

MIT License - See LICENSE file for details

---

**Monetize your bot traffic. Protect your content. Get paid for AI scraping.**
