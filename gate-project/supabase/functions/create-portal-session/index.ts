// Edge Function: create-portal-session
// Creates a Stripe Customer Portal session for self-service billing management

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

    // Create Customer Portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl || `${Deno.env.get('FRONTEND_URL')}/billing`,
    })

    return new Response(
      JSON.stringify({
        sessionId: session.id,
        url: session.url, // Frontend expects 'url' not 'portalUrl'
        portalUrl: session.url, // Keep for backwards compatibility
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error: unknown) {
    console.error('Error creating portal session:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to create portal session'
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
