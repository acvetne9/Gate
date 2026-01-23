# Gate Protection WordPress Plugin

WordPress plugin for monetizing bot traffic and protecting content from AI scrapers.

## Version 1.3.0 - Simplified Setup!

**What's New:**
- ✅ **No Site ID** - Removed site ID requirement, only need API key + URL
- ✅ **Simplified Configuration** - Just add your API key and URL
- ✅ **Enhanced Security** - No hardcoded backend URLs visible to plugin users
- ✅ **Updated Branding** - Now called "Gate Protection" (formerly GateProtect)

## Quick Start

### 1. Installation

1. Upload the `wordpress-gate-plugin` folder to `/wp-content/plugins/`
2. Activate the plugin through the 'Plugins' menu in WordPress
3. Go to **Settings → Gate Protection**

### 2. Configuration

1. Get your **API Key** and **API URL** from [Gate Dashboard](https://gate-protect.com/dashboard)
2. Paste them into **Settings → Gate Protection**:
   - **API Key** - Your unique API key
   - **API URL** - Your API endpoint URL
3. Check **"Enable Gate Protection"**
4. Save Settings

**Both API Key and API URL are required.**

### 3. Protect Your Content

In the post/page editor, look for the **🛡️ Gate Protection** box in the sidebar:
- ✅ Check **"Protect this content"** to enable protection
- Bots will be charged to access protected pages
- Humans can optionally see a gate (configure in settings)

---

## How It Works

### Default Behavior

| Visitor Type | What Happens |
|--------------|--------------|
| 👤 **Humans** | ✅ Full access (unless gate enabled for humans) |
| 🤖 **AI Bots** (GPTBot, ClaudeBot) | 💳 Payment required |
| 🔍 **SEO Bots** (Google, Bing) | ✅ Allowed for indexing |
| 🕷️ **Scrapers** | 💳 Payment required |

### Bot Monetization

- Bots must **pay to access** your protected content
- Payments go to **your Stripe account** (connect in Gate dashboard)
- You keep **100% of bot payments**
- Two pricing plans:
  - **Keeper:** Free forever, $0.50 per bot request
  - **MAX:** $20/month, custom pricing (you control the rate)

---

## Settings

### API Configuration

- **Enable Protection** - Turn protection on/off globally
- **API Key** - Your unique API key from Gate dashboard (required)
- **API URL** - Your API endpoint URL from Gate dashboard (required)

### Redirect URLs

- **Subscribe URL** - Where to send humans who hit the gate (e.g., `/subscribe`, `/pricing`)
- **Login URL** - Where existing subscribers should log in (defaults to WordPress login)
- **Redirect Behavior** - Immediately redirect vs. show gate page first

---

## Testing

### Test Human Access
```bash
# Visit a protected page in your browser
# Should see gate (if enabled for humans) or full access
```

### Test Bot Detection
```bash
# Use curl to simulate a bot
curl https://yoursite.com/protected-page/

# Should see blocked message or payment requirement
```

### Check Logs
- All requests are logged in your Gate dashboard
- See bot detection, payment requests, and access decisions
- Filter by date, site, bot type, etc.

---

## Troubleshooting

### Plugin Not Working?

1. **Check Credentials**: Settings → Gate Protection → Make sure both API key and API URL are entered
2. **Enable Protection**: Check "Enable Gate Protection" box
3. **Protect Content**: Mark posts as "Protect this content" in the editor
4. **Check Logs**: View WordPress debug logs if `WP_DEBUG` is enabled

### Error: "Invalid API key" or "Plugin not configured"?

- Verify your API key and API URL are correct (copy from Gate dashboard)
- Make sure both fields are filled in (both are required)
- Verify your site is active in Gate dashboard

### Bots Not Being Blocked?

- Confirm the post is marked as protected
- Check that "Enable Protection" is turned on
- View logs in Gate dashboard to see detection decisions

---

## Migration from v1.0.0

If updating from version 1.0.0:

1. **Remove Site ID** - No longer needed!
2. **Add API URL** - NEW REQUIREMENT: Get your API URL from Gate dashboard
3. **Keep API Key** - Your existing API key still works
4. **Save Settings** - Resave to update configuration

**Important:** You must add the API URL field. Old settings with `site_id` will be ignored.

---

## Files Structure

```
wordpress-gate-plugin/
├── wordpress-protect.php    # Main plugin file
├── includes/
│   ├── admin.php           # Admin settings page
│   ├── api.php             # Gate API communication
│   └── protection.php      # Bot detection & protection logic
└── templates/
    ├── gate.php         # Gate display template
    └── blocked.php         # Blocked bot template
```

---

## Developer Hooks

### Filters

```php
// Customize bot detection decision
add_filter('gate_protection_decision', function($result, $post_id) {
    // Modify $result array
    return $result;
}, 10, 2);

// Customize gate display
add_filter('gate_gate_config', function($config) {
    $config['title'] = 'Custom Title';
    return $config;
});
```

### Actions

```php
// Triggered when bot is blocked
add_action('gate_bot_blocked', function($user_agent, $ip, $post_id) {
    // Custom logging, notifications, etc.
});

// Triggered when gate is shown
add_action('gate_gate_shown', function($post_id, $reason) {
    // Track gate impressions
});
```

---

## Requirements

- **WordPress:** 5.0 or higher
- **PHP:** 7.2 or higher
- **Gate Account:** Free at [gate-protect.com](https://gate-protect.com)

---

## Support

- **Dashboard:** [gate-protect.com/dashboard](https://gate-protect.com/dashboard)
- **Documentation:** See inline code documentation
- **Issues:** Report bugs via support channels

---

## License

GPL v2 or later

---

**Monetize your bot traffic. Protect your content. Get paid for AI scraping.**
