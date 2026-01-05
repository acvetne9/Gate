import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, validatePassword, validateEmail, logSecurityEvent } from '../lib/supabase'

interface User {
  id: string
  email: string
  name?: string
  role: 'admin' | 'customer'
}

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<string>
  signUp: (email: string, password: string, name: string, website?: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// SECURITY: Track login attempts
const loginAttempts = new Map<string, { count: number, resetAt: number }>()

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadUserProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadUserProfile(session.user.id)
      } else {
        setUser(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadUserProfile(userId: string) {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (data) {
      setUser({
        id: data.id,
        email: data.email,
        name: data.name,
        role: data.role
      })
    }
    setLoading(false)
  }

  const signIn = async (email: string, password: string): Promise<string> => {
    // SECURITY: Validate email format
    if (!validateEmail(email)) {
      throw new Error('Invalid email format')
    }

    // SECURITY: Check rate limiting
    const now = Date.now()
    const attempts = loginAttempts.get(email)

    if (attempts && attempts.count >= 5 && now < attempts.resetAt) {
      const minutesLeft = Math.ceil((attempts.resetAt - now) / 60000)
      await logSecurityEvent('rate_limit_exceeded', {
        email,
        attemptCount: attempts.count
      }, 'high')
      throw new Error(`Too many login attempts. Try again in ${minutesLeft} minutes.`)
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        // SECURITY: Track failed login
        const currentAttempts = loginAttempts.get(email) || { count: 0, resetAt: 0 }
        loginAttempts.set(email, {
          count: currentAttempts.count + 1,
          resetAt: now + 15 * 60 * 1000 // 15 minutes
        })

        if (currentAttempts.count >= 3) {
          await logSecurityEvent('multiple_failed_logins', {
            email,
            attemptCount: currentAttempts.count + 1
          }, 'medium')
        }

        throw error
      }

      // SECURITY: Clear failed attempts on success
      loginAttempts.delete(email)

      // SECURITY: Log successful login
      await logSecurityEvent('successful_login', { email }, 'low')

      // Fetch user profile to get role
      if (data.user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', data.user.id)
          .single()

        return profile?.role || 'customer'
      }

      return 'customer'
    } catch (error) {
      throw error
    }
  }

  const signUp = async (email: string, password: string, name: string, website?: string) => {
    // SECURITY: Validate email
    if (!validateEmail(email)) {
      throw new Error('Invalid email format')
    }

    // SECURITY: Validate password
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.errors.join(', '))
    }

    try {
      // All new users are 'customer' by default
      // Admins must be manually promoted in the database
      const role = 'customer'

      // Sign up with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
          data: {
            name,
            role
          }
        }
      })

      if (error) {
        console.error('Signup error:', error)
        throw new Error(error.message || 'Failed to create account')
      }

      if (!data.user) {
        throw new Error('Failed to create user account')
      }

      console.log('User created:', data.user.id)

      // SECURITY: Log new user creation
      try {
        await logSecurityEvent('user_created', {
          email,
          role: 'customer',
          isAdmin: false
        }, 'low')
      } catch (logError) {
        console.warn('Failed to log security event:', logError)
      }

      // Create user profile with role
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: data.user.id,
          email,
          name,
          role
        })

      if (profileError) {
        console.error('Profile creation error:', profileError)
        throw new Error(`Failed to create user profile: ${profileError.message}`)
      }

      console.log('Profile created successfully')

      // If customer, create demo site
      if (role === 'customer') {
        const siteId = 'site_' + crypto.randomUUID().replace(/-/g, '').substring(0, 16)
        const apiKey = 'pk_live_' + crypto.randomUUID().replace(/-/g, '').substring(0, 32)

        const { error: siteError } = await supabase
          .from('sites')
          .insert({
            customer_id: data.user.id,
            site_id: siteId,
            api_key: apiKey,
            name: website || `${name}'s Site`,
            domain: website || 'example.com',
            status: 'active',
            config: {
              gateType: 'none',
              meteredLimit: 3,
              premiumPages: [],
              blockedBots: ['GPTBot', 'ClaudeBot', 'CCBot'],
              subscribeUrl: '',
              loginUrl: '',
              showGatewallToHumans: false
            },
            stats: {
              totalRequests: 0,
              blockedRequests: 0,
              allowedRequests: 0
            }
          })

        if (siteError) {
          console.error('Site creation error:', siteError)
          // Don't throw here - profile is created, site can be created later
          console.warn('Site creation failed but profile was created successfully')
        } else {
          console.log('Demo site created successfully')
        }
      }

      // Check if email confirmation is required
      if (data.user && !data.session) {
        console.log('Email confirmation required')
        // Email confirmation is required - user will need to check their email
        return
      }

      console.log('Signup completed successfully')
    } catch (error: any) {
      console.error('Signup process error:', error)
      throw error
    }
  }

  const signOut = async () => {
    // SECURITY: Log logout
    if (user) {
      await logSecurityEvent('user_logout', { email: user.email }, 'low')
    }

    await supabase.auth.signOut()
    // Note: setUser(null) is handled by onAuthStateChange listener
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
