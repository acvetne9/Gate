// Edge Function: create-bank-setup-session
// Creates a Stripe Checkout session specifically for adding US bank accounts (ACH)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { stripe, getOrCreateStripeCustomer, corsHeaders, supabaseAdmin } from '../_shared/stripe.ts'

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
    const { customerId, returnUrl } = await req.json()

    if (!customerId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameter: customerId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user email from Supabase
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('email')
      .eq('id', customerId)
      .single()

    if (!profile) {
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get or create Stripe customer
    const stripeCustomerId = await getOrCreateStripeCustomer(customerId, profile.email)

    // Create Checkout session with payment_method_collection and explicit ACH configuration
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'setup',
      payment_method_types: ['us_bank_account'],
      payment_method_options: {
        us_bank_account: {
          financial_connections: {
            permissions: ['payment_method', 'balances'],
          },
        },
      },
      success_url: returnUrl || `${Deno.env.get('FRONTEND_URL')}/billing?setup=success`,
      cancel_url: returnUrl || `${Deno.env.get('FRONTEND_URL')}/billing?setup=cancelled`,
    })

    return new Response(
      JSON.stringify({
        sessionId: session.id,
        url: session.url,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error: unknown) {
    console.error('Error creating bank setup session:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to create bank setup session'
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
