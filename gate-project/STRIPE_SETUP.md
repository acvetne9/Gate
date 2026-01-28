# Stripe Integration Setup Guide

Complete guide to setting up Stripe payments for GateProtect.

## Prerequisites

- Stripe account (create at stripe.com)
- Supabase project setup
- Supabase CLI installed: `npm install -g supabase`

---

## 1. Stripe Configuration

### Get API Keys
1. Log into https://dashboard.stripe.com
2. Navigate to **Developers > API keys**
3. Copy your **Publishable key** (pk_test_...)
4. Copy your **Secret key** (sk_test_...)

### Create Products
1. Navigate to **Products** and click **+ Add product**

**Keeper Plan:**
- Name: "Keeper Plan"
- Description: "5 websites, 50,000 requests/month, collect payments from bots"
- Price: $29.00/month
- Copy the **Price ID** (price_...)

**MAX Plan:**
- Name: "MAX Plan"
- Description: "Unlimited websites, 1M+ requests/month, collect payments from bots"
- Price: $99.00/month
- Copy the **Price ID** (price_...)

---

## 2. Configure Application

Edit `src/config/stripe.ts` with your keys:

```typescript
export const stripeConfig = {
  publishableKey: 'pk_test_your_actual_key',
  prices: {
    keeper: 'price_your_keeper_price_id',
    max: 'price_your_max_price_id'
  },
  connectClientId: 'ca_your_connect_client_id' // Optional
}
```

---

## 3. Supabase Setup

### Link Project
```bash
supabase login
supabase link --project-ref your-project-ref
```

### Set Secrets
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_your_secret_key
```

### Run Migrations
```bash
supabase db push
```

### Deploy Edge Functions
```bash
supabase functions deploy create-checkout-session
supabase functions deploy create-portal-session
supabase functions deploy get-subscription-status
supabase functions deploy stripe-webhooks
supabase functions deploy check-plan-limits
```

---

## 4. Webhook Setup

### Get Webhook URL
Your URL: `https://[your-project-ref].supabase.co/functions/v1/stripe-webhooks`

### Configure in Stripe
1. Go to **Developers > Webhooks**
2. Click **+ Add endpoint**
3. Enter your webhook URL
4. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `payment_method.attached`
5. Save and copy the **Signing secret** (whsec_...)

### Add Webhook Secret
```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

---

## 5. Testing

### Start Development Server
```bash
npm run dev
```

### Test Flow
1. **Signup**: Create test account at http://localhost:5173
2. **View Pricing**: Navigate to /pricing
3. **Subscribe**: Click "Upgrade to Keeper"
4. **Checkout**: Use test card `4242 4242 4242 4242`
   - Expiry: Any future date (12/34)
   - CVC: Any 3 digits (123)
5. **Verify**: Check /billing page for subscription details

### Verify
- ✅ Current plan shows "Keeper"
- ✅ Payment method displays
- ✅ Invoice appears in history
- ✅ "Manage in Stripe" button works

---

## 6. Production Deployment

### Switch to Live Mode
1. In Stripe Dashboard, toggle to "Live mode"
2. Get live API keys (pk_live_..., sk_live_...)
3. Create production products and get price IDs

### Update Configuration
```typescript
// src/config/stripe.ts
export const stripeConfig = {
  publishableKey: 'pk_live_your_live_key',
  prices: {
    keeper: 'price_live_keeper_id',
    max: 'price_live_max_id'
  },
  connectClientId: 'ca_live_connect_id'
}
```

### Update Supabase Secrets
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_... --project-ref your-project-ref
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_live_... --project-ref your-project-ref
```

### Create Production Webhook
1. Add endpoint with your production URL
2. Select same events as test mode
3. Update webhook secret in Supabase

---

## Troubleshooting

### Checkout Not Working
- Verify price IDs in `src/config/stripe.ts`
- Check browser console for errors
- Confirm edge functions are deployed: `supabase functions list`

### Webhook Failures
- Verify webhook secret is set: `supabase secrets list`
- Check webhook signature in Stripe Dashboard > Webhooks > Events
- View function logs: `supabase functions logs stripe-webhooks`

### Subscription Not Updating
- Check webhook events in Stripe Dashboard
- Verify RLS policies allow user data access
- Check database migrations ran successfully

---

## Quick Reference

```bash
# View secrets
supabase secrets list

# Redeploy function
supabase functions deploy stripe-webhooks

# View logs
supabase functions logs stripe-webhooks

# Check database
supabase db pull
```

---

## Plan Limits

- **Free**: 1 site, 1,000 requests/month
- **Keeper**: 5 sites, 50,000 requests/month, bot payments
- **MAX**: Unlimited sites, 1M+ requests/month, bot payments

---

## Support

Questions? Contact support@gateprotect.com
