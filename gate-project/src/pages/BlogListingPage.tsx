import { useNavigate } from 'react-router-dom'
import { Calendar, Clock, ArrowRight, Shield } from 'lucide-react'
import { PageLayout } from '../components'

interface BlogArticle {
  id: string
  title: string
  slug: string
  excerpt: string
  author: string
  date: string
  readTime: string
  category: string
}

const articles: BlogArticle[] = [
  {
    id: '1',
    title: 'The Business of Bots: Why AI Scrapers Are Targeting Your Content',
    slug: 'business-of-bots',
    excerpt: 'Large language models need data—billions of pages worth. Discover why AI companies are aggressively scraping the web, what content they\'re after, and how this affects your business bottom line.',
    author: 'Gate Team',
    date: 'December 20, 2024',
    readTime: '8 min read',
    category: 'Industry Analysis'
  },
  {
    id: '2',
    title: 'How to Detect AI Bots: A Technical Deep Dive',
    slug: 'detect-ai-bots',
    excerpt: 'Modern AI crawlers are sophisticated, but not invisible. Learn the technical indicators that distinguish GPTBot, ClaudeBot, and other AI scrapers from legitimate traffic—from user agent analysis to behavioral fingerprinting.',
    author: 'Technical Team',
    date: 'December 15, 2024',
    readTime: '12 min read',
    category: 'Technical Guide'
  },
  {
    id: '3',
    title: 'The Legal Landscape: Copyright, AI Training, and Your Content',
    slug: 'legal-landscape-ai-copyright',
    excerpt: 'As lawsuits against AI companies mount, content creators are fighting back. Explore the emerging legal frameworks around web scraping for AI training, what courts are saying, and how to protect your intellectual property.',
    author: 'Legal Analysis Team',
    date: 'December 10, 2024',
    readTime: '10 min read',
    category: 'Legal & Policy'
  },
  {
    id: '4',
    title: 'Case Study: How News Publishers Are Fighting Back Against AI Scrapers',
    slug: 'publishers-fighting-ai-scrapers',
    excerpt: 'Major publishers like The New York Times and Associated Press are taking action. Learn their strategies for protecting premium content, the economics of licensing vs. blocking, and what smaller publishers can learn from their approach.',
    author: 'Industry Research',
    date: 'December 5, 2024',
    readTime: '9 min read',
    category: 'Case Study'
  }
]

export default function BlogListingPage() {
  const navigate = useNavigate()

  return (
    <PageLayout activeRoute="/blog">
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 relative">
      {/* Global Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px]" />
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-green-100/20 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-[800px] h-[800px] bg-green-50/30 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 w-[700px] h-[700px] bg-green-100/15 rounded-full blur-3xl" />
      </div>

      {/* Navigation (provided by PageLayout) */}

      {/* Hero Section */}
      <section className="pt-24 pb-32 px-8 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-green-50/40 via-transparent to-transparent" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-radial from-green-100/30 to-transparent blur-2xl" />
        </div>
        
        <div className="max-w-7xl mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 rounded-full text-green-800 text-sm mb-8 animate-[fadeIn_0.6s_ease-out] hover:bg-green-100 hover:scale-105 transition-all duration-300 cursor-pointer">
                <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
                Latest insights and updates
              </div>
              
              <h1 className="text-6xl lg:text-7xl font-semibold text-gray-900 mb-6 leading-tight tracking-tight animate-[fadeIn_0.8s_ease-out]">
                <span className="inline-block hover:scale-105 transition-transform duration-300 cursor-default">Deep insights</span>
                <br />
                <span className="inline-block hover:scale-105 transition-transform duration-300 cursor-default">into</span>
                {' '}
                <span className="text-green-800 inline-block hover:scale-105 transition-transform duration-300 cursor-default">
                  bot protection
                </span>
              </h1>
              
              <p className="text-xl text-gray-600 font-light mb-10 leading-relaxed animate-[fadeIn_1s_ease-out]">
                Expert analysis, technical guides, and real-world case studies on AI scraping, content security, and the evolving landscape of web protection.
              </p>

              <div className="flex flex-wrap gap-3 animate-[fadeIn_1.2s_ease-out]">
                {['Industry Analysis', 'Technical Guides', 'Case Studies', 'Legal & Policy'].map((tag, i) => (
                  <div 
                    key={i} 
                    className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:border-green-300 hover:bg-green-50 hover:scale-105 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
                  >
                    {tag}
                  </div>
                ))}
              </div>
            </div>

            <div className="relative group animate-[fadeIn_1s_ease-out]">
              <div className="absolute inset-0 bg-green-100/30 blur-3xl group-hover:bg-green-200/40 transition-all duration-500" />
              <div className="relative bg-white rounded-3xl p-12 shadow-xl border border-gray-200 group-hover:shadow-2xl group-hover:-translate-y-2 transition-all duration-500">
                  <div className="space-y-6">
                    <div 
                      onClick={() => navigate(`/blog/${articles[0].slug}`)}
                      className="flex items-start gap-4 p-6 bg-green-50 rounded-2xl group-hover:bg-green-100 transition-colors duration-300 cursor-pointer"
                    >
                      <div className="w-12 h-12 rounded-xl bg-green-800 flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                        <Shield className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div className="text-xs text-green-700 font-medium mb-1">FEATURED</div>
                        <h3 className="font-semibold text-gray-900 mb-1">Latest Article</h3>
                        <p className="text-sm text-gray-600">{articles[0].title}</p>
                      </div>
                    </div>

                  <div className="grid grid-cols-3 gap-4 pt-6 border-t border-gray-200">
                    <div className="text-center group/stat cursor-default">
                      <div className="text-3xl font-light text-green-800 mb-1 group-hover/stat:scale-110 transition-transform duration-300">4</div>
                      <div className="text-xs text-gray-600">Articles</div>
                    </div>
                    <div className="text-center group/stat cursor-default">
                      <div className="text-3xl font-light text-green-800 mb-1 group-hover/stat:scale-110 transition-transform duration-300">4</div>
                      <div className="text-xs text-gray-600">Categories</div>
                    </div>
                    <div className="text-center group/stat cursor-default">
                      <div className="text-3xl font-light text-green-800 mb-1 group-hover/stat:scale-110 transition-transform duration-300">1</div>
                      <div className="text-xs text-gray-600">Mission</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Articles Grid */}
      <section className="py-24 px-8 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,_var(--tw-gradient-stops))] from-white via-green-50/40 to-gray-50" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,_var(--tw-gradient-stops))] from-green-100/20 via-transparent to-transparent" />
        </div>
        
        <div className="max-w-7xl mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-10">
            {articles.map((article, index) => (
              <article
                key={article.id}
                onClick={() => navigate(`/blog/${article.slug}`)}
                className="group cursor-pointer"
                style={{ animation: `fadeIn 0.8s ease-out ${index * 0.15}s both` }}
              >
                <div className="relative bg-white rounded-3xl border border-gray-200 overflow-hidden hover:border-green-200 hover:shadow-2xl hover:-translate-y-3 transition-all duration-500 h-full flex flex-col">
                  <div className="relative p-10 flex-1 flex flex-col">
                    <div className="inline-block self-start px-4 py-2 bg-green-50 text-green-800 text-xs font-medium rounded-full mb-6 group-hover:bg-green-100 group-hover:scale-105 transition-all duration-300">
                      {article.category}
                    </div>

                    <h2 className="text-3xl font-semibold text-gray-900 mb-5 group-hover:text-green-800 group-hover:translate-x-1 transition-all duration-300 tracking-tight leading-tight">
                      {article.title}
                    </h2>

                    <p className="text-gray-600 mb-8 leading-relaxed font-light flex-1 group-hover:text-gray-700 transition-colors duration-300">
                      {article.excerpt}
                    </p>

                    <div className="flex items-center justify-between pt-6 border-t border-gray-200 group-hover:border-green-200 transition-colors duration-300">
                      <div className="space-y-2">
                        <div className="text-sm text-gray-900 font-medium group-hover:text-green-800 transition-colors duration-300">{article.author}</div>
                        <div className="flex items-center gap-4 text-xs text-gray-500 group-hover:text-gray-600 transition-colors duration-300">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{article.date}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{article.readTime}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 rounded-full bg-green-800 flex items-center justify-center group-hover:bg-green-700 group-hover:scale-125 group-hover:rotate-12 transition-all duration-300 shadow-lg">
                          <ArrowRight className="w-5 h-5 text-white group-hover:translate-x-1 transition-transform duration-300" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,_var(--tw-gradient-stops))] from-white via-green-50/50 to-gray-50" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_40%,_var(--tw-gradient-stops))] from-green-100/30 via-transparent to-transparent" />
        </div>
        
        <div className="max-w-4xl mx-auto px-8 text-center relative">
          <div className="bg-white rounded-3xl p-16 border border-gray-200 shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 group">
            <h2 className="text-5xl font-semibold text-gray-900 mb-4 tracking-tight group-hover:scale-105 transition-transform duration-300 inline-block cursor-default">
              Stay informed
            </h2>
            <p className="text-xl text-gray-600 mb-10 font-light">
              Receive our latest insights and updates directly in your inbox
            </p>
            <div className="flex gap-4 max-w-lg mx-auto">
              <input 
                type="email" 
                placeholder="Your email address"
                className="flex-1 px-6 py-4 border border-gray-300 rounded-full text-gray-900 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all bg-white hover:border-gray-400"
              />
              <button className="px-8 py-4 bg-green-800 text-white font-medium rounded-full hover:bg-green-700 hover:shadow-xl hover:scale-105 hover:-translate-y-1 transition-all duration-300 whitespace-nowrap group/btn">
                <span className="flex items-center gap-2">
                  Subscribe
                  <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform duration-300" />
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_var(--tw-gradient-stops))] from-white via-green-50/60 to-gray-50" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,_var(--tw-gradient-stops))] from-green-100/20 via-transparent to-transparent" />
        </div>
        
        <div className="max-w-4xl mx-auto px-8 text-center relative">
          <h2 className="text-6xl font-semibold text-gray-900 mb-6 tracking-tight">
            <span className="inline-block hover:scale-105 transition-transform duration-300 cursor-default">Protect your content</span>
            <br />
            <span className="text-green-800 inline-block hover:scale-105 transition-transform duration-300 cursor-default">
              starting today
            </span>
          </h2>
          <p className="text-xl text-gray-600 mb-12 font-light">
            Comprehensive protection against AI scrapers and unauthorized access
          </p>
          <div className="flex gap-4 justify-center">
            <button onClick={() => navigate('/demo')} className="px-8 py-4 bg-white text-gray-700 font-medium rounded-full hover:bg-gray-50 hover:scale-105 hover:-translate-y-1 transition-all duration-300 border border-gray-300">
              View Demo
            </button>
            <button onClick={() => navigate('/signup')} className="px-8 py-4 bg-green-800 text-white font-medium rounded-full hover:bg-green-700 hover:shadow-xl hover:scale-105 hover:-translate-y-1 transition-all duration-300 group">
              <span className="flex items-center gap-2">
                Get Started Free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
              </span>
            </button>
          </div>
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
