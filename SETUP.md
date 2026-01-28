# 🛡️ GateProtect Setup Guide

This guide explains how the GateProtect website protects itself and logs traffic to the dashboard.

## What's Configured

The GateProtect website now has the widget installed on itself, so:

1. **All visitors are tracked** - See logs in the dashboard
2. **Bots are blocked** - GPTBot, ClaudeBot, CCBot automatically blocked
3. **Humans are allowed** - No gate for real visitors
4. **Demo works** - Bot attacks show up in your dashboard

## Quick Setup (One-Time)

### Step 1: Run the Database Migration

This creates a demo site in your database:

```bash
cd gate-project
```

Then run the migration in your Supabase SQL Editor:

```sql
-- Copy the contents of:
supabase/migrations/20240101_auto_create_demo_site.sql
```

OR if you have Supabase CLI:

```bash
supabase db push
```

### Step 2: Update Widget Configuration

Edit `/gate-project/public/widget-config.js` and replace `YOUR_PROJECT` with your actual Supabase URL:

```javascript
const SUPABASE_URL = 'https://YOUR_ACTUAL_PROJECT_ID.supabase.co';
```

You can find your Supabase URL in `.env.local` as `VITE_SUPABASE_URL`.

### Step 3: Build the Widget (If Changed)

```bash
cd gate-protect-widget
npm install
npm run build
```

Then copy to public folder:

```bash
cp dist/gate-widget.min.js ../gate-project/public/
```

### Step 4: That's It!

Now when you visit your site:

- ✅ **Dashboard logs** will show all traffic (humans + bots)
- ✅ **Demo page** bot attacks will appear in dashboard
- ✅ **Humans** can browse freely (no gate)
- ❌ **AI bots** are automatically blocked

## How It Works

### The Widget

Located in `index.html`, the widget:
1. Loads configuration from `/public/widget-config.js`
2. Loads the widget script (`/public/gate-widget.min.js`)
3. Sends all page views to your backend
4. Blocks bots, allows humans

### Pre-configured Credentials

```javascript
Site ID: site_gateprotect_demo
API Key: pk_live_demo_gateprotect_2024
```

These are created by the migration and hardcoded in the widget config.

### Backend Logs

All traffic goes to:
- **Table:** `request_logs`
- **Site ID:** `site_gateprotect_demo`
- **Customer:** acvetne@gmail.com

View logs at: http://localhost:5173/dashboard

## Demo Page Integration

The demo page (`/demo`) uses the attack-bots to simulate traffic:

1. User clicks "Launch Attack"
2. Bots (GPTBot, ClaudeBot, CCBot, ScraperBot) are triggered
3. Each bot makes requests to the backend
4. Requests are logged to database
5. Dashboard shows the attack logs
6. Demo page shows terminal logs in real-time

The demo uses the SAME site credentials, so all attacks show up in your dashboard!

## Viewing Logs

### Option 1: Dashboard

1. Go to http://localhost:5173/dashboard
2. Login as acvetne@gmail.com
3. Select "GateProtect Demo Site"
4. View all traffic logs

### Option 2: Browser Console

When viewing the site, open browser console and run:

```javascript
// View widget status
GateProtect.debug.status()

// View all logs
GateProtect.logs.getAll()

// Download logs
GateProtect.logs.download()
```

## Testing

### Test as Human

Just visit the site normally:
- ✅ You'll see the content
- 📊 Log will appear in dashboard as "allowed"

### Test as Bot

Use curl or change user agent:

```bash
# Test with curl (detected as bot)
curl http://localhost:5173

# Test with specific bot
curl -A "GPTBot/1.0" http://localhost:5173
```

Logs will show "blocked" in the dashboard.

### Test Demo Page

1. Go to http://localhost:5173/demo
2. Click "Launch Attack"
3. Watch terminal logs fill up
4. Check dashboard to see the attack logged
5. All 4 bots (GPTBot, ClaudeBot, CCBot, ScraperBot) will appear

## Troubleshooting

### Widget not loading?

Check browser console for:

```
🛡️ GateProtect widget configured for: site_gateprotect_demo
[GateProtect] Initializing GateProtect Widget
[GateProtect] ✓ Configuration validated
```

If you see:
```
⚠️ GateProtect widget not configured
```

Update `/public/widget-config.js` with your Supabase URL.

### No logs in dashboard?

1. Check that migration ran (look for `site_gateprotect_demo` in `sites` table)
2. Check widget config has correct Supabase URL
3. Check browser network tab - should see POST to `/functions/v1/check-access`

### Getting "payment required"?

This shouldn't happen! The default config has `showGatewallToHumans: false`.

If it does:
1. Check site config in database
2. Ensure `showGatewallToHumans` is `false`
3. Check browser console for errors

## Summary

✅ **Widget installed** - `index.html` loads widget automatically
✅ **Site created** - Migration creates demo site in database
✅ **Bots blocked** - AI scrapers automatically blocked
✅ **Humans allowed** - No gate for real visitors
✅ **Logs working** - All traffic logged to dashboard
✅ **Demo works** - Bot attacks visible in dashboard

---

**Need help?** Check the dashboard logs or browser console for errors.
