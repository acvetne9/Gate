/**
 * SettingsContext - Load application configuration from database
 * This eliminates the need for environment variables
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '../lib/supabase'

interface AppSettings {
  stripe_publishable_key: string
  stripe_keeper_price_id: string
  stripe_max_price_id: string
  stripe_connect_client_id: string
  stripe_account_id: string
  app_url: string
}

interface SettingsContextType {
  settings: AppSettings | null
  loading: boolean
  error: string | null
  refreshSettings: () => Promise<void>
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

// Default fallback settings (used if database is unavailable or during initial load)
const DEFAULT_SETTINGS: AppSettings = {
  stripe_publishable_key: 'pk_live_51SkzH9QzIlRI55yLTxHWq9F7lACX4vvzVV66uGeyJjAsWB3fVV6h71DpezjIgrcD7Hi0Wb7UY5wWp4trvrLjbgmC00vK933Njj',
  stripe_keeper_price_id: 'prod_TiQr8gEqB8Q6Km',
  stripe_max_price_id: 'prod_TiQsIG6aaOSikC',
  stripe_connect_client_id: 'ca_TkatocOJAdLzhkfBUnZUCLyF35B8hV1f',
  stripe_account_id: 'acct_1SkzH9QzIlRI55yL', // Platform Stripe account ID
  app_url: typeof window !== 'undefined' ? window.location.origin : 'https://gate-sercurities.lovable.app'
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings | null>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadSettings = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch all settings from database
      const { data, error: fetchError } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', [
          'stripe_publishable_key',
          'stripe_keeper_price_id',
          'stripe_max_price_id',
          'stripe_connect_client_id',
          'stripe_account_id',
          'app_url'
        ])

      if (fetchError) {
        // If table doesn't exist or user doesn't have access, use defaults
        console.warn('Could not load settings from database, using defaults:', fetchError.message)
        setSettings(DEFAULT_SETTINGS)
        setLoading(false)
        return
      }

      // Transform array of key-value pairs into object
      const settingsObject = data.reduce((acc, item) => {
        acc[item.key as keyof AppSettings] = item.value
        return acc
      }, {} as Partial<AppSettings>)

      // Merge with defaults to ensure all keys exist
      const mergedSettings: AppSettings = {
        ...DEFAULT_SETTINGS,
        ...settingsObject
      }

      setSettings(mergedSettings)
    } catch (err) {
      console.error('Error loading settings:', err)
      setError(err instanceof Error ? err.message : 'Failed to load settings')
      // Use defaults on error
      setSettings(DEFAULT_SETTINGS)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  const refreshSettings = async () => {
    await loadSettings()
  }

  return (
    <SettingsContext.Provider value={{ settings, loading, error, refreshSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}

// Convenience function to get a specific setting
export function useSetting<K extends keyof AppSettings>(key: K): AppSettings[K] | null {
  const { settings } = useSettings()
  return settings ? settings[key] : null
}
