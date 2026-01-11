// Shared Stripe utilities for Supabase Edge Functions
// Provides common Stripe functionality used across multiple functions

import Stripe from 'https://esm.sh/stripe@14.10.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

// Initialize Supabase client for fetching settings
const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

const supabaseForSettings = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Get Stripe secret key from database
async function getStripeSecretKey(): Promise<string> {
  try {
    const { data, error } = await supabaseForSettings
      .from('app_settings')
      .select('value')
      .eq('key', 'stripe_secret_key')
      .single()

    if (error || !data) {
      console.error('Failed to fetch Stripe secret key from database:', error)
      // Fallback to environment variable
      return Deno.env.get('STRIPE_SECRET_KEY') || ''
    }

    return data.value
  } catch (err) {
    console.error('Error fetching Stripe secret key:', err)
    // Fallback to environment variable
    return Deno.env.get('STRIPE_SECRET_KEY') || ''
  }
}

// Initialize Stripe client with key from database
const stripeSecretKey = await getStripeSecretKey()
export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

// Initialize Supabase client with service role key
export const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

/**
 * Get or create a Stripe customer for a user
 * @param userId - Supabase user ID
 * @param email - User email
 * @returns Stripe customer ID
 */
export async function getOrCreateStripeCustomer(
  userId: string,
  email: string
): Promise<string> {
  // Check if customer already exists in user_profiles
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single()

  if (profile?.stripe_customer_id) {
    return profile.stripe_customer_id
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email,
    metadata: {
      supabase_user_id: userId,
    },
  })

  // Store Stripe customer ID in user_profiles
  await supabaseAdmin
    .from('user_profiles')
    .update({ stripe_customer_id: customer.id })
    .eq('id', userId)

  return customer.id
}

/**
 * Sync Stripe subscription data to Supabase database
 * @param subscription - Stripe subscription object
 */
export async function syncSubscriptionToDatabase(
  subscription: Stripe.Subscription
): Promise<void> {
  const customerId = subscription.customer as string

  // Get user ID from Stripe customer ID
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!profile) {
    console.error('User profile not found for Stripe customer:', customerId)
    return
  }

  // Determine plan name from price ID
  const priceId = subscription.items.data[0]?.price.id || ''
  let planName: 'free' | 'pro' | 'business' = 'free'

  const proPriceId = Deno.env.get('STRIPE_PRO_PRICE_ID')
  const businessPriceId = Deno.env.get('STRIPE_BUSINESS_PRICE_ID')

  if (priceId === proPriceId) {
    planName = 'pro'
  } else if (priceId === businessPriceId) {
    planName = 'business'
  }

  // Upsert subscription data
  await supabaseAdmin
    .from('subscriptions')
    .upsert(
      {
        customer_id: profile.id,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        stripe_price_id: priceId,
        status: subscription.status,
        plan_name: planName,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
        trial_end: subscription.trial_end
          ? new Date(subscription.trial_end * 1000).toISOString()
          : null,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'stripe_subscription_id',
      }
    )

  // Update user_profiles with subscription info
  await supabaseAdmin
    .from('user_profiles')
    .update({
      subscription_tier: planName,
      subscription_status: subscription.status,
    })
    .eq('id', profile.id)
}

/**
 * Sync invoice data to Supabase database
 * @param invoice - Stripe invoice object
 */
export async function syncInvoiceToDatabase(
  invoice: Stripe.Invoice
): Promise<void> {
  const customerId = invoice.customer as string

  // Get user ID from Stripe customer ID
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!profile) {
    console.error('User profile not found for Stripe customer:', customerId)
    return
  }

  // Upsert invoice data
  await supabaseAdmin
    .from('invoices')
    .upsert(
      {
        customer_id: profile.id,
        stripe_invoice_id: invoice.id,
        stripe_subscription_id: invoice.subscription as string,
        amount_paid: invoice.amount_paid,
        amount_due: invoice.amount_due,
        currency: invoice.currency,
        status: invoice.status || 'draft',
        invoice_pdf: invoice.invoice_pdf || null,
        hosted_invoice_url: invoice.hosted_invoice_url || null,
        billing_reason: invoice.billing_reason || null,
        created_at: new Date(invoice.created * 1000).toISOString(),
        paid_at: invoice.status_transitions?.paid_at
          ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
          : null,
      },
      {
        onConflict: 'stripe_invoice_id',
      }
    )
}

/**
 * Sync payment method data to Supabase database
 * @param paymentMethod - Stripe payment method object
 * @param customerId - Stripe customer ID
 * @param isDefault - Whether this is the default payment method
 */
export async function syncPaymentMethodToDatabase(
  paymentMethod: Stripe.PaymentMethod,
  customerId: string,
  isDefault: boolean = false
): Promise<void> {
  // Get user ID from Stripe customer ID
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!profile) {
    console.error('User profile not found for Stripe customer:', customerId)
    return
  }

  // If this is the new default, unset other defaults
  if (isDefault) {
    await supabaseAdmin
      .from('payment_methods')
      .update({ is_default: false })
      .eq('customer_id', profile.id)
  }

  // Upsert payment method data
  const paymentMethodData: any = {
    customer_id: profile.id,
    stripe_payment_method_id: paymentMethod.id,
    type: paymentMethod.type,
    is_default: isDefault,
  }

  // Add card-specific data if type is card
  if (paymentMethod.type === 'card' && paymentMethod.card) {
    paymentMethodData.card_brand = paymentMethod.card.brand
    paymentMethodData.card_last4 = paymentMethod.card.last4
    paymentMethodData.card_exp_month = paymentMethod.card.exp_month
    paymentMethodData.card_exp_year = paymentMethod.card.exp_year
  }

  // Add bank account data if type is us_bank_account
  if (paymentMethod.type === 'us_bank_account' && paymentMethod.us_bank_account) {
    paymentMethodData.bank_name = paymentMethod.us_bank_account.bank_name
    paymentMethodData.bank_last4 = paymentMethod.us_bank_account.last4
    paymentMethodData.account_type = paymentMethod.us_bank_account.account_type
    paymentMethodData.account_holder_type = paymentMethod.us_bank_account.account_holder_type
    paymentMethodData.routing_number = paymentMethod.us_bank_account.routing_number
  }

  await supabaseAdmin
    .from('payment_methods')
    .upsert(paymentMethodData, {
      onConflict: 'stripe_payment_method_id',
    })
}

/**
 * Delete subscription from database
 * @param subscriptionId - Stripe subscription ID
 */
export async function deleteSubscriptionFromDatabase(
  subscriptionId: string
): Promise<void> {
  const { data: subscription } = await supabaseAdmin
    .from('subscriptions')
    .select('customer_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single()

  if (!subscription) {
    return
  }

  // Update subscription status to canceled
  await supabaseAdmin
    .from('subscriptions')
    .update({ status: 'canceled' })
    .eq('stripe_subscription_id', subscriptionId)

  // Reset user to free tier
  await supabaseAdmin
    .from('user_profiles')
    .update({
      subscription_tier: 'free',
      subscription_status: 'canceled',
    })
    .eq('id', subscription.customer_id)
}

/**
 * CORS headers for API responses
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
