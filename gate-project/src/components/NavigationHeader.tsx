/**
 * Reusable Navigation Header Component
 * Provides consistent navigation across authenticated pages
 */

import { Shield, Sparkles, ChevronDown } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSubscription } from '../contexts/SubscriptionContext'

interface NavigationHeaderProps {
  activeRoute?: string
  customActions?: React.ReactNode
}

export function NavigationHeader({ activeRoute, customActions }: NavigationHeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [forceCollapsed, setForceCollapsed] = useState(false)
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const navRef = useRef<HTMLDivElement | null>(null)
  const logoRef = useRef<HTMLDivElement | null>(null)
  const actionsRef = useRef<HTMLDivElement | null>(null)
  const dropdownRef = useRef<HTMLDivElement | null>(null)
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { subscriptionData } = useSubscription()

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [dropdownOpen])

  useEffect(() => {
    let raf = 0
    const checkOverflow = () => {
      if (!wrapperRef.current || !navRef.current || !logoRef.current) return
      const wrapperWidth = wrapperRef.current.clientWidth
      const logoWidth = logoRef.current.offsetWidth || 0
      const actionsWidth = actionsRef.current ? actionsRef.current.offsetWidth : 0
      const available = wrapperWidth - logoWidth - actionsWidth - 120
      const navWidth = navRef.current.scrollWidth || 0
      const shouldCollapse = navWidth > available
      setForceCollapsed(shouldCollapse)
    }

    const onResize = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(checkOverflow)
    }

    onResize()
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(onResize)
      if (wrapperRef.current) ro.observe(wrapperRef.current)
      if (navRef.current) ro.observe(navRef.current)
      if (logoRef.current) ro.observe(logoRef.current)
      if (actionsRef.current) ro.observe(actionsRef.current)
      window.addEventListener('orientationchange', onResize)
      return () => {
        ro.disconnect()
        window.removeEventListener('orientationchange', onResize)
        cancelAnimationFrame(raf)
      }
    }

    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
      cancelAnimationFrame(raf)
    }
  }, [])

  const isCollapsed = forceCollapsed || (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 1024px)').matches)

  const getActiveLabel = () => {
    if (activeRoute === '/') return 'Home'
    if (activeRoute === '/demo') return 'Demo'
    if (activeRoute === '/dashboard') return 'Dashboard'
    if (activeRoute === '/billing') return 'Billing'
    if (activeRoute === '/admin') return 'Admin Panel'
    if (activeRoute === '/onboarding') return 'Get Started'
    if (activeRoute === '/blog') return 'Blog'
    return 'Menu'
  }

  const navItems = [
    { label: 'Home', path: '/' },
    { label: 'Demo', path: '/demo' },
    { label: 'Dashboard', path: '/dashboard', auth: true },
    { label: 'Billing', path: '/billing', auth: true },
    { label: 'Admin Panel', path: '/admin', auth: true, admin: true },
    { label: 'Get Started', path: '/dashboard/onboarding' },
    { label: 'Blog', path: '/blog' },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-white/90 dark:bg-[#09090b]/90 border-b border-gray-200/80 dark:border-[#27272a] shadow-sm transition-all duration-300">
      <div ref={wrapperRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo */}
          <div
            ref={logoRef}
            className="flex items-center gap-2 group cursor-pointer flex-shrink-0"
            onClick={() => navigate('/')}
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-green-800 to-green-900 flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-300">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900 dark:text-slate-100 hidden sm:inline">Gate</span>
          </div>

          {/* Navigation Links - Full Width */}
          {!isCollapsed && (
            <div ref={navRef} className="flex items-center gap-8 lg:gap-10 whitespace-nowrap">
              {navItems.map((item) => {
                if (item.auth && !user) return null
                if (item.admin && user?.role !== 'admin') return null
                const isActive = (item.path === '/' && activeRoute === '/') || activeRoute === item.path
                const baseClass = `text-sm font-medium hover:text-gray-900 hover:-translate-y-0.5 transition-all duration-200 whitespace-nowrap ${isActive ? 'font-semibold' : 'text-gray-700'}`
                const className = item.admin ? `${baseClass} ${isActive ? 'text-purple-600' : 'text-purple-600'}` : `${baseClass} ${isActive ? 'text-green-800' : ''}`
                return (
                  <button key={item.path} onClick={() => navigate(item.path)} className={className}>
                    {item.label}
                  </button>
                )
              })}
            </div>
          )}

          {/* Dropdown Menu - Collapsed Width */}
          {isCollapsed && (
            <div ref={dropdownRef} className="relative flex-1 flex justify-center mx-4">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100/80 rounded-lg transition-all duration-200 border border-transparent hover:border-gray-200"
              >
                <span className="font-semibold">{getActiveLabel()}</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Panel */}
              {dropdownOpen && (
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-52 bg-white dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] rounded-xl shadow-xl overflow-hidden">
                  <div className="py-2">
                    {navItems.map((item) => {
                      if (item.auth && !user) return null
                      if (item.admin && user?.role !== 'admin') return null
                      const isActive = (item.path === '/' && activeRoute === '/') || activeRoute === item.path
                      const base = isActive ? 'text-green-800 bg-green-50 border-l-4 border-green-800' : 'text-gray-700 border-l-4 border-transparent'
                      const purpleActive = isActive ? 'text-purple-600 bg-purple-50 border-l-4 border-purple-600' : 'text-purple-600 border-l-4 border-transparent'
                      const className = item.admin ? `w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-purple-50 transition-colors ${purpleActive}` : `w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors ${base}`
                      return (
                        <button
                          key={item.path}
                          onClick={() => { setDropdownOpen(false); navigate(item.path) }}
                          className={className}
                        >
                          {item.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* User Info & Actions */}
          {user ? (
            <div ref={actionsRef} className="flex items-center gap-3 flex-shrink-0">
              {customActions || (
                <>
                  <span className="hidden lg:inline px-3 py-1.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-700 capitalize border border-gray-200">
                    <Sparkles className="w-3 h-3 inline mr-1" />
                    {user.role || 'user'}
                  </span>
                  {subscriptionData?.subscription?.plan_name && (
                    <span className={`hidden lg:inline px-3 py-1.5 text-xs font-semibold rounded-full capitalize ${
                      subscriptionData.subscription.plan_name === 'max' ? 'bg-purple-100 text-purple-700 border border-purple-300' :
                      subscriptionData.subscription.plan_name === 'keeper' ? 'bg-green-100 text-green-700 border border-green-300' :
                      'bg-gray-100 text-gray-700 border border-gray-200'
                    }`}>
                      {subscriptionData.subscription.plan_name} plan
                    </span>
                  )}
                  <button
                    onClick={signOut}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 bg-green-800 text-white text-xs sm:text-sm font-semibold rounded-full hover:bg-green-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
                  >
                    Sign Out
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <button 
                onClick={() => navigate('/login')} 
                className="text-xs sm:text-sm font-medium text-gray-700 hover:text-gray-900 hover:-translate-y-0.5 transition-all duration-200"
              >
                Sign In
              </button>
              <button 
                onClick={() => navigate('/signup')} 
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-green-800 text-white text-xs sm:text-sm font-semibold rounded-full hover:bg-green-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
              >
                Sign Up
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
