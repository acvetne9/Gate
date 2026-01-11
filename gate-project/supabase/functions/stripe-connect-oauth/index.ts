// Stripe Connect OAuth Handler
// Handles the OAuth callback from Stripe Connect and stores the connected account

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { stripe, supabaseAdmin, corsHeaders } from '../_shared/stripe.ts'

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { code, userId } = await req.json()

    if (!code || !userId) {
      throw new Error('Missing required parameters: code or userId')
    }

    console.log('Processing Stripe Connect OAuth for user:', userId)

    // Exchange authorization code for access token and connected account ID
    const response = await stripe.oauth.token({
      grant_type: 'authorization_code',
      code,
    })

    const stripeAccountId = response.stripe_user_id

    if (!stripeAccountId) {
      throw new Error('Failed to get Stripe account ID from OAuth response')
    }

    console.log('Received Stripe account ID:', stripeAccountId)

    // Check if this Stripe account is already connected to a different user
    const { data: existingConnection } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email')
      .eq('stripe_account_id', stripeAccountId)
      .neq('id', userId)
      .single()

    if (existingConnection) {
      throw new Error('This Stripe account is already connected to another user. Please use a different Stripe account.')
    }

    // Store the connected account ID in the user_profiles table
    // If already connected to this user, this will just update the stripe_connected flag
    const { error: updateError } = await supabaseAdmin
      .from('user_profiles')
      .update({
        stripe_account_id: stripeAccountId,
        stripe_connected: true,
      })
      .eq('id', userId)

    if (updateError) {
      throw updateError
    }

    console.log('Successfully connected Stripe account to user')

    return new Response(
      JSON.stringify({
        success: true,
        stripe_account_id: stripeAccountId,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('Stripe Connect OAuth error:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to connect Stripe account',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
