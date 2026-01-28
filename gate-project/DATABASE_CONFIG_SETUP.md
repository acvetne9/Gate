# Database-Based Configuration System

This project now stores sensitive configuration (Stripe keys, etc.) in the **Supabase database** instead of environment variables. This allows you to use hosting services that don't support environment variables.

## Overview

Instead of using `.env` files, all sensitive configuration is now stored in a `app_settings` table in your Supabase database. Admins can manage these settings through the Admin Panel in the web interface.

## Setup Instructions

### Step 1: Apply the Database Migration

You need to create the `app_settings` table in your Supabase database. You have two options:

#### Option A: Using Supabase CLI (Recommended)

```bash
# Login to Supabase CLI (if not already logged in)
npx supabase login

# Link your project
npx supabase link --project-ref bakzzkadgmyvvvnpuvki

# Push the migration to your database
npx supabase db push
```

#### Option B: Using Supabase Dashboard SQL Editor

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/bakzzkadgmyvvvnpuvki
2. Navigate to **SQL Editor** in the left sidebar
3. Open the migration file: `supabase/migrations/20260105000001_create_app_settings.sql`
4. Copy the entire SQL content
5. Paste it into the SQL Editor and click **Run**

### Step 2: Configure Your Settings

After the migration is applied, the table will be populated with default values. You need to update these with your actual keys:

1. **Login as Admin** to your application
2. Navigate to **Admin Panel** (top navigation)
3. Click on the **Settings** tab
4. Update the following values:
   - `stripe_publishable_key` - Your Stripe publishable key (starts with `pk_`)
   - `stripe_keeper_price_id` - Your Stripe price ID for the Keeper plan
   - `stripe_max_price_id` - Your Stripe price ID for the MAX plan
   - `stripe_connect_client_id` - Your Stripe Connect client ID (starts with `ca_`)
   - `app_url` - Your application's public URL

5. Click **Save** for each setting

### Step 3: Verify Everything Works

1. Go to the **Pricing** page and verify plans are displayed correctly
2. Try to subscribe to a plan (test mode if using Stripe test keys)
3. Check the **Billing** page to ensure Stripe Connect can be configured

## How It Works

### Architecture

```
┌─────────────────────┐
│   React Frontend    │
│                     │
│  ┌──────────────┐  │
│  │ SettingsContext│  │
│  │  (loads on    │  │
│  │   app start)  │  │
│  └───────┬──────┘  │
└──────────┼─────────┘
           │
           │ Fetches settings
           │ on app initialization
           ▼
    ┌──────────────┐
    │  Supabase    │
    │   Database   │
    │              │
    │ app_settings │
    │    table     │
    └──────────────┘
```

### Key Components

1. **`app_settings` table** (Supabase)
   - Stores all configuration as key-value pairs
   - Secured with Row Level Security (RLS) - only admins can access
   - Tracks when settings were last updated

2. **`SettingsContext`** (`src/contexts/SettingsContext.tsx`)
   - Loads settings from database when app starts
   - Caches settings in React context for fast access
   - Provides fallback values if database is unavailable

3. **`SettingsManagementPage`** (`src/pages/SettingsManagementPage.tsx`)
   - Admin interface to view and edit settings
   - Accessible via Admin Panel > Settings
   - Shows/hides sensitive values

4. **Updated Components**
   - `PricingPage` - Uses database settings for Stripe price IDs
   - `BillingPage` - Uses database settings for Stripe Connect
   - All pages load settings from SettingsContext

### Security Features

- **Row Level Security (RLS)**: Only users with `role = 'admin'` can read/write settings
- **Sensitive value masking**: Sensitive settings are hidden by default in the UI
- **Audit trail**: Tracks who updated settings and when

## Configuration Reference

### Available Settings

| Key | Description | Sensitive | Example |
|-----|-------------|-----------|---------|
| `stripe_publishable_key` | Stripe publishable key (frontend) | No | `pk_live_...` |
| `stripe_keeper_price_id` | Price ID for Keeper plan | No | `prod_...` |
| `stripe_max_price_id` | Price ID for MAX plan | No | `prod_...` |
| `stripe_connect_client_id` | Stripe Connect OAuth client ID | Yes | `ca_...` |
| `app_url` | Application URL for redirects | No | `https://yourdomain.com` |

### Adding New Settings

To add a new configuration value:

1. Insert it into the database:
```sql
INSERT INTO app_settings (key, value, description, is_sensitive, category)
VALUES ('your_new_key', 'default_value', 'Description', false, 'category');
```

2. Add the key to `AppSettings` interface in `src/contexts/SettingsContext.tsx`:
```typescript
interface AppSettings {
  // ... existing keys
  your_new_key: string
}
```

3. Update the default settings in `SettingsContext.tsx`:
```typescript
const DEFAULT_SETTINGS: AppSettings = {
  // ... existing defaults
  your_new_key: 'default_value'
}
```

4. Add the key to the database query in `loadSettings()`:
```typescript
.in('key', [
  // ... existing keys
  'your_new_key'
])
```

## Fallback Behavior

If the database is unavailable or the migration hasn't been run, the app will use **hardcoded fallback values** defined in `SettingsContext.tsx`. This ensures the app still works during initial setup.

## Troubleshooting

### Settings not loading?

1. Check that the migration was applied: Look for `app_settings` table in Supabase Dashboard
2. Verify you're logged in as an admin user
3. Check browser console for error messages

### RLS policy errors?

Make sure your user has `role = 'admin'` in the `user_profiles` table:

```sql
UPDATE user_profiles
SET role = 'admin'
WHERE email = 'your@email.com';
```

### Settings not updating in the app?

The settings are cached in context. If you update settings directly in the database, refresh the page to reload them.

## Environment Variables (Still Supported)

The app no longer requires environment variables, but they can still be used as overrides if needed. The priority is:

1. **Database settings** (primary source)
2. **Fallback defaults** (if database unavailable)
3. **Environment variables** (no longer used, but Supabase URL/key remain hardcoded)

### Supabase Credentials

The Supabase URL and anon key are still hardcoded in `src/lib/supabase.ts` because they're needed to connect to the database in the first place. These values are not sensitive secrets.

## Migration File Location

The migration file is located at:
```
supabase/migrations/20260105000001_create_app_settings.sql
```

## Summary

✅ **No environment variables needed** - Everything is in the database
✅ **Admin UI** - Manage settings through the web interface
✅ **Secure** - RLS policies protect sensitive data
✅ **Fallback values** - App works even if database isn't configured yet
✅ **Audit trail** - Track who changed what and when

---

**Need help?** Open an issue or check the Supabase Dashboard for database connectivity issues.
