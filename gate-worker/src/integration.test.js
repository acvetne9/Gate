import { describe, it, expect } from 'vitest';
import { detectBot, validateFingerprint, validateBehavior, hmacSHA256, sha256Short } from './core.js';

/**
 * Integration tests — simulate complete attack scenarios end-to-end
 * through the detection + validation pipeline.
 */

function mockRequest(url, headers = {}, cf = {}) {
  const h = new Headers();
  for (const [k, v] of Object.entries(headers)) h.set(k, v);
  return { url, headers: h, cf };
}

const VALID_FINGERPRINT = {
  ua: 'Mozilla/5.0 Chrome/120', lang: 'en-US',
  canvas: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB',
  webgl: { r: 'ANGLE (Intel HD Graphics 630)', v: 'Google Inc. (Intel)' },
  sw: 1920, sh: 1080, cores: 8, plugins: ['PDF Viewer', 'Chrome PDF Plugin'],
  webdriver: false,
};

const REAL_BROWSER_HEADERS = {
  'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'accept': 'text/html,application/xhtml+xml,*/*',
  'accept-language': 'en-US,en;q=0.9',
  'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
  'sec-fetch-mode': 'navigate',
  'sec-fetch-dest': 'document',
};

// ============================================================
// Scenario: Known bot tries to access content
// ============================================================
describe('Scenario: Known bot access attempt', () => {
  const bots = [
    { name: 'GPTBot', ua: 'GPTBot/1.0 (+https://openai.com/gptbot)' },
    { name: 'curl', ua: 'curl/8.4.0' },
    { name: 'python-requests', ua: 'python-requests/2.31.0' },
    { name: 'Scrapy', ua: 'Scrapy/2.11.0' },
    { name: 'HeadlessChrome', ua: 'Mozilla/5.0 HeadlessChrome/120.0.0.0' },
  ];

  bots.forEach(({ name, ua }) => {
    it(`${name}: detected as bot, would be challenged or blocked`, () => {
      const req = mockRequest('https://site.com/', { 'user-agent': ua });
      const detection = detectBot(req);
      expect(detection.isBot).toBe(true);
      expect(detection.confidence).toBeGreaterThanOrEqual(50);
    });
  });
});

// ============================================================
// Scenario: Stealth scraper with Chrome UA but missing headers
// ============================================================
describe('Scenario: UA spoofing attack', () => {
  it('Chrome UA without browser headers scores suspicious', () => {
    const req = mockRequest('https://site.com/', {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    });
    const detection = detectBot(req);
    // Missing: accept-language (+20), accept (+15), sec-ch-ua (+15), sec-fetch-mode (+10) = 60+
    expect(detection.confidence).toBeGreaterThanOrEqual(30);
  });

  it('Chrome UA with Accept-Language but missing Client Hints still flagged', () => {
    const req = mockRequest('https://site.com/', {
      'user-agent': 'Mozilla/5.0 Chrome/120.0.0.0 Safari/537.36',
      'accept-language': 'en-US',
      'accept': 'text/html',
    });
    const detection = detectBot(req);
    expect(detection.signals).toContain('missing_client_hints');
  });
});

// ============================================================
// Scenario: Real human with proper browser
// ============================================================
describe('Scenario: Legitimate human visitor', () => {
  it('passes bot detection with low score', () => {
    const req = mockRequest('https://site.com/', REAL_BROWSER_HEADERS);
    const detection = detectBot(req);
    expect(detection.isBot).toBe(false);
    expect(detection.confidence).toBeLessThan(30);
  });

  it('passes fingerprint validation', () => {
    const result = validateFingerprint(VALID_FINGERPRINT);
    expect(result.valid).toBe(true);
  });

  it('passes behavioral validation with natural movement', () => {
    const result = validateBehavior({
      mouse: 15, moveVarianceX: 2000, moveVarianceY: 1200,
      scroll: 2, touch: 0, keys: 0, clicks: 1,
      timeOnPage: 3000, samples: 15,
    });
    expect(result.valid).toBe(true);
  });
});

// ============================================================
// Scenario: Headless browser with stealth plugin
// ============================================================
describe('Scenario: Stealth headless browser', () => {
  it('passes bot detection (spoofed UA) but fails fingerprint (SwiftShader)', () => {
    const req = mockRequest('https://site.com/', REAL_BROWSER_HEADERS);
    const detection = detectBot(req);
    expect(detection.isBot).toBe(false); // UA looks legit

    // But fingerprint reveals headless
    const fpResult = validateFingerprint({
      ...VALID_FINGERPRINT,
      webgl: { r: 'Google SwiftShader', v: 'Google Inc.' },
    });
    expect(fpResult.valid).toBe(false);
    expect(fpResult.failures).toContain('headless_webgl');
  });

  it('passes both UA and WebGL but fails on webdriver flag', () => {
    const req = mockRequest('https://site.com/', REAL_BROWSER_HEADERS);
    const detection = detectBot(req);
    expect(detection.isBot).toBe(false);

    const fpResult = validateFingerprint({
      ...VALID_FINGERPRINT,
      webdriver: true,
    });
    expect(fpResult.valid).toBe(false);
    expect(fpResult.failures).toContain('webdriver');
  });
});

// ============================================================
// Scenario: Bot with automated mouse movements
// ============================================================
describe('Scenario: Behavioral detection of automated interaction', () => {
  it('catches perfectly straight mouse movement (Puppeteer moveTo)', () => {
    const result = validateBehavior({
      mouse: 20,
      moveVarianceX: 0, // All points on same X — straight line
      moveVarianceY: 0, // All points on same Y
      scroll: 0, touch: 0, keys: 0, clicks: 0,
    });
    expect(result.valid).toBe(false);
    expect(result.failures).toContain('linear_mouse_movement');
  });

  it('passes natural human movement with variance', () => {
    const result = validateBehavior({
      mouse: 20,
      moveVarianceX: 3500,
      moveVarianceY: 1800,
      scroll: 5, touch: 0, keys: 2, clicks: 3,
    });
    expect(result.valid).toBe(true);
  });
});

// ============================================================
// Scenario: Datacenter proxy attack
// ============================================================
describe('Scenario: Datacenter IP detection', () => {
  const datacenterASNs = [
    { name: 'AWS', asn: 16509 },
    { name: 'Google Cloud', asn: 15169 },
    { name: 'Azure', asn: 8075 },
    { name: 'DigitalOcean', asn: 14061 },
    { name: 'Hetzner', asn: 24940 },
  ];

  datacenterASNs.forEach(({ name, asn }) => {
    it(`flags ${name} ASN (${asn})`, () => {
      const req = mockRequest('https://site.com/', REAL_BROWSER_HEADERS, { asn });
      const detection = detectBot(req);
      expect(detection.signals).toContain('datacenter_asn');
      expect(detection.confidence).toBeGreaterThanOrEqual(25);
    });
  });
});

// ============================================================
// Scenario: Cookie signing and verification
// ============================================================
describe('Scenario: Cookie integrity', () => {
  const SECRET = 'test-secret-key-32-chars-long!!!';

  it('HMAC signature is deterministic', async () => {
    const sig1 = await hmacSHA256('payload-data', SECRET);
    const sig2 = await hmacSHA256('payload-data', SECRET);
    expect(sig1).toBe(sig2);
  });

  it('different payloads produce different signatures', async () => {
    const sig1 = await hmacSHA256('page-a', SECRET);
    const sig2 = await hmacSHA256('page-b', SECRET);
    expect(sig1).not.toBe(sig2);
  });

  it('forged signature does not match', async () => {
    const real = await hmacSHA256('real-payload', SECRET);
    const forged = await hmacSHA256('real-payload', 'wrong-secret');
    expect(real).not.toBe(forged);
  });

  it('IP hashing is consistent for same IP', async () => {
    const h1 = await sha256Short('192.168.1.1');
    const h2 = await sha256Short('192.168.1.1');
    expect(h1).toBe(h2);
  });

  it('different IPs produce different hashes', async () => {
    const h1 = await sha256Short('192.168.1.1');
    const h2 = await sha256Short('10.0.0.1');
    expect(h1).not.toBe(h2);
  });
});

// ============================================================
// Scenario: Multi-layered defense (full pipeline)
// ============================================================
describe('Scenario: Full defense pipeline', () => {
  it('real human passes all layers', () => {
    const req = mockRequest('https://site.com/', REAL_BROWSER_HEADERS);
    const detection = detectBot(req);
    const fpResult = validateFingerprint(VALID_FINGERPRINT);
    const behaviorResult = validateBehavior({
      mouse: 10, moveVarianceX: 1200, moveVarianceY: 900,
      scroll: 2, touch: 0, keys: 0, clicks: 1,
    });

    expect(detection.isBot).toBe(false);
    expect(fpResult.valid).toBe(true);
    expect(behaviorResult.valid).toBe(true);
  });

  it('sophisticated bot passes detection but fails fingerprint', () => {
    const req = mockRequest('https://site.com/', REAL_BROWSER_HEADERS);
    const detection = detectBot(req);
    expect(detection.isBot).toBe(false); // Looks human

    const fpResult = validateFingerprint({
      ...VALID_FINGERPRINT,
      canvas: 'x', // Spoofed/missing
      webgl: null,  // No WebGL
    });
    expect(fpResult.valid).toBe(false);
    expect(fpResult.failures.length).toBeGreaterThanOrEqual(2);
  });

  it('bot with perfect fingerprint fails behavioral check', () => {
    const req = mockRequest('https://site.com/', REAL_BROWSER_HEADERS);
    const detection = detectBot(req);
    expect(detection.isBot).toBe(false);

    const fpResult = validateFingerprint(VALID_FINGERPRINT);
    expect(fpResult.valid).toBe(true);

    const behaviorResult = validateBehavior({
      mouse: 50,
      moveVarianceX: 0, // Robot: perfectly consistent
      moveVarianceY: 0,
      scroll: 0, touch: 0, keys: 0, clicks: 0,
    });
    expect(behaviorResult.valid).toBe(false);
  });
});
