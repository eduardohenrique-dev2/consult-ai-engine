// Conecta/valida credenciais IMAP+SMTP do usuário e salva criptografado
import { createClient } from "npm:@supabase/supabase-js@2";
import { ImapFlow } from "npm:imapflow@1.0.164";
import nodemailer from "npm:nodemailer@6.9.14";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRESETS: Record<string, { imap_host: string; imap_port: number; smtp_host: string; smtp_port: number }> = {
  gmail:   { imap_host: "imap.gmail.com",       imap_port: 993, smtp_host: "smtp.gmail.com",       smtp_port: 465 },
  outlook: { imap_host: "outlook.office365.com",imap_port: 993, smtp_host: "smtp.office365.com",   smtp_port: 587 },
  zoho:    { imap_host: "imap.zoho.com",         imap_port: 993, smtp_host: "smtp.zoho.com",        smtp_port: 465 },
  yahoo:   { imap_host: "imap.mail.yahoo.com",   imap_port: 993, smtp_host: "smtp.mail.yahoo.com",  smtp_port: 465 },
};

async function getKey(): Promise<CryptoKey> {
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", hash, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptSecret(plain: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plain)));
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv); out.set(ct, iv.length);
  return btoa(String.fromCharCode(...out));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsErr || !claims?.claims) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    const userId = claims.claims.sub;

    const body = await req.json();
    const {
      provider_preset, email_address, password,
      imap_host, imap_port, smtp_host, smtp_port,
      display_name,
    } = body;

    if (!email_address || !password) {
      return new Response(JSON.stringify({ error: "email_address e password obrigatórios" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const preset = provider_preset && PRESETS[provider_preset];
    const cfg = {
      imap_host: imap_host || preset?.imap_host,
      imap_port: imap_port || preset?.imap_port || 993,
      smtp_host: smtp_host || preset?.smtp_host,
      smtp_port: smtp_port || preset?.smtp_port || 465,
    };
    if (!cfg.imap_host || !cfg.smtp_host) {
      return new Response(JSON.stringify({ error: "Hosts IMAP/SMTP obrigatórios" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Validar IMAP
    const imap = new ImapFlow({
      host: cfg.imap_host, port: cfg.imap_port, secure: cfg.imap_port === 993,
      auth: { user: email_address, pass: password }, logger: false,
    });
    try {
      await imap.connect();
      await imap.logout();
    } catch (e: any) {
      return new Response(JSON.stringify({ error: `IMAP falhou: ${e.message}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Validar SMTP
    const transporter = nodemailer.createTransport({
      host: cfg.smtp_host, port: cfg.smtp_port, secure: cfg.smtp_port === 465,
      auth: { user: email_address, pass: password },
    });
    try {
      await transporter.verify();
    } catch (e: any) {
      return new Response(JSON.stringify({ error: `SMTP falhou: ${e.message}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const encrypted = await encryptSecret(password);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: existing } = await admin.from("user_integrations")
      .select("id").eq("user_id", userId).eq("email_address", email_address).maybeSingle();

    const payload = {
      user_id: userId,
      provider: "imap",
      email_address,
      display_name: display_name || email_address,
      imap_host: cfg.imap_host, imap_port: cfg.imap_port,
      smtp_host: cfg.smtp_host, smtp_port: cfg.smtp_port,
      imap_user: email_address, smtp_user: email_address,
      imap_password_encrypted: encrypted, smtp_password_encrypted: encrypted,
      status: "ativa", last_error: null, sync_enabled: true,
    };

    let result;
    if (existing) {
      result = await admin.from("user_integrations").update(payload).eq("id", existing.id).select().single();
    } else {
      result = await admin.from("user_integrations").insert(payload).select().single();
    }
    if (result.error) throw result.error;

    return new Response(JSON.stringify({ success: true, integration: result.data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
