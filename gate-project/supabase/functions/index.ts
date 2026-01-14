import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("Hello world function called");

  return new Response(
    JSON.stringify({ message: "Hello from Supabase Edge Functions!" }),
    { 
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200 
    }
  );
});
