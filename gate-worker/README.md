# Gate Protection Worker - Advanced Multi-Layer Detection

A Cloudflare Worker with comprehensive 5-layer bot detection that sits in front of any website to detect bots and require payment for automated access.

## Detection Layers

| Layer | What It Detects | Signals |
|-------|-----------------|---------|
| **Network** | IP reputation, datacenter ASNs, TLS fingerprints | Cloudflare bot score, JA3 hashes, VPN/proxy detection |
| **Browser** | JavaScript execution, browser APIs | Proof-of-work challenge, WebDriver detection, automation properties |
| **Fingerprint** | User-Agent spoofing, header inconsistencies | UA/platform mismatch, missing Client Hints, header order anomalies |
| **Behavior** | Rate limiting, access patterns, timing | Burst detection, sequential crawling, robotic timing |
| **Intelligence** | Known bots, threat feeds, honeypots | AbuseIPDB score, known bot UAs, honeypot triggers |

## How Detection Works

```
Request → 5-Layer Analysis (parallel) → Risk Score Calculation
                                              │
              ┌───────────────────────────────┼───────────────────────────────┐
              │                               │                               │
        Score < 30                    30 ≤ Score < 70                   Score ≥ 70
         (Human)                      (Suspicious)                    (Definite Bot)
              │                               │                               │
              ▼                               ▼                               ▼
      Forward to Origin              JS Challenge                    Check Token
                                          │                               │
                                    Pass? │ Fail?                    Valid? │ Invalid?
                                          │                               │
                                     Forward │ Payment               Forward │ Payment
```

## Project Structure

```
gate-worker/
├── src/
│   ├── index.js                    # Main worker entry point
│   ├── token-issuer.js             # Token creation & Stripe webhooks
│   └── detection/
│       ├── index.js                # Detection orchestrator
│       ├── network-layer.js        # IP, ASN, TLS analysis
│       ├── browser-layer.js        # JS challenges, browser verification
│       ├── fingerprint-layer.js    # UA consistency, header analysis
│       ├── behavior-layer.js       # Rate limiting, patterns
│       └── intelligence-layer.js   # Threat feeds, known bots
├── wrangler.toml
├── package.json
└── README.md
```

## Quick Start

### 1. Install Dependencies

```bash
cd gate-worker
npm install
```

### 2. Create KV Namespace

```bash
npx wrangler kv namespace create TOKENS
```

Update `wrangler.toml` with the returned ID.

### 3. Set Secrets

```bash
# Token signing secret (generate random 32+ chars)
npx wrangler secret put TOKEN_SECRET

# Stripe webhook secret
npx wrangler secret put STRIPE_WEBHOOK_SECRET

# Your origin server
npx wrangler secret put ORIGIN_HOST

# (Optional) AbuseIPDB API key for threat intelligence
npx wrangler secret put ABUSEIPDB_API_KEY
```

### 4. Deploy

```bash
npm run deploy
```

## Configuration

Edit `src/index.js` to customize:

```javascript
const CONFIG = {
  sitePolicy: {
    allowSearchEngines: true,   // Google, Bing (SEO)
    allowSocialPreviews: true,  // Twitter, Facebook unfurls
    allowAICrawlers: false,     // GPTBot, ClaudeBot (charge)
    allowSeoTools: false,       // Ahrefs, Semrush (charge)
    allowMonitoring: true,      // UptimeRobot, Pingdom
    chargeUnknownBots: true,    // Default for unknowns
  },
  detection: {
    layers: {
      network: true,
      browserChallenge: true,
      fingerprint: true,
      behavior: true,
      intelligence: true,
    },
  },
};
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/__gate` | GET | Payment page with detection info |
| `/__challenge` | GET | JavaScript challenge page |
| `/__stripe-webhook` | POST | Stripe webhook for token issuance |
| `/__token-status?token=xxx` | GET | Check token validity |
| `/__detection-debug` | GET | Debug endpoint (requires `DEBUG_MODE`) |

## Detection Signals

### Network Layer
- **datacenter-asn**: Request from AWS, GCP, Azure, etc.
- **cf-bot-score**: Cloudflare's bot management score
- **known-bot-ja3**: TLS fingerprint matches known bot
- **tor-exit**: Request from Tor network
- **proxy-asn**: Request from known VPN/proxy

### Browser Layer
- **js-challenge-failed**: Couldn't complete JavaScript challenge
- **webdriver-detected**: `navigator.webdriver` is true
- **automation-property**: Found Puppeteer/Selenium properties

### Fingerprint Layer
- **ua-mismatch**: User-Agent claims Chrome but missing Client Hints
- **impossible-combo**: Safari on Windows, etc.
- **automation-tool-ua**: User-Agent contains "python-requests", "curl", etc.

### Behavior Layer
- **rate-limit-exceeded**: Too many requests per minute
- **burst-detected**: Many requests in short burst
- **robotic-timing**: Perfectly regular request intervals
- **sequential-crawling**: Accessing /page/1, /page/2, /page/3...

### Intelligence Layer
- **known-bot-ua**: Identified as GPTBot, AhrefsBot, etc.
- **threat-intel-high**: AbuseIPDB score > 80%
- **honeypot-triggered**: Accessed /.env, /wp-admin, etc.
- **repeat-offender**: Multiple previous suspicious activities

## Token Usage

Bots can purchase and use tokens:

```bash
# With token header
curl -H "X-Paid-Token: YOUR_TOKEN" https://yourdomain.com/api/data

# Token format: base64(payload).signature
# Payload: { exp, nonce, scope, sub, iat }
```

## Customization

### Add Custom Bot Patterns

Edit `src/detection/intelligence-layer.js`:

```javascript
const KNOWN_BOT_USER_AGENTS = [
  // Add your patterns
  { pattern: /MyCustomBot/i, name: 'CustomBot', company: 'Me', type: 'custom' },
  ...
];
```

### Add IP Blocklist

Edit `src/detection/intelligence-layer.js`:

```javascript
const BLOCKED_IP_RANGES = [
  { start: '1.2.3.0', end: '1.2.3.255', reason: 'Known bad actor' },
];
```

### Adjust Detection Thresholds

Edit `src/detection/index.js`:

```javascript
const DETECTION_CONFIG = {
  thresholds: {
    definiteBot: 70,  // Raise to be more lenient
    likelyBot: 50,
    suspicious: 30,   // Lower to challenge more traffic
  },
  weights: {
    network: 0.20,    // Adjust layer importance
    fingerprint: 0.25,
    behavior: 0.25,
    intelligence: 0.30,
  },
};
```

### Add Custom Honeypots

Edit `src/detection/intelligence-layer.js`:

```javascript
const HONEYPOT_PATHS = [
  '/.env',
  '/admin/secret',      // Add your own
  '/api/internal',
  ...
];
```

## Response Headers

The worker adds these headers to all responses:

| Header | Description |
|--------|-------------|
| `X-Bot-Detection` | `bot` or `human` |
| `X-Bot-Confidence` | Score 0-100 |
| `X-Bot-Verdict` | `human`, `suspicious`, `likely_bot`, `definite_bot` |
| `X-Bot-Name` | Identified bot name (if known) |
| `X-Bot-Type` | Bot category |

## Security Features

- **HMAC-SHA256 tokens** with constant-time comparison
- **Single-use tokens** deleted on use
- **Proof-of-work JS challenges** prevent automated solving
- **Rate limiting** per IP with burst detection
- **Honeypot traps** catch vulnerability scanners
- **TLS fingerprinting** detects HTTP libraries

## Performance

All detection layers run in parallel. Typical processing time: 5-15ms.

| Layer | Typical Time |
|-------|--------------|
| Network | 1-2ms |
| Fingerprint | 1-2ms |
| Behavior | 2-5ms (KV reads) |
| Intelligence | 2-5ms (cached) |
| Browser Challenge | N/A (separate page) |

## Development

```bash
# Local development
npm run dev

# View logs
npm run tail

# Deploy
npm run deploy
```

## License

MIT
