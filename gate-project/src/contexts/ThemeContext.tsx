import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  setTheme: (t: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light')

  useEffect(() => {
    try {
      const saved = localStorage.getItem('theme') as Theme | null
      if (saved === 'light' || saved === 'dark') {
        setThemeState(saved)
        document.documentElement.classList.toggle('dark', saved === 'dark')
        return
      }

      const prefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      const initial = prefersDark ? 'dark' : 'light'
      setThemeState(initial)
      document.documentElement.classList.toggle('dark', initial === 'dark')
    } catch (e) {
      // fallback to light
      setThemeState('light')
      document.documentElement.classList.remove('dark')
    }

    // Sync across tabs and listen for system changes when no saved preference
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'theme') {
        const newVal = e.newValue as Theme | null
        if (newVal === 'light' || newVal === 'dark') {
          setThemeState(newVal)
          document.documentElement.classList.toggle('dark', newVal === 'dark')
        }
      }
    }

    let mql: MediaQueryList | null = null
    const onPrefChange = (ev: MediaQueryListEvent) => {
      try {
        // only update if user hasn't saved a preference
        const saved = localStorage.getItem('theme')
        if (saved === 'light' || saved === 'dark') return
        const newTheme: Theme = ev.matches ? 'dark' : 'light'
        setThemeState(newTheme)
        document.documentElement.classList.toggle('dark', newTheme === 'dark')
      } catch (e) {}
    }

    try {
      if (typeof window !== 'undefined' && window.matchMedia) {
        mql = window.matchMedia('(prefers-color-scheme: dark)')
        if (mql && typeof mql.addEventListener === 'function') {
          mql.addEventListener('change', onPrefChange)
        } else if (mql && typeof (mql as any).addListener === 'function') {
          ;(mql as any).addListener(onPrefChange)
        }
      }
    } catch (e) {}

    window.addEventListener('storage', onStorage)

    return () => {
      window.removeEventListener('storage', onStorage)
      try {
        if (mql) {
          if (typeof mql.removeEventListener === 'function') mql.removeEventListener('change', onPrefChange)
          else if (typeof (mql as any).removeListener === 'function') (mql as any).removeListener(onPrefChange)
        }
      } catch (e) {}
    }
  }, [])

  const setTheme = (t: Theme) => {
    try {
      localStorage.setItem('theme', t)
    } catch (e) {}
    setThemeState(t)
    document.documentElement.classList.toggle('dark', t === 'dark')
  }

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}

export default ThemeProvider
