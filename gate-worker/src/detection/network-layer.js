/**
 * Network Layer Detection
 * =======================
 * Analyzes network-level signals that bots cannot easily spoof:
 * - IP reputation & datacenter detection
 * - ASN (Autonomous System Number) analysis
 * - TLS fingerprinting (JA3/JA4)
 * - TCP/IP characteristics
 * - Geolocation anomalies
 */

// ============================================
// Known Datacenter/Cloud Provider ASNs
// ============================================
// Bots often run from cloud infrastructure
const DATACENTER_ASNS = new Set([
  // AWS
  14618, 16509, 7224,
  // Google Cloud
  15169, 396982,
  // Microsoft Azure
  8075, 8068, 8069,
  // DigitalOcean
  14061,
  // Linode
  63949,
  // Vultr
  20473,
  // OVH
  16276,
  // Hetzner
  24940,
  // Cloudflare (Workers, but could be proxied bots)
  13335,
  // Oracle Cloud
  31898,
  // IBM Cloud
  36351,
  // Alibaba Cloud
  45102,
  // Tencent Cloud
  132203,
  // HostGator/Bluehost
  46606,
  // GoDaddy
  26496,
  // Rackspace
  19994,
  // Scaleway
  12876,
]);

// ============================================
// Known Hosting/Proxy Provider Keywords
// ============================================
const HOSTING_KEYWORDS = [
  'hosting', 'server', 'cloud', 'vps', 'dedicated',
  'datacenter', 'data center', 'colocation', 'colo',
  'amazon', 'aws', 'google', 'microsoft', 'azure',
  'digitalocean', 'linode', 'vultr', 'ovh', 'hetzner',
  'proxy', 'vpn', 'tor', 'exit node',
];

// ============================================
// Known Bot TLS Fingerprints (JA3 Hashes)
// ============================================
// These are simplified examples - maintain your own list
const KNOWN_BOT_JA3 = new Set([
  // Python requests library
  '3b5074b1b5d032e5620f69f9f700ff0e',
  // Go net/http
  '2d8f8e8b3c5d4e5f6a7b8c9d0e1f2a3b',
  // curl
  '456523fc94726331a4d5a2e1d40b2cd7',
  // Node.js (some versions)
  'ada70206e40642a3e4461f35503241d5',
  // Headless Chrome (old)
  'b32309a26951912be7dba376398abc3b',
  // PhantomJS
  '9e10692f1b7f78228b2d4e424db3a98c',
]);

// ============================================
// Suspicious TLS Characteristics
// ============================================
const OUTDATED_TLS_VERSIONS = ['TLSv1', 'TLSv1.0', 'TLSv1.1'];
const SUSPICIOUS_CIPHER_SUITES = [
  // Weak ciphers that modern browsers don't use
  'TLS_RSA_WITH_AES_128_CBC_SHA',
  'TLS_RSA_WITH_AES_256_CBC_SHA',
  'TLS_RSA_WITH_3DES_EDE_CBC_SHA',
];

// ============================================
// Main Network Analysis Function
// ============================================

/**
 * Analyze network-layer signals
 * @param {Request} request - Incoming request
 * @param {Object} env - Environment bindings
 * @returns {Object} Network analysis result with signals
 */
export async function analyzeNetworkLayer(request, env) {
  const cf = request.cf || {};
  const signals = [];
  let riskScore = 0;

  // ----------------------------------------
  // 1. IP Address Analysis
  // ----------------------------------------
  const ip = request.headers.get('cf-connecting-ip') || '';
  const ipAnalysis = analyzeIP(ip, cf);
  signals.push(...ipAnalysis.signals);
  riskScore += ipAnalysis.risk;

  // ----------------------------------------
  // 2. ASN / Network Analysis
  // ----------------------------------------
  const asnAnalysis = analyzeASN(cf);
  signals.push(...asnAnalysis.signals);
  riskScore += asnAnalysis.risk;

  // ----------------------------------------
  // 3. TLS Fingerprint Analysis
  // ----------------------------------------
  const tlsAnalysis = analyzeTLSFingerprint(cf, request);
  signals.push(...tlsAnalysis.signals);
  riskScore += tlsAnalysis.risk;

  // ----------------------------------------
  // 4. Geolocation Analysis
  // ----------------------------------------
  const geoAnalysis = analyzeGeolocation(cf, request);
  signals.push(...geoAnalysis.signals);
  riskScore += geoAnalysis.risk;

  // ----------------------------------------
  // 5. Connection Characteristics
  // ----------------------------------------
  const connAnalysis = analyzeConnection(cf, request);
  signals.push(...connAnalysis.signals);
  riskScore += connAnalysis.risk;

  return {
    layer: 'network',
    riskScore: Math.min(riskScore, 100),
    signals,
    metadata: {
      ip,
      asn: cf.asn,
      country: cf.country,
      tlsVersion: cf.tlsVersion,
      httpProtocol: cf.httpProtocol,
    }
  };
}

// ============================================
// IP Analysis
// ============================================

function analyzeIP(ip, cf) {
  const signals = [];
  let risk = 0;

  // Check if IP is IPv6 (less common for bots, but not definitive)
  const isIPv6 = ip.includes(':');

  // Check for localhost/private IPs (shouldn't happen via CF, but check anyway)
  if (isPrivateIP(ip)) {
    signals.push({ type: 'private-ip', severity: 'high', detail: 'Private IP address' });
    risk += 30;
  }

  // Check Cloudflare's threat score if available
  if (cf.threatScore !== undefined) {
    if (cf.threatScore > 50) {
      signals.push({ type: 'cf-threat-score', severity: 'high', detail: `Score: ${cf.threatScore}` });
      risk += 25;
    } else if (cf.threatScore > 20) {
      signals.push({ type: 'cf-threat-score', severity: 'medium', detail: `Score: ${cf.threatScore}` });
      risk += 15;
    }
  }

  // Check if Cloudflare detected it as a known bot
  if (cf.isBot) {
    signals.push({ type: 'cf-known-bot', severity: 'info', detail: 'Cloudflare identified as bot' });
    risk += 20;
  }

  return { signals, risk };
}

function isPrivateIP(ip) {
  // IPv4 private ranges
  const privateRanges = [
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^127\./,
    /^0\./,
  ];
  return privateRanges.some(r => r.test(ip));
}

// ============================================
// ASN Analysis
// ============================================

function analyzeASN(cf) {
  const signals = [];
  let risk = 0;

  const asn = cf.asn;
  const asOrg = cf.asOrganization || '';

  if (!asn) {
    signals.push({ type: 'missing-asn', severity: 'medium', detail: 'No ASN information' });
    risk += 10;
    return { signals, risk };
  }

  // Check if ASN belongs to known datacenter
  if (DATACENTER_ASNS.has(asn)) {
    signals.push({
      type: 'datacenter-asn',
      severity: 'medium',
      detail: `ASN ${asn} is a known datacenter/cloud provider`
    });
    risk += 20;
  }

  // Check AS organization name for hosting keywords
  const orgLower = asOrg.toLowerCase();
  for (const keyword of HOSTING_KEYWORDS) {
    if (orgLower.includes(keyword)) {
      signals.push({
        type: 'hosting-org',
        severity: 'medium',
        detail: `AS organization "${asOrg}" matches hosting pattern`
      });
      risk += 15;
      break;
    }
  }

  // Check for known proxy/VPN providers in org name
  if (/vpn|proxy|anonymo|hide|mask|tunnel/i.test(asOrg)) {
    signals.push({
      type: 'proxy-asn',
      severity: 'high',
      detail: `AS organization "${asOrg}" appears to be a proxy/VPN`
    });
    risk += 25;
  }

  return { signals, risk };
}

// ============================================
// TLS Fingerprint Analysis
// ============================================

function analyzeTLSFingerprint(cf, request) {
  const signals = [];
  let risk = 0;

  // Check TLS version
  const tlsVersion = cf.tlsVersion;
  if (tlsVersion && OUTDATED_TLS_VERSIONS.includes(tlsVersion)) {
    signals.push({
      type: 'outdated-tls',
      severity: 'high',
      detail: `Using outdated ${tlsVersion}`
    });
    risk += 25;
  }

  // Check JA3 fingerprint (requires Cloudflare Bot Management)
  const botManagement = cf.botManagement || {};
  const ja3Hash = botManagement.ja3Hash;

  if (ja3Hash) {
    if (KNOWN_BOT_JA3.has(ja3Hash)) {
      signals.push({
        type: 'known-bot-ja3',
        severity: 'high',
        detail: `JA3 hash ${ja3Hash} matches known bot`
      });
      risk += 30;
    }

    // Check for JA3 anomalies
    // Real browsers have consistent JA3 for their version
    // Bots often have unusual or inconsistent fingerprints
  }

  // Check Cloudflare's bot score if available
  const botScore = botManagement.score;
  if (botScore !== undefined) {
    if (botScore < 10) {
      signals.push({
        type: 'cf-bot-score-critical',
        severity: 'critical',
        detail: `Bot score: ${botScore}/100 (definitely automated)`
      });
      risk += 40;
    } else if (botScore < 30) {
      signals.push({
        type: 'cf-bot-score-high',
        severity: 'high',
        detail: `Bot score: ${botScore}/100 (likely automated)`
      });
      risk += 25;
    } else if (botScore < 50) {
      signals.push({
        type: 'cf-bot-score-medium',
        severity: 'medium',
        detail: `Bot score: ${botScore}/100 (possibly automated)`
      });
      risk += 15;
    }
  }

  // Check verified bot status
  if (botManagement.verifiedBot) {
    signals.push({
      type: 'cf-verified-bot',
      severity: 'info',
      detail: 'Cloudflare verified this as a legitimate bot'
    });
    // Don't add risk - verified bots are known entities
  }

  return { signals, risk };
}

// ============================================
// Geolocation Analysis
// ============================================

function analyzeGeolocation(cf, request) {
  const signals = [];
  let risk = 0;

  const country = cf.country;
  const region = cf.region;
  const city = cf.city;
  const timezone = cf.timezone;

  // Check Accept-Language vs Geolocation mismatch
  const acceptLang = request.headers.get('accept-language') || '';

  if (country && acceptLang) {
    const langMismatch = checkLanguageGeoMismatch(acceptLang, country);
    if (langMismatch.suspicious) {
      signals.push({
        type: 'lang-geo-mismatch',
        severity: 'low',
        detail: langMismatch.detail
      });
      risk += 5;
    }
  }

  // Check for Tor exit nodes (Cloudflare marks these)
  if (cf.isTor) {
    signals.push({
      type: 'tor-exit',
      severity: 'high',
      detail: 'Request from Tor exit node'
    });
    risk += 25;
  }

  // Check for known high-risk countries (customize based on your use case)
  // This is controversial - use carefully and consider legal implications

  return { signals, risk };
}

function checkLanguageGeoMismatch(acceptLang, country) {
  // Map countries to expected primary languages
  const countryLangMap = {
    'US': ['en'],
    'GB': ['en'],
    'DE': ['de'],
    'FR': ['fr'],
    'ES': ['es'],
    'IT': ['it'],
    'JP': ['ja'],
    'CN': ['zh'],
    'KR': ['ko'],
    'BR': ['pt'],
    'RU': ['ru'],
  };

  const expectedLangs = countryLangMap[country];
  if (!expectedLangs) return { suspicious: false };

  // Extract primary language from Accept-Language
  const primaryLang = acceptLang.split(',')[0].split('-')[0].toLowerCase();

  // Check if there's a mismatch
  if (!expectedLangs.includes(primaryLang)) {
    return {
      suspicious: true,
      detail: `Language "${primaryLang}" unusual for country "${country}"`
    };
  }

  return { suspicious: false };
}

// ============================================
// Connection Analysis
// ============================================

function analyzeConnection(cf, request) {
  const signals = [];
  let risk = 0;

  // Check HTTP protocol version
  const httpProtocol = cf.httpProtocol;

  // HTTP/1.0 is very unusual for modern browsers
  if (httpProtocol === 'HTTP/1.0') {
    signals.push({
      type: 'http10',
      severity: 'high',
      detail: 'Using HTTP/1.0 (very unusual for browsers)'
    });
    risk += 20;
  }

  // HTTP/1.1 without upgrade to h2 might indicate older tools
  if (httpProtocol === 'HTTP/1.1') {
    signals.push({
      type: 'http11-only',
      severity: 'low',
      detail: 'Using HTTP/1.1 (most browsers support HTTP/2+)'
    });
    risk += 5;
  }

  // Check for unusual request method on typical pages
  const method = request.method;
  if (!['GET', 'HEAD', 'POST', 'OPTIONS'].includes(method)) {
    signals.push({
      type: 'unusual-method',
      severity: 'medium',
      detail: `Unusual HTTP method: ${method}`
    });
    risk += 10;
  }

  return { signals, risk };
}

// ============================================
// IP Reputation Check (External Service)
// ============================================

/**
 * Check IP against external reputation services
 * Implement this with your preferred service (AbuseIPDB, IPQualityScore, etc.)
 */
export async function checkIPReputation(ip, env) {
  // Example: AbuseIPDB integration
  // Requires ABUSEIPDB_API_KEY in env

  if (!env.ABUSEIPDB_API_KEY) {
    return { checked: false, reason: 'No API key configured' };
  }

  try {
    const response = await fetch(`https://api.abuseipdb.com/api/v2/check?ipAddress=${ip}`, {
      headers: {
        'Key': env.ABUSEIPDB_API_KEY,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      return { checked: false, reason: 'API error' };
    }

    const data = await response.json();
    const abuseScore = data.data?.abuseConfidenceScore || 0;

    return {
      checked: true,
      score: abuseScore,
      isTor: data.data?.isTor || false,
      isPublicProxy: data.data?.isPublicProxy || false,
      totalReports: data.data?.totalReports || 0
    };

  } catch (error) {
    console.error('IP reputation check failed:', error);
    return { checked: false, reason: error.message };
  }
}
