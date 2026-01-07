import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { ArrowRight, Lock, BarChart3, Zap, Check, Globe, Shield } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { PageLayout } from '../components'
import { getGlobalStats, type GlobalStats } from '../lib/stats'

export default function LandingPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [stats, setStats] = useState<GlobalStats>({ totalSites: 0, totalRequests: 0, botsBlocked: 0 })
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    getGlobalStats()
      .then(setStats)
      .catch(err => console.error('Error fetching stats:', err))
      .finally(() => setLoadingStats(false))
  }, [])

  return (
    <PageLayout activeRoute="/">
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-8 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-green-50/30 to-transparent" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-green-100/20 rounded-full blur-3xl" />
        </div>
        
        <div className="max-w-7xl mx-auto relative">
          <div className="text-center max-w-4xl mx-auto mb-16">
            <h1 className="text-8xl md:text-9xl font-bold text-gray-900 mb-8 leading-none tracking-tighter animate-[fadeIn_0.8s_ease-out]">
              <span className="bg-gradient-to-r from-gray-900 via-green-800 to-gray-900 bg-clip-text text-transparent inline-block hover:scale-105 hover:from-green-700 hover:via-green-600 hover:to-green-700 transition-all duration-500 cursor-default">
                Control your content.
              </span>
            </h1>
            
            <p className="text-2xl text-gray-600 mb-12 leading-relaxed font-light max-w-3xl mx-auto animate-[fadeIn_1s_ease-out]">
              Stop AI from stealing your content and draining your ad revenue.<br />
              Earn <span className="font-bold text-green-700">$$$</span> from bot requests.
            </p>
            
            <div className="flex gap-4 justify-center animate-[fadeIn_1.2s_ease-out]">
              <button onClick={() => navigate('/demo')} className="px-8 py-4 bg-green-800 text-white font-medium rounded-full hover:bg-green-700 hover:shadow-xl hover:scale-105 hover:-translate-y-1 transition-all duration-300 flex items-center gap-2 group">
                Try Demo 
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
              </button>
              <button onClick={() => navigate('/signup')} className="px-8 py-4 bg-white text-gray-700 font-medium rounded-full hover:bg-gray-50 hover:scale-105 hover:-translate-y-1 transition-all duration-300 border border-gray-300">
                Get Started
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[
              { icon: Lock, title: 'Intelligent Blocking', desc: 'Advanced detection of AI scrapers and bots', delay: '0.2s' },
              { icon: BarChart3, title: 'Real-Time Analytics', desc: 'Comprehensive insights into all traffic', delay: '0.4s' },
              { icon: Zap, title: 'Instant Setup', desc: 'Deploy protection in under 60 seconds', delay: '0.6s' }
            ].map((item, i) => (
              <div key={i} className="group bg-white p-8 rounded-3xl border border-gray-200 hover:border-green-200 hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 cursor-pointer" style={{ animation: `fadeIn 0.8s ease-out ${item.delay} both` }}>
                <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center mb-6 group-hover:bg-green-100 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <item.icon className="w-7 h-7 text-green-800 group-hover:scale-110 transition-transform duration-300" />
                </div>
                <h3 className="font-semibold text-xl text-gray-900 mb-3 group-hover:text-green-800 group-hover:translate-x-1 group-hover:scale-105 transition-all duration-300 origin-left">{item.title}</h3>
                <p className="text-gray-600 leading-relaxed group-hover:text-gray-700 group-hover:translate-x-1 transition-all duration-300 delay-75">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,_var(--tw-gradient-stops))] from-white via-green-50/40 to-gray-50" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,_var(--tw-gradient-stops))] from-green-100/20 via-transparent to-transparent" />
        </div>
        
        <div className="max-w-7xl mx-auto px-8 relative">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-6xl font-semibold text-gray-900 mb-6 tracking-tight hover:scale-105 transition-transform duration-300 inline-block cursor-default">
              Simple. Powerful. Effective.
            </h2>
            <p className="text-xl text-gray-600 font-light">Three steps to comprehensive protection</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-12">
            {[
              { num: '01', title: 'Install', desc: 'Add a single line of code to your website. No complex configuration needed.' },
              { num: '02', title: 'Configure', desc: 'Start your protection and connect your bank to collect bot payments.' },
              { num: '03', title: 'Monitor', desc: 'Watch real-time analytics as bots are identified, blocked, and charged.' }
            ].map((step, i) => (
              <div key={i} className="group relative flex">
                <div className="relative bg-white p-10 rounded-3xl border border-gray-200 group-hover:border-green-200 group-hover:-translate-y-3 group-hover:shadow-2xl transition-all duration-500 cursor-pointer flex flex-col flex-1">
                  <div className="text-7xl font-light text-green-200 mb-8 group-hover:text-green-300 group-hover:scale-125 group-hover:-translate-x-2 transition-all duration-500 inline-block">
                    {step.num}
                  </div>
                  <h3 className="text-3xl font-semibold text-gray-900 mb-4 group-hover:text-green-800 transition-colors duration-300">{step.title}</h3>
                  <p className="text-gray-600 leading-relaxed text-lg font-light group-hover:text-gray-700 transition-colors duration-300 flex-1">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bot Blocking Demo */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,_var(--tw-gradient-stops))] from-white via-green-50/50 to-gray-50" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,_var(--tw-gradient-stops))] from-green-100/30 via-transparent to-transparent" />
        </div>
        
        <div className="max-w-7xl mx-auto px-8 relative">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div>
              <h2 className="text-6xl font-semibold text-gray-900 mb-8 tracking-tight leading-tight">
                <span className="inline-block hover:scale-105 transition-transform duration-300 cursor-default">Automatic threat</span>
                <br />
                <span className="text-green-800 inline-block hover:scale-105 transition-transform duration-300 cursor-default">detection</span>
              </h2>
              <div className="space-y-5 mb-12">
                {[
                  'Identify GPTBot, ClaudeBot, and other AI crawlers',
                  'Prevent unauthorized training on your content',
                  'Add as many sites as you want',
                  'Comprehensive site logs and tracking'
                ].map((feature, i) => (
                  <div key={i} className="flex items-start gap-4 group cursor-pointer hover:translate-x-2 transition-all duration-300">
                    <div className="w-6 h-6 rounded-full bg-green-800 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:scale-125 group-hover:rotate-12 transition-all duration-300">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-gray-700 text-lg group-hover:text-gray-900 transition-colors duration-300">{feature}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => navigate('/demo')} className="px-8 py-4 bg-green-800 text-white font-medium rounded-full hover:bg-green-700 hover:shadow-xl hover:scale-105 hover:-translate-y-1 transition-all duration-300 group">
                <span className="flex items-center gap-2">
                  View Live Demo
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                </span>
              </button>
            </div>

            <div className="relative group">
              <div className="absolute inset-0 bg-green-100/30 blur-3xl group-hover:bg-green-200/40 transition-all duration-500" />
              <div className="relative bg-gray-900 rounded-3xl p-10 shadow-2xl group-hover:shadow-3xl group-hover:-translate-y-2 transition-all duration-500">
                <div className="space-y-4 font-mono text-sm">
                  {[
                    { type: 'blocked', text: 'GPTBot access denied', color: 'text-red-400' },
                    { type: 'blocked', text: 'ClaudeBot access denied', color: 'text-red-400' },
                    { type: 'allowed', text: 'Human visitor granted', color: 'text-green-400' },
                    { type: 'blocked', text: 'Scraper blocked', color: 'text-red-400' },
                    { type: 'allowed', text: 'Human visitor granted', color: 'text-green-400' }
                  ].map((log, i) => (
                    <div key={i} className="flex items-center gap-4 text-gray-300 animate-[slideIn_0.5s_ease-out] hover:translate-x-2 hover:text-white transition-all duration-300 cursor-default" style={{ animationDelay: `${i * 0.1}s` }}>
                      <div className={`w-2 h-2 rounded-full ${log.type === 'blocked' ? 'bg-red-500' : 'bg-green-500'} animate-pulse`} />
                      <span className={log.color}>{log.text}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-10 pt-8 border-t border-gray-800">
                  <div className="grid grid-cols-2 gap-8">
                    <div className="group/stat cursor-default">
                      <div className="text-gray-500 text-sm mb-2 group-hover/stat:text-gray-400 transition-colors duration-300">Total requests</div>
                      <div className="text-white text-3xl font-light group-hover/stat:scale-110 transition-transform duration-300">5</div>
                    </div>
                    <div className="group/stat cursor-default">
                      <div className="text-gray-500 text-sm mb-2 group-hover/stat:text-gray-400 transition-colors duration-300">Blocked</div>
                      <div className="text-green-400 text-3xl font-light group-hover/stat:scale-110 transition-transform duration-300">3</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,_var(--tw-gradient-stops))] from-white via-green-50/40 to-gray-50" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,_var(--tw-gradient-stops))] from-green-100/20 via-transparent to-transparent" />
        </div>
        
        <div className="max-w-7xl mx-auto px-8 relative">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-6xl font-semibold text-gray-900 mb-6 tracking-tight hover:scale-105 transition-transform duration-300 inline-block cursor-default">Network Statistics</h2>
            <p className="text-xl text-gray-600 font-light">Real-time metrics from the Gate network</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Globe, value: loadingStats ? '...' : stats.totalSites.toLocaleString(), label: 'Protected Sites' },
              { icon: BarChart3, value: loadingStats ? '...' : stats.totalRequests.toLocaleString(), label: 'Requests Monitored' },
              { icon: Shield, value: loadingStats ? '...' : stats.botsBlocked.toLocaleString(), label: 'Bots Blocked' }
            ].map((stat, i) => (
              <div key={i} className="group relative bg-white p-10 rounded-3xl border border-gray-200 hover:border-green-200 hover:-translate-y-3 hover:shadow-2xl transition-all duration-500 cursor-pointer">
                <stat.icon className="w-8 h-8 text-green-700 mb-6 group-hover:scale-125 group-hover:rotate-6 transition-all duration-300" />
                <div className="text-5xl font-light text-gray-900 mb-2 group-hover:scale-110 group-hover:text-green-800 transition-all duration-300">{stat.value}</div>
                <div className="text-sm text-gray-600 group-hover:text-gray-700 transition-colors duration-300">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_var(--tw-gradient-stops))] from-white via-green-50/60 to-gray-50" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_80%,_var(--tw-gradient-stops))] from-green-100/30 via-transparent to-transparent" />
        </div>
        
        <div className="max-w-4xl mx-auto px-8 text-center relative">
          <h2 className="text-6xl font-semibold text-gray-900 mb-6 tracking-tight hover:scale-105 transition-transform duration-300 inline-block cursor-default">
            Ready to get started?
          </h2>
          <p className="text-xl text-gray-600 mb-12 font-light">
            Join our security network protecting their content with Gate
          </p>
          <button onClick={() => navigate(user ? '/dashboard' : '/signup')} className="px-10 py-5 bg-green-800 text-white text-lg font-medium rounded-full hover:bg-green-700 hover:shadow-2xl hover:scale-110 hover:-translate-y-2 transition-all duration-300 inline-flex items-center gap-3 group">
            Get Started Free 
            <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform duration-300" />
          </button>
        </div>
      </section>

        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes slideIn {
            from { opacity: 0; transform: translateX(-10px); }
            to { opacity: 1; transform: translateX(0); }
          }
        `}</style>
      </div>
    </PageLayout>
  )
}
