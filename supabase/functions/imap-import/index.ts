// Importa emails via IMAP de uma integração específica e cria chamados
import { createClient } from "npm:@supabase/supabase-js@2";
import { ImapFlow } from "npm:imapflow@1.0.164";
import { simpleParser } from "npm:mailparser@3.7.1";

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
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims } = await sb.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (!claims?.claims) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    const userId = claims.claims.sub;

    const { integration_id, max = 25, classificacao_padrao } = await req.json();
    if (!integration_id) return new Response(JSON.stringify({ error: "integration_id obrigatório" }), { status: 400, headers: corsHeaders });

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: integ, error: ie } = await admin.from("user_integrations").select("*").eq("id", integration_id).eq("user_id", userId).single();
    if (ie || !integ) return new Response(JSON.stringify({ error: "Integração não encontrada" }), { status: 404, headers: corsHeaders });
    if (integ.provider !== "imap") return new Response(JSON.stringify({ error: "Integração não é IMAP" }), { status: 400, headers: corsHeaders });

    const password = await decryptSecret(integ.imap_password_encrypted);
    const client = new ImapFlow({
      host: integ.imap_host, port: integ.imap_port, secure: integ.imap_port === 993,
      auth: { user: integ.imap_user, pass: password }, logger: false,
    });

    let imported = 0, skipped = 0, errors = 0;
    try {
      await client.connect();
      const lock = await client.getMailboxLock("INBOX");
      try {
        const uids = await client.search({ seen: false }, { uid: true }) as number[];
        const slice = uids.slice(-max);

        for (const uid of slice) {
          try {
            const msg = await client.fetchOne(String(uid), { source: true, envelope: true }, { uid: true });
            if (!msg) continue;
            const parsed = await simpleParser(msg.source as Uint8Array);
            const messageId = parsed.messageId || `imap-${integration_id}-${uid}`;

            const { data: dup } = await admin.from("imported_emails").select("id").eq("gmail_message_id", messageId).maybeSingle();
            if (dup) { skipped++; continue; }

            const titulo = (parsed.subject || "(sem assunto)").slice(0, 200);
            const descricao = (parsed.text || parsed.html || "").toString().slice(0, 4000);
            const remetente = parsed.from?.text || "";

            const { data: chamado, error: cErr } = await admin.from("chamados").insert({
              titulo, descricao,
              tipo: classificacao_padrao || "Geral",
              categoria: classificacao_padrao || null,
              status: "Novo", prioridade: "media",
              owner_user_id: userId, integration_id,
              thread_id: parsed.headers.get("references")?.toString() || messageId,
            }).select().single();
            if (cErr) { errors++; continue; }

            await admin.from("imported_emails").insert({
              gmail_message_id: messageId, chamado_id: chamado.id,
              assunto: titulo, remetente, data_email: parsed.date?.toISOString() || null,
              thread_id: chamado.thread_id, owner_user_id: userId, integration_id,
              processed_status: "created",
            });
            await client.messageFlagsAdd(String(uid), ["\\Seen"], { uid: true });
            imported++;
          } catch (err) { errors++; console.error("msg err", err); }
        }
      } finally { lock.release(); }
      await client.logout();

      await admin.from("user_integrations").update({ last_sync_at: new Date().toISOString(), status: "ativa", last_error: null }).eq("id", integration_id);
      await admin.from("email_import_logs").insert({
        usuario_id: userId, total_processados: imported + skipped + errors,
        total_importados: imported, total_duplicados: skipped, total_erros: errors,
        status: errors > 0 ? "parcial" : "sucesso", classificacao_padrao: classificacao_padrao || null,
      });

      return new Response(JSON.stringify({ success: true, imported, skipped, errors }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (e: any) {
      await admin.from("user_integrations").update({ status: "erro", last_error: e.message }).eq("id", integration_id);
      throw e;
    }
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
