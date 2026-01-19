/**
 * GateProtect Widget Configuration
 *
 * This file configures the widget to protect the GateProtect site itself.
 * Update the SUPABASE_URL with your actual Supabase project URL.
 */

(function() {
  // IMPORTANT: Replace this with your actual Supabase URL
  // You can find it in your .env.local file as VITE_SUPABASE_URL
  const SUPABASE_URL = localStorage.getItem('VITE_SUPABASE_URL') ||
                       'https://bakzzkadgmyvvvnpuvki.supabase.co';

  // Pre-configured credentials for the GateProtect demo site
  const WIDGET_CONFIG = {
    siteId: 'site_gateprotect_demo',
    apiKey: 'pk_live_demo_gateprotect_2024',
    apiUrl: SUPABASE_URL + '/functions/v1',
    debug: false, // Set to true to see debug logs
    seoSafe: true // Allow search engine bots
  };

  // Make config available globally
  window.GATE_WIDGET_CONFIG = WIDGET_CONFIG;

  // If Supabase URL is not configured, log a warning
  if (SUPABASE_URL.includes('YOUR_PROJECT')) {
    console.warn(
      '⚠️ GateProtect widget not configured. ' +
      'Please update SUPABASE_URL in /public/widget-config.js'
    );
  } else {
    console.log('🛡️ GateProtect widget configured for:', WIDGET_CONFIG.siteId);
  }
})();
