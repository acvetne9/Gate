import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
  Shield,
  AlertCircle,
  CheckCircle,
  Save,
  Eye,
  EyeOff,
  Settings as SettingsIcon,
  Globe,
  Link as LinkIcon,
  TestTube
} from 'lucide-react'

interface GlobalSettings {
  enabled: boolean
  api_url: string
  subscribe_url: string
  login_url: string
  redirect_immediately: boolean
  default_blocked_bots: string[]
  default_gate_type: 'hard' | 'metered' | 'freemium' | 'none'
  default_metered_limit: number
}

export default function AdminSettings() {
  const { user } = useAuth()
  const [settings, setSettings] = useState<GlobalSettings>({
    enabled: true,
    api_url: '',
    subscribe_url: '/subscribe',
    login_url: '/login',
    redirect_immediately: false,
    default_blocked_bots: ['GPTBot', 'ClaudeBot', 'CCBot'],
    default_gate_type: 'none',
    default_metered_limit: 3
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [showApiUrl, setShowApiUrl] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    try {
      // Load global settings from a settings table or use defaults
      const { data, error } = await supabase
        .from('global_settings')
        .select('*')
        .single()

      if (data) {
        setSettings(data.config || settings)
      }
    } catch (err) {
      console.log('Using default settings')
    } finally {
      setLoading(false)
    }
  }

  async function saveSettings() {
    setSaving(true)
    setError('')

    try {
      const { error } = await supabase
        .from('global_settings')
        .upsert({
          id: 1,
          config: settings,
          updated_by: user?.id,
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const isConfigured = settings.api_url && settings.subscribe_url

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-green-500/20"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-green-700 border-r-green-800 animate-spin"></div>
          </div>
          <p className="text-slate-300 text-sm">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-green-100 to-green-200 bg-clip-text text-transparent flex items-center gap-3">
          <SettingsIcon className="w-10 h-10 text-green-400" />
          Global Settings
        </h1>
        <p className="text-slate-300 mt-2 text-lg">Configure system-wide protection settings</p>
      </div>

      {/* Status Banner */}
      {isConfigured ? (
        <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-2xl p-6 mb-8">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-400" />
            <div>
              <h3 className="text-white font-semibold">✓ Connected!</h3>
              <p className="text-green-300 text-sm">Your system is configured and protecting content</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-2xl p-6 mb-8">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-yellow-400" />
            <div>
              <h3 className="text-white font-semibold">⚠ Not Configured</h3>
              <p className="text-yellow-300 text-sm">Enter API URL and redirect URLs to activate protection</p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/30 rounded-2xl p-4 mb-8">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Success Message */}
      {saved && (
        <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-2xl p-4 mb-8">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <p className="text-green-300 text-sm">Settings saved successfully!</p>
          </div>
        </div>
      )}

      {/* Settings Form */}
      <div className="space-y-6">
        {/* API Configuration */}
        <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <Shield className="w-6 h-6 text-green-400" />
            API Configuration
          </h2>

          <div className="space-y-6">
            {/* Enable Protection */}
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                  className="w-5 h-5 rounded bg-slate-700 border-white/20 text-green-800 focus:ring-2 focus:ring-green-500"
                />
                <div>
                  <span className="text-white font-semibold">Enable Gate Protection</span>
                  <p className="text-slate-400 text-sm">When disabled, all content is accessible</p>
                </div>
              </label>
            </div>

            {/* API URL */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-3">API URL</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input
                    type={showApiUrl ? 'text' : 'password'}
                    value={settings.api_url}
                    onChange={(e) => setSettings({ ...settings, api_url: e.target.value })}
                    placeholder="https://your-project.supabase.co/functions/v1/check-access"
                    className="w-full px-5 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-green-500/50 focus:ring-2 focus:ring-green-500/20 transition-all font-mono text-sm"
                  />
                </div>
                <button
                  onClick={() => setShowApiUrl(!showApiUrl)}
                  className="p-3 hover:bg-white/5 rounded-xl transition border border-white/10"
                >
                  {showApiUrl ? (
                    <EyeOff className="w-5 h-5 text-slate-400" />
                  ) : (
                    <Eye className="w-5 h-5 text-slate-400" />
                  )}
                </button>
              </div>
              <p className="text-slate-500 text-xs mt-2">Your Supabase Edge Function URL for access checks</p>
            </div>
          </div>
        </div>

        {/* Redirect URLs */}
        <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <Globe className="w-6 h-6 text-green-400" />
            Default Bot Protection Settings
          </h2>

          <div className="space-y-6">
            {/* Blocked Bots */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-3">Default Blocked Bots</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {settings.default_blocked_bots.map((bot, index) => (
                  <span
                    key={index}
                    className="px-3 py-1.5 bg-red-500/20 text-red-300 border border-red-500/30 rounded-full text-sm font-medium flex items-center gap-2"
                  >
                    {bot}
                    <button
                      onClick={() => {
                        const newBots = settings.default_blocked_bots.filter((_, i) => i !== index)
                        setSettings({ ...settings, default_blocked_bots: newBots })
                      }}
                      className="hover:text-red-100"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <p className="text-slate-500 text-xs">Common bots: GPTBot, ClaudeBot, CCBot, Bingbot, Googlebot</p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end gap-4">
          <button
            onClick={saveSettings}
            disabled={saving}
            className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-green-700 to-green-800 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all font-semibold shadow-lg shadow-green-500/25 hover:shadow-green-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Testing Instructions */}
      {isConfigured && settings.enabled && (
        <div className="mt-8 bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <TestTube className="w-6 h-6 text-cyan-400" />
            Testing Instructions
          </h2>

          <ol className="space-y-4 text-slate-300">
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold">1</span>
              <div className="flex-1">
                <p className="text-white font-semibold">Protect a site</p>
                <p className="text-sm text-slate-400">Go to "All Sites" and enable protection for a customer's site</p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold">2</span>
              <div className="flex-1">
                <p className="text-white font-semibold">Test with incognito</p>
                <p className="text-sm text-slate-400">Open protected site in incognito - should redirect to: <code className="px-2 py-0.5 bg-slate-900/50 rounded text-cyan-300">{settings.subscribe_url}</code></p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold">3</span>
              <div className="flex-1">
                <p className="text-white font-semibold">Test bot blocking</p>
                <p className="text-sm text-slate-400">Run: <code className="px-2 py-0.5 bg-slate-900/50 rounded text-cyan-300">curl -A "GPTBot" https://protected-site.com/</code></p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold">4</span>
              <div className="flex-1">
                <p className="text-white font-semibold">Check logs</p>
                <p className="text-sm text-slate-400">Go to "All Logs" to see bot blocks and human visits</p>
              </div>
            </li>
          </ol>
        </div>
      )}
    </div>
  )
}
