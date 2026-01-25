// Honeypot Trap Handler
// Catches bots that follow hidden links and logs them

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const trapPath = url.pathname.replace('/honeypot-trap', '')
    const userAgent = req.headers.get('user-agent') || 'unknown'
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ||
               req.headers.get('cf-connecting-ip') ||
               req.headers.get('x-real-ip') ||
               'unknown'
    const referer = req.headers.get('referer') || 'direct'

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Determine trap type from path
    let trapType = 'unknown'
    if (trapPath.includes('pricing')) trapType = 'fake_pricing_link'
    else if (trapPath.includes('admin')) trapType = 'admin_probe'
    else if (trapPath.includes('api')) trapType = 'api_probe'
    else if (trapPath.includes('download')) trapType = 'download_link'
    else if (trapPath.includes('env') || trapPath.includes('git')) trapType = 'security_probe'
    else if (trapPath.includes('wp-') || trapPath.includes('wordpress')) trapType = 'wordpress_probe'

    // Log the honeypot hit
    const logEntry = {
      timestamp: new Date().toISOString(),
      ip: ip,
      user_agent: userAgent,
      trap_path: trapPath,
      trap_type: trapType,
      referer: referer,
      headers: Object.fromEntries(req.headers.entries()),
      is_confirmed_bot: true
    }

    // Store in database
    const { error: logError } = await supabase
      .from('honeypot_logs')
      .insert(logEntry)

    if (logError) {
      console.error('Failed to log honeypot hit:', logError)
    }

    // Also add to bot_logs for unified tracking
    const { error: botLogError } = await supabase
      .from('bot_logs')
      .insert({
        ip: ip,
        user_agent: userAgent,
        page: trapPath,
        type: 'bot',
        status: 'blocked',
        decision_reason: `Honeypot triggered: ${trapType}`,
        risk_score: 1.0,
        detection_data: {
          honeypot: true,
          trap_type: trapType,
          referer: referer
        }
      })

    // Add IP to blocklist (temporary - 24 hours)
    const { error: blockError } = await supabase
      .from('blocked_ips')
      .upsert({
        ip: ip,
        reason: `Honeypot: ${trapType}`,
        blocked_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString()
      }, { onConflict: 'ip' })

    console.log(`[Honeypot] Trap triggered: ${trapType} by ${ip}`)

    // Return a redirect to bot payment page - use origin from referer or fallback
    const referer = req.headers.get('referer') || ''
    let origin = req.headers.get('origin')
    if (!origin && referer) {
      try { origin = new URL(referer).origin } catch { origin = null }
    }
    const baseUrl = origin || 'https://security-gate.lovable.app'
    const redirectUrl = `${baseUrl}/bot-payment?reason=honeypot&trap=${trapType}`

    return new Response(
      `<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="refresh" content="0;url=${redirectUrl}">
  <title>Redirecting...</title>
</head>
<body>
  <p>Automated access detected. Redirecting to payment...</p>
  <script>window.location.href = "${redirectUrl}";</script>
</body>
</html>`,
      {
        status: 402, // Payment Required
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/html',
          'X-Robots-Tag': 'noindex, nofollow',
          'X-Gate-Honeypot': 'triggered'
        }
      }
    )
  } catch (error) {
    console.error('Honeypot handler error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
