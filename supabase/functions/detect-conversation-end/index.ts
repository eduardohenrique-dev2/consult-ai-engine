// Detecta encerramento de conversa por heurística simples (sem custo de IA).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SIGNALS = [
  /\bobrigad[oa]\b/i,
  /\bvaleu\b/i,
  /\bresolveu\b/i,
  /\bera isso\b/i,
  /\bperfeito\b/i,
  /\bfunciono+u\b/i,
  /\bdeu cert[oa]\b/i,
  /\bagradec/i,
  /^t?á\.?$/i,
  /^ok\.?$/i,
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { text } = await req.json();
    const t = (text || "").trim();
    const isEnding = SIGNALS.some((r) => r.test(t)) || t.length <= 4;
    return new Response(JSON.stringify({ isEnding }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ isEnding: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
