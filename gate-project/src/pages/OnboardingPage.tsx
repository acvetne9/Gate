import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Code, Globe, BarChart3, CheckCircle, Copy, Check, ExternalLink, ArrowRight } from 'lucide-react'
import { PageLayout } from '../components'
import { useAuth } from '../contexts/AuthContext'

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const [copied, setCopied] = useState<string | null>(null)
  const [selectedTab, setSelectedTab] = useState<'quick' | 'detailed'>('detailed')

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const steps = [
    {
      number: '01',
      title: 'Create Your First Site',
      icon: <Globe className="w-7 h-7" />,
      description: 'Go to your Sites dashboard and click "Create Site"',
      action: 'Add your website domain and name'
    },
    {
      number: '02',
      title: 'Get Your API Key',
      icon: <Code className="w-7 h-7" />,
      description: 'Copy your API Key from the dashboard',
      action: 'Shown on each site card'
    },
    {
      number: '03',
      title: 'Install the Widget',
      icon: <Shield className="w-7 h-7" />,
      description: 'Add one script tag to your website',
      action: 'Paste in the <head> section (important!)'
    },
    {
      number: '04',
      title: 'Monitor Traffic',
      icon: <BarChart3 className="w-7 h-7" />,
      description: 'View real-time logs and analytics',
      action: 'Click "Logs" to see all activity'
    }
  ]

  const widgetCode = `<!-- Gate Protection Widget - Place in <head> section -->
<script
  src="https://security-gate.lovable.app/gate-protection-v3.js"
  data-api-key="YOUR_API_KEY"
></script>`

  return (
    <PageLayout activeRoute="/onboarding">
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 relative">
      {/* Global Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px]" />
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-green-100/20 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-[800px] h-[800px] bg-green-50/30 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 w-[700px] h-[700px] bg-green-100/15 rounded-full blur-3xl" />
      </div>

      {/* Navigation provided by PageLayout */}

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-8 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-green-50/40 via-transparent to-transparent" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-radial from-green-100/30 to-transparent blur-2xl" />
        </div>

        <div className="max-w-6xl mx-auto relative">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-800 rounded-3xl mb-6 shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 animate-[fadeIn_0.6s_ease-out]">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-7xl font-semibold mb-6 text-gray-900 tracking-tight leading-tight animate-[fadeIn_0.8s_ease-out]">
              Welcome to <span className="text-green-800 inline-block hover:scale-105 transition-transform duration-300 cursor-default">Gate</span>
            </h1>
            <p className="text-2xl text-gray-600 max-w-2xl mx-auto font-light animate-[fadeIn_1s_ease-out]">
              Let's get your site protected in just a few minutes
            </p>
          </div>

          {/* Tab Selection */}
          <div className="flex justify-center gap-4 mb-12 animate-[fadeIn_1.2s_ease-out]">
            <button
              onClick={() => setSelectedTab('detailed')}
              className={`px-8 py-4 font-medium rounded-full transition-all duration-300 ${
                selectedTab === 'detailed'
                  ? 'bg-green-800 text-white hover:bg-green-700 hover:shadow-xl hover:scale-105 hover:-translate-y-1'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-green-200 hover:scale-105 hover:-translate-y-1'
              }`}
            >
              Quick Start
            </button>
            <button
              onClick={() => setSelectedTab('quick')}
              className={`px-8 py-4 font-medium rounded-full transition-all duration-300 ${
                selectedTab === 'quick'
                  ? 'bg-green-800 text-white hover:bg-green-700 hover:shadow-xl hover:scale-105 hover:-translate-y-1'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-green-200 hover:scale-105 hover:-translate-y-1'
              }`}
            >
              Detailed Guide
            </button>
          </div>

          {selectedTab === 'quick' && (
            <div className="space-y-8 animate-[fadeIn_0.6s_ease-out]">
              {/* Installation Code */}
              <div className="bg-white rounded-3xl border border-gray-200 hover:border-green-200 p-10 hover:shadow-2xl hover:-translate-y-2 transition-all duration-500">
                <h2 className="text-5xl font-bold mb-12 text-gray-900 text-center tracking-tight">Installation Code</h2>

                <div className="space-y-8">
                  {/* Standard HTML */}
                  <div className="space-y-4">
                    <h3 className="text-2xl font-semibold text-gray-900">For Standard HTML Sites</h3>
                    <p className="text-gray-600 text-lg">
                      Copy this code and paste it in your <code className="bg-gray-100 px-2 py-1 rounded font-mono text-sm">&lt;head&gt;</code> section (this ensures the gate loads before content renders):
                    </p>

                    <div className="relative group">
                      <pre className="bg-gray-900 text-green-400 p-8 rounded-2xl overflow-x-auto text-sm font-mono shadow-lg group-hover:shadow-xl transition-all duration-300">
                        {widgetCode}
                      </pre>
                      <button
                        onClick={() => copyToClipboard(widgetCode, 'widget')}
                        className="absolute top-4 right-4 p-3 bg-gray-800 hover:bg-gray-700 rounded-xl transition-all duration-300 hover:scale-110"
                      >
                        {copied === 'widget' ? (
                          <Check className="w-5 h-5 text-green-400" />
                        ) : (
                          <Copy className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Framework Guides */}
                  <div className="space-y-6">
                    <h3 className="text-2xl font-semibold text-gray-900">For JavaScript Frameworks & SPAs</h3>
                    <p className="text-gray-600 text-lg">
                      Add the script to your framework's HTML file or layout component:
                    </p>

                    <div className="grid md:grid-cols-2 gap-6">
                      {/* React Frameworks */}
                      <div className="bg-gradient-to-br from-green-50 to-green-100/50 border border-green-200 rounded-2xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                        <p className="text-lg text-green-900 mb-4 font-semibold flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-800 rounded-full" />
                          React Frameworks
                        </p>
                        <ul className="text-sm text-gray-800 space-y-3">
                          <li className="flex flex-col gap-1">
                            <strong className="text-gray-900">Create React App:</strong>
                            <code className="bg-white/80 px-2 py-1 rounded text-xs">public/index.html</code>
                          </li>
                          <li className="flex flex-col gap-1">
                            <strong className="text-gray-900">Vite + React:</strong>
                            <code className="bg-white/80 px-2 py-1 rounded text-xs">index.html</code>
                          </li>
                          <li className="flex flex-col gap-1">
                            <strong className="text-gray-900">Next.js (Pages):</strong>
                            <code className="bg-white/80 px-2 py-1 rounded text-xs">pages/_document.js</code>
                          </li>
                          <li className="flex flex-col gap-1">
                            <strong className="text-gray-900">Next.js (App):</strong>
                            <code className="bg-white/80 px-2 py-1 rounded text-xs">app/layout.tsx</code>
                          </li>
                          <li className="flex flex-col gap-1">
                            <strong className="text-gray-900">Gatsby:</strong>
                            <code className="bg-white/80 px-2 py-1 rounded text-xs">gatsby-ssr.js</code>
                          </li>
                          <li className="flex flex-col gap-1">
                            <strong className="text-gray-900">Remix:</strong>
                            <code className="bg-white/80 px-2 py-1 rounded text-xs">app/root.tsx</code>
                          </li>
                        </ul>
                      </div>

                      {/* Vue Frameworks */}
                      <div className="bg-gradient-to-br from-green-50 to-green-100/50 border border-green-200 rounded-2xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                        <p className="text-lg text-green-900 mb-4 font-semibold flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-800 rounded-full" />
                          Vue Frameworks
                        </p>
                        <ul className="text-sm text-gray-800 space-y-3">
                          <li className="flex flex-col gap-1">
                            <strong className="text-gray-900">Vue CLI:</strong>
                            <code className="bg-white/80 px-2 py-1 rounded text-xs">public/index.html</code>
                          </li>
                          <li className="flex flex-col gap-1">
                            <strong className="text-gray-900">Vite + Vue:</strong>
                            <code className="bg-white/80 px-2 py-1 rounded text-xs">index.html</code>
                          </li>
                          <li className="flex flex-col gap-1">
                            <strong className="text-gray-900">Nuxt.js 2:</strong>
                            <code className="bg-white/80 px-2 py-1 rounded text-xs">nuxt.config.js</code>
                          </li>
                          <li className="flex flex-col gap-1">
                            <strong className="text-gray-900">Nuxt.js 3:</strong>
                            <code className="bg-white/80 px-2 py-1 rounded text-xs">app.vue</code>
                          </li>
                        </ul>
                      </div>

                      {/* Other Frameworks */}
                      <div className="bg-gradient-to-br from-green-50 to-green-100/50 border border-green-200 rounded-2xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                        <p className="text-lg text-green-900 mb-4 font-semibold flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-800 rounded-full" />
                          Other Modern Frameworks
                        </p>
                        <ul className="text-sm text-gray-800 space-y-3">
                          <li className="flex flex-col gap-1">
                            <strong className="text-gray-900">Angular:</strong>
                            <code className="bg-white/80 px-2 py-1 rounded text-xs">src/index.html</code>
                          </li>
                          <li className="flex flex-col gap-1">
                            <strong className="text-gray-900">Svelte:</strong>
                            <code className="bg-white/80 px-2 py-1 rounded text-xs">public/index.html</code>
                          </li>
                          <li className="flex flex-col gap-1">
                            <strong className="text-gray-900">SvelteKit:</strong>
                            <code className="bg-white/80 px-2 py-1 rounded text-xs">src/app.html</code>
                          </li>
                          <li className="flex flex-col gap-1">
                            <strong className="text-gray-900">Astro:</strong>
                            <code className="bg-white/80 px-2 py-1 rounded text-xs">src/layouts/Layout.astro</code>
                          </li>
                          <li className="flex flex-col gap-1">
                            <strong className="text-gray-900">Solid.js:</strong>
                            <code className="bg-white/80 px-2 py-1 rounded text-xs">index.html</code>
                          </li>
                          <li className="flex flex-col gap-1">
                            <strong className="text-gray-900">Preact:</strong>
                            <code className="bg-white/80 px-2 py-1 rounded text-xs">src/index.html</code>
                          </li>
                        </ul>
                      </div>

                      {/* Static Site Generators */}
                      <div className="bg-gradient-to-br from-green-50 to-green-100/50 border border-green-200 rounded-2xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                        <p className="text-lg text-green-900 mb-4 font-semibold flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-800 rounded-full" />
                          Static Site Generators
                        </p>
                        <ul className="text-sm text-gray-800 space-y-3">
                          <li className="flex flex-col gap-1">
                            <strong className="text-gray-900">Jekyll:</strong>
                            <code className="bg-white/80 px-2 py-1 rounded text-xs">_layouts/default.html</code>
                          </li>
                          <li className="flex flex-col gap-1">
                            <strong className="text-gray-900">Hugo:</strong>
                            <code className="bg-white/80 px-2 py-1 rounded text-xs">layouts/_default/baseof.html</code>
                          </li>
                          <li className="flex flex-col gap-1">
                            <strong className="text-gray-900">11ty:</strong>
                            <code className="bg-white/80 px-2 py-1 rounded text-xs">_includes/layouts/base.njk</code>
                          </li>
                          <li className="flex flex-col gap-1">
                            <strong className="text-gray-900">Hexo:</strong>
                            <code className="bg-white/80 px-2 py-1 rounded text-xs">themes/[theme]/layout/layout.ejs</code>
                          </li>
                          <li className="flex flex-col gap-1">
                            <strong className="text-gray-900">Docusaurus:</strong>
                            <code className="bg-white/80 px-2 py-1 rounded text-xs">src/theme/Root.js</code>
                          </li>
                        </ul>
                      </div>
                    </div>

                    {/* CMS Section - Full Width */}
                    <div className="bg-gradient-to-br from-green-50 to-green-100/50 border border-green-200 rounded-2xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                      <p className="text-lg text-green-900 mb-4 font-semibold flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-800 rounded-full" />
                        CMS & Website Builders
                      </p>
                      <div className="grid md:grid-cols-2 gap-x-8 gap-y-3">
                        <div className="flex flex-col gap-1">
                          <strong className="text-sm text-gray-900">WordPress:</strong>
                          <span className="text-sm text-gray-800">Add to <code className="bg-white/80 px-2 py-0.5 rounded text-xs">footer.php</code></span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <strong className="text-sm text-gray-900">Webflow:</strong>
                          <span className="text-sm text-gray-800">Settings → Custom Code → Footer</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <strong className="text-sm text-gray-900">Wix:</strong>
                          <span className="text-sm text-gray-800">Settings → Custom Code → Body End</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <strong className="text-sm text-gray-900">Squarespace:</strong>
                          <span className="text-sm text-gray-800">Settings → Code Injection → Footer</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <strong className="text-sm text-gray-900">Shopify:</strong>
                          <span className="text-sm text-gray-800"><code className="bg-white/80 px-2 py-0.5 rounded text-xs">theme.liquid</code></span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <strong className="text-sm text-gray-900">Ghost:</strong>
                          <span className="text-sm text-gray-800">Settings → Code Injection → Footer</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
                    <p className="text-green-900 flex items-start gap-3">
                      <span className="text-2xl">⚠️</span>
                      <span><strong>Important:</strong> Replace <code className="bg-white px-2 py-1 rounded font-mono text-sm">YOUR_API_KEY</code> with your actual API key from the Sites dashboard.</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedTab === 'detailed' && (
            <div className="space-y-8 animate-[fadeIn_0.6s_ease-out]">
              {/* Step by Step Guide */}
              {steps.map((step, index) => (
                <div
                  key={index}
                  className="group relative bg-white p-10 rounded-3xl border border-gray-200 hover:border-green-200 hover:-translate-y-3 hover:shadow-2xl transition-all duration-500 cursor-pointer"
                >
                  <div className="flex gap-8 items-start">
                    <div className="flex-shrink-0">
                      <div className="text-7xl font-light text-green-200 group-hover:text-green-300 group-hover:scale-125 group-hover:-translate-x-2 transition-all duration-500">
                        {step.number}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center group-hover:bg-green-100 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                          <div className="text-green-800">{step.icon}</div>
                        </div>
                        <h3 className="text-3xl font-semibold text-gray-900 group-hover:text-green-800 transition-colors duration-300">{step.title}</h3>
                      </div>
                      <p className="text-gray-600 text-lg mb-3 leading-relaxed group-hover:text-gray-700 transition-colors duration-300">{step.description}</p>
                      <p className="text-gray-900 font-medium flex items-center gap-2 group-hover:translate-x-2 transition-transform duration-300">
                        <ArrowRight className="w-5 h-5 text-green-800" />
                        {step.action}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* What Happens Next - Always shown */}
          <div className="bg-white rounded-3xl border border-gray-200 hover:border-green-200 p-10 hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 mt-8 animate-[fadeIn_0.6s_ease-out]">
            <h2 className="text-4xl font-semibold mb-8 text-gray-900 text-center">What Happens Next?</h2>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="flex gap-5 group cursor-pointer hover:translate-x-2 transition-all duration-300">
                <div className="flex-shrink-0">
                  <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center group-hover:bg-green-100 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                    <CheckCircle className="w-7 h-7 text-green-800" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2 text-xl text-gray-900">Humans Browse Freely</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Real visitors access your content normally without any interruption
                  </p>
                </div>
              </div>

              <div className="flex gap-5 group cursor-pointer hover:translate-x-2 transition-all duration-300">
                <div className="flex-shrink-0">
                  <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center group-hover:bg-red-100 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                    <Shield className="w-7 h-7 text-red-600" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2 text-xl text-gray-900">Bots Are Blocked</h3>
                  <p className="text-gray-600 leading-relaxed">
                    AI scrapers must pay $0.10 to access your content
                  </p>
                </div>
              </div>

              <div className="flex gap-5 group cursor-pointer hover:translate-x-2 transition-all duration-300">
                <div className="flex-shrink-0">
                  <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center group-hover:bg-green-100 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                    <BarChart3 className="w-7 h-7 text-green-800" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2 text-xl text-gray-900">View Live Logs</h3>
                  <p className="text-gray-600 leading-relaxed">
                    See all traffic in real-time on your Logs page
                  </p>
                </div>
              </div>

              <div className="flex gap-5 group cursor-pointer hover:translate-x-2 transition-all duration-300">
                <div className="flex-shrink-0">
                  <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center group-hover:bg-green-100 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                    <BarChart3 className="w-7 h-7 text-green-800" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2 text-xl text-gray-900">Earn Revenue</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Track earnings from bots in your dashboard
                  </p>
                </div>
              </div>
            </div>
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
