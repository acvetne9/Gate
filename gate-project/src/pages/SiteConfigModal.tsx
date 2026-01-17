import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

import { useSubscription } from '../contexts/SubscriptionContext'
import {
  AlertCircle,
  Shield,
  Save,
  DollarSign,
  Trash2
} from 'lucide-react'

interface Site {
  id: string
  site_id: string
  api_key: string
  name: string
  domain: string
  status: string
  config: {
    allowedBots?: string[]
    subscribeUrl?: string
    loginUrl?: string
    showGatewallToHumans?: boolean
    botPaymentAmount?: number
  }
  stripe_account_id?: string
  stripe_connected?: boolean
}

interface SiteConfigModalProps {
  site: Site
  onClose: () => void
  onSuccess: () => void
}

export default function SiteConfigModal({ site, onClose, onSuccess }: SiteConfigModalProps) {
  const { subscriptionData } = useSubscription()
  const subscription = subscriptionData?.subscription || null
  const [activeTab, setActiveTab] = useState<'general' | 'bots'>('general')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  

  // General settings
  const [name, setName] = useState(site.name)
  const [domain, setDomain] = useState(site.domain)
  const [status, setStatus] = useState(site.status)

  // Bot settings
  const [allowedBots, setAllowedBots] = useState(site.config?.allowedBots?.join('\n') || 'googlebot\nbingbot\nslurp\nduckduckbot\nbaiduspider\nyandexbot')
  const [botPaymentAmount, setBotPaymentAmount] = useState(site.config?.botPaymentAmount || 0.50)

  const handleSave = async () => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const updates: any = {}

      // Always include status so Pause changes are applied regardless of active tab
      updates.status = status

      if (activeTab === 'general') {
        updates.name = name
        updates.domain = domain
      }

      if (activeTab === 'bots') {
        updates.config = {
          ...site.config,
          allowedBots: allowedBots.split('\n').filter(b => b.trim()),
          botPaymentAmount: parseFloat(botPaymentAmount.toString())
        }
      }

      const { error: updateError } = await supabase
        .from('sites')
        .update(updates)
        .eq('id', site.id)

      if (updateError) throw updateError

      setSuccess('Settings saved successfully!')
      // If site is paused, inform the user explicitly
      if (status === 'paused') setSuccess('Settings saved — Gate is now paused for this site.')
      setTimeout(() => {
        onSuccess()
      }, 1500)
    } catch (err: any) {
      setError(err.message || 'Failed to save settings')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    try {
      const { error: deleteError } = await supabase
        .from('sites')
        .delete()
        .eq('id', site.id)

      if (deleteError) throw deleteError

      onSuccess()
    } catch (err: any) {
      setError(err.message || 'Failed to delete site')
      setShowDeleteConfirm(false)
    }
  }

  // ESC key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showDeleteConfirm) {
          setShowDeleteConfirm(false)
        } else {
          onClose()
        }
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [showDeleteConfirm, onClose])

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-3xl w-full my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Configure {site.name}</h2>
          <p className="text-sm text-gray-600 mt-1">{site.domain}</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex px-6 space-x-8">
            <button
              onClick={() => setActiveTab('general')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
                activeTab === 'general'
                  ? 'border-green-800 text-green-800'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              General
            </button>
            <button
              onClick={() => setActiveTab('bots')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
                activeTab === 'bots'
                  ? 'border-green-800 text-green-800'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Bot Protection
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="px-6 py-6 max-h-[60vh] overflow-y-auto">
          {status === 'paused' && (
            <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">This site is currently <strong>Paused</strong>. Gate protection is disabled and all traffic will be allowed (requests will still be logged).</p>
            </div>
          )}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">{success}</p>
            </div>
          )}

          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Site Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Domain
                </label>
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Paused sites won't block traffic but will still log requests
                </p>
              </div>
            </div>
          )}

          {/* Bot Protection Tab */}
          {activeTab === 'bots' && (
            <div className="space-y-6">
              {/* Bot Payment Amount */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  <DollarSign className="w-4 h-4 inline mr-2" />
                  Bot Payment Amount (per request)
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-700">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.50"
                    value={botPaymentAmount}
                    onChange={(e) => setBotPaymentAmount(parseFloat(e.target.value) || 0.50)}
                    disabled={subscription?.plan_name !== 'max'}
                    className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                  <span className="text-sm text-gray-600">per request</span>
                </div>
                {subscription?.plan_name !== 'max' ? (
                  <p className="text-xs text-gray-600 mt-2">
                    <strong>Keeper Plan:</strong> Fixed at $1.00 per bot request (50/50 revenue split). Upgrade to MAX to set any price with 90/10 split.
                  </p>
                ) : (
                  <p className="text-xs text-gray-600 mt-2">
                    <strong>MAX Plan:</strong> Set any price — you keep 90%, Gate takes 10%. Minimum $0.50 (Stripe requirement).
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Allowed SEO Bot User Agents (one per line)
                </label>
                <p className="text-sm text-gray-600 mb-3">
                  ✅ <strong>Allow SEO Crawlers:</strong> Add legitimate SEO bots you want to allow (e.g., Googlebot, Bingbot). All other bots will be blocked unless they pay.
                </p>
                <textarea
                  value={allowedBots}
                  onChange={(e) => setAllowedBots(e.target.value)}
                  rows={8}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm"
                  placeholder="googlebot&#10;bingbot&#10;slurp&#10;duckduckbot&#10;baiduspider&#10;yandexbot"
                />
                <p className="mt-1 text-xs text-gray-500">
                  These user agents will bypass the gate. AI scrapers and unlisted bots will be blocked unless they pay.
                </p>
              </div>

              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <h4 className="font-medium text-gray-900 mb-2">Common SEO Crawlers (Recommended to Allow):</h4>
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
                  <div>• Googlebot (Google Search)</div>
                  <div>• Bingbot (Bing Search)</div>
                  <div>• Slurp (Yahoo Search)</div>
                  <div>• DuckDuckBot (DuckDuckGo)</div>
                  <div>• Baiduspider (Baidu)</div>
                  <div>• Yandexbot (Yandex)</div>
                </div>
                <p className="text-xs text-gray-600 mt-3">
                  ℹ️ These are legitimate search engine crawlers that help with SEO. AI scrapers (GPTBot, ClaudeBot, CCBot) are NOT included by default.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Site
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 transition"
            >
              Cancel
            </button>
          </div>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center px-6 py-2 bg-green-800 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-white border-2 border-black max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Delete Site?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <strong>{site.name}</strong>?
              This action cannot be undone and will permanently delete all logs and configuration.
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 transition"
              >
                Delete Site
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
