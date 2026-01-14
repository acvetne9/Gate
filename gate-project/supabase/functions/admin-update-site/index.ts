import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-secret',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const adminSecret = req.headers.get('x-admin-secret') || ''
    const configured = Deno.env.get('SIGNING_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    if (!configured || adminSecret !== configured) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const body = await req.json()
    const { apiKey, status, domain } = body
    if (!apiKey && !domain) {
      return new Response(JSON.stringify({ error: 'apiKey or domain required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL') || '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '')

    const updates: any = { }
    if (status) updates.status = status

    let q = supabase.from('sites').update(updates)
    if (apiKey) q = q.eq('api_key', apiKey)
    if (domain) q = q.eq('domain', domain)

    const { error } = await q
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ error: 'internal_error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
