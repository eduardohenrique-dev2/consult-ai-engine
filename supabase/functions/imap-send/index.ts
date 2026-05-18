// Envia email via SMTP da integração do usuário
import { createClient } from "npm:@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.14";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function decryptSecret(b64: string): Promise<string> {
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  const key = await crypto.subtle.importKey("raw", hash, "AES-GCM", false, ["encrypt", "decrypt"]);
  const raw = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const iv = raw.slice(0, 12); const ct = raw.slice(12);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return new TextDecoder().decode(pt);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: claims } = await sb.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (!claims?.claims) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    const userId = claims.claims.sub;

    const { integration_id, to, subject, html, text, chamado_id, in_reply_to } = await req.json();
    if (!integration_id || !to || !subject) return new Response(JSON.stringify({ error: "Campos obrigatórios faltando" }), { status: 400, headers: corsHeaders });

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: integ, error } = await admin.from("user_integrations").select("*").eq("id", integration_id).eq("user_id", userId).single();
    if (error || !integ || integ.provider !== "imap") return new Response(JSON.stringify({ error: "Integração IMAP não encontrada" }), { status: 404, headers: corsHeaders });

    const password = await decryptSecret(integ.smtp_password_encrypted);
    const transporter = nodemailer.createTransport({
      host: integ.smtp_host, port: integ.smtp_port, secure: integ.smtp_port === 465,
      auth: { user: integ.smtp_user, pass: password },
    });

    const info = await transporter.sendMail({
      from: `"${integ.display_name || integ.email_address}" <${integ.email_address}>`,
      to, subject, html, text: text || (html ? html.replace(/<[^>]+>/g, "") : undefined),
      inReplyTo: in_reply_to, references: in_reply_to,
    });

    await admin.from("email_logs").insert({
      direction: "outbound", status: "enviado", destinatario: to, assunto: subject,
      conteudo: text || html || "", chamado_id: chamado_id || null,
    });

    return new Response(JSON.stringify({ success: true, messageId: info.messageId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
