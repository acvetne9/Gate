import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { useSettings } from '../contexts/SettingsContext'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  CreditCard,
  FileText,
  TrendingUp,
  Check,
  AlertCircle,
  ExternalLink,
  Download,
  Shield,
  CheckCircle,
  Zap,
  Building2,
  Eye,
} from 'lucide-react'
import { PageLayout } from '../components'
import { planLimits } from '../config/stripe'

export default function BillingPage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { subscriptionData, loading, refreshSubscription, openCustomerPortal, openBankSetup, createCheckoutSession } = useSubscription()
  const { settings } = useSettings()
  const subscription = subscriptionData?.subscription || null
  const invoices = subscriptionData?.invoices || []
  const paymentMethods = subscriptionData?.paymentMethods || []
  const usage = subscriptionData?.usage || null
  const [showSuccess, setShowSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [showCanceled, setShowCanceled] = useState(false)
  const [stripeConnected, setStripeConnected] = useState(false)
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null)
  const [loadingStripe, setLoadingStripe] = useState(true)
  const [showPlansView, setShowPlansView] = useState(false)

  useEffect(() => {
    // Handle checkout success
    if (searchParams.get('success') === 'true') {
      setSuccessMessage('Your subscription has been activated. Thank you for upgrading!')
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 5000)
      // Refresh subscription data after successful checkout
      refreshSubscription()
    }
    // Handle payment method setup success (bank account or card added)
    if (searchParams.get('setup') === 'success') {
      setSuccessMessage('Payment method added successfully!')
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 5000)
      // Refresh subscription data to show new payment method
      refreshSubscription()
    }
    // Handle cancellation
    if (searchParams.get('canceled') === 'true' || searchParams.get('setup') === 'cancelled') {
      setShowCanceled(true)
      setTimeout(() => setShowCanceled(false), 5000)
    }
  }, [searchParams])

  // Load Stripe connection status
  useEffect(() => {
    const loadStripeStatus = async () => {
      if (!user?.id) return

      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('stripe_account_id, stripe_connected')
          .eq('id', user.id)
          .single()

        if (error) throw error

        setStripeConnected(data?.stripe_connected || false)
        setStripeAccountId(data?.stripe_account_id || null)
      } catch (error) {
        console.error('Error loading Stripe status:', error)
      } finally {
        setLoadingStripe(false)
      }
    }

    loadStripeStatus()
  }, [user])

  const connectStripe = () => {
    const stripeClientId = settings?.stripe_connect_client_id

    if (!stripeClientId || stripeClientId === 'ca_your_stripe_connect_client_id') {
      alert('Stripe Connect is not configured. Please update the settings in Admin Panel > Settings.')
      return
    }

    const appUrl = settings?.app_url || window.location.origin
    const redirectUri = `${appUrl}/stripe/connect/callback`

    // Construct Stripe Connect OAuth URL
    const stripeOAuthUrl = new URL('https://connect.stripe.com/oauth/authorize')
    stripeOAuthUrl.searchParams.append('client_id', stripeClientId)
    stripeOAuthUrl.searchParams.append('state', user?.id || '') // Pass user ID in state
    stripeOAuthUrl.searchParams.append('response_type', 'code')
    stripeOAuthUrl.searchParams.append('redirect_uri', redirectUri)
    stripeOAuthUrl.searchParams.append('scope', 'read_write')

    // Redirect to Stripe OAuth
    window.location.href = stripeOAuthUrl.toString()
  }

  // Admin accounts show Stripe setup for accepting bot payments
  // but don't need their own subscription
  const isAdmin = user?.role === 'admin'

  if (loading) {
    return (
      <PageLayout activeRoute="/billing">
        <div className="min-h-screen bg-gray-50">
          <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 64px)' }}>
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-800 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading billing information...</p>
            </div>
          </div>
        </div>
      </PageLayout>
    )
  }

  const planName = subscription?.plan_name || 'keeper'
  const planStatus = subscription?.status || 'active'

  return (
    <PageLayout activeRoute="/billing">
      <div className="min-h-screen bg-gray-50">

      {/* Main Content */}
      <div className="pt-24 pb-20 px-8">
        <div className="max-w-7xl mx-auto">
        {/* Success/Canceled Messages */}
        {showSuccess && (
          <div className="mb-6 p-6 bg-white rounded-3xl border border-green-200 shadow-xl transition-all duration-300">
            <div className="flex items-start">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mr-4">
                <Check className="w-5 h-5 text-green-700" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Success!</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {successMessage}
                </p>
              </div>
            </div>
          </div>
        )}

        {showCanceled && (
          <div className="mb-6 p-6 bg-white rounded-3xl border border-gray-200 shadow-xl transition-all duration-300">
            <div className="flex items-start">
              <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0 mr-4">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Checkout Canceled</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Your payment was not processed. You can try again whenever you're ready.
                </p>
              </div>
            </div>
          </div>
        )}

          <div className="mb-12">
            <h1 className="text-5xl font-semibold text-gray-900 mb-3 tracking-tight">
              Billing & <span className="text-green-800">Subscription</span>
            </h1>
            <p className="text-xl text-gray-600 font-light">Manage your subscription, payment methods, and invoices</p>
          </div>

          {/* Current Plan Section */}
          <div className="p-8 mb-6 bg-white rounded-3xl border border-gray-200 hover:border-green-200 hover:shadow-xl transition-all duration-500">
          {isAdmin && !showPlansView ? (
            // Admin Account View
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-green-100 rounded-2xl">
                    <Shield className="w-7 h-7 text-green-800" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-900">Admin Account</h2>
                    <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 mt-1 inline-block">
                      Unlimited Access
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowPlansView(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-800 bg-green-50 rounded-full hover:bg-green-100 transition-all duration-200"
                >
                  <Eye className="w-4 h-4" />
                  View Plans
                </button>
              </div>

              <div className="bg-green-50 rounded-2xl p-6 mb-6 border border-green-100">
                <p className="text-sm text-gray-900 mb-4 font-medium">
                  Your admin account has unlimited access - no subscription required.
                </p>
                <ul className="space-y-3 text-sm text-gray-700">
                  <li className="flex items-start">
                    <div className="w-5 h-5 rounded-full bg-green-700 flex items-center justify-center flex-shrink-0 mr-3 mt-0.5">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    Unlimited sites and requests
                  </li>
                  <li className="flex items-start">
                    <div className="w-5 h-5 rounded-full bg-green-700 flex items-center justify-center flex-shrink-0 mr-3 mt-0.5">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    Full admin panel access
                  </li>
                  <li className="flex items-start">
                    <div className="w-5 h-5 rounded-full bg-green-700 flex items-center justify-center flex-shrink-0 mr-3 mt-0.5">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    No billing for your own account
                  </li>
                </ul>
              </div>

              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-green-800" />
                  Accept Payments from Bots
                </h3>
                <p className="text-sm text-gray-700 mb-3">
                  Configure Stripe below to receive payments when bots access your protected content.
                </p>
                <p className="text-xs text-gray-600">
                  Note: Stripe setup is only needed if you want to charge bots for access.
                </p>
              </div>
            </div>
          ) : isAdmin && showPlansView ? (
            // Admin viewing plans (view only)
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-green-100 rounded-2xl">
                    <TrendingUp className="w-7 h-7 text-green-800" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-900">Available Plans</h2>
                    <span className="px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600 mt-1 inline-block flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      View Only
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowPlansView(false)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-800 bg-green-50 rounded-full hover:bg-green-100 transition-all duration-200"
                >
                  <Shield className="w-4 h-4" />
                  Back to Admin
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Keeper Plan */}
                <div className="rounded-2xl border-2 border-gray-200 bg-gray-50 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 rounded-xl bg-green-100">
                      <Zap className="w-6 h-6 text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Keeper</h3>
                  </div>

                  <div className="mb-4">
                    <span className="text-3xl font-bold text-gray-900">$0</span>
                    <span className="text-gray-600">/month</span>
                  </div>

                  <p className="text-sm text-gray-600 mb-4">Free plan - protect sites & access content</p>

                  <ul className="space-y-2">
                    {planLimits.keeper.features.slice(0, 4).map((feature, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* MAX Plan */}
                <div className="rounded-2xl border-2 border-gray-200 bg-gray-50 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 rounded-xl bg-gray-900">
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">MAX</h3>
                  </div>

                  <div className="mb-4">
                    <span className="text-3xl font-bold text-gray-900">$99</span>
                    <span className="text-gray-600">/month</span>
                  </div>

                  <p className="text-sm text-gray-600 mb-4">Premium features + discounted rates</p>

                  <ul className="space-y-2">
                    {planLimits.max.features.slice(0, 4).map((feature, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <p className="text-center text-sm text-gray-500 mt-6">
                As an admin, you have unlimited access and don't need to subscribe to a plan.
              </p>
            </div>
          ) : (
            // Regular Customer View
            <div>
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-3">Current Plan</h2>
                  <div className="flex items-center gap-3">
                    <span className="text-4xl font-semibold text-green-800 capitalize">{planName}</span>
                    <span
                      className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        planStatus === 'active'
                          ? 'bg-green-100 text-green-800'
                          : planStatus === 'trialing'
                          ? 'bg-green-100 text-green-800'
                          : planStatus === 'canceled'
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {planStatus}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/pricing')}
                  className="px-6 py-3 bg-green-800 text-white font-medium rounded-full hover:bg-green-700 hover:shadow-xl hover:scale-105 hover:-translate-y-1 transition-all duration-300"
                >
                  {planName === 'keeper' ? 'Upgrade to MAX' : 'Change Plan'}
                </button>
              </div>

              {subscription?.current_period_end && (
                <div className="text-sm text-gray-600 mb-6">
                  {subscription.cancel_at_period_end ? (
                    <p>
                      Your subscription will be canceled on{' '}
                      <strong className="text-gray-900">{new Date(subscription.current_period_end).toLocaleDateString()}</strong>
                    </p>
                  ) : (
                    <p>
                      Next billing date:{' '}
                      <strong className="text-gray-900">{new Date(subscription.current_period_end).toLocaleDateString()}</strong>
                    </p>
                  )}
                </div>
              )}

              {/* Usage Stats */}
              {usage && (
                <div className="grid grid-cols-2 gap-6 pt-6 border-t border-gray-200">
                  <div className="bg-gray-50 p-5 rounded-2xl">
                    <p className="text-sm text-gray-600 mb-2">Sites Used</p>
                    <p className="text-3xl font-semibold text-gray-900">
                      {usage.sites} / ∞
                    </p>
                  </div>
                  <div className="bg-gray-50 p-5 rounded-2xl">
                    <p className="text-sm text-gray-600 mb-2">Requests This Month</p>
                    <p className="text-3xl font-semibold text-gray-900">{usage.requests.toLocaleString()}</p>
                  </div>
                </div>
              )}

              {planName !== 'free' && (
                <div className="mt-6">
                  <button
                    onClick={openCustomerPortal}
                    className="flex items-center gap-2 text-sm text-green-800 hover:text-green-700 font-medium hover:-translate-y-0.5 transition-all duration-200"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Manage Subscription in Stripe
                  </button>
                </div>
              )}
            </div>
          )}
          </div>

          {/* Available Plans Section - Only for non-admins */}
          {!isAdmin && (
            <div className="bg-white rounded-3xl border border-gray-200 hover:border-green-200 hover:shadow-xl transition-all duration-500 p-8 mb-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
                  <TrendingUp className="w-6 h-6 text-green-800" />
                  Available Plans
                </h2>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Keeper Plan */}
                <div className={`rounded-2xl border-2 p-6 transition-all ${
                  planName === 'keeper' ? 'border-green-600 bg-green-50' : 'border-gray-200 bg-gray-50'
                }`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 rounded-xl bg-green-100">
                      <Zap className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Keeper</h3>
                      {planName === 'keeper' && (
                        <span className="text-xs font-semibold text-green-700">Current Plan</span>
                      )}
                    </div>
                  </div>

                  <div className="mb-4">
                    <span className="text-3xl font-bold text-gray-900">$0</span>
                    <span className="text-gray-600">/month</span>
                  </div>

                  <p className="text-sm text-gray-600 mb-4">Free plan - protect sites & access content</p>

                  <ul className="space-y-2 mb-6">
                    {planLimits.keeper.features.slice(0, 4).map((feature, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {planName !== 'keeper' && (
                    <button
                      onClick={() => navigate('/pricing')}
                      className="w-full py-2 px-4 bg-gray-200 text-gray-700 font-medium rounded-full hover:bg-gray-300 transition-all duration-200"
                    >
                      Downgrade to Keeper
                    </button>
                  )}
                  {planName === 'keeper' && (
                    <div className="w-full py-2 px-4 bg-green-100 text-green-700 font-medium rounded-full text-center">
                      Current Plan
                    </div>
                  )}
                </div>

                {/* MAX Plan */}
                <div className={`rounded-2xl border-2 p-6 transition-all ${
                  planName === 'max' ? 'border-green-600 bg-green-50' : 'border-gray-200 bg-gray-50'
                }`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 rounded-xl bg-gray-900">
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">MAX</h3>
                      {planName === 'max' && (
                        <span className="text-xs font-semibold text-green-700">Current Plan</span>
                      )}
                    </div>
                  </div>

                  <div className="mb-4">
                    <span className="text-3xl font-bold text-gray-900">$99</span>
                    <span className="text-gray-600">/month</span>
                  </div>

                  <p className="text-sm text-gray-600 mb-4">Premium features + discounted rates</p>

                  <ul className="space-y-2 mb-6">
                    {planLimits.max.features.slice(0, 4).map((feature, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {planName !== 'max' && (
                    <button
                      onClick={async () => {
                        const priceId = settings?.stripe_max_price_id
                        if (priceId) {
                          await createCheckoutSession(priceId)
                        } else {
                          navigate('/pricing')
                        }
                      }}
                      className="w-full py-2 px-4 bg-green-800 text-white font-medium rounded-full hover:bg-green-700 hover:shadow-lg transition-all duration-200"
                    >
                      Upgrade to MAX
                    </button>
                  )}
                  {planName === 'max' && (
                    <div className="w-full py-2 px-4 bg-green-100 text-green-700 font-medium rounded-full text-center">
                      Current Plan
                    </div>
                  )}
                </div>
              </div>

              <p className="text-center text-sm text-gray-500 mt-6">
                <a href="/pricing" className="text-green-700 hover:text-green-800 font-medium">
                  View full plan comparison →
                </a>
              </p>
            </div>
          )}

          {/* Stripe Connect Section - For receiving bot payments */}
          <div className="bg-white rounded-2xl border border-gray-200 hover:border-green-200 hover:shadow-xl transition-all duration-500 p-8 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Payment Collection (Stripe Connect)
            </h2>
          </div>

          <div className="bg-green-50 rounded-2xl p-6 mb-6 border border-green-100">
            <p className="text-sm text-gray-900 mb-2 font-medium">
              <strong>Connect your Stripe account</strong> to receive payments when bots access your protected content.
            </p>
            <p className="text-xs text-gray-700">
              This is separate from your subscription billing. Payments from bots go directly to your connected Stripe account.
            </p>
          </div>

          {loadingStripe ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-800 mx-auto"></div>
            </div>
          ) : stripeConnected ? (
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">Stripe Connected</h3>
                  <p className="text-sm text-gray-700 mb-2">
                    Your Stripe account is connected and ready to receive bot payments.
                  </p>
                  {stripeAccountId && (
                    <p className="text-xs text-gray-700 font-mono bg-white border border-gray-200 rounded px-3 py-2 inline-block">
                      Account: {stripeAccountId}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={connectStripe}
              className="w-full px-6 py-4 bg-green-800 text-white font-medium rounded-full hover:bg-green-700 hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
            >
              <CreditCard className="w-5 h-5" />
              Connect Stripe Account
            </button>
          )}
          </div>

          {/* Payment Methods Section */}
          <div className="bg-white rounded-2xl border border-gray-200 hover:border-green-200 hover:shadow-xl transition-all duration-500 p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-green-800" />
              Payment Methods
            </h2>
            {planName !== 'free' && (
              <button
                onClick={openCustomerPortal}
                className="text-sm text-green-800 hover:text-green-700 font-medium hover:-translate-y-0.5 transition-all duration-200"
              >
                Add Payment Method
              </button>
            )}
          </div>

          {paymentMethods.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No bank accounts on file.</p>
              {planName === 'free' && (
                <p className="text-sm mt-2">Upgrade to Keeper or MAX to add bank accounts.</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {paymentMethods.map((pm) => (
                <div
                  key={pm.id}
                  className="flex items-center justify-between p-6 border border-gray-200 bg-gray-50 rounded-2xl hover:border-green-200 transition-all duration-300"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-green-800" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 capitalize">
                        {(pm as any).bank_name || pm.card_brand || 'Bank Account'} •••• {(pm as any).bank_last4 || pm.card_last4}
                      </p>
                      <p className="text-sm text-gray-600">
                        {(pm as any).account_type ? `${(pm as any).account_type} account` : pm.card_exp_month ? `Expires ${pm.card_exp_month}/${pm.card_exp_year}` : 'ACH Direct Debit'}
                      </p>
                    </div>
                  </div>
                  {pm.is_default && (
                    <span className="px-3 py-1 text-xs font-semibold bg-green-800 text-white rounded-full">
                      Default
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
          </div>

          {/* Invoices Section */}
          <div className="bg-white rounded-2xl border border-gray-200 hover:border-green-200 hover:shadow-xl transition-all duration-500 p-8">
          <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2 mb-6">
            <FileText className="w-5 h-5 text-green-800" />
            Invoice History
          </h2>

          {invoices.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No invoices yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                      Amount
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50 transition-colors duration-200">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {new Date(invoice.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        ${(invoice.amount_paid / 100).toFixed(2)} {invoice.currency.toUpperCase()}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 text-xs font-semibold rounded-full ${
                            invoice.status === 'paid'
                              ? 'bg-green-100 text-green-800'
                              : invoice.status === 'open'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-3">
                          {invoice.invoice_pdf && (
                            <a
                              href={invoice.invoice_pdf}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-800 hover:text-green-700 text-sm flex items-center gap-1 font-medium hover:-translate-y-0.5 transition-all duration-200"
                            >
                              <Download className="w-4 h-4" />
                              PDF
                            </a>
                          )}
                          {invoice.hosted_invoice_url && (
                            <a
                              href={invoice.hosted_invoice_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-800 hover:text-green-700 text-sm flex items-center gap-1 font-medium hover:-translate-y-0.5 transition-all duration-200"
                            >
                              <ExternalLink className="w-4 h-4" />
                              View
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
    </PageLayout>
  )
}