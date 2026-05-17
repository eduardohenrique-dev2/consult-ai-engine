import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Refresca o access_token de uma user_integration Gmail usando o refresh_token salvo.
 * Body: { integration_id: string }
 * Retorna: { access_token, expires_at }
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { integration_id } = await req.json();
    if (!integration_id) throw new Error("integration_id obrigatório");

    const clientId = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID");
    const clientSecret = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET");
    if (!clientId || !clientSecret) throw new Error("Credenciais OAuth Google ausentes");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: integ, error } = await supabase
      .from("user_integrations")
      .select("*")
      .eq("id", integration_id)
      .maybeSingle();
    if (error || !integ) throw new Error("Integração não encontrada");
    if (!integ.oauth_refresh_token) throw new Error("Sem refresh_token salvo. Reconecte a conta.");

    const resp = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: integ.oauth_refresh_token,
        grant_type: "refresh_token",
      }),
    });
    const data = await resp.json();
    if (!resp.ok) {
      await supabase.from("user_integrations").update({
        status: "expirada",
        last_error: `Refresh falhou: ${JSON.stringify(data)}`,
      }).eq("id", integration_id);
      throw new Error(`Refresh falhou: ${data.error_description || data.error || resp.status}`);
    }

    const expiresAt = new Date(Date.now() + (data.expires_in ?? 3600) * 1000).toISOString();
    await supabase.from("user_integrations").update({
      oauth_access_token: data.access_token,
      oauth_expires_at: expiresAt,
      status: "ativa",
      last_error: null,
    }).eq("id", integration_id);

    return new Response(JSON.stringify({ access_token: data.access_token, expires_at: expiresAt }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("refresh-gmail-token error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
