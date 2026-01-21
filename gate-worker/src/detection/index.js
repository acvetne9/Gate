/**
 * Advanced Bot Detection Orchestrator
 * ====================================
 * Combines all detection layers into a unified decision engine.
 *
 * Detection Layers:
 * 1. Network Layer   - IP, ASN, TLS fingerprinting
 * 2. Browser Layer   - JavaScript challenges, browser verification
 * 3. Fingerprint Layer - UA consistency, header analysis
 * 4. Behavior Layer  - Rate limiting, access patterns, timing
 * 5. Intelligence Layer - Threat feeds, known bots, honeypots
 *
 * The orchestrator runs all layers and produces a final verdict.
 */

import { analyzeNetworkLayer } from './network-layer.js';
import { checkBrowserChallenge, serveChallengeePage } from './browser-layer.js';
import { analyzeFingerprintLayer } from './fingerprint-layer.js';
import { analyzeBehaviorLayer, shouldRateLimit } from './behavior-layer.js';
import { analyzeIntelligenceLayer, getBotPolicy, getBotDescription } from './intelligence-layer.js';

// ============================================
// Detection Configuration
// ============================================

const DETECTION_CONFIG = {
  // Risk score thresholds
  thresholds: {
    definiteBot: 70,      // Score >= 70: Definitely a bot
    likelyBot: 50,        // Score >= 50: Likely a bot
    suspicious: 30,       // Score >= 30: Suspicious
    human: 0,             // Score < 30: Probably human
  },

  // Layer weights for final score calculation
  weights: {
    network: 0.20,
    fingerprint: 0.25,
    behavior: 0.25,
    intelligence: 0.30,
  },

  // Enable/disable layers
  layers: {
    network: true,
    browserChallenge: true, // Set to false to skip JS challenges
    fingerprint: true,
    behavior: true,
    intelligence: true,
  },

  // Challenge settings
  challenge: {
    requireForScore: 40,  // Require JS challenge if score >= 40
    bypassForKnownBots: true, // Skip challenge for identified bots (they'll fail anyway)
  },
};

// ============================================
// Main Detection Function
// ============================================

/**
 * Run comprehensive bot detection on a request
 *
 * @param {Request} request - Incoming request
 * @param {Object} env - Environment bindings
 * @param {Object} options - Detection options
 * @returns {Object} Detection result with verdict and details
 */
export async function detectBot(request, env, options = {}) {
  const startTime = Date.now();
  const config = { ...DETECTION_CONFIG, ...options };

  const result = {
    isBot: false,
    confidence: 0,
    verdict: 'human',
    requiresChallenge: false,
    requiresPayment: false,
    shouldBlock: false,
    layers: {},
    signals: [],
    botInfo: null,
    processingTime: 0,
  };

  try {
    // ========================================
    // Phase 1: Quick Checks (Fast Path)
    // ========================================

    // Check rate limiting first (can short-circuit)
    const ip = request.headers.get('cf-connecting-ip') || '';
    const rateLimitResult = await shouldRateLimit(ip, env);

    if (rateLimitResult.limited) {
      result.isBot = true;
      result.confidence = 100;
      result.verdict = 'rate_limited';
      result.shouldBlock = true;
      result.retryAfter = rateLimitResult.retryAfter;
      result.signals.push({
        layer: 'behavior',
        type: 'rate-limited',
        severity: 'critical'
      });
      return finalizeResult(result, startTime);
    }

    // ========================================
    // Phase 2: Run Detection Layers in Parallel
    // ========================================

    const layerPromises = [];

    if (config.layers.network) {
      layerPromises.push(
        analyzeNetworkLayer(request, env)
          .then(r => ({ name: 'network', result: r }))
          .catch(e => ({ name: 'network', error: e }))
      );
    }

    if (config.layers.fingerprint) {
      layerPromises.push(
        analyzeFingerprintLayer(request, env)
          .then(r => ({ name: 'fingerprint', result: r }))
          .catch(e => ({ name: 'fingerprint', error: e }))
      );
    }

    if (config.layers.behavior) {
      layerPromises.push(
        analyzeBehaviorLayer(request, env)
          .then(r => ({ name: 'behavior', result: r }))
          .catch(e => ({ name: 'behavior', error: e }))
      );
    }

    if (config.layers.intelligence) {
      layerPromises.push(
        analyzeIntelligenceLayer(request, env)
          .then(r => ({ name: 'intelligence', result: r }))
          .catch(e => ({ name: 'intelligence', error: e }))
      );
    }

    // Wait for all layers
    const layerResults = await Promise.all(layerPromises);

    // Process layer results
    let totalWeightedScore = 0;
    let totalWeight = 0;

    for (const { name, result: layerResult, error } of layerResults) {
      if (error) {
        console.error(`Layer ${name} error:`, error);
        continue;
      }

      result.layers[name] = layerResult;

      // Aggregate signals
      result.signals.push(...layerResult.signals.map(s => ({
        ...s,
        layer: name
      })));

      // Calculate weighted score
      const weight = config.weights[name] || 0.25;
      totalWeightedScore += layerResult.riskScore * weight;
      totalWeight += weight;

      // Capture bot info from intelligence layer
      if (name === 'intelligence' && layerResult.botInfo) {
        result.botInfo = layerResult.botInfo;
      }
    }

    // Normalize score
    const finalScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
    result.confidence = Math.round(finalScore);

    // ========================================
    // Phase 3: Determine Verdict
    // ========================================

    if (finalScore >= config.thresholds.definiteBot) {
      result.isBot = true;
      result.verdict = 'definite_bot';
    } else if (finalScore >= config.thresholds.likelyBot) {
      result.isBot = true;
      result.verdict = 'likely_bot';
    } else if (finalScore >= config.thresholds.suspicious) {
      result.verdict = 'suspicious';
      // Suspicious traffic might need a challenge
      result.requiresChallenge = config.layers.browserChallenge;
    } else {
      result.verdict = 'human';
    }

    // ========================================
    // Phase 4: Check for Critical Signals
    // ========================================

    // Any critical signal = definite bot
    const hasCritical = result.signals.some(s => s.severity === 'critical');
    if (hasCritical) {
      result.isBot = true;
      result.verdict = 'definite_bot';
      result.confidence = Math.max(result.confidence, 80);
    }

    // Honeypot triggered = block
    const honeypotTriggered = result.signals.some(s => s.type === 'honeypot-triggered');
    if (honeypotTriggered) {
      result.shouldBlock = true;
      result.verdict = 'blocked';
    }

    // ========================================
    // Phase 5: Apply Bot Policy
    // ========================================

    if (result.isBot && result.botInfo) {
      const policy = getBotPolicy(result.botInfo, options.sitePolicy);

      switch (policy) {
        case 'allow':
          result.requiresPayment = false;
          result.shouldBlock = false;
          result.policyAction = 'allow';
          break;

        case 'charge':
          result.requiresPayment = true;
          result.shouldBlock = false;
          result.policyAction = 'charge';
          break;

        case 'block':
          result.shouldBlock = true;
          result.requiresPayment = false;
          result.policyAction = 'block';
          break;
      }

      result.botDescription = getBotDescription(result.botInfo);
    } else if (result.isBot) {
      // Unknown bot - default to requiring payment
      result.requiresPayment = true;
      result.policyAction = 'charge';
      result.botDescription = 'Unknown automated traffic';
    }

    // ========================================
    // Phase 6: Browser Challenge Decision
    // ========================================

    if (config.layers.browserChallenge &&
        finalScore >= config.challenge.requireForScore &&
        !result.shouldBlock) {

      // Skip challenge for known bots (they'll fail anyway)
      if (config.challenge.bypassForKnownBots && result.botInfo) {
        result.requiresChallenge = false;
      } else {
        result.requiresChallenge = true;
      }
    }

    return finalizeResult(result, startTime);

  } catch (error) {
    console.error('Detection error:', error);

    // On error, return cautious result
    result.error = error.message;
    result.verdict = 'error';
    result.requiresChallenge = true;

    return finalizeResult(result, startTime);
  }
}

function finalizeResult(result, startTime) {
  result.processingTime = Date.now() - startTime;
  return result;
}

// ============================================
// Detection Response Handler
// ============================================

/**
 * Handle the detection result and return appropriate response
 *
 * @param {Request} request - Original request
 * @param {Object} detection - Detection result from detectBot()
 * @param {Object} env - Environment bindings
 * @returns {Response|null} Response if handling needed, null to continue
 */
export async function handleDetectionResult(request, detection, env) {
  const url = new URL(request.url);

  // ----------------------------------------
  // Case 1: Should Block
  // ----------------------------------------
  if (detection.shouldBlock) {
    return new Response('Access Denied', {
      status: 403,
      headers: {
        'Content-Type': 'text/plain',
        'X-Bot-Detection': 'blocked',
        'X-Bot-Reason': detection.verdict,
      }
    });
  }

  // ----------------------------------------
  // Case 2: Rate Limited
  // ----------------------------------------
  if (detection.verdict === 'rate_limited') {
    return new Response('Too Many Requests', {
      status: 429,
      headers: {
        'Content-Type': 'text/plain',
        'Retry-After': String(detection.retryAfter || 60),
        'X-Bot-Detection': 'rate-limited',
      }
    });
  }

  // ----------------------------------------
  // Case 3: Requires Browser Challenge
  // ----------------------------------------
  if (detection.requiresChallenge) {
    // Check if already passed challenge
    const challengeResult = await checkBrowserChallenge(request, env);

    if (challengeResult.verified) {
      // Challenge passed - update detection
      detection.requiresChallenge = false;
      detection.challengePassed = true;

      // If challenge passed, might not be a bot after all
      if (detection.verdict === 'suspicious') {
        detection.isBot = false;
        detection.verdict = 'human_verified';
      }
    } else if (challengeResult.needsChallenge) {
      // Serve challenge page
      return serveChallengeePage(request, env);
    }

    // Handle set-cookie from challenge verification
    if (challengeResult.setCookie) {
      detection.setCookie = challengeResult.setCookie;
    }
  }

  // ----------------------------------------
  // Case 4: Bot Requiring Payment
  // ----------------------------------------
  if (detection.isBot && detection.requiresPayment) {
    // Check for valid token
    const tokenHeader = request.headers.get('X-Paid-Token');

    if (!tokenHeader) {
      // No token - redirect to gate
      return redirectToPayment(url, 'missing_token', detection);
    }

    // Token will be verified by main worker
    // Return null to let main flow continue
  }

  // ----------------------------------------
  // Case 5: Human or Allowed Bot
  // ----------------------------------------
  // Return null to let the request continue to origin
  return null;
}

function redirectToPayment(originalUrl, reason, detection) {
  const gateUrl = new URL('https://securitygate.app/bot-payment');
  gateUrl.searchParams.set('return_to', originalUrl.toString());
  gateUrl.searchParams.set('reason', reason);

  if (detection.botInfo?.name) {
    gateUrl.searchParams.set('bot', detection.botInfo.name);
  }

  if (detection.botInfo?.type) {
    gateUrl.searchParams.set('bot_type', detection.botInfo.type);
  }

  if (detection.botInfo?.company) {
    gateUrl.searchParams.set('bot_company', detection.botInfo.company);
  }

  if (detection.confidence) {
    gateUrl.searchParams.set('confidence', String(detection.confidence));
  }

  if (detection.verdict) {
    gateUrl.searchParams.set('verdict', detection.verdict);
  }

  return Response.redirect(gateUrl.toString(), 302);
}

// ============================================
// Detection Summary for Logging
// ============================================

/**
 * Create a summary object suitable for logging
 */
export function createDetectionSummary(detection) {
  return {
    verdict: detection.verdict,
    isBot: detection.isBot,
    confidence: detection.confidence,
    botInfo: detection.botInfo ? {
      name: detection.botInfo.name,
      company: detection.botInfo.company,
      type: detection.botInfo.type,
    } : null,
    policyAction: detection.policyAction,
    signalCount: detection.signals.length,
    criticalSignals: detection.signals.filter(s => s.severity === 'critical').length,
    highSignals: detection.signals.filter(s => s.severity === 'high').length,
    processingTime: detection.processingTime,
    layerScores: Object.fromEntries(
      Object.entries(detection.layers).map(([k, v]) => [k, v.riskScore])
    ),
  };
}

// ============================================
// Export Individual Layer Functions
// ============================================

export {
  analyzeNetworkLayer,
  checkBrowserChallenge,
  serveChallengeePage,
  analyzeFingerprintLayer,
  analyzeBehaviorLayer,
  shouldRateLimit,
  analyzeIntelligenceLayer,
  getBotPolicy,
  getBotDescription,
};
