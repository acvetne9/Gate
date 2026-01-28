# Bot Payments Setup Guide

Complete guide to setting up bot payment collection with revenue sharing.

## Overview

GateProtect allows you to charge bots when they access your protected content:

- **Keeper Plan**: $0.50 per bot access (50/50 split - you keep $0.25, user keeps $0.25)
- **MAX Plan**: Variable amount set by user (90/10 split - user keeps 90%, you keep 10%)

This uses **Stripe Connect** for payment processing and automatic revenue splitting.

---

## 1. Create Stripe Connect Application

### Step 1: Enable Stripe Connect
1. Log into https://dashboard.stripe.com
2. Navigate to **Connect > Get started**
3. Click **Build a platform or marketplace**

### Step 2: Configure Application Settings
1. Go to **Connect > Settings**
2. Under **Branding**:
   - Platform name: "GateProtect"
   - Icon: Upload your logo
   - Color: #16a34a (green)
3. Under **Integration**:
   - Account types: **Standard accounts** (recommended)
   - Redirect URIs: Add your callback URL
     - Development: `http://localhost:5173/stripe/connect/callback`
     - Production: `https://yourdomain.com/stripe/connect/callback`

### Step 3: Get Client ID
1. Go to **Connect > Settings**
2. Copy your **Client ID** (starts with `ca_`)
3. Update `src/config/stripe.ts`:

```typescript
stripe: {
  connectClientId: 'ca_YOUR_ACTUAL_CLIENT_ID'
}
```

---

## 2. Update Database

Run the migration to add bot payment settings:

```bash
supabase db push
```

This adds these columns to `user_profiles`:
- `stripe_account_id` - Connected Stripe account
- `stripe_connected` - Connection status
- `bot_payment_enabled` - Whether to charge bots
- `bot_payment_amount` - Custom amount for MAX plan (in cents)

---

## 3. Deploy Edge Function

Deploy the bot payment charging function:

```bash
supabase functions deploy charge-bot-payment
```

This function:
- Validates user has Stripe connected
- Calculates charge based on plan tier
- Creates Payment Intent with revenue split
- Logs the charge attempt

---

## 4. How It Works

### For Keeper Plan Users

1. User connects their Stripe account via Billing page
2. When a bot accesses their protected page:
   - Bot is charged $0.50
   - $0.25 goes to you (platform)
   - $0.25 goes to the user
3. Payment is processed via Stripe Connect

### For MAX Plan Users

1. User connects Stripe account
2. User sets custom bot charge amount in their settings (e.g., $2.00)
3. When a bot accesses their page:
   - Bot is charged $2.00
   - $0.20 goes to you (10% platform fee)
   - $1.80 goes to the user (90%)
4. Payment is processed automatically

---

## 5. User Flow

### User Setup (One-time)

1. User upgrades to Keeper or MAX plan
2. User goes to Billing page
3. User clicks **"Connect Stripe Account"**
4. User is redirected to Stripe OAuth
5. User authorizes the connection
6. User is redirected back with connected account
7. Bot payments are now enabled

### Bot Payment Flow

1. Bot visits protected page with widget
2. Widget detects bot (via fingerprinting)
3. Widget calls `charge-bot-payment` edge function
4. Payment Intent is created with Stripe Connect
5. Bot is shown payment page (Stripe Checkout)
6. Bot completes payment (or bounces)
7. If paid: Bot gets access, revenue is split
8. Payment details logged in `bot_charges` table

---

## 6. Revenue Split Configuration

Current setup in `charge-bot-payment/index.ts`:

```typescript
if (tier === 'keeper') {
  chargeAmount = 50        // 50 cents
  applicationFeeAmount = 25 // You get 25 cents (50%)
} else if (tier === 'max') {
  chargeAmount = profile.bot_payment_amount || 100 // Default $1.00
  applicationFeeAmount = Math.floor(chargeAmount * 0.1) // You get 10%
}
```

### To Change Revenue Splits

Edit `supabase/functions/charge-bot-payment/index.ts`:

**Example: 70/30 split for Keeper**
```typescript
if (tier === 'keeper') {
  chargeAmount = 50
  applicationFeeAmount = 35 // Platform gets 70%
}
```

**Example: 5% platform fee for MAX**
```typescript
else if (tier === 'max') {
  applicationFeeAmount = Math.floor(chargeAmount * 0.05) // 5% fee
}
```

Then redeploy:
```bash
supabase functions deploy charge-bot-payment
```

---

## 7. Testing Bot Payments

### Test Mode Setup

1. Use Stripe test mode keys
2. Connect a test Stripe account
3. Use test cards for bot payments:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`

### Test Flow

```bash
# 1. Start dev server
npm run dev

# 2. Create test user and upgrade to Keeper
# 3. Connect test Stripe account
# 4. Trigger bot detection on protected page
# 5. Verify payment intent created
# 6. Check Stripe Dashboard > Payments for charge
# 7. Verify platform fee appears in your balance
```

---

## 8. Monitoring & Analytics

### View Bot Charges

Query the `bot_charges` table:

```sql
SELECT
  bc.*,
  up.email,
  s.name as site_name
FROM bot_charges bc
JOIN user_profiles up ON bc.customer_id = up.id
JOIN sites s ON bc.site_id = s.id
WHERE bc.status = 'succeeded'
ORDER BY bc.created_at DESC;
```

### Track Revenue

**Your platform revenue:**
```sql
SELECT
  DATE(created_at) as date,
  COUNT(*) as charges,
  SUM(platform_fee) / 100.0 as platform_revenue
FROM bot_charges
WHERE status = 'succeeded'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

**User revenue:**
```sql
SELECT
  customer_id,
  COUNT(*) as charges,
  SUM(amount - platform_fee) / 100.0 as user_revenue
FROM bot_charges
WHERE status = 'succeeded'
GROUP BY customer_id
ORDER BY user_revenue DESC;
```

---

## 9. Production Checklist

- [ ] Stripe Connect configured in live mode
- [ ] `connectClientId` updated in config with live client ID
- [ ] Edge function deployed to production
- [ ] Database migration run on production
- [ ] Test end-to-end with live Stripe account
- [ ] Monitor first few charges closely
- [ ] Set up alerts for failed charges

---

## 10. Troubleshooting

### "Stripe Connect not configured"
- Check `src/config/stripe.ts` has correct `connectClientId`
- Verify it starts with `ca_`

### "Payment collection not configured"
- User needs to connect their Stripe account first
- Check `user_profiles.stripe_connected = true`

### Revenue split incorrect
- Check `applicationFeeAmount` calculation in edge function
- Verify Stripe Connect settings allow application fees

### Charges failing
- View logs: `supabase functions logs charge-bot-payment`
- Check Stripe Dashboard > Connect > Charges
- Verify connected account has charges enabled

---

## Summary

1. **Setup Stripe Connect** - Get client ID
2. **Update config** - Add client ID to `src/config/stripe.ts`
3. **Deploy function** - `supabase functions deploy charge-bot-payment`
4. **Users connect** - Via Billing page "Connect Stripe Account" button
5. **Bots pay** - Automatic charges when bots detected
6. **Revenue splits** - Automatic via Stripe Connect

Your platform earns:
- **50%** of Keeper bot payments ($0.25 per bot)
- **10%** of MAX bot payments (varies by user setting)

All automated, no manual intervention required! 🎉
