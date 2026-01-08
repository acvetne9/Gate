import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../integrations/supabase/client'
import { useAuth } from '../contexts/AuthContext'
import { toast } from 'sonner'

interface Subscription {
  id: string
  customer_id: string
  stripe_customer_id: string
  stripe_subscription_id: string | null
  stripe_price_id: string | null
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete' | 'incomplete_expired' | 'unpaid'
  plan_name: 'free' | 'keeper' | 'max'
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  trial_end: string | null
  created_at: string
  updated_at: string
}

interface Invoice {
  id: string
  customer_id: string
  stripe_invoice_id: string
  stripe_subscription_id: string | null
  amount_paid: number // in cents
  amount_due: number // in cents
  currency: string
  status: 'paid' | 'open' | 'void' | 'uncollectible' | 'draft'
  invoice_pdf: string | null
  hosted_invoice_url: string | null
  billing_reason: string | null
  created_at: string
  paid_at: string | null
}

interface PaymentMethod {
  id: string
  customer_id: string
  stripe_payment_method_id: string
  type: 'card' | 'bank_account' | 'us_bank_account' | 'sepa_debit'
  card_brand: string | null
  card_last4: string | null
  card_exp_month: number | null
  card_exp_year: number | null
  is_default: boolean
  created_at: string
}

interface UserProfile {
  subscription_tier: 'free' | 'keeper' | 'max'
  subscription_status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete'
  stripe_customer_id: string | null
}

interface Usage {
  sites: number
  requests: number
  period: {
    start: string
    end: string | null
  }
}

interface SubscriptionData {
  subscription: Subscription | null
  invoices: Invoice[]
  paymentMethods: PaymentMethod[]
  profile: UserProfile | null
  usage: Usage
}

interface SubscriptionContextType {
  subscriptionData: SubscriptionData | null
  loading: boolean
  error: string | null
  refreshSubscription: () => Promise<void>
  createCheckoutSession: (priceId: string) => Promise<void>
  openCustomerPortal: () => Promise<void>
  openBankSetup: () => Promise<void>
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined)

export const useSubscription = () => {
  const context = useContext(SubscriptionContext)
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider')
  }
  return context
}

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth()
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSubscriptionStatus = async () => {
    if (!user || !user.id) {
      setLoading(false)
      setSubscriptionData(null)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data, error: functionError } = await supabase.functions.invoke('get-subscription-status', {
        body: { customerId: user.id }
      })

      if (functionError) {
        console.error('Error fetching subscription status:', functionError)
        setError(functionError.message || 'Failed to fetch subscription status')
        setSubscriptionData(null)
        return
      }

      setSubscriptionData(data as SubscriptionData)
    } catch (err) {
      console.error('Error fetching subscription:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setSubscriptionData(null)
    } finally {
      setLoading(false)
    }
  }

  const refreshSubscription = async () => {
    await fetchSubscriptionStatus()
  }

  const createCheckoutSession = async (priceId: string) => {
    if (!user || !user.id) {
      toast.error('You must be logged in to subscribe')
      return
    }

    // Validate priceId to prevent injection
    if (!priceId || typeof priceId !== 'string' || priceId.length < 5) {
      toast.error('Invalid price ID')
      return
    }

    try {
      toast.loading('Creating checkout session...')

      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          priceId,
          customerId: user.id,
          successUrl: `${window.location.origin}/dashboard?checkout=success`,
          cancelUrl: `${window.location.origin}/pricing?checkout=canceled`
        }
      })

      toast.dismiss()

      if (error) {
        console.error('Error creating checkout session:', error)
        toast.error('Failed to create checkout session')
        return
      }

      if (data?.url) {
        window.location.href = data.url
      } else {
        toast.error('No checkout URL returned')
      }
    } catch (err) {
      toast.dismiss()
      console.error('Error creating checkout:', err)
      toast.error('Failed to create checkout session')
    }
  }

  const openCustomerPortal = async () => {
    if (!user || !user.id) {
      toast.error('You must be logged in to manage billing')
      return
    }

    try {
      toast.loading('Opening billing portal...')

      const { data, error } = await supabase.functions.invoke('create-portal-session', {
        body: {
          customerId: user.id,
          returnUrl: `${window.location.origin}/billing?setup=success`
        }
      })

      toast.dismiss()

      if (error) {
        console.error('Error creating portal session:', error)
        toast.error('Failed to open billing portal')
        return
      }

      if (data?.url) {
        window.location.href = data.url
      } else {
        toast.error('No portal URL returned')
      }
    } catch (err) {
      toast.dismiss()
      console.error('Error opening portal:', err)
      toast.error('Failed to open billing portal')
    }
  }

  const openBankSetup = async () => {
    if (!user || !user.id) {
      toast.error('You must be logged in to add a bank account')
      return
    }

    try {
      toast.loading('Setting up bank account...')

      const { data, error } = await supabase.functions.invoke('create-bank-setup-session', {
        body: {
          customerId: user.id,
          returnUrl: `${window.location.origin}/billing`
        }
      })

      toast.dismiss()

      if (error) {
        console.error('Error creating bank setup session:', error)
        toast.error('Failed to open bank account setup')
        return
      }

      if (data?.url) {
        window.location.href = data.url
      } else {
        toast.error('No setup URL returned')
      }
    } catch (err) {
      toast.dismiss()
      console.error('Error opening bank setup:', err)
      toast.error('Failed to open bank account setup')
    }
  }

  useEffect(() => {
    fetchSubscriptionStatus()
  }, [user])

  const value: SubscriptionContextType = {
    subscriptionData,
    loading,
    error,
    refreshSubscription,
    createCheckoutSession,
    openCustomerPortal,
    openBankSetup
  }

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>
}
