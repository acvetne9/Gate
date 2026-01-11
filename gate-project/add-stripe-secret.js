// Script to add stripe_secret_key to app_settings table
// Run this with: node add-stripe-secret.js

const { createClient } = require('@supabase/supabase-js')

// Use service role key for admin operations
const supabase = createClient(
  'https://bakzzkadgmyvvvnpuvki.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY_HERE'
)

async function addStripeSecret() {
  console.log('Adding stripe_secret_key to app_settings...')

  // Check if it already exists
  const { data: existing } = await supabase
    .from('app_settings')
    .select('*')
    .eq('key', 'stripe_secret_key')
    .single()

  if (existing) {
    console.log('✅ stripe_secret_key already exists')
    return
  }

  // Insert the new setting
  const { data, error } = await supabase
    .from('app_settings')
    .insert({
      key: 'stripe_secret_key',
      value: 'sk_test_your_stripe_secret_key_here',
      description: 'Stripe secret key for API authentication (SENSITIVE - Never expose publicly)',
      is_sensitive: true,
      category: 'stripe'
    })
    .select()

  if (error) {
    console.error('❌ Error:', error)
  } else {
    console.log('✅ Successfully added stripe_secret_key!')
    console.log('⚠️  Go to Settings Management page and update it with your real Stripe secret key')
  }
}

addStripeSecret()
