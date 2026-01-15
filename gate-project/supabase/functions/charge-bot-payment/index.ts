// Edge Function: charge-bot-payment
// Charges a bot payment using Stripe Connect with revenue sharing

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.21.0'
import { corsHeaders, supabaseAdmin } from '../_shared/stripe.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
})

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { siteId, botInfo } = await req.json()

    if (!siteId) {
      return new Response(
        JSON.stringify({ error: 'Missing siteId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get site and customer information
    const { data: site, error: siteError } = await supabaseAdmin
      .from('sites')
      .select(`
        *,
        user_profiles!inner(
          id,
          subscription_tier,
          stripe_account_id,
          stripe_connected,
          bot_payment_enabled,
          bot_payment_amount
        )
      `)
      .eq('id', siteId)
      .single()

    if (siteError || !site) {
      return new Response(
        JSON.stringify({ error: 'Site not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const profile = site.user_profiles

    // Check if user has Stripe connected
    if (!profile.stripe_connected || !profile.stripe_account_id) {
      return new Response(
        JSON.stringify({
          error: 'Payment collection not configured',
          message: 'Connect your Stripe account in the billing settings to collect bot payments'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if bot payments are enabled
    if (!profile.bot_payment_enabled) {
      return new Response(
        JSON.stringify({ error: 'Bot payments not enabled' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Calculate charge amount and platform fee based on plan
    let chargeAmount: number
    let applicationFeeAmount: number
    let description: string

    const tier = profile.subscription_tier || 'free'

    if (tier === 'keeper') {
      // Keeper (free plan): fixed $1.00 per bot request, 50/50 revenue split
      chargeAmount = 100 // 100 cents ($1.00)
      applicationFeeAmount = 50 // Platform gets 50 cents (50%)
      description = 'Bot access fee (Keeper - $1.00)'
    } else if (tier === 'max') {
      // MAX ($99/mo plan): site owner sets any price, platform takes only 10%
      // Amount stored in cents in profile.bot_payment_amount
      // Site config stores in dollars, profile stores in cents
      const siteConfigAmount = site.config?.botPaymentAmount
      chargeAmount = profile.bot_payment_amount || (siteConfigAmount ? Math.round(siteConfigAmount * 100) : 100)
      applicationFeeAmount = Math.max(Math.floor(chargeAmount * 0.1), 1) // Platform gets 10%, minimum 1 cent
      description = `Bot access fee (MAX - $${(chargeAmount / 100).toFixed(2)})`
    } else {
      // Free plan — cannot charge bots
      return new Response(
        JSON.stringify({
          error: 'Upgrade required',
          message: 'Upgrade to Keeper or MAX plan to collect bot payments'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Stripe minimum charge is $0.50 USD
    if (chargeAmount < 50) {
      chargeAmount = 50
      applicationFeeAmount = tier === 'keeper' ? 25 : Math.max(Math.floor(50 * 0.1), 1)
    }

    // Create a Payment Intent with Stripe Connect
    // Note: This creates an intent that must be confirmed by the bot/user
    // Supports both card and ACH (us_bank_account) payment methods
    const paymentIntent = await stripe.paymentIntents.create({
      amount: chargeAmount,
      currency: 'usd',
      payment_method_types: ['card', 'us_bank_account'], // Support both card and ACH
      application_fee_amount: applicationFeeAmount,
      description,
      metadata: {
        site_id: siteId,
        site_name: site.name,
        customer_id: profile.id,
        subscription_tier: tier,
        bot_user_agent: botInfo?.userAgent || 'unknown',
        bot_ip: botInfo?.ip || 'unknown'
      },
      // The connected account receives the payment
      transfer_data: {
        destination: profile.stripe_account_id,
      },
    })

    console.log('Payment intent created for bot access - supports card and ACH')

    // Log the charge attempt
    await supabaseAdmin
      .from('bot_charges')
      .insert({
        customer_id: profile.id,
        site_id: siteId,
        stripe_payment_intent_id: paymentIntent.id,
        amount: chargeAmount,
        platform_fee: applicationFeeAmount,
        status: 'pending',
        bot_info: botInfo || {}
      })

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        amount: chargeAmount,
        platformFee: applicationFeeAmount,
        userReceives: chargeAmount - applicationFeeAmount,
        description,
        paymentIntentId: paymentIntent.id
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error: unknown) {
    console.error('Error creating bot payment:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to create bot payment'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
