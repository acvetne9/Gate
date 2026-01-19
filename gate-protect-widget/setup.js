#!/usr/bin/env node

/**
 * GateProtect Setup Script
 *
 * This script automatically creates a site for acvetne@gmail.com
 * and generates the widget integration code.
 *
 * Usage: node setup.js
 */

const crypto = require('crypto');

console.log('\n🛡️  GateProtect Setup Wizard\n');
console.log('═══════════════════════════════════════\n');

// Generate site credentials
function generateSiteId() {
  return 'site_' + crypto.randomBytes(16).toString('hex');
}

function generateApiKey() {
  return 'pk_live_' + crypto.randomBytes(32).toString('hex');
}

// Configuration for acvetne@gmail.com
const config = {
  email: 'acvetne@gmail.com',
  siteId: generateSiteId(),
  apiKey: generateApiKey(),
  siteName: 'My Protected Site',
  domain: 'example.com',
  supabaseUrl: process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL',
};

console.log('✅ Generated Credentials for:', config.email);
console.log('');
console.log('Site ID:', config.siteId);
console.log('API Key:', config.apiKey);
console.log('');

// Generate widget code
const widgetCode = `<!-- GateProtect Widget -->
<script
  src="https://cdn.gateprotect.com/widget.js"
  data-site-id="${config.siteId}"
  data-api-key="${config.apiKey}"
  data-api-url="${config.supabaseUrl}/functions/v1"
  data-debug="true"
  async
></script>`;

console.log('═══════════════════════════════════════\n');
console.log('📋 Widget Integration Code:\n');
console.log(widgetCode);
console.log('');

// Save to file
const fs = require('fs');
const widgetConfigPath = './widget-config.html';

fs.writeFileSync(widgetConfigPath, `<!DOCTYPE html>
<html>
<head>
  <title>GateProtect Widget Configuration</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      max-width: 800px;
      margin: 50px auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .card {
      background: white;
      padding: 30px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      margin-bottom: 20px;
    }
    h1 { color: #667eea; margin-top: 0; }
    pre {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #667eea;
      overflow-x: auto;
    }
    code { font-family: 'Monaco', 'Consolas', monospace; font-size: 14px; }
    .credentials { background: #d4edda; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .credentials strong { color: #155724; }
    .step { background: #fff3cd; padding: 15px; border-radius: 6px; margin: 15px 0; }
    .step h3 { margin-top: 0; color: #856404; }
  </style>
</head>
<body>
  <div class="card">
    <h1>🛡️ GateProtect Widget Configuration</h1>
    <p><strong>User:</strong> ${config.email}</p>
    <p><strong>Site:</strong> ${config.siteName}</p>

    <div class="credentials">
      <strong>Your Credentials (Keep these secret!):</strong><br>
      <strong>Site ID:</strong> <code>${config.siteId}</code><br>
      <strong>API Key:</strong> <code>${config.apiKey}</code>
    </div>

    <h2>Installation Instructions</h2>

    <div class="step">
      <h3>Step 1: Add to Dashboard</h3>
      <p>First, create this site in your dashboard:</p>
      <ol>
        <li>Go to <a href="http://localhost:5173/dashboard" target="_blank">Dashboard</a></li>
        <li>Click "Add New Site"</li>
        <li>Enter site name and domain</li>
        <li>Save the Site ID and API Key shown above</li>
      </ol>
    </div>

    <div class="step">
      <h3>Step 2: Add Widget to Your Site</h3>
      <p>Copy and paste this code into your HTML (before closing &lt;/body&gt; tag):</p>
      <pre><code>${widgetCode.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
    </div>

    <div class="step">
      <h3>Step 3: Test It</h3>
      <p>Visit your site and check the browser console. You should see:</p>
      <ul>
        <li>✅ "GateProtect initialization complete"</li>
        <li>✅ "Access granted, no protection applied" (for humans)</li>
        <li>Bots will be automatically blocked</li>
      </ul>
    </div>

    <h2>Configuration Options</h2>
    <p>You can customize the widget behavior with data attributes:</p>
    <ul>
      <li><code>data-debug="true"</code> - Enable detailed console logging</li>
      <li><code>data-mode="auto"</code> - Auto-detect (default) | "always" | "never"</li>
      <li><code>data-seo-safe="true"</code> - Allow search engine bots (recommended)</li>
      <li><code>data-protect-body="true"</code> - Protect entire page (default) or specific elements</li>
    </ul>

    <h2>Default Behavior</h2>
    <ul>
      <li>✅ <strong>Humans:</strong> Always allowed (no gate)</li>
      <li>❌ <strong>Bots:</strong> Blocked (GPTBot, ClaudeBot, CCBot, etc.)</li>
      <li>✅ <strong>SEO Bots:</strong> Allowed (Google, Bing, etc.)</li>
    </ul>
  </div>
</body>
</html>
`);

console.log('═══════════════════════════════════════\n');
console.log('✅ Configuration saved to:', widgetConfigPath);
console.log('');
console.log('Next Steps:');
console.log('1. Open', widgetConfigPath, 'in your browser');
console.log('2. Follow the installation instructions');
console.log('3. Add the widget code to your site');
console.log('');
console.log('Need help? Visit: http://localhost:5173/dashboard\n');

// Instructions for creating the site in database
console.log('═══════════════════════════════════════\n');
console.log('🔧 Manual Database Setup (Optional):');
console.log('');
console.log('If you want to create the site directly in the database,');
console.log('run this SQL in your Supabase SQL Editor:\n');

const sql = `
-- First, get the user ID for acvetne@gmail.com
SELECT id FROM auth.users WHERE email = 'acvetne@gmail.com';

-- Then insert the site (replace USER_ID with the ID from above)
INSERT INTO sites (
  customer_id,
  site_id,
  api_key,
  name,
  domain,
  status,
  config
) VALUES (
  'USER_ID',
  '${config.siteId}',
  '${config.apiKey}',
  '${config.siteName}',
  '${config.domain}',
  'active',
  '{
    "gateType": "none",
    "showGatewallToHumans": false,
    "blockedBots": ["GPTBot", "ClaudeBot", "CCBot"],
    "meteredLimit": 3,
    "premiumPages": [],
    "subscribeUrl": "",
    "loginUrl": ""
  }'::jsonb
);
`.trim();

console.log(sql);
console.log('\n═══════════════════════════════════════\n');
