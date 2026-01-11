const Stripe = require('stripe');

// Your Stripe secret key
const STRIPE_SECRET_KEY = 'your_stripe_secret_key_here'; // Replace with your key
const CORRECT_CUSTOMER_ID = 'cus_TleosoBpqgIcnQ';
const YOUR_EMAIL = 'your-email@example.com'; // Replace with your email

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

(async () => {
  console.log('\n=== Cleaning Up Duplicate Stripe Customers ===\n');

  try {
    // List all customers with your email
    const customers = await stripe.customers.list({
      email: YOUR_EMAIL,
      limit: 100,
    });

    console.log(`Found ${customers.data.length} customers with email: ${YOUR_EMAIL}\n`);

    for (const customer of customers.data) {
      if (customer.id === CORRECT_CUSTOMER_ID) {
        console.log(`✓ Keeping: ${customer.id} (This is the correct one with bank account)`);

        // List payment methods on this customer to verify
        const paymentMethods = await stripe.paymentMethods.list({
          customer: customer.id,
          limit: 10,
        });

        console.log(`  Payment methods: ${paymentMethods.data.length}`);
        paymentMethods.data.forEach(pm => {
          if (pm.type === 'us_bank_account') {
            console.log(`    - Bank: ${pm.us_bank_account?.bank_name} ****${pm.us_bank_account?.last4}`);
          } else if (pm.type === 'card') {
            console.log(`    - Card: ${pm.card?.brand} ****${pm.card?.last4}`);
          }
        });
      } else {
        console.log(`✗ Deleting: ${customer.id}`);

        // Check if customer has any subscriptions
        const subscriptions = await stripe.subscriptions.list({
          customer: customer.id,
          limit: 1,
        });

        if (subscriptions.data.length > 0) {
          console.log(`  WARNING: Customer has ${subscriptions.data.length} subscription(s). Skipping deletion.`);
        } else {
          // Delete the customer
          await stripe.customers.del(customer.id);
          console.log(`  Deleted successfully`);
        }
      }
      console.log('');
    }

    console.log('Cleanup complete!\n');
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
