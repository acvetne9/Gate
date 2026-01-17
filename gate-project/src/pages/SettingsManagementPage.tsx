/**
 * Settings Management Page - Admin Interface
 * Allows admins to manage application configuration stored in database
 */

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useSettings } from '../contexts/SettingsContext'
import { Save, RefreshCw, Eye, EyeOff, Shield, DollarSign, Globe, Check } from 'lucide-react'

interface Setting {
  id: string
  key: string
  value: string
  description: string | null
  is_sensitive: boolean
  category: string
  updated_at: string
}

export default function SettingsManagementPage() {
  const [settings, setSettings] = useState<Setting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedKey, setSavedKey] = useState<string | null>(null)
  const [showSensitive, setShowSensitive] = useState<{ [key: string]: boolean }>({})
  const { refreshSettings } = useSettings()

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .order('category', { ascending: true })
        .order('key', { ascending: true })

      if (error) throw error
      setSettings(data || [])
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setLoading(false)
    }
  }

  async function saveSetting(setting: Setting) {
    setSaving(true)
    setSavedKey(null)
    
    try {
      const { error } = await supabase
        .from('app_settings')
        .update({ value: setting.value })
        .eq('id', setting.id)

      if (error) throw error

      setSavedKey(setting.key)
      setTimeout(() => setSavedKey(null), 3000)

      // Refresh the settings context so the app uses the new values
      try {
        await refreshSettings()
      } catch (e) {
        console.error('Error refreshing settings:', e)
      }
    } catch (error) {
      console.error('Error saving setting:', error)
    }
    
    setSaving(false)
  }

  function updateSettingValue(id: string, newValue: string) {
    setSettings(prev =>
      prev.map(s => (s.id === id ? { ...s, value: newValue } : s))
    )
  }

  function toggleShowSensitive(key: string) {
    setShowSensitive(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'stripe':
        return <DollarSign className="w-5 h-5" />
      case 'general':
        return <Globe className="w-5 h-5" />
      default:
        return <Shield className="w-5 h-5" />
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'stripe':
        return 'bg-green-50 border-green-200 text-green-700'
      case 'general':
        return 'bg-green-50 border-green-200 text-green-700'
      default:
        return 'bg-gray-50 border-gray-200 text-gray-700'
    }
  }

  const groupedSettings = settings.reduce((acc, setting) => {
    if (!acc[setting.category]) {
      acc[setting.category] = []
    }
    acc[setting.category].push(setting)
    return acc
  }, {} as Record<string, Setting[]>)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-800 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Application Settings</h1>
            <p className="text-gray-600 mt-1">Manage configuration stored in database</p>
          </div>
          <button
            onClick={loadSettings}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-full hover:bg-gray-50 hover:border-green-200 transition-all duration-200"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {Object.entries(groupedSettings).map(([category, categorySettings]) => (
          <div key={category} className="bg-white rounded-3xl border border-gray-200 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getCategoryColor(category)}`}>
                {getCategoryIcon(category)}
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 capitalize">{category}</h2>
            </div>

            <div className="space-y-6">
              {categorySettings.map(setting => (
                <div key={setting.id} className="border-b border-gray-200 pb-6 last:border-b-0 last:pb-0">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-sm font-semibold text-gray-900">{setting.key}</h3>
                        {setting.is_sensitive && (
                          <span className="px-2 py-0.5 text-xs bg-orange-100 text-orange-700 border border-orange-300 rounded">
                            Sensitive
                          </span>
                        )}
                      </div>
                      {setting.description && (
                        <p className="text-xs text-gray-500">{setting.description}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        Last updated: {new Date(setting.updated_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex-1 relative">
                      <input
                        type={setting.is_sensitive && !showSensitive[setting.key] ? 'password' : 'text'}
                        value={setting.value}
                        onChange={(e) => updateSettingValue(setting.id, e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:border-green-800 transition-all duration-200 font-mono text-sm"
                        placeholder={`Enter ${setting.key}`}
                      />
                      {setting.is_sensitive && (
                        <button
                          onClick={() => toggleShowSensitive(setting.key)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded transition-colors"
                        >
                          {showSensitive[setting.key] ? (
                            <EyeOff className="w-4 h-4 text-gray-600" />
                          ) : (
                            <Eye className="w-4 h-4 text-gray-600" />
                          )}
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => saveSetting(setting)}
                      disabled={saving}
                      className="flex items-center gap-2 px-6 py-3 bg-green-800 text-white rounded-full hover:bg-green-700 hover:shadow-lg hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="w-4 h-4" />
                      Save
                    </button>
                  </div>
                  {savedKey === setting.key && (
                    <p className="flex items-center gap-1 text-sm text-green-600 mt-2">
                      <Check className="w-4 h-4" />
                      Saved successfully
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {settings.length === 0 && (
        <div className="bg-white rounded-3xl border border-gray-200 p-16 text-center">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Settings Found</h3>
          <p className="text-gray-600 mb-6">
            Run the database migration to create the app_settings table and populate default values.
          </p>
          <code className="text-sm bg-gray-900 text-green-400 px-4 py-2 rounded-lg inline-block">
            supabase db push
          </code>
        </div>
      )}
    </div>
  )
}
