// Bot Knowledge Base - Comprehensive database of known bots
// Updated regularly to identify legitimate and malicious bots

export interface BotPattern {
  name: string
  company: string
  type: 'ai-training' | 'search-engine' | 'monitoring' | 'scraper' | 'security' | 'social-media' | 'seo' | 'unknown'
  purpose: string
  isLegitimate: boolean
  respectsRobotsTxt: boolean
  docsUrl?: string
  userAgentPatterns: RegExp[]
  ipRanges?: string[] // CIDR notation
  reverseDnsPatterns?: RegExp[] // PTR record patterns
  verificationMethod: 'user-agent' | 'ip-range' | 'reverse-dns' | 'combined'
}

export const KNOWN_BOTS: BotPattern[] = [
  // ============================================
  // AI Training Bots
  // ============================================
  {
    name: 'GPTBot',
    company: 'OpenAI',
    type: 'ai-training',
    purpose: 'Training GPT models and AI systems',
    isLegitimate: true,
    respectsRobotsTxt: true,
    docsUrl: 'https://platform.openai.com/docs/gptbot',
    userAgentPatterns: [/GPTBot/i],
    reverseDnsPatterns: [/\.openai\.com$/],
    verificationMethod: 'combined'
  },
  {
    name: 'ClaudeBot',
    company: 'Anthropic',
    type: 'ai-training',
    purpose: 'Training Claude AI models',
    isLegitimate: true,
    respectsRobotsTxt: true,
    docsUrl: 'https://support.anthropic.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler',
    userAgentPatterns: [/ClaudeBot/i, /Claude-Web/i],
    reverseDnsPatterns: [/\.anthropic\.com$/],
    verificationMethod: 'combined'
  },
  {
    name: 'CCBot',
    company: 'Common Crawl',
    type: 'ai-training',
    purpose: 'Building web archives for AI training and research',
    isLegitimate: true,
    respectsRobotsTxt: true,
    docsUrl: 'https://commoncrawl.org/ccbot',
    userAgentPatterns: [/CCBot/i],
    reverseDnsPatterns: [/\.commoncrawl\.org$/],
    verificationMethod: 'combined'
  },
  {
    name: 'Google-Extended',
    company: 'Google',
    type: 'ai-training',
    purpose: 'Training Google AI models (Bard/Gemini)',
    isLegitimate: true,
    respectsRobotsTxt: true,
    docsUrl: 'https://developers.google.com/search/docs/crawling-indexing/overview-google-crawlers',
    userAgentPatterns: [/Google-Extended/i],
    reverseDnsPatterns: [/\.google\.com$/, /\.googlebot\.com$/],
    verificationMethod: 'combined'
  },
  {
    name: 'FacebookBot',
    company: 'Meta',
    type: 'ai-training',
    purpose: 'Training Meta AI models',
    isLegitimate: true,
    respectsRobotsTxt: true,
    docsUrl: 'https://developers.facebook.com/docs/sharing/webmasters/crawler',
    userAgentPatterns: [/facebookexternalhit/i, /Meta-ExternalAgent/i],
    reverseDnsPatterns: [/\.fbsv\.net$/, /\.facebook\.com$/],
    verificationMethod: 'combined'
  },
  {
    name: 'PerplexityBot',
    company: 'Perplexity AI',
    type: 'ai-training',
    purpose: 'Training Perplexity AI search models',
    isLegitimate: true,
    respectsRobotsTxt: true,
    docsUrl: 'https://docs.perplexity.ai/docs/perplexitybot',
    userAgentPatterns: [/PerplexityBot/i],
    verificationMethod: 'user-agent'
  },
  {
    name: 'Anthropic-AI',
    company: 'Anthropic',
    type: 'ai-training',
    purpose: 'Research and AI training',
    isLegitimate: true,
    respectsRobotsTxt: true,
    userAgentPatterns: [/anthropic-ai/i],
    verificationMethod: 'user-agent'
  },
  {
    name: 'Applebot-Extended',
    company: 'Apple',
    type: 'ai-training',
    purpose: 'Training Apple Intelligence models',
    isLegitimate: true,
    respectsRobotsTxt: true,
    docsUrl: 'https://support.apple.com/en-us/119829',
    userAgentPatterns: [/Applebot-Extended/i],
    reverseDnsPatterns: [/\.applebot\.apple\.com$/],
    verificationMethod: 'combined'
  },

  // ============================================
  // Search Engine Crawlers
  // ============================================
  {
    name: 'Googlebot',
    company: 'Google',
    type: 'search-engine',
    purpose: 'Web indexing for Google Search',
    isLegitimate: true,
    respectsRobotsTxt: true,
    docsUrl: 'https://developers.google.com/search/docs/crawling-indexing/googlebot',
    userAgentPatterns: [/Googlebot/i],
    reverseDnsPatterns: [/\.google\.com$/, /\.googlebot\.com$/],
    verificationMethod: 'combined'
  },
  {
    name: 'Bingbot',
    company: 'Microsoft',
    type: 'search-engine',
    purpose: 'Web indexing for Bing Search',
    isLegitimate: true,
    respectsRobotsTxt: true,
    docsUrl: 'https://www.bing.com/webmasters/help/which-crawlers-does-bing-use-8c184ec0',
    userAgentPatterns: [/bingbot/i, /BingPreview/i],
    reverseDnsPatterns: [/\.search\.msn\.com$/],
    verificationMethod: 'combined'
  },
  {
    name: 'DuckDuckBot',
    company: 'DuckDuckGo',
    type: 'search-engine',
    purpose: 'Web indexing for DuckDuckGo Search',
    isLegitimate: true,
    respectsRobotsTxt: true,
    docsUrl: 'https://help.duckduckgo.com/duckduckgo-help-pages/results/duckduckbot/',
    userAgentPatterns: [/DuckDuckBot/i],
    verificationMethod: 'user-agent'
  },
  {
    name: 'Baiduspider',
    company: 'Baidu',
    type: 'search-engine',
    purpose: 'Web indexing for Baidu Search',
    isLegitimate: true,
    respectsRobotsTxt: true,
    userAgentPatterns: [/Baiduspider/i],
    reverseDnsPatterns: [/\.crawl\.baidu\.com$/],
    verificationMethod: 'combined'
  },
  {
    name: 'Yandex Bot',
    company: 'Yandex',
    type: 'search-engine',
    purpose: 'Web indexing for Yandex Search',
    isLegitimate: true,
    respectsRobotsTxt: true,
    docsUrl: 'https://yandex.com/support/webmaster/robot-workings/check-yandex-robots.html',
    userAgentPatterns: [/YandexBot/i],
    reverseDnsPatterns: [/\.yandex\.ru$/, /\.yandex\.net$/, /\.yandex\.com$/],
    verificationMethod: 'combined'
  },

  // ============================================
  // Social Media Bots
  // ============================================
  {
    name: 'Twitterbot',
    company: 'Twitter/X',
    type: 'social-media',
    purpose: 'Fetching link previews and cards',
    isLegitimate: true,
    respectsRobotsTxt: true,
    userAgentPatterns: [/Twitterbot/i],
    reverseDnsPatterns: [/\.twitter\.com$/],
    verificationMethod: 'combined'
  },
  {
    name: 'LinkedInBot',
    company: 'LinkedIn',
    type: 'social-media',
    purpose: 'Fetching link previews',
    isLegitimate: true,
    respectsRobotsTxt: true,
    userAgentPatterns: [/LinkedInBot/i],
    reverseDnsPatterns: [/\.linkedin\.com$/],
    verificationMethod: 'combined'
  },
  {
    name: 'Slackbot',
    company: 'Slack',
    type: 'social-media',
    purpose: 'Unfurling links in Slack messages',
    isLegitimate: true,
    respectsRobotsTxt: false,
    docsUrl: 'https://api.slack.com/robots',
    userAgentPatterns: [/Slackbot/i],
    verificationMethod: 'user-agent'
  },
  {
    name: 'WhatsApp',
    company: 'Meta',
    type: 'social-media',
    purpose: 'Link preview generation',
    isLegitimate: true,
    respectsRobotsTxt: false,
    userAgentPatterns: [/WhatsApp/i],
    verificationMethod: 'user-agent'
  },

  // ============================================
  // Monitoring & SEO Tools
  // ============================================
  {
    name: 'SemrushBot',
    company: 'Semrush',
    type: 'seo',
    purpose: 'SEO analysis and monitoring',
    isLegitimate: true,
    respectsRobotsTxt: true,
    docsUrl: 'https://www.semrush.com/bot/',
    userAgentPatterns: [/SemrushBot/i],
    verificationMethod: 'user-agent'
  },
  {
    name: 'AhrefsBot',
    company: 'Ahrefs',
    type: 'seo',
    purpose: 'SEO backlink analysis',
    isLegitimate: true,
    respectsRobotsTxt: true,
    docsUrl: 'https://ahrefs.com/robot',
    userAgentPatterns: [/AhrefsBot/i],
    verificationMethod: 'user-agent'
  },
  {
    name: 'MJ12bot',
    company: 'Majestic',
    type: 'seo',
    purpose: 'Building search engine index',
    isLegitimate: true,
    respectsRobotsTxt: true,
    docsUrl: 'https://majestic.com/about/crawler',
    userAgentPatterns: [/MJ12bot/i],
    verificationMethod: 'user-agent'
  },
  {
    name: 'DotBot',
    company: 'Moz',
    type: 'seo',
    purpose: 'SEO data collection',
    isLegitimate: true,
    respectsRobotsTxt: true,
    docsUrl: 'https://moz.com/help/moz-procedures/what-is-dotbot',
    userAgentPatterns: [/DotBot/i],
    verificationMethod: 'user-agent'
  },

  // ============================================
  // Security & Monitoring
  // ============================================
  {
    name: 'DatadogSynthetics',
    company: 'Datadog',
    type: 'monitoring',
    purpose: 'Website uptime and performance monitoring',
    isLegitimate: true,
    respectsRobotsTxt: false,
    userAgentPatterns: [/DatadogSynthetics/i],
    verificationMethod: 'user-agent'
  },
  {
    name: 'Pingdom',
    company: 'Pingdom',
    type: 'monitoring',
    purpose: 'Website monitoring',
    isLegitimate: true,
    respectsRobotsTxt: false,
    userAgentPatterns: [/Pingdom/i],
    verificationMethod: 'user-agent'
  },
  {
    name: 'UptimeRobot',
    company: 'UptimeRobot',
    type: 'monitoring',
    purpose: 'Website uptime monitoring',
    isLegitimate: true,
    respectsRobotsTxt: false,
    userAgentPatterns: [/UptimeRobot/i],
    verificationMethod: 'user-agent'
  },

  // ============================================
  // Scrapers & Malicious Bots (Known Bad Actors)
  // ============================================
  {
    name: 'SemrushBot (Aggressive)',
    company: 'Unknown',
    type: 'scraper',
    purpose: 'Aggressive content scraping',
    isLegitimate: false,
    respectsRobotsTxt: false,
    userAgentPatterns: [/SEMrushBot/i],
    verificationMethod: 'user-agent'
  },
  {
    name: 'MauiBot',
    company: 'Unknown',
    type: 'scraper',
    purpose: 'Content scraping',
    isLegitimate: false,
    respectsRobotsTxt: false,
    userAgentPatterns: [/MauiBot/i],
    verificationMethod: 'user-agent'
  },
  {
    name: 'AhrefsBot (Aggressive)',
    company: 'Unknown',
    type: 'scraper',
    purpose: 'Aggressive scraping',
    isLegitimate: false,
    respectsRobotsTxt: false,
    userAgentPatterns: [/AhrefsSiteAudit/i],
    verificationMethod: 'user-agent'
  },
  {
    name: 'PetalBot',
    company: 'Aspiegel',
    type: 'scraper',
    purpose: 'Content scraping',
    isLegitimate: false,
    respectsRobotsTxt: false,
    userAgentPatterns: [/PetalBot/i],
    verificationMethod: 'user-agent'
  },
  {
    name: 'Bytespider',
    company: 'ByteDance',
    type: 'ai-training',
    purpose: 'Data collection for AI training',
    isLegitimate: true,
    respectsRobotsTxt: true,
    userAgentPatterns: [/Bytespider/i],
    verificationMethod: 'user-agent'
  }
]

/**
 * Identify a bot based on user agent, reverse DNS, and IP address
 */
export function identifyBot(userAgent: string, reverseDns?: string, ip?: string): BotPattern | null {
  for (const bot of KNOWN_BOTS) {
    // Check user agent patterns
    const userAgentMatch = bot.userAgentPatterns.some(pattern => pattern.test(userAgent))

    if (!userAgentMatch) continue

    // If verification requires reverse DNS, check it
    if (bot.verificationMethod === 'reverse-dns' || bot.verificationMethod === 'combined') {
      if (reverseDns && bot.reverseDnsPatterns) {
        const dnsMatch = bot.reverseDnsPatterns.some(pattern => pattern.test(reverseDns))
        if (bot.verificationMethod === 'combined' && !dnsMatch) continue
        if (bot.verificationMethod === 'reverse-dns' && !dnsMatch) continue
      } else if (bot.verificationMethod === 'combined' && bot.reverseDnsPatterns) {
        // Required reverse DNS but none provided - only return if user-agent only
        continue
      }
    }

    // If verification requires IP range, check it (TODO: implement IP range checking)
    if (bot.verificationMethod === 'ip-range' && bot.ipRanges && ip) {
      // TODO: Implement CIDR matching
    }

    return bot
  }

  return null
}

/**
 * Get bot category for display
 */
export function getBotCategory(type: BotPattern['type']): { label: string; color: string } {
  const categories = {
    'ai-training': { label: 'AI Training Bot', color: 'text-purple-600' },
    'search-engine': { label: 'Search Engine', color: 'text-blue-600' },
    'monitoring': { label: 'Monitoring Service', color: 'text-green-600' },
    'scraper': { label: 'Content Scraper', color: 'text-red-600' },
    'security': { label: 'Security Scanner', color: 'text-yellow-600' },
    'social-media': { label: 'Social Media Bot', color: 'text-cyan-600' },
    'seo': { label: 'SEO Tool', color: 'text-indigo-600' },
    'unknown': { label: 'Unknown Bot', color: 'text-gray-600' }
  }
  return categories[type] || categories.unknown
}
