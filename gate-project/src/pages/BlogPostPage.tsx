import { useNavigate, useParams } from 'react-router-dom'
import { Calendar, Clock, ArrowLeft, Shield } from 'lucide-react'
import { PageLayout } from '../components'

interface BlogPost {
  slug: string
  title: string
  author: string
  date: string
  readTime: string
  category: string
  content: JSX.Element
}

const blogPosts: Record<string, BlogPost> = {
  'business-of-bots': {
    slug: 'business-of-bots',
    title: 'The Business of Bots: Why AI Scrapers Are Targeting Your Content',
    author: 'Gate Team',
    date: 'December 20, 2024',
    readTime: '8 min read',
    category: 'Industry Analysis',
    content: (
      <>
        <p className="text-xl text-gray-700 mb-8 leading-relaxed">
          The web is under siege, but the attackers aren't hackers—they're billion-dollar AI companies racing to scrape every page, article, and comment to train their language models. For content creators, this isn't just an annoyance—it's an existential threat to their business model.
        </p>

        <h2 className="text-3xl font-bold mt-12 mb-4">The AI Training Data Gold Rush</h2>
        <p className="mb-6 leading-relaxed">
          Large language models like GPT-4, Claude, and Gemini require massive amounts of training data—we're talking trillions of words scraped from across the internet. OpenAI's GPTBot, Anthropic's ClaudeBot, and Common Crawl's CCBot are continuously crawling websites, downloading content at scale.
        </p>
        <p className="mb-6 leading-relaxed">
          Here's the economics: AI companies need your content to train models worth billions of dollars, but they'd prefer not to pay for it. Why license content when you can scrape it for free?
        </p>

        <div className="border border-gray-200 rounded-2xl p-8 bg-green-50 my-8">
          <h3 className="font-bold text-xl mb-4 text-green-900">By The Numbers</h3>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="text-green-800 font-bold">•</span>
              <span><strong>Common Crawl</strong> has archived over 250 billion web pages</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-800 font-bold">•</span>
              <span><strong>GPTBot</strong> can make thousands of requests per minute to a single site</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-800 font-bold">•</span>
              <span><strong>Training GPT-3</strong> required 45TB of text data from 8+ million websites</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-800 font-bold">•</span>
              <span>The <strong>economic value</strong> of this scraped content is estimated in the billions</span>
            </li>
          </ul>
        </div>

        <h2 className="text-3xl font-bold mt-12 mb-4">What Content Are They After?</h2>
        <p className="mb-6 leading-relaxed">
          AI companies prioritize high-quality, structured content:
        </p>
        <ul className="space-y-3 mb-6 ml-6">
          <li className="leading-relaxed">
            <strong>News & Journalism</strong> - Breaking news, analysis, and investigative reporting provide factual, well-written training data.
          </li>
          <li className="leading-relaxed">
            <strong>Technical Documentation</strong> - Developer guides, API docs, and tutorials teach AI systems to code and solve technical problems.
          </li>
          <li className="leading-relaxed">
            <strong>Academic & Research</strong> - Scientific papers, research articles, and educational content provide authoritative knowledge.
          </li>
          <li className="leading-relaxed">
            <strong>User-Generated Content</strong> - Forums, Reddit threads, and comment sections show natural language and conversational patterns.
          </li>
        </ul>

        <h2 className="text-3xl font-bold mt-12 mb-4">The Business Impact</h2>
        <p className="mb-6 leading-relaxed">
          For publishers and content creators, AI scraping creates several problems:
        </p>

        <div className="space-y-6 mb-8">
          <div className="border-l-4 border-green-800 pl-6 py-2">
            <h3 className="font-bold text-xl mb-2">Lost Revenue Opportunity</h3>
            <p className="text-gray-700">
              Companies like The New York Times license their content to AI companies for millions of dollars. If your content is being scraped for free, you're losing potential licensing revenue.
            </p>
          </div>

          <div className="border-l-4 border-green-800 pl-6 py-2">
            <h3 className="font-bold text-xl mb-2">Competitive Disadvantage</h3>
            <p className="text-gray-700">
              AI models trained on your premium content can now answer questions that previously required visiting your website, reducing your traffic and ad revenue.
            </p>
          </div>

          <div className="border-l-4 border-green-800 pl-6 py-2">
            <h3 className="font-bold text-xl mb-2">Server Costs</h3>
            <p className="text-gray-700">
              Aggressive bot traffic can spike your server costs. Some publishers report bot traffic accounting for 30-50% of total requests.
            </p>
          </div>
        </div>

        <h2 className="text-3xl font-bold mt-12 mb-4">The Legal Battle Brewing</h2>
        <p className="mb-6 leading-relaxed">
          Major publishers aren't taking this lying down. The New York Times sued OpenAI and Microsoft in December 2023 for copyright infringement, claiming their content was used to train ChatGPT without permission or compensation.
        </p>
        <p className="mb-6 leading-relaxed">
          Other media companies are following suit. The legal question is simple: Is scraping copyrighted content for AI training "fair use" or theft? Courts haven't definitively answered yet, but the cases are piling up.
        </p>

        <h2 className="text-3xl font-bold mt-12 mb-4">What You Can Do</h2>
        <p className="mb-6 leading-relaxed">
          Content creators have several options:
        </p>
        <ol className="space-y-4 mb-8 ml-6 list-decimal">
          <li className="leading-relaxed">
            <strong>Block AI Bots</strong> - Use technical measures (robots.txt, user agent blocking, behavioral detection) to prevent scraping.
          </li>
          <li className="leading-relaxed">
            <strong>License Your Content</strong> - Negotiate licensing deals with AI companies that value your content.
          </li>
          <li className="leading-relaxed">
            <strong>Legal Action</strong> - Join class action lawsuits or pursue individual claims if your copyright is infringed.
          </li>
          <li className="leading-relaxed">
            <strong>Monitor & Document</strong> - Track bot activity to understand the scope and build evidence for negotiations or legal action.
          </li>
        </ol>

        <div className="border border-gray-200 rounded-3xl p-10 bg-gradient-to-br from-green-50 to-white my-12 text-center shadow-lg">
          <h3 className="text-2xl font-bold mb-4">Ready to Protect Your Content?</h3>
          <p className="text-gray-700 mb-6 text-lg">
            Gate helps you detect, block, and monitor AI scrapers in real-time.
          </p>
          <button
            onClick={() => window.location.href = '/demo'}
            className="px-8 py-3 bg-green-800 text-white text-lg font-medium rounded-full hover:bg-green-700 hover:shadow-xl hover:scale-105 hover:-translate-y-1 transition-all duration-300"
          >
            See How It Works
          </button>
        </div>

        <h2 className="text-3xl font-bold mt-12 mb-4">Conclusion</h2>
        <p className="mb-6 leading-relaxed">
          The AI training data economy is worth billions, and your content is the raw material. Whether you choose to license, block, or pursue legal remedies, the most important step is understanding what's happening and taking control.
        </p>
        <p className="mb-6 leading-relaxed">
          The era of free content for AI training is coming to an end. Publishers who act now—documenting bot activity, implementing protections, and exploring licensing opportunities—will be in the strongest position as this market matures.
        </p>
      </>
    )
  },
  'detect-ai-bots': {
    slug: 'detect-ai-bots',
    title: 'How to Detect AI Bots: A Technical Deep Dive',
    author: 'Technical Team',
    date: 'December 15, 2024',
    readTime: '12 min read',
    category: 'Technical Guide',
    content: (
      <>
        <p className="text-xl text-gray-700 mb-8 leading-relaxed">
          AI bots are getting smarter, but they still leave fingerprints. This technical guide explains exactly how to identify GPTBot, ClaudeBot, and other AI scrapers using a multi-layered detection approach.
        </p>

        <h2 className="text-3xl font-bold mt-12 mb-4">Layer 1: User Agent Analysis</h2>
        <p className="mb-6 leading-relaxed">
          The simplest detection method is checking the user agent string. Most AI companies identify their bots:
        </p>
        <div className="border border-gray-200 rounded-2xl bg-gray-900 text-green-400 font-mono text-sm p-6 my-6 overflow-x-auto shadow-lg">
          <div>GPTBot/1.0 (+https://openai.com/gptbot)</div>
          <div>ClaudeBot/1.0 (+https://www.anthropic.com)</div>
          <div>CCBot/2.0 (https://commoncrawl.org/faq/)</div>
          <div>anthropic-ai</div>
          <div>cohere-ai</div>
        </div>
        <p className="mb-6 leading-relaxed">
          However, user agents can be spoofed. Some bots intentionally masquerade as Chrome or Firefox to evade detection. That's why you need additional layers.
        </p>

        <h2 className="text-3xl font-bold mt-12 mb-4">Layer 2: Behavioral Fingerprinting</h2>
        <p className="mb-6 leading-relaxed">
          Real browsers behave differently than bots. Look for these behavioral anomalies:
        </p>
        <ul className="space-y-3 mb-6 ml-6">
          <li><strong>Request patterns:</strong> Bots often request pages in alphabetical or sequential order, ignoring normal browsing patterns.</li>
          <li><strong>Speed:</strong> Bots can load pages faster than humanly possible (sub-100ms between requests).</li>
          <li><strong>Missing headers:</strong> Real browsers send Accept-Language, Accept-Encoding, and other headers bots often omit.</li>
          <li><strong>No JavaScript execution:</strong> Many bots don't execute JavaScript or render pages.</li>
        </ul>

        <h2 className="text-3xl font-bold mt-12 mb-4">Layer 3: Browser Fingerprinting</h2>
        <p className="mb-6 leading-relaxed">
          Real browsers have unique fingerprints from canvas rendering, WebGL, and installed fonts. Bots typically fail these tests:
        </p>
        <div className="border border-gray-200 rounded-2xl p-8 bg-green-50 my-8">
          <h3 className="font-bold text-xl mb-4 text-green-900">Detection Tests</h3>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="text-green-800 font-bold">•</span>
              <span><strong>Canvas fingerprinting:</strong> Each browser renders canvas slightly differently</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-800 font-bold">•</span>
              <span><strong>WebGL renderer:</strong> Bots often lack GPU information</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-800 font-bold">•</span>
              <span><strong>Plugin enumeration:</strong> Headless browsers have no plugins</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-800 font-bold">•</span>
              <span><strong>Navigator properties:</strong> Check for webdriver, phantom, selenium flags</span>
            </li>
          </ul>
        </div>

        <h2 className="text-3xl font-bold mt-12 mb-4">Layer 4: Network-Level Detection</h2>
        <p className="mb-6 leading-relaxed">
          IP addresses, ASNs, and network patterns reveal bot infrastructure:
        </p>
        <ul className="space-y-3 mb-6 ml-6">
          <li><strong>Known bot IPs:</strong> OpenAI, Anthropic, and Common Crawl operate from documented IP ranges.</li>
          <li><strong>Cloud providers:</strong> Excessive traffic from AWS, GCP, or Azure can indicate scrapers.</li>
          <li><strong>Reverse DNS:</strong> Legitimate crawlers often have identifiable reverse DNS records.</li>
        </ul>

        <h2 className="text-3xl font-bold mt-12 mb-4">Implementation Example</h2>
        <p className="mb-6 leading-relaxed">
          Here's a simplified risk scoring system:
        </p>
        <div className="border border-gray-200 rounded-2xl bg-gray-900 text-green-400 font-mono text-xs p-6 my-6 overflow-x-auto shadow-lg">
          {`function calculateBotRisk(request) {
  let score = 0;

  // Check user agent
  if (request.userAgent.includes('GPTBot')) score += 0.9;
  if (request.userAgent.includes('ClaudeBot')) score += 0.9;
  if (request.userAgent.includes('bot')) score += 0.5;

  // Check behavior
  if (request.timeOnPage < 100) score += 0.3;
  if (!request.headers['accept-language']) score += 0.2;

  // Check fingerprint
  if (request.canvas === null) score += 0.4;
  if (request.webdriver === true) score += 0.6;

  return Math.min(score, 1.0);
}`}
        </div>

        <h2 className="text-3xl font-bold mt-12 mb-4">Recommended Approach</h2>
        <p className="mb-6 leading-relaxed">
          Combine all layers for robust detection:
        </p>
        <ol className="space-y-4 mb-8 ml-6 list-decimal">
          <li>Start with user agent filtering (catches 70% of bots)</li>
          <li>Add behavioral checks for sophisticated bots</li>
          <li>Use fingerprinting to catch headless browsers</li>
          <li>Implement network-level blocking for known bot infrastructure</li>
          <li>Log everything for analysis and continuous improvement</li>
        </ol>

        <p className="mb-6 leading-relaxed">
          With this multi-layered approach, you can detect over 95% of AI bots while minimizing false positives on legitimate users.
        </p>
      </>
    )
  },
  'legal-landscape-ai-copyright': {
    slug: 'legal-landscape-ai-copyright',
    title: 'The Legal Landscape: Copyright, AI Training, and Your Content',
    author: 'Legal Analysis Team',
    date: 'December 10, 2024',
    readTime: '10 min read',
    category: 'Legal & Policy',
    content: (
      <>
        <p className="text-xl text-gray-700 mb-8 leading-relaxed">
          As AI companies scrape billions of web pages to train their models, content creators are fighting back in court. The legal battle over AI training data is reshaping copyright law and could determine the future of the internet.
        </p>

        <h2 className="text-3xl font-bold mt-12 mb-4">The Central Legal Question</h2>
        <p className="mb-6 leading-relaxed">
          At the heart of every lawsuit is this question: When AI companies scrape copyrighted content to train their models, is that copyright infringement or fair use?
        </p>
        <p className="mb-6 leading-relaxed">
          AI companies argue this is "transformative use"—they're not republishing your content, they're using it to create something entirely new (a language model). Content creators argue it's theft—using copyrighted work without permission or compensation to build billion-dollar products.
        </p>

        <h2 className="text-3xl font-bold mt-12 mb-4">Major Legal Cases</h2>

        <div className="space-y-6 mb-8">
          <div className="border-l-4 border-green-800 pl-6 py-2">
            <h3 className="font-bold text-xl mb-2">New York Times v. OpenAI & Microsoft (2023)</h3>
            <p className="text-gray-700 mb-2">
              The Times sued for copyright infringement, claiming ChatGPT was trained on millions of their articles without permission. They argue this creates a competing product that summarizes their content, reducing the need to visit their website.
            </p>
            <p className="text-gray-700">
              <strong>Status:</strong> Ongoing. Could set major precedent for all AI training cases.
            </p>
          </div>

          <div className="border-l-4 border-green-800 pl-6 py-2">
            <h3 className="font-bold text-xl mb-2">Authors Guild v. OpenAI (2023)</h3>
            <p className="text-gray-700 mb-2">
              Popular authors including John Grisham and George R.R. Martin sued OpenAI for using their books to train ChatGPT without authorization or compensation.
            </p>
            <p className="text-gray-700">
              <strong>Status:</strong> Class action proceeding in federal court.
            </p>
          </div>

          <div className="border-l-4 border-green-800 pl-6 py-2">
            <h3 className="font-bold text-xl mb-2">Getty Images v. Stability AI (2023)</h3>
            <p className="text-gray-700 mb-2">
              Getty sued Stability AI for training its image generation model on 12+ million copyrighted images from Getty's database.
            </p>
            <p className="text-gray-700">
              <strong>Status:</strong> Proceeding in US and UK courts.
            </p>
          </div>
        </div>

        <h2 className="text-3xl font-bold mt-12 mb-4">The Fair Use Defense</h2>
        <p className="mb-6 leading-relaxed">
          AI companies rely heavily on fair use doctrine. Under US copyright law, fair use considers four factors:
        </p>
        <div className="border border-gray-200 rounded-2xl p-8 bg-green-50 my-8">
          <ol className="space-y-4 list-decimal ml-6">
            <li><strong>Purpose and character:</strong> Is the use transformative? Commercial vs. educational?</li>
            <li><strong>Nature of the work:</strong> Is it factual or creative?</li>
            <li><strong>Amount used:</strong> How much of the original was copied?</li>
            <li><strong>Market impact:</strong> Does it harm the market for the original work?</li>
          </ol>
        </div>
        <p className="mb-6 leading-relaxed">
          AI companies argue their use is transformative (creating a new tool, not republishing), while plaintiffs argue it's commercial exploitation that harms their market.
        </p>

        <h2 className="text-3xl font-bold mt-12 mb-4">International Perspectives</h2>
        <p className="mb-6 leading-relaxed">
          Different countries are taking different approaches:
        </p>
        <ul className="space-y-3 mb-6 ml-6">
          <li><strong>European Union:</strong> The EU AI Act requires disclosure of copyrighted training data and opt-out mechanisms for rights holders.</li>
          <li><strong>United Kingdom:</strong> Proposed exceptions for text and data mining, but facing pushback from publishers.</li>
          <li><strong>Japan:</strong> More permissive approach, allowing broader use of copyrighted content for AI training.</li>
        </ul>

        <h2 className="text-3xl font-bold mt-12 mb-4">What Content Creators Should Do</h2>
        <p className="mb-6 leading-relaxed">
          While courts sort this out, you have options:
        </p>
        <ol className="space-y-4 mb-8 ml-6 list-decimal">
          <li className="leading-relaxed">
            <strong>Document Everything:</strong> Log all bot traffic. This evidence could be valuable in future litigation or licensing negotiations.
          </li>
          <li className="leading-relaxed">
            <strong>Update Terms of Service:</strong> Explicitly prohibit AI training on your content. While enforceability is unclear, it strengthens your legal position.
          </li>
          <li className="leading-relaxed">
            <strong>Implement Technical Protections:</strong> Block known AI bots through robots.txt, user agent filtering, and behavioral analysis.
          </li>
          <li className="leading-relaxed">
            <strong>Consider Collective Action:</strong> Industry groups and class actions give smaller creators leverage they wouldn't have individually.
          </li>
          <li className="leading-relaxed">
            <strong>Explore Licensing:</strong> Some AI companies are open to licensing deals. Having documentation of bot activity strengthens your negotiating position.
          </li>
        </ol>

        <h2 className="text-3xl font-bold mt-12 mb-4">Looking Ahead</h2>
        <p className="mb-6 leading-relaxed">
          The legal landscape is evolving rapidly. Court decisions in 2024-2025 will likely establish important precedents. Key areas to watch:
        </p>
        <ul className="space-y-2 mb-6 ml-6">
          <li>• Outcomes of major lawsuits (NYT v. OpenAI, Authors Guild, etc.)</li>
          <li>• New legislation (EU AI Act implementation, US proposals)</li>
          <li>• Industry standards for AI training data attribution and compensation</li>
          <li>• Emergence of licensing markets and collective management organizations</li>
        </ul>

        <p className="mb-6 leading-relaxed">
          One thing is clear: the era of unrestricted scraping is ending. Content creators are asserting their rights, courts are weighing in, and the industry is moving toward more structured arrangements for AI training data.
        </p>
      </>
    )
  },
  'publishers-fighting-ai-scrapers': {
    slug: 'publishers-fighting-ai-scrapers',
    title: 'Case Study: How News Publishers Are Fighting Back Against AI Scrapers',
    author: 'Industry Research',
    date: 'December 5, 2024',
    readTime: '9 min read',
    category: 'Case Study',
    content: (
      <>
        <p className="text-xl text-gray-700 mb-8 leading-relaxed">
          Major news publishers are taking diverse approaches to the AI scraping challenge—some are blocking, others are licensing, and a few are suing. Let's examine what's working, what isn't, and what smaller publishers can learn.
        </p>

        <h2 className="text-3xl font-bold mt-12 mb-4">The New York Times: The Legal Route</h2>
        <p className="mb-6 leading-relaxed">
          In December 2023, The New York Times filed a lawsuit against OpenAI and Microsoft for copyright infringement, alleging billions of their articles were used to train ChatGPT without permission.
        </p>
        <p className="mb-6 leading-relaxed">
          <strong>Their Strategy:</strong>
        </p>
        <ul className="space-y-2 mb-6 ml-6">
          <li>• Document extensive evidence of AI training on their content</li>
          <li>• Seek both damages and injunctive relief</li>
          <li>• Use lawsuit as leverage for favorable licensing terms</li>
          <li>• Simultaneously implement technical blocking measures</li>
        </ul>
        <p className="mb-6 leading-relaxed">
          <strong>Results So Far:</strong> The case is ongoing, but it's already achieved one goal—forcing AI companies to take licensing seriously. Several publishers have since signed licensing deals.
        </p>

        <h2 className="text-3xl font-bold mt-12 mb-4">Associated Press: The Licensing Model</h2>
        <p className="mb-6 leading-relaxed">
          AP took a different approach, signing a licensing deal with OpenAI in mid-2023. The deal allows OpenAI to access AP's archive while compensating AP for the use.
        </p>
        <div className="border border-gray-200 rounded-2xl p-8 bg-green-50 my-8">
          <h3 className="font-bold text-xl mb-4 text-green-900">Licensing Deal Benefits</h3>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="text-green-800 font-bold">•</span>
              <span><strong>Revenue:</strong> Immediate financial compensation</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-800 font-bold">•</span>
              <span><strong>Attribution:</strong> AP content is cited when used</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-800 font-bold">•</span>
              <span><strong>Technology access:</strong> AP gets OpenAI tools for journalism</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-800 font-bold">•</span>
              <span><strong>Market positioning:</strong> First-mover advantage in licensing</span>
            </li>
          </ul>
        </div>
        <p className="mb-6 leading-relaxed">
          <strong>The Trade-off:</strong> AP accepts AI training on their content in exchange for compensation and partnership. Some view this as pragmatic, others as surrendering content rights.
        </p>

        <h2 className="text-3xl font-bold mt-12 mb-4">Axel Springer: The Dual Strategy</h2>
        <p className="mb-6 leading-relaxed">
          Axel Springer (publisher of Politico, Business Insider, Bild) is pursuing both licensing and blocking:
        </p>
        <ul className="space-y-3 mb-6 ml-6">
          <li className="leading-relaxed">
            <strong>Licensing:</strong> Signed deals with OpenAI and other AI companies for controlled access to their content archive.
          </li>
          <li className="leading-relaxed">
            <strong>Blocking:</strong> Implemented aggressive technical measures to block unauthorized scrapers, including sophisticated bots that spoof user agents.
          </li>
          <li className="leading-relaxed">
            <strong>Monitoring:</strong> Built internal systems to track all bot activity and identify new scraping attempts.
          </li>
        </ul>

        <h2 className="text-3xl font-bold mt-12 mb-4">The Guardian: Technical Blocking</h2>
        <p className="mb-6 leading-relaxed">
          The Guardian updated their robots.txt to explicitly block AI bots and implemented multi-layer detection:
        </p>
        <div className="border border-gray-200 rounded-2xl bg-gray-900 text-green-400 font-mono text-xs p-6 my-6 overflow-x-auto shadow-lg">
          {`User-agent: GPTBot
Disallow: /

User-agent: ChatGPT-User
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: anthropic-ai
Disallow: /`}
        </div>
        <p className="mb-6 leading-relaxed">
          They also implemented:
        </p>
        <ul className="space-y-2 mb-6 ml-6">
          <li>• Rate limiting to prevent aggressive scraping</li>
          <li>• Behavioral analysis to catch bots with spoofed user agents</li>
          <li>• IP blocking for known bot infrastructure</li>
        </ul>

        <h2 className="text-3xl font-bold mt-12 mb-4">Reuters: Premium Content Gating</h2>
        <p className="mb-6 leading-relaxed">
          Reuters adopted a hybrid approach:
        </p>
        <ul className="space-y-3 mb-6 ml-6">
          <li><strong>Public content:</strong> Basic news remains scrapable, accepting this as inevitable</li>
          <li><strong>Premium content:</strong> In-depth analysis and exclusive reporting behind authentication</li>
          <li><strong>Selective licensing:</strong> Licensing deals for access to premium archives</li>
        </ul>
        <p className="mb-6 leading-relaxed">
          This strategy acknowledges that commodity news will be scraped regardless, while protecting their highest-value content and maintaining licensing revenue.
        </p>

        <h2 className="text-3xl font-bold mt-12 mb-4">Key Lessons for Smaller Publishers</h2>

        <div className="space-y-6 mb-8">
          <div className="border-l-4 border-green-800 pl-6 py-2">
            <h3 className="font-bold text-xl mb-2">Lesson 1: One Size Doesn't Fit All</h3>
            <p className="text-gray-700">
              The right strategy depends on your content type, audience, and resources. News wires can license archives; investigative journalism should be protected; commodity news may not be worth fighting over.
            </p>
          </div>

          <div className="border-l-4 border-green-800 pl-6 py-2">
            <h3 className="font-bold text-xl mb-2">Lesson 2: Technical Measures Are Table Stakes</h3>
            <p className="text-gray-700">
              Whether you're licensing or blocking, you need to monitor and control bot access. You can't negotiate licensing without knowing what's being scraped, and you can't block without detection systems.
            </p>
          </div>

          <div className="border-l-4 border-green-800 pl-6 py-2">
            <h3 className="font-bold text-xl mb-2">Lesson 3: Collective Action Has Power</h3>
            <p className="text-gray-700">
              Smaller publishers can't match The New York Times' legal budget, but industry associations and collective licensing organizations can negotiate on behalf of multiple publishers.
            </p>
          </div>
        </div>

        <h2 className="text-3xl font-bold mt-12 mb-4">Practical Steps for Any Publisher</h2>
        <ol className="space-y-4 mb-8 ml-6 list-decimal">
          <li className="leading-relaxed">
            <strong>Start Monitoring:</strong> You can't make strategic decisions without data. Track what bots are accessing your content and how often.
          </li>
          <li className="leading-relaxed">
            <strong>Implement Basic Blocking:</strong> Update robots.txt and block obvious bot user agents as a baseline.
          </li>
          <li className="leading-relaxed">
            <strong>Categorize Your Content:</strong> Decide what's worth protecting vs. what serves as marketing/SEO.
          </li>
          <li className="leading-relaxed">
            <strong>Join Industry Groups:</strong> Publisher associations are coordinating responses and negotiating collective licenses.
          </li>
          <li className="leading-relaxed">
            <strong>Document Everything:</strong> Log bot activity meticulously—it's evidence for legal action or licensing negotiations.
          </li>
        </ol>

        <h2 className="text-3xl font-bold mt-12 mb-4">The Bottom Line</h2>
        <p className="mb-6 leading-relaxed">
          Publishers that treat AI scraping as a strategic issue—not just a technical annoyance—are positioning themselves to either monetize their content through licensing or protect it through legal and technical means.
        </p>
        <p className="mb-6 leading-relaxed">
          The worst position is passivity. Whether you choose to block, license, or litigate, the time to act is now while the market and legal frameworks are still forming.
        </p>
      </>
    )
  }
}

export default function BlogPostPage() {
  const navigate = useNavigate()
  const { slug } = useParams<{ slug: string }>()

  const post = slug ? blogPosts[slug] : null

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-6">Article Not Found</h1>
          <button
            onClick={() => navigate('/blog')}
            className="px-8 py-3 bg-green-800 text-white font-medium rounded-full hover:bg-green-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
          >
            Back to Blog
          </button>
        </div>
      </div>
    )
  }

  return (
    <PageLayout activeRoute="/blog">
      <div className="min-h-screen bg-gray-50">
      {/* Navigation provided by PageLayout */}

      {/* Article Header */}
      <section className="pt-32 pb-12 px-8 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_var(--tw-gradient-stops))] from-white via-green-50/60 to-gray-50" />
        </div>
        
        <div className="max-w-4xl mx-auto relative">
          <button
            onClick={() => navigate('/blog')}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 mb-8 group hover:-translate-x-1 transition-all duration-300"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-300" />
            Back to Blog
          </button>

          <div className="inline-block px-4 py-1.5 bg-green-100 text-green-800 text-xs font-semibold rounded-full mb-6">
            {post.category}
          </div>

          <h1 className="text-5xl md:text-6xl font-semibold text-gray-900 mb-8 leading-tight tracking-tight">
            {post.title}
          </h1>

          <div className="flex items-center gap-8 text-sm text-gray-600 pb-8 border-b border-gray-200">
            <span className="font-medium text-gray-900">{post.author}</span>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-green-800" />
              <span>{post.date}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-green-800" />
              <span>{post.readTime}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Article Content */}
      <section className="py-16 px-8 relative">
        <div className="max-w-4xl mx-auto">
          <div className="prose prose-lg max-w-none text-gray-800">
            {post.content}
          </div>
        </div>
      </section>

      {/* Related Articles CTA */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_var(--tw-gradient-stops))] from-white via-green-50/60 to-gray-50" />
        </div>
        
        <div className="max-w-4xl mx-auto px-8 text-center relative">
          <h2 className="text-5xl font-semibold text-gray-900 mb-6 tracking-tight hover:scale-105 transition-transform duration-300 inline-block cursor-default">
            Read more insights
          </h2>
          <p className="text-xl text-gray-600 mb-12 font-light">
            Explore our latest articles on bot protection and content security
          </p>
          <button
            onClick={() => navigate('/blog')}
            className="px-10 py-5 bg-green-800 text-white text-lg font-medium rounded-full hover:bg-green-700 hover:shadow-2xl hover:scale-110 hover:-translate-y-2 transition-all duration-300 inline-flex items-center gap-3"
          >
            View All Articles
          </button>
        </div>
      </section>

        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    </PageLayout>
  )
}
