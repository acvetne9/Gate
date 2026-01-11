#!/bin/bash

# Setup Stripe Secrets for Supabase Edge Functions
# This script sets the required Stripe secrets for OAuth and payments

echo "🔐 Setting up Stripe secrets for Supabase Edge Functions..."
echo ""
echo "You need your Stripe SECRET KEY (starts with sk_live_ or sk_test_)"
echo "Get it from: https://dashboard.stripe.com/apikeys"
echo ""
read -p "Enter your Stripe Secret Key: " STRIPE_SECRET_KEY

if [ -z "$STRIPE_SECRET_KEY" ]; then
  echo "❌ Error: Stripe Secret Key cannot be empty"
  exit 1
fi

echo ""
echo "Setting secrets..."

# Set Stripe secret key
npx supabase secrets set STRIPE_SECRET_KEY="$STRIPE_SECRET_KEY"

echo ""
echo "✅ Stripe secrets configured!"
echo ""
echo "Next steps:"
echo "1. Deploy your edge functions: npx supabase functions deploy stripe-connect-oauth"
echo "2. Test the Stripe Connect flow in your app"
