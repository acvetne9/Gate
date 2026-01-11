// Edge Function: create-checkout-session
// Creates a Stripe Checkout session for subscription purchase

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'
import { stripe, getOrCreateStripeCustomer, corsHeaders, supabaseAdmin } from '../_shared/stripe.ts'

// Input validation schema
const CheckoutSchema = z.object({
  priceId: z.string().regex(/^price_[a-zA-Z0-9]+$/, 'Invalid price ID format'),
  customerId: z.string().uuid('Invalid customer ID format'),
  successUrl: z.string().url().max(2000).optional(),
  cancelUrl: z.string().url().max(2000).optional()
})

// Validate URL is on allowed domains
function isAllowedRedirectUrl(url: string | undefined, frontendUrl: string): boolean {
  if (!url) return true // Will use default
  try {
    const parsed = new URL(url)
    const frontend = new URL(frontendUrl)
    // Allow same origin or localhost for development
    return parsed.origin === frontend.origin || 
           parsed.hostname === 'localhost' || 
           parsed.hostname === '127.0.0.1'
  } catch {
    return false
  }
}

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

    // Parse and validate request body
    let rawBody: unknown
    try {
      rawBody = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const validationResult = CheckoutSchema.safeParse(rawBody)
    if (!validationResult.success) {
      console.error('Validation error:', validationResult.error.errors)
      return new Response(
        JSON.stringify({ error: 'Invalid request parameters', details: validationResult.error.errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { priceId, customerId, successUrl, cancelUrl } = validationResult.data
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:5173'

    // Validate redirect URLs are on allowed domains
    if (!isAllowedRedirectUrl(successUrl, frontendUrl)) {
      return new Response(
        JSON.stringify({ error: 'Invalid success URL domain' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    if (!isAllowedRedirectUrl(cancelUrl, frontendUrl)) {
      return new Response(
        JSON.stringify({ error: 'Invalid cancel URL domain' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user email from Supabase auth
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

    // Create Checkout session with ACH bank account payments
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['us_bank_account'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      payment_method_options: {
        us_bank_account: {
          financial_connections: {
            permissions: ['payment_method', 'balances'],
          },
          verification_method: 'instant', // Use Stripe Financial Connections for instant verification
        },
      },
      success_url: successUrl || `${frontendUrl}/billing?success=true`,
      cancel_url: cancelUrl || `${frontendUrl}/billing?canceled=true`,
      allow_promotion_codes: true,
      customer_update: {
        address: 'auto',
      },
      metadata: {
        supabase_user_id: customerId,
      },
    })

    console.log('Checkout session created:', session.id)

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
    console.error('Error creating checkout session:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to create checkout session'
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