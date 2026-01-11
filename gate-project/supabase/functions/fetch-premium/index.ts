import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function base64urlToString(input: string) {
  // base64url -> binary string
  input = input.replace(/-/g, '+').replace(/_/g, '/')
  // pad
  while (input.length % 4) input += '='
  const binary = atob(input)
  return binary
}

function base64urlEncodeBinary(binary: string) {
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function verifyHmac(unsigned: string, signatureB64url: string, secret: string) {
  const enc = new TextEncoder()
  const key = enc.encode(secret)
  const data = enc.encode(unsigned)
  const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, data)
  const sigArr = new Uint8Array(sig as ArrayBuffer)
  let binary = ''
  for (let i = 0; i < sigArr.length; i++) binary += String.fromCharCode(sigArr[i])
  const expected = base64urlEncodeBinary(binary)
  return expected === signatureB64url
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const url = new URL(req.url)
    let token = url.searchParams.get('token')

    // If no token in URL, try to get from request body
    if (!token) {
      try {
        const body = await req.json()
        token = body?.token || null
      } catch {
        // Body wasn't valid JSON, token remains null
      }
    }

    if (!token) {
      return new Response(JSON.stringify({ error: 'Missing token' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
    }

    const parts = token.split('.')
    if (parts.length !== 3) {
      return new Response(JSON.stringify({ error: 'Invalid token format' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
    }

    const [h, p, s] = parts
    const unsigned = `${h}.${p}`
    const secret = Deno.env.get('SIGNING_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    if (!secret) {
      return new Response(JSON.stringify({ error: 'Server misconfigured' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 })
    }

    const valid = await verifyHmac(unsigned, s, secret)
    if (!valid) {
      return new Response(JSON.stringify({ error: 'Invalid token signature' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 })
    }

    const payloadJson = base64urlToString(p)
    let payload
    try { payload = JSON.parse(payloadJson) } catch { payload = null }

    if (!payload || !payload.exp) {
      return new Response(JSON.stringify({ error: 'Invalid token payload' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
    }

    const now = Math.floor(Date.now() / 1000)
    if (now > payload.exp) {
      return new Response(JSON.stringify({ error: 'Token expired' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 410 })
    }

    const origin = req.headers.get('origin') || ''
    if (payload.origin && payload.origin !== origin) {
      return new Response(JSON.stringify({ error: 'Origin mismatch' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 })
    }

    // Require jti to prevent replay
    const jti = payload.jti || payload.jti === 0 ? payload.jti : null
    if (!jti) {
      return new Response(JSON.stringify({ error: 'Missing jti in token' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
    }

    // Use Supabase service role to check/insert token usage and rate-limit per site
    const supabase = createClient(Deno.env.get('SUPABASE_URL') || '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '')

    // Validate site exists and is active
    if (payload.site_id) {
      const { data: site, error: siteError } = await supabase
        .from('sites')
        .select('id, status')
        .eq('id', payload.site_id)
        .single()

      if (siteError || !site) {
        return new Response(JSON.stringify({ error: 'Invalid site' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 })
      }

      // Allow paused sites (they just won't enforce gate) but reject deleted/invalid
      if (site.status === 'deleted') {
        return new Response(JSON.stringify({ error: 'Site no longer active' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 })
      }
    }

    // Rate limit: count usages in last 60s
    try {
      const cutoff = new Date(Date.now() - 60000).toISOString()
      const { count } = await supabase.from('token_usages').select('*', { count: 'exact', head: true }).eq('site_id', payload.site_id).gte('used_at', cutoff)
      const recent = count || 0
      if (recent >= 60) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 })
      }
    } catch (e) {
      console.error('Rate check failed', e)
    }

    // Attempt to record this jti as used (single-use enforcement)
    try {
      const { error: insertErr } = await supabase.from('token_usages').insert({ jti: String(jti), site_id: payload.site_id })
      if (insertErr) {
        // assumed conflict -> already used
        console.error('Token usage insert error', insertErr)
        return new Response(JSON.stringify({ error: 'Token already used' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 410 })
      }
    } catch (e) {
      console.error('Token usage DB error', e)
      return new Response(JSON.stringify({ error: 'Internal server error' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 })
    }

    // Token valid and recorded — return premium fragment (in real usage, fetch from storage or generate)
    const content = `<div class="premium">Premium content for site ${payload.site_id} — page ${payload.page}</div>`

    return new Response(JSON.stringify({ ok: true, content }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 })
  }
})
