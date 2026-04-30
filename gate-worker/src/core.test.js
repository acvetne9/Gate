import { describe, it, expect } from 'vitest';
import {
  isStaticAsset,
  detectBot,
  classifyBlockType,
  computeHumanConfidence,
  validateFingerprint,
  validateBehavior,
  parseCookies,
  hmacSHA256,
  sha256Short,
  timingSafeEqual,
  ipTo24,
} from './core.js';

// Helper: create a mock Request with configurable headers
function mockRequest(url, headers = {}, cf = {}) {
  const h = new Headers();
  for (const [k, v] of Object.entries(headers)) h.set(k, v);
  return { url, headers: h, cf };
}

// ============================================================
// isStaticAsset
// ============================================================
describe('isStaticAsset', () => {
  it('identifies CSS files', () => {
    expect(isStaticAsset('/styles/main.css')).toBe(true);
  });

  it('identifies JS files', () => {
    expect(isStaticAsset('/assets/index-abc123.js')).toBe(true);
  });

  it('identifies images', () => {
    expect(isStaticAsset('/logo.png')).toBe(true);
    expect(isStaticAsset('/photo.jpg')).toBe(true);
    expect(isStaticAsset('/icon.svg')).toBe(true);
    expect(isStaticAsset('/hero.webp')).toBe(true);
  });

  it('identifies fonts', () => {
    expect(isStaticAsset('/fonts/inter.woff2')).toBe(true);
    expect(isStaticAsset('/fonts/arial.ttf')).toBe(true);
  });

  it('rejects HTML pages', () => {
    expect(isStaticAsset('/about')).toBe(false);
    expect(isStaticAsset('/')).toBe(false);
    expect(isStaticAsset('/blog/my-article')).toBe(false);
  });

  it('rejects API endpoints', () => {
    expect(isStaticAsset('/__gate-verify')).toBe(false);
    expect(isStaticAsset('/__gate-stats')).toBe(false);
  });
});

// ============================================================
// detectBot — Bot User-Agent Detection
// ============================================================
describe('detectBot', () => {
  describe('known bot user agents', () => {
    const knownBots = [
      ['GPTBot', 'Mozilla/5.0 (compatible; GPTBot/1.0; +https://openai.com/gptbot)'],
      ['ClaudeBot', 'Mozilla/5.0 (compatible; ClaudeBot/1.0; +https://anthropic.com)'],
      ['CCBot', 'CCBot/2.0 (https://commoncrawl.org/faq/)'],
      ['Googlebot', 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'],
      ['Bingbot', 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)'],
      ['python-requests', 'python-requests/2.31.0'],
      ['curl', 'curl/8.4.0'],
      ['Scrapy', 'Scrapy/2.11.0 (+https://scrapy.org)'],
      ['wget', 'Wget/1.21.3'],
      ['HeadlessChrome', 'Mozilla/5.0 HeadlessChrome/120.0.0.0 Safari/537.36'],
      ['Selenium', 'Mozilla/5.0 Chrome/120.0.0.0 Safari/537.36 Selenium/4.15'],
      ['AhrefsBot', 'Mozilla/5.0 (compatible; AhrefsBot/7.0)'],
      ['SEMrushBot', 'Mozilla/5.0 (compatible; SemrushBot/7~bl)'],
      ['Go-http-client', 'Go-http-client/2.0'],
      ['axios', 'axios/1.6.0'],
    ];

    knownBots.forEach(([name, ua]) => {
      it(`detects ${name} as bot (score >= 50)`, () => {
        const req = mockRequest('https://example.com/', { 'user-agent': ua });
        const result = detectBot(req);
        expect(result.isBot).toBe(true);
        expect(result.confidence).toBeGreaterThanOrEqual(50);
        expect(result.signals).toContain('ua_bot_pattern');
      });
    });
  });

  describe('empty/missing user agent', () => {
    it('flags empty user agent (score >= 60)', () => {
      const req = mockRequest('https://example.com/', { 'user-agent': '' });
      const result = detectBot(req);
      expect(result.confidence).toBeGreaterThanOrEqual(60);
      expect(result.signals).toContain('empty_user_agent');
    });

    it('flags missing user agent', () => {
      const req = mockRequest('https://example.com/');
      const result = detectBot(req);
      expect(result.confidence).toBeGreaterThanOrEqual(60);
    });
  });

  describe('real browser headers', () => {
    it('scores low for Chrome with full headers', () => {
      const req = mockRequest('https://example.com/', {
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'accept': 'text/html,application/xhtml+xml,*/*',
        'accept-language': 'en-US,en;q=0.9',
        'sec-ch-ua': '"Chromium";v="120"',
        'sec-fetch-mode': 'navigate',
      });
      const result = detectBot(req);
      expect(result.isBot).toBe(false);
      expect(result.confidence).toBeLessThan(30);
    });
  });

  describe('UA spoofing detection', () => {
    it('catches Chrome UA without Accept-Language', () => {
      const req = mockRequest('https://example.com/', {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
      });
      const result = detectBot(req);
      expect(result.confidence).toBeGreaterThanOrEqual(20);
      expect(result.signals).toContain('no_accept_language');
    });

    it('catches Chrome UA without sec-ch-ua', () => {
      const req = mockRequest('https://example.com/', {
        'user-agent': 'Mozilla/5.0 Chrome/120.0.0.0 Safari/537.36',
        'accept-language': 'en-US',
        'accept': 'text/html',
      });
      const result = detectBot(req);
      expect(result.signals).toContain('missing_client_hints');
    });
  });

  describe('datacenter ASN detection', () => {
    it('flags AWS ASN', () => {
      const req = mockRequest('https://example.com/', {
        'user-agent': 'Mozilla/5.0 Chrome/120.0.0.0',
        'accept-language': 'en',
        'accept': 'text/html',
        'sec-ch-ua': '"Chromium";v="120"',
        'sec-fetch-mode': 'navigate',
      }, { asn: 16509 });
      const result = detectBot(req);
      expect(result.signals).toContain('datacenter_asn');
      expect(result.confidence).toBeGreaterThanOrEqual(25);
    });

    it('does not flag residential ASN', () => {
      const req = mockRequest('https://example.com/', {
        'user-agent': 'Mozilla/5.0 Chrome/120.0.0.0',
        'accept-language': 'en',
        'accept': 'text/html',
        'sec-ch-ua': '"Chromium";v="120"',
        'sec-fetch-mode': 'navigate',
      }, { asn: 7922 }); // Comcast
      const result = detectBot(req);
      expect(result.signals).not.toContain('datacenter_asn');
    });
  });
});

// ============================================================
// validateFingerprint
// ============================================================
describe('validateFingerprint', () => {
  const validFingerprint = {
    ua: 'Mozilla/5.0 Chrome/120',
    lang: 'en-US',
    canvas: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEU',
    webgl: { r: 'ANGLE (Intel HD Graphics)', v: 'Google Inc. (Intel)' },
    sw: 1920, sh: 1080,
    cores: 8,
    plugins: ['PDF Viewer', 'Chrome PDF Plugin'],
    webdriver: false,
  };

  it('passes valid fingerprint', () => {
    const result = validateFingerprint(validFingerprint);
    expect(result.valid).toBe(true);
    expect(result.failures).toHaveLength(0);
  });

  it('catches webdriver flag', () => {
    const result = validateFingerprint({ ...validFingerprint, webdriver: true });
    expect(result.valid).toBe(false);
    expect(result.failures).toContain('webdriver');
  });

  it('catches SwiftShader renderer', () => {
    const result = validateFingerprint({
      ...validFingerprint,
      webgl: { r: 'Google SwiftShader', v: 'Google Inc.' },
    });
    expect(result.valid).toBe(false);
    expect(result.failures).toContain('headless_webgl');
  });

  it('catches missing canvas', () => {
    const result = validateFingerprint({ ...validFingerprint, canvas: null });
    expect(result.valid).toBe(false);
    expect(result.failures).toContain('missing_canvas');
  });

  it('catches short canvas (spoofed)', () => {
    const result = validateFingerprint({ ...validFingerprint, canvas: 'test' });
    expect(result.valid).toBe(false);
    expect(result.failures).toContain('missing_canvas');
  });

  it('catches zero screen dimensions', () => {
    const result = validateFingerprint({ ...validFingerprint, sw: 0, sh: 0 });
    expect(result.valid).toBe(false);
    expect(result.failures).toContain('zero_screen');
  });

  it('catches missing WebGL', () => {
    const result = validateFingerprint({ ...validFingerprint, webgl: null });
    expect(result.valid).toBe(false);
    expect(result.failures).toContain('missing_webgl');
  });

  it('catches zero cores', () => {
    const result = validateFingerprint({ ...validFingerprint, cores: 0 });
    expect(result.valid).toBe(false);
    expect(result.failures).toContain('zero_cores');
  });

  it('catches missing language', () => {
    const result = validateFingerprint({ ...validFingerprint, lang: '' });
    expect(result.valid).toBe(false);
    expect(result.failures).toContain('missing_language');
  });

  it('catches headless screen + no plugins combo', () => {
    const result = validateFingerprint({
      ...validFingerprint,
      sw: 800, sh: 600,
      plugins: [],
    });
    expect(result.valid).toBe(false);
    expect(result.failures).toContain('headless_screen_no_plugins');
  });

  it('allows 800x600 if plugins present', () => {
    const result = validateFingerprint({
      ...validFingerprint,
      sw: 800, sh: 600,
      plugins: ['PDF Viewer'],
    });
    expect(result.failures).not.toContain('headless_screen_no_plugins');
  });
});

// ============================================================
// validateBehavior
// ============================================================
describe('validateBehavior', () => {
  it('passes with natural mouse movement', () => {
    const result = validateBehavior({
      mouse: 20, moveVarianceX: 1500, moveVarianceY: 800,
      scroll: 3, touch: 0, keys: 0, clicks: 1,
    });
    expect(result.valid).toBe(true);
  });

  it('catches perfectly linear mouse movement', () => {
    const result = validateBehavior({
      mouse: 10, moveVarianceX: 0, moveVarianceY: 0,
      scroll: 0, touch: 0, keys: 0, clicks: 0,
    });
    expect(result.valid).toBe(false);
    expect(result.failures).toContain('linear_mouse_movement');
  });

  it('passes with no behavioral data (mobile)', () => {
    const result = validateBehavior(null);
    expect(result.valid).toBe(true);
  });

  it('passes with minimal mouse movement (< 5 moves)', () => {
    const result = validateBehavior({
      mouse: 3, moveVarianceX: 0, moveVarianceY: 0,
    });
    expect(result.valid).toBe(true);
  });
});

// ============================================================
// parseCookies
// ============================================================
describe('parseCookies', () => {
  it('parses single cookie', () => {
    const result = parseCookies('__gate_verified=abc123');
    expect(result.__gate_verified).toBe('abc123');
  });

  it('parses multiple cookies', () => {
    const result = parseCookies('a=1; b=2; c=3');
    expect(result.a).toBe('1');
    expect(result.b).toBe('2');
    expect(result.c).toBe('3');
  });

  it('handles empty string', () => {
    const result = parseCookies('');
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('handles null', () => {
    const result = parseCookies(null);
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('handles cookies with = in value', () => {
    const result = parseCookies('token=abc=def=ghi');
    expect(result.token).toBe('abc=def=ghi');
  });
});

// ============================================================
// Crypto helpers
// ============================================================
describe('hmacSHA256', () => {
  it('produces consistent signatures', async () => {
    const sig1 = await hmacSHA256('hello', 'secret');
    const sig2 = await hmacSHA256('hello', 'secret');
    expect(sig1).toBe(sig2);
  });

  it('produces different signatures for different data', async () => {
    const sig1 = await hmacSHA256('hello', 'secret');
    const sig2 = await hmacSHA256('world', 'secret');
    expect(sig1).not.toBe(sig2);
  });

  it('produces different signatures for different secrets', async () => {
    const sig1 = await hmacSHA256('hello', 'secret1');
    const sig2 = await hmacSHA256('hello', 'secret2');
    expect(sig1).not.toBe(sig2);
  });
});

describe('sha256Short', () => {
  it('produces consistent hashes', async () => {
    const h1 = await sha256Short('test');
    const h2 = await sha256Short('test');
    expect(h1).toBe(h2);
  });

  it('produces different hashes for different inputs', async () => {
    const h1 = await sha256Short('hello');
    const h2 = await sha256Short('world');
    expect(h1).not.toBe(h2);
  });
});

describe('timingSafeEqual', () => {
  it('returns true for equal strings', () => {
    expect(timingSafeEqual('abc', 'abc')).toBe(true);
  });

  it('returns false for different strings', () => {
    expect(timingSafeEqual('abc', 'def')).toBe(false);
  });

  it('returns false for different lengths', () => {
    expect(timingSafeEqual('abc', 'abcd')).toBe(false);
  });

  it('returns true for empty strings', () => {
    expect(timingSafeEqual('', '')).toBe(true);
  });
});

describe('ipTo24', () => {
  it('converts IPv4 to /24 prefix', () => {
    expect(ipTo24('192.168.1.100')).toBe('192.168.1.0/24');
  });

  it('handles different IPs in same subnet', () => {
    expect(ipTo24('10.0.0.1')).toBe('10.0.0.0/24');
    expect(ipTo24('10.0.0.255')).toBe('10.0.0.0/24');
  });

  it('returns null for non-IPv4', () => {
    expect(ipTo24('::1')).toBeNull();
    expect(ipTo24(null)).toBeNull();
    expect(ipTo24('')).toBeNull();
  });
});

// ============================================================
// classifyBlockType
// ============================================================
describe('classifyBlockType', () => {
  it('hard-blocks HTTP libraries', () => {
    expect(classifyBlockType('curl/7.64.1', [])).toBe('hard_block');
    expect(classifyBlockType('python-requests/2.28.0', [])).toBe('hard_block');
    expect(classifyBlockType('wget/1.21', [])).toBe('hard_block');
    expect(classifyBlockType('Go-http-client/1.1', [])).toBe('hard_block');
    expect(classifyBlockType('node-fetch/2.6.7', [])).toBe('hard_block');
    expect(classifyBlockType('axios/1.4.0', [])).toBe('hard_block');
    expect(classifyBlockType('Scrapy/2.8.0', [])).toBe('hard_block');
  });

  it('hard-blocks headless browsers', () => {
    expect(classifyBlockType('Mozilla/5.0 HeadlessChrome/120.0', [])).toBe('hard_block');
    expect(classifyBlockType('PhantomJS/2.1.1', [])).toBe('hard_block');
    expect(classifyBlockType('puppeteer-extra', [])).toBe('hard_block');
    expect(classifyBlockType('playwright/1.40.0', [])).toBe('hard_block');
  });

  it('hard-blocks empty user-agent', () => {
    expect(classifyBlockType('', [])).toBe('hard_block');
    expect(classifyBlockType(null, [])).toBe('hard_block');
  });

  it('hard-blocks datacenter ASN + bot UA combo', () => {
    expect(classifyBlockType('SomeBot/1.0', ['datacenter_asn', 'ua_bot_pattern'])).toBe('hard_block');
  });

  it('payment-redirects AI crawlers', () => {
    expect(classifyBlockType('Mozilla/5.0 (compatible; GPTBot/1.0)', ['ua_bot_pattern'])).toBe('payment_redirect');
    expect(classifyBlockType('ClaudeBot/1.0', ['ua_bot_pattern'])).toBe('payment_redirect');
    expect(classifyBlockType('CCBot/2.0', ['ua_bot_pattern'])).toBe('payment_redirect');
  });

  it('payment-redirects search engine bots', () => {
    expect(classifyBlockType('Googlebot/2.1', ['ua_bot_pattern'])).toBe('payment_redirect');
    expect(classifyBlockType('Mozilla/5.0 (compatible; bingbot/2.0)', ['ua_bot_pattern'])).toBe('payment_redirect');
  });
});

// ============================================================
// detectBot — blockType field
// ============================================================
describe('detectBot blockType', () => {
  it('returns hard_block for curl', () => {
    const req = mockRequest('https://example.com/', { 'user-agent': 'curl/7.64.1' });
    const result = detectBot(req);
    expect(result.blockType).toBe('hard_block');
    expect(result.confidence).toBeGreaterThanOrEqual(50);
  });

  it('returns payment_redirect for GPTBot', () => {
    const req = mockRequest('https://example.com/', { 'user-agent': 'Mozilla/5.0 (compatible; GPTBot/1.0)' });
    const result = detectBot(req);
    expect(result.blockType).toBe('payment_redirect');
  });

  it('returns payment_redirect for normal browser', () => {
    const req = mockRequest('https://example.com/', {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      'accept-language': 'en-US,en;q=0.9',
      'accept': 'text/html',
      'sec-ch-ua': '"Chromium";v="120"',
      'sec-fetch-mode': 'navigate',
    });
    const result = detectBot(req);
    expect(result.blockType).toBe('payment_redirect');
  });
});

// ============================================================
// computeHumanConfidence
// ============================================================
describe('computeHumanConfidence', () => {
  it('returns strong for rich behavioral signals', () => {
    expect(computeHumanConfidence({
      mouse: 25, scroll: 3, touch: 0, keys: 0, clicks: 2,
      moveVarianceX: 500, moveVarianceY: 300, timeOnPage: 5000, samples: 20,
    })).toBe('strong');
  });

  it('returns strong for mobile touch users', () => {
    expect(computeHumanConfidence({
      mouse: 0, scroll: 2, touch: 5, keys: 0, clicks: 0,
      moveVarianceX: 0, moveVarianceY: 0, timeOnPage: 4000, samples: 0,
    })).toBe('strong');
  });

  it('returns moderate for minimal but present interaction', () => {
    expect(computeHumanConfidence({
      mouse: 15, scroll: 0, touch: 0, keys: 0, clicks: 0,
      moveVarianceX: 50, moveVarianceY: 30, timeOnPage: 1000, samples: 5,
    })).toBe('moderate');
  });

  it('returns moderate for slow page load with time', () => {
    expect(computeHumanConfidence({
      mouse: 0, scroll: 0, touch: 0, keys: 0, clicks: 0,
      moveVarianceX: 0, moveVarianceY: 0, timeOnPage: 3000, samples: 0,
    })).toBe('moderate');
  });

  it('returns weak for null behavior', () => {
    expect(computeHumanConfidence(null)).toBe('weak');
  });

  it('returns weak for zero interaction and fast solve', () => {
    expect(computeHumanConfidence({
      mouse: 0, scroll: 0, touch: 0, keys: 0, clicks: 0,
      moveVarianceX: 0, moveVarianceY: 0, timeOnPage: 500, samples: 0,
    })).toBe('weak');
  });
});
