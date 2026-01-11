// Application Configuration
// Replace these with your actual keys and IDs
// NOTE: For platforms that don't support environment variables,
// update these values directly

export const appConfig = {
  // Supabase Configuration
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL || 'https://bakzzkadgmyvvvnpuvki.supabase.co',
    anonKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJha3p6a2FkZ215dnZ2bnB1dmtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MTczMjksImV4cCI6MjA4MTk5MzMyOX0._tdT8u-ApjOACB1KVWg3honn-egJKfqTZWSKCW2goCk'
  },

  // Stripe Configuration
  stripe: {
    // Stripe Publishable Key (safe to expose in frontend)
    publishableKey: 'pk_live_51SkzH9QzIlRI55yLTxHWq9F7lACX4vvzVV66uGeyJjAsWB3fVV6h71DpezjIgrcD7Hi0Wb7UY5wWp4trvrLjbgmC00vK933Njj',

    // Price IDs for subscription plans (monthly billing)
    prices: {
      keeper: 'prod_TiQr8gEqB8Q6Km',
      max: 'prod_TiQsIG6aaOSikC'
    },

    // Stripe Connect (for bot payments)
    connectClientId: 'ca_your_stripe_connect_client_id'
  }
}

// Export individual configs for convenience
export const stripeConfig = appConfig.stripe
export const supabaseConfig = appConfig.supabase

// Plan metadata for display
export const planLimits = {
  keeper: {
    sites: 999,
    requests: 10000000,
    features: [
      'Protect unlimited websites',
      'Full bot detection & blocking',
      'Bot payments at $1.00/request',
      '50/50 revenue split with Gate',
    ]
  },
  max: {
    sites: 9999,
    requests: 10000000,
    features: [
      'Everything in Keeper, plus:',
      'Set any bot payment price',
      '90/10 revenue split (you keep 90%)',
      'Premium support',
    ]
  }
}
