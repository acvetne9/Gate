# GateProtect

Protect your content from bots and collect payments when they access it.

## Features

- 🛡️ **Bot Detection**: Advanced AI-powered bot detection
- 💰 **Bot Payments**: Charge bots to access your content via Stripe
- 📊 **Real-time Analytics**: Monitor all requests in real-time
- 🔒 **Subscription Management**: Free, Keeper, and MAX plans
- 🌐 **Multi-site Support**: Manage multiple websites
- ⚡ **Easy Integration**: Simple JavaScript widget

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Application**

   Edit `src/config/stripe.ts` with your credentials:
   - Supabase URL and anon key
   - Stripe publishable key
   - Stripe price IDs for Keeper and MAX plans

3. **Setup Stripe Integration**

   Follow the complete guide in [STRIPE_SETUP.md](./STRIPE_SETUP.md)

4. **Run Development Server**
   ```bash
   npm run dev
   ```

## Configuration

All configuration is in `src/config/stripe.ts`:

```typescript
export const appConfig = {
  supabase: {
    url: 'your_supabase_url',
    anonKey: 'your_supabase_key'
  },
  stripe: {
    publishableKey: 'pk_test_...',
    prices: {
      keeper: 'price_...',
      max: 'price_...'
    }
  }
}
```

## Project Structure

```
src/
├── components/     # Reusable UI components
├── config/         # Configuration (Stripe, Supabase)
├── contexts/       # React contexts (Auth, Subscription)
├── pages/          # Page components
├── integrations/   # Supabase integration
└── lib/            # Utilities

supabase/
├── functions/      # Edge functions (Stripe, webhooks)
└── migrations/     # Database migrations
```

## Subscription Plans

- **Free**: 1 site, 1K requests/month
- **Keeper**: 5 sites, 50K requests/month, bot payments
- **MAX**: Unlimited sites, 1M+ requests/month, bot payments

## Documentation

- [Stripe Setup Guide](./STRIPE_SETUP.md) - Complete Stripe integration guide
- [Database Schema](./supabase/migrations/) - Database structure

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Payments**: Stripe
- **Styling**: Tailwind CSS
- **UI**: Radix UI + Lucide Icons

## Support

Questions or issues? Contact support@gateprotect.com
