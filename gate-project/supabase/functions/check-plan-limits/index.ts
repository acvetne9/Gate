// Edge Function: check-plan-limits
// Validates if user can perform an action based on their plan tier

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders, supabaseAdmin } from '../_shared/stripe.ts'

// Plan limits configuration
const PLAN_LIMITS = {
  free: {
    sites: 1,
    requests_per_month: 1000,
    premium_features: false,
  },
  keeper: {
    sites: 5,
    requests_per_month: 50000,
    premium_features: true,
  },
  max: {
    sites: 999, // Effectively unlimited
    requests_per_month: 1000000,
    premium_features: true,
  },
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { customerId, action } = await req.json()

    if (!customerId || !action) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: customerId and action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user's subscription tier
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('subscription_tier')
      .eq('id', customerId)
      .single()

    if (!profile) {
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const tier = (profile.subscription_tier || 'free') as keyof typeof PLAN_LIMITS
    const limits = PLAN_LIMITS[tier]

    // Check based on action type
    let allowed = true
    let reason = ''
    let currentUsage: any = {}

    switch (action) {
      case 'create_site':
        // Count current sites
        const { count: siteCount } = await supabaseAdmin
          .from('sites')
          .select('id', { count: 'exact', head: true })
          .eq('customer_id', customerId)

        const currentSiteCount = siteCount ?? 0
        currentUsage.sites = currentSiteCount

        if (currentSiteCount >= limits.sites) {
          allowed = false
          reason = `You've reached the maximum number of sites (${limits.sites}) for your ${tier} plan. Upgrade to create more sites.`
        }
        break

      case 'check_requests':
        // Calculate current month's requests
        const startOfMonth = new Date()
        startOfMonth.setDate(1)
        startOfMonth.setHours(0, 0, 0, 0)

        const { count: requestCount } = await supabaseAdmin
          .from('request_logs')
          .select('id', { count: 'exact', head: true })
          .eq('customer_id', customerId)
          .gte('timestamp', startOfMonth.toISOString())

        const currentRequestCount = requestCount ?? 0
        currentUsage.requests = currentRequestCount

        if (currentRequestCount >= limits.requests_per_month) {
          allowed = false
          reason = `You've reached the monthly request limit (${limits.requests_per_month.toLocaleString()}) for your ${tier} plan. Upgrade for higher limits.`
        }
        break

      case 'access_premium_features':
        if (!limits.premium_features) {
          allowed = false
          reason = `Premium features are not available on the ${tier} plan. Upgrade to Keeper or MAX to access this feature.`
        }
        break

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    return new Response(
      JSON.stringify({
        allowed,
        reason: reason || 'Action allowed',
        tier,
        limits,
        currentUsage,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error: unknown) {
    console.error('Error checking plan limits:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to check plan limits'
    return new Response(
      JSON.stringify({
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
