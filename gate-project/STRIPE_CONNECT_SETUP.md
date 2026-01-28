# Stripe Connect Setup Guide

This guide explains how to set up Stripe Connect for the Gate platform, allowing sites to connect their own Stripe accounts to receive bot payments directly.

## Prerequisites

1. A Stripe account (sign up at https://stripe.com)
2. Access to your Stripe Dashboard
3. Access to your Supabase project

## Step 1: Enable Stripe Connect

1. Log in to your Stripe Dashboard (https://dashboard.stripe.com)
2. Navigate to **Connect** → **Settings**
3. Click **Get Started** if Connect is not enabled
4. Choose **Platform or Marketplace** as your integration type
5. Fill in your platform details:
   - Platform name: "Gate"
   - Platform description: "Bot protection and monetization platform"
   - Website: Your Gate platform URL

## Step 2: Configure OAuth Settings

1. In the Stripe Dashboard, go to **Connect** → **Settings**
2. Scroll down to **Integration**
3. Add your OAuth redirect URI:
   - Development: `http://localhost:5173/stripe/connect/callback`
   - Production: `https://your-domain.com/stripe/connect/callback`
4. Click **Save**

## Step 3: Get Your Stripe Connect Client ID

1. In the Stripe Dashboard, go to **Developers** → **API Keys**
2. Look for the **Connect** section
3. Copy your **Client ID** (starts with `ca_`)
4. Note: Use test mode client ID for development, live mode for production

## Step 4: Configure Environment Variables

### Frontend (.env.local)

Add to your `.env.local` file:

```bash
# Stripe Connect Client ID (from Step 3)
VITE_STRIPE_CONNECT_CLIENT_ID=ca_...

# Your app URL (for OAuth redirects)
VITE_APP_URL=http://localhost:5173

# Other Stripe keys (if not already set)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Backend (Supabase Secrets)

Set your Stripe secret key in Supabase:

```bash
# Using Supabase CLI
supabase secrets set STRIPE_SECRET_KEY=sk_test_...

# Or in Supabase Dashboard:
# Project Settings → Edge Functions → Secrets
```

## Step 5: Deploy Edge Function

Deploy the Stripe Connect OAuth handler:

```bash
supabase functions deploy stripe-connect-oauth
```

## Step 6: Test the Flow

1. Log in to your Gate dashboard
2. Create or select a site
3. Click **Configure** → **Payments (Stripe)** tab
4. Click **Connect Stripe Account**
5. You should be redirected to Stripe's OAuth page
6. Authorize the connection
7. You should be redirected back with a success message

## How It Works

### OAuth Flow

1. **User clicks "Connect Stripe Account"**
   - Frontend redirects to: `https://connect.stripe.com/oauth/authorize`
   - Parameters: `client_id`, `state` (site ID), `redirect_uri`

2. **User authorizes on Stripe**
   - Stripe redirects to: `https://your-app.com/stripe/connect/callback?code=ac_...&state=site_123`

3. **Callback handler processes authorization**
   - Frontend calls: `stripe-connect-oauth` edge function
   - Edge function exchanges code for access token
   - Stripe account ID is stored in `sites` table

4. **Connection complete**
   - User is redirected to dashboard
   - Site now shows "Stripe Connected"

### Database Schema

The `sites` table stores:
- `stripe_account_id`: The connected Stripe account ID (e.g., `acct_abc123`)
- `stripe_connected`: Boolean flag indicating connection status

### Security

- OAuth state parameter prevents CSRF attacks
- Authorization code can only be used once
- Site ownership is verified before saving connection
- Only the site owner can connect/disconnect Stripe

## Troubleshooting

### "Stripe Connect is not configured"
- Check that `VITE_STRIPE_CONNECT_CLIENT_ID` is set in `.env.local`
- Restart your development server after adding the variable

### "Invalid redirect_uri"
- Verify the redirect URI is added in Stripe Dashboard → Connect → Settings
- Ensure the URI exactly matches (including http/https)

### "Failed to connect Stripe account"
- Check browser console for detailed error messages
- Verify Supabase Edge Function is deployed: `supabase functions list`
- Check Edge Function logs: `supabase functions logs stripe-connect-oauth`

### OAuth callback shows error
- Check that user is logged in
- Verify the site ID in the `state` parameter is valid
- Check Supabase Edge Function secrets are set

## Testing with Stripe Test Mode

1. Use your **test mode** client ID (starts with `ca_test_`)
2. Use **test mode** secret key (starts with `sk_test_`)
3. When authorizing, use a test Stripe account
4. Test accounts are separate from live accounts

## Production Deployment

Before going live:

1. ✅ Switch to **live mode** in Stripe Dashboard
2. ✅ Update `VITE_STRIPE_CONNECT_CLIENT_ID` with live client ID
3. ✅ Update `STRIPE_SECRET_KEY` in Supabase with live secret key
4. ✅ Add production redirect URI to Stripe Connect settings
5. ✅ Update `VITE_APP_URL` to your production domain
6. ✅ Redeploy Edge Functions to production
7. ✅ Test the complete OAuth flow in production

## Additional Resources

- [Stripe Connect Documentation](https://stripe.com/docs/connect)
- [OAuth for Connect](https://stripe.com/docs/connect/oauth-reference)
- [Stripe Connect Best Practices](https://stripe.com/docs/connect/best-practices)
