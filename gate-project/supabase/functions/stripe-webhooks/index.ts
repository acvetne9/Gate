// Edge Function: stripe-webhooks
// CRITICAL: Handles all Stripe webhook events to keep database in sync

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.10.0?target=deno'
import {
  stripe,
  corsHeaders,
  syncSubscriptionToDatabase,
  syncInvoiceToDatabase,
  syncPaymentMethodToDatabase,
  deleteSubscriptionFromDatabase,
} from '../_shared/stripe.ts'

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get Stripe signature from headers
    const signature = req.headers.get('stripe-signature')
    if (!signature) {
      console.error('Missing Stripe signature header')
      return new Response(
        JSON.stringify({ error: 'Missing Stripe signature' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get webhook secret
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
    if (!webhookSecret) {
      console.error('Missing STRIPE_WEBHOOK_SECRET environment variable')
      return new Response(
        JSON.stringify({ error: 'Webhook secret not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get raw body for signature verification
    const body = await req.text()

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        webhookSecret
      )
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : 'Unknown error'
      console.error('Webhook signature verification failed:', errMessage)
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Processing webhook event: ${event.type}`)

    // Handle different event types
    switch (event.type) {
      // Subscription events
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await syncSubscriptionToDatabase(event.data.object as Stripe.Subscription)
        console.log(`Synced subscription: ${event.data.object.id}`)
        break

      case 'customer.subscription.deleted':
        await deleteSubscriptionFromDatabase(event.data.object.id)
        console.log(`Deleted subscription: ${event.data.object.id}`)
        break

      // Invoice events
      case 'invoice.paid':
      case 'invoice.payment_succeeded':
        await syncInvoiceToDatabase(event.data.object as Stripe.Invoice)
        console.log(`Synced paid invoice: ${event.data.object.id}`)
        break

      case 'invoice.payment_failed':
        await syncInvoiceToDatabase(event.data.object as Stripe.Invoice)
        console.log(`Synced failed invoice: ${event.data.object.id}`)
        // TODO: Send email notification to user about payment failure
        break

      case 'invoice.created':
      case 'invoice.finalized':
      case 'invoice.updated':
        await syncInvoiceToDatabase(event.data.object as Stripe.Invoice)
        console.log(`Synced invoice: ${event.data.object.id}`)
        break

      // Payment method events
      case 'payment_method.attached':
        const paymentMethod = event.data.object as Stripe.PaymentMethod
        if (paymentMethod.customer) {
          // Check if this is the default payment method
          const customer = await stripe.customers.retrieve(paymentMethod.customer as string)
          const isDefault =
            typeof customer !== 'string' &&
            !customer.deleted &&
            customer.invoice_settings?.default_payment_method === paymentMethod.id

          await syncPaymentMethodToDatabase(
            paymentMethod,
            paymentMethod.customer as string,
            isDefault
          )
          console.log(`Synced payment method: ${paymentMethod.id}`)
        }
        break

      case 'customer.updated':
        // Handle default payment method changes
        const updatedCustomer = event.data.object as Stripe.Customer
        if (updatedCustomer.invoice_settings?.default_payment_method) {
          const defaultPM = await stripe.paymentMethods.retrieve(
            updatedCustomer.invoice_settings.default_payment_method as string
          )
          await syncPaymentMethodToDatabase(defaultPM, updatedCustomer.id, true)
          console.log(`Updated default payment method for customer: ${updatedCustomer.id}`)
        }
        break

      // Checkout session events
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session
        console.log(`Checkout session completed: ${session.id}`)
        // Subscription is handled by subscription.created event
        break

      case 'checkout.session.async_payment_succeeded':
        console.log(`Async payment succeeded for session: ${event.data.object.id}`)
        // ACH payments complete asynchronously (3-5 business days)
        break

      case 'checkout.session.async_payment_failed':
        console.log(`Async payment failed for session: ${event.data.object.id}`)
        // ACH payment failed - notify user
        break

      // ACH-specific events
      case 'charge.pending':
        const pendingCharge = event.data.object as Stripe.Charge
        console.log(`ACH charge pending: ${pendingCharge.id} - waiting for bank confirmation`)
        // ACH payments start as "pending" and take 3-5 days to confirm
        break

      case 'charge.succeeded':
        const successCharge = event.data.object as Stripe.Charge
        console.log(`Charge succeeded: ${successCharge.id}`)
        // ACH payment confirmed by bank
        break

      case 'charge.failed':
        const failedCharge = event.data.object as Stripe.Charge
        console.log(`Charge failed: ${failedCharge.id} - reason: ${failedCharge.failure_message}`)
        // ACH payment rejected by bank (insufficient funds, etc.)
        break

      case 'payment_intent.payment_failed':
        const failedPaymentIntent = event.data.object as Stripe.PaymentIntent
        console.log(`Payment intent failed: ${failedPaymentIntent.id}`)
        // Handle payment failures for ACH
        break

      case 'checkout.session.async_payment_failed':
        console.log(`Async payment failed for session: ${event.data.object.id}`)
        // TODO: Notify user about payment failure
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    // Return success response
    return new Response(
      JSON.stringify({ received: true, event: event.type }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error: unknown) {
    console.error('Error processing webhook:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to process webhook'
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
