// Edge Function: get-subscription-status
// Fetches current subscription, invoices, and payment methods for a user

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.10.0?target=deno'
import { corsHeaders, supabaseAdmin, stripe } from '../_shared/stripe.ts'

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { customerId } = await req.json()

    if (!customerId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameter: customerId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch subscription data
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('customer_id', customerId)
      .single()

    if (subError && subError.code !== 'PGRST116') {
      // PGRST116 = no rows returned (user might not have subscription)
      console.error('Error fetching subscription:', subError)
    }

    // Fetch invoices (last 12 months)
    const { data: invoices, error: invoicesError } = await supabaseAdmin
      .from('invoices')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (invoicesError) {
      console.error('Error fetching invoices:', invoicesError)
    }

    // Get user profile to get Stripe customer ID
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email, name, role, stripe_customer_id')
      .eq('id', customerId)
      .single()

    if (profileError) {
      console.error('Error fetching user profile:', profileError)
    }

    // Fetch payment methods directly from Stripe (not database)
    // Only if the user already has a Stripe customer ID - don't create one just for viewing
    let paymentMethods: any[] = []
    let stripeCustomerId: string | null = null

    if (userProfile) {
    // Only use existing Stripe customer - don't create one
      stripeCustomerId = userProfile.stripe_customer_id || null

      // Only fetch payment methods if customer already exists in Stripe
      if (stripeCustomerId) {
        try {
          // Verify customer exists in Stripe first
          const customer = await stripe.customers.retrieve(stripeCustomerId)
          
          if (typeof customer !== 'string' && !customer.deleted) {
            // Fetch payment methods from Stripe
            const pmList = await stripe.paymentMethods.list({
              customer: stripeCustomerId,
              limit: 10,
            })

            const defaultPMId = customer.invoice_settings?.default_payment_method

            // Format payment methods for frontend
            paymentMethods = pmList.data.map((pm: Stripe.PaymentMethod) => ({
              id: pm.id,
              customer_id: customerId,
              stripe_payment_method_id: pm.id,
              type: pm.type,
              card_brand: pm.card?.brand || null,
              card_last4: pm.card?.last4 || null,
              card_exp_month: pm.card?.exp_month || null,
              card_exp_year: pm.card?.exp_year || null,
              bank_name: pm.us_bank_account?.bank_name || null,
              bank_last4: pm.us_bank_account?.last4 || null,
              account_type: pm.us_bank_account?.account_type || null,
              is_default: pm.id === defaultPMId,
              created_at: new Date(pm.created * 1000).toISOString(),
            }))
          } else {
            // Customer was deleted in Stripe, clear the reference
            console.log('Stripe customer was deleted, clearing reference')
            stripeCustomerId = null
          }
        } catch (stripeError: unknown) {
          // Customer doesn't exist in Stripe - clear the stale reference
          console.log('Stripe customer not found, continuing without payment methods:', stripeError)
          stripeCustomerId = null
        }
      }
    }

    // Build profile with subscription data from subscription table
    const profile = userProfile ? {
      subscription_tier: subscription?.plan_name || 'free',
      subscription_status: subscription?.status || 'active',
      stripe_customer_id: stripeCustomerId
    } : null

    // Fetch usage data (optional - for displaying current usage)
    const { data: sites } = await supabaseAdmin
      .from('sites')
      .select('id, name, domain')
      .eq('customer_id', customerId)

    const siteCount = sites?.length || 0

    // Calculate current period usage
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { count: requestLogCount } = await supabaseAdmin
      .from('request_logs')
      .select('id', { count: 'exact', head: true })
      .eq('customer_id', customerId)
      .gte('timestamp', startOfMonth.toISOString())

    const requestCount = requestLogCount ?? 0

    return new Response(
      JSON.stringify({
        subscription: subscription || null,
        invoices: invoices || [],
        paymentMethods: paymentMethods || [],
        profile: profile || null,
        usage: {
          sites: siteCount,
          requests: requestCount,
          period: {
            start: startOfMonth.toISOString(),
            end: subscription?.current_period_end || null,
          },
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error: unknown) {
    console.error('Error fetching subscription status:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch subscription status'
    return new Response(
      JSON.stringify({
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
