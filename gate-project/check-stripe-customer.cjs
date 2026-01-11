require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseServiceKey);

(async () => {
  console.log('\n=== Checking Stripe Customer IDs ===\n');

  // Get all user profiles with their Stripe customer IDs
  const { data: profiles, error: profilesError } = await supabase
    .from('user_profiles')
    .select('id, email, stripe_customer_id, name');

  if (profilesError) {
    console.error('Error fetching profiles:', profilesError);
  }

  console.log('Total profiles found:', profiles?.length || 0);
  console.log('');

  if (profiles && profiles.length > 0) {
    profiles.forEach(profile => {
      console.log('User:', profile.name || profile.email);
      console.log('  Supabase ID:', profile.id);
      console.log('  Stripe Customer ID:', profile.stripe_customer_id || 'NOT SET');
      console.log('');
    });
  } else {
    console.log('No user profiles found (or stripe_customer_id column does not exist).');
    console.log('');
  }

  // Check subscriptions table for Stripe customer IDs
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('customer_id, stripe_customer_id');

  if (subscriptions && subscriptions.length > 0) {
    console.log('Stripe Customer IDs from subscriptions table:');
    subscriptions.forEach(sub => {
      console.log('  User ID:', sub.customer_id, '-> Stripe Customer:', sub.stripe_customer_id);
    });
  } else {
    console.log('No subscriptions found in database.');
  }

  console.log('\n====================================\n');
})();
