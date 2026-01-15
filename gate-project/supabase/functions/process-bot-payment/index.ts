import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.5.0?target=deno'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Input validation schema
const BotPaymentSchema = z.object({
  siteId: z.string().min(1).max(100),
  page: z.string().max(2000).optional().default('/'),
  amount: z.number().min(0.50).max(100000), // Min $0.50 (Stripe minimum), no practical max
  paymentMethodId: z.string().regex(/^pm_[a-zA-Z0-9]+$/, 'Invalid payment method ID'),
  userAgent: z.string().max(1000).optional().default('')
})

// Sanitize string input
function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .substring(0, 2000)
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeSecretKey) {
      console.error('STRIPE_SECRET_KEY not configured')
      return new Response(
        JSON.stringify({ success: false, error: 'Payment processing not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    })

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse and validate input
    let rawBody: unknown
    try {
      rawBody = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const validationResult = BotPaymentSchema.safeParse(rawBody)
    if (!validationResult.success) {
      console.error('Validation error:', validationResult.error.errors)
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid request parameters', details: validationResult.error.errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { siteId, page, amount, paymentMethodId, userAgent } = validationResult.data

    // Sanitize string inputs
    const sanitizedPage = sanitizeString(page)
    const sanitizedUserAgent = sanitizeString(userAgent)

    // Get site information
    const { data: site, error: siteError } = await supabaseClient
      .from('sites')
      .select('id, customer_id, name, config')
      .eq('site_id', siteId)
      .single()

    if (siteError || !site) {
      return new Response(
        JSON.stringify({ success: false, error: 'Site not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate amount matches site's configured bot payment amount
    const configuredAmount = site.config?.botPaymentAmount || 0.50

    // Amount must match the configured price (bots can't choose their own price)
    if (Math.abs(amount - configuredAmount) > 0.01) {
      return new Response(
        JSON.stringify({ success: false, error: `Payment amount must be $${configuredAmount.toFixed(2)}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get client IP
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] ||
                     req.headers.get('x-real-ip') ||
                     'unknown'

    // Get payment method details to check type
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId)

    // Create payment intent - ACH vs card handling
    const paymentIntentParams: any = {
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      payment_method: paymentMethodId,
      metadata: {
        site_id: siteId,
        page: sanitizedPage,
        bot_ip: clientIp,
        user_agent: sanitizedUserAgent.substring(0, 500), // Stripe metadata limit
      },
      description: `Bot access to ${sanitizedPage} on ${site.name}`,
    }

    // Handle ACH (us_bank_account) vs card differently
    if (paymentMethod.type === 'us_bank_account') {
      // ACH payments: Allow redirects for verification, will be async
      paymentIntentParams.confirm = true
      paymentIntentParams.payment_method_types = ['us_bank_account']
      paymentIntentParams.mandate_data = {
        customer_acceptance: {
          type: 'online',
          online: {
            ip_address: clientIp,
            user_agent: sanitizedUserAgent
          }
        }
      }
      console.log('Processing ACH payment for bot access - payment will be async (3-5 days)')
    } else {
      // Card payments: Instant confirmation, no redirects
      paymentIntentParams.confirm = true
      paymentIntentParams.automatic_payment_methods = {
        enabled: true,
        allow_redirects: 'never'
      }
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams)

    // For ACH, payment will be 'processing' - we grant access immediately and charge settles in 3-5 days
    // For cards, payment will be 'succeeded' immediately
    const validStatuses = ['succeeded', 'processing', 'requires_action']
    if (!validStatuses.includes(paymentIntent.status)) {
      console.error('Payment failed with status:', paymentIntent.status)
      return new Response(
        JSON.stringify({ success: false, error: 'Payment failed', status: paymentIntent.status }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Log payment type for monitoring
    if (paymentIntent.status === 'processing') {
      console.log('ACH payment initiated - access granted, charge will settle in 3-5 business days')
    }

    // Determine bot type from user agent
    let botType = 'unknown'
    const ua = sanitizedUserAgent.toLowerCase()
    if (ua.includes('gptbot')) botType = 'GPTBot'
    else if (ua.includes('claude')) botType = 'ClaudeBot'
    else if (ua.includes('ccbot')) botType = 'CCBot'
    else if (ua.includes('bingbot')) botType = 'BingBot'
    else if (ua.includes('googlebot')) botType = 'GoogleBot'

    // Record the charge in database (if bot_charges table exists)
    try {
      await supabaseClient
        .from('bot_charges')
        .insert({
          site_id: site.id,
          customer_id: site.customer_id,
          bot_ip: clientIp,
          bot_user_agent: sanitizedUserAgent,
          bot_type: botType,
          amount,
          currency: 'USD',
          stripe_payment_intent_id: paymentIntent.id,
          stripe_charge_id: paymentIntent.latest_charge as string,
          page_accessed: sanitizedPage,
          access_granted: true,
        })
    } catch (chargeError) {
      // Table might not exist, log and continue
      console.warn('Could not record to bot_charges:', chargeError)
    }

    // Log the access
    await supabaseClient.from('request_logs').insert({
      site_id: site.id,
      customer_id: site.customer_id,
      ip: clientIp,
      user_agent: sanitizedUserAgent,
      page: sanitizedPage,
      type: 'bot',
      status: 'allowed_paid',
      decision_reason: `Bot paid $${amount.toFixed(2)} for access`,
      risk_score: 1.0, // Bot but paid
    })

    console.log('Bot payment processed:', {
      paymentIntentId: paymentIntent.id,
      amount,
      siteId,
      botType
    })

    return new Response(
      JSON.stringify({
        success: true,
        paymentIntentId: paymentIntent.id,
        message: 'Payment successful. Access granted.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: unknown) {
    console.error('Payment processing error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Payment processing failed'
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})