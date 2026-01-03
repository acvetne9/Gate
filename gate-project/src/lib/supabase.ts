import { createClient } from '@supabase/supabase-js'

// Hardcoded fallback credentials (workaround for environments without ENV variable support)
const HARDCODED_SUPABASE_URL = 'https://bakzzkadgmyvvvnpuvki.supabase.co'
const HARDCODED_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJha3p6a2FkZ215dnZ2bnB1dmtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MTczMjksImV4cCI6MjA4MTk5MzMyOX0._tdT8u-ApjOACB1KVWg3honn-egJKfqTZWSKCW2goCk'

// Try to use ENV variables first, fallback to hardcoded values
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || HARDCODED_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || HARDCODED_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase credentials. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ============================================
// SECURITY: Admin Access Control
// ============================================
// Admin roles are managed in the database, not in the frontend
// To make someone an admin, run this SQL in Supabase:
// UPDATE user_profiles SET role = 'admin' WHERE email = 'user@email.com';

export function isAdmin(email: string): boolean {
  // All users are 'customer' by default
  // Admins must be manually promoted in the database
  return false
}

// ============================================
// SECURITY: Password Validation
// ============================================
export function validatePassword(password: string): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters')
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain an uppercase letter')
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain a lowercase letter')
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain a number')
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain a special character')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

// ============================================
// SECURITY: Email Validation
// ============================================
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// ============================================
// SECURITY: Log Security Event
// ============================================
export async function logSecurityEvent(
  eventType: string, 
  details: any, 
  severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
) {
  try {
    await supabase.from('security_events').insert({
      event_type: eventType,
      details,
      severity,
      ip: details.ip || 'unknown',
      user_agent: navigator.userAgent
    })
  } catch (error) {
    console.error('Failed to log security event:', error)
  }
}

// ============================================
// Database Types (TypeScript)
// ============================================
export interface UserProfile {
  id: string
  email: string
  name?: string
  role: 'admin' | 'customer'
  created_at: string
  updated_at: string
}

export interface Site {
  id: string
  customer_id: string
  name: string
  domain: string
  api_key: string
  site_id: string
  config: {
    gateType: 'hard' | 'metered' | 'freemium' | 'hybrid'
    meteredLimit?: number
    blockedBots: string[]
    allowedBots: string[]
    sensitivity: 'low' | 'medium' | 'high'
  }
  stats: {
    totalRequests: number
    blockedRequests: number
    allowedRequests: number
    revenue: number
  }
  status: 'active' | 'trial' | 'suspended' | 'cancelled'
  created_at: string
  updated_at: string
}

export interface WhoisData {
  orgName?: string
  netRange?: string
  description?: string
  abuseEmail?: string
  registrationDate?: string
  country?: string
  city?: string
  region?: string
  latitude?: number
  longitude?: number
  isp?: string
  asn?: string
}

export interface BotIdentity {
  name?: string
  company?: string
  type?: 'ai-training' | 'search-engine' | 'monitoring' | 'scraper' | 'security' | 'social-media' | 'seo' | 'unknown'
  purpose?: string
  isLegitimate?: boolean
  respectsRobotsTxt?: boolean
  docsUrl?: string
  verified?: boolean
}

export interface RequestLog {
  id: string
  site_id: string
  customer_id: string
  timestamp: string
  ip: string
  user_agent: string
  page: string
  type: 'human' | 'bot' | 'scraper'
  status: 'allowed' | 'blocked'
  detection_data: any
  fingerprint: any
  risk_score: number
  decision_reason: string
  whois_data?: WhoisData
  bot_identity?: BotIdentity
  reverse_dns?: string
  network_type?: string
  hosting_provider?: string
}

export interface Simulation {
  id: string
  site_id: string
  launched_by: string
  config: any
  results: any
  status: 'running' | 'completed' | 'failed'
  total_requests: number
  blocked_count: number
  allowed_count: number
  created_at: string
  completed_at?: string
}
