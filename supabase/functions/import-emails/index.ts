import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GMAIL_GATEWAY = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";

function decodeBase64Url(s: string): string {
  try {
    const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 ? b64 + "=".repeat(4 - (b64.length % 4)) : b64;
    return new TextDecoder().decode(Uint8Array.from(atob(pad), (c) => c.charCodeAt(0)));
  } catch {
    return "";
  }
}

function extractBody(payload: any): string {
  if (!payload) return "";
  if (payload.body?.data) return decodeBase64Url(payload.body.data);
  if (payload.parts) {
    const textPart = payload.parts.find((p: any) => p.mimeType === "text/plain");
    if (textPart?.body?.data) return decodeBase64Url(textPart.body.data);
    for (const p of payload.parts) {
      const nested = extractBody(p);
      if (nested) return nested;
    }
  }
  return "";
}

function parseSender(from: string): { name: string; email: string } {
  const m = from.match(/^(.*?)\s*<(.+?)>\s*$/);
  if (m) return { name: m[1].replace(/"/g, "").trim(), email: m[2].trim() };
  return { name: from.trim(), email: from.trim() };
}

function classify(subject: string, body: string): { tipo: string; eh_esocial: boolean; evento_esocial: string | null } {
  const text = `${subject} ${body}`.toLowerCase();
  const esocialMatch = text.match(/s-(1200|1210|2200|2299|1010|1020)/);
  const eh_esocial = !!esocialMatch || /esocial|e-social|dctfweb/.test(text);
  const evento_esocial = esocialMatch ? `S-${esocialMatch[1]}` : null;
  let tipo = "Folha";
  if (eh_esocial) tipo = "eSocial";
  else if (/folha|salário|salario|holerite|rubrica/.test(text)) tipo = "Folha";
  else if (/ponto|jornada|hora extra/.test(text)) tipo = "Ponto";
  else if (/benefíc|beneficio|vale|plano de saúde/.test(text)) tipo = "Benefício";
  return { tipo, eh_esocial, evento_esocial };
}

function classifyPriority(subject: string, body: string): string {
  const t = `${subject} ${body}`.toLowerCase();
  if (/urgente|crítico|critico|parado|bloqueado/.test(t)) return "critica";
  if (/erro|falha|problema/.test(t)) return "alta";
  return "media";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GOOGLE_MAIL_API_KEY = Deno.env.get("GOOGLE_MAIL_API_KEY");
    if (!LOVABLE_API_KEY || !GOOGLE_MAIL_API_KEY) {
      throw new Error("Gmail não conectado");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const gmailHeaders = {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": GOOGLE_MAIL_API_KEY,
    };

    // List recent inbox messages (last 20)
    const listResp = await fetch(
      `${GMAIL_GATEWAY}/users/me/messages?maxResults=20&q=in:inbox`,
      { headers: gmailHeaders },
    );
    if (!listResp.ok) {
      throw new Error(`Gmail list falhou [${listResp.status}]: ${await listResp.text()}`);
    }
    const listData = await listResp.json();
    const messages = listData.messages || [];

    let imported = 0;
    let skipped = 0;
    const created: any[] = [];

    for (const msg of messages) {
      // Skip if already imported
      const { data: existing } = await supabase
        .from("imported_emails")
        .select("id")
        .eq("gmail_message_id", msg.id)
        .maybeSingle();
      if (existing) { skipped++; continue; }

      const detailResp = await fetch(
        `${GMAIL_GATEWAY}/users/me/messages/${msg.id}?format=full`,
        { headers: gmailHeaders },
      );
      if (!detailResp.ok) continue;
      const detail = await detailResp.json();

      const headers = detail.payload?.headers || [];
      const subject = headers.find((h: any) => h.name.toLowerCase() === "subject")?.value || "(sem assunto)";
      const from = headers.find((h: any) => h.name.toLowerCase() === "from")?.value || "";
      const dateHdr = headers.find((h: any) => h.name.toLowerCase() === "date")?.value || "";
      const body = extractBody(detail.payload).slice(0, 5000);
      const { name: senderName, email: senderEmail } = parseSender(from);

      const { tipo, eh_esocial, evento_esocial } = classify(subject, body);
      const prioridade = classifyPriority(subject, body);

      // Match cliente by email/name
      let cliente_id: string | null = null;
      if (senderEmail) {
        const { data: clienteMatch } = await supabase
          .from("clientes")
          .select("id")
          .or(`contato.ilike.%${senderEmail}%,nome.ilike.%${senderName}%`)
          .limit(1);
        if (clienteMatch?.length) cliente_id = clienteMatch[0].id;
      }

      // AI suggestion
      let sugestao_ia: string | null = null;
      let query_sugerida: string | null = null;
      try {
        const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: `Você é especialista em TOTVS RM (Folha, Ponto, Benefícios, eSocial). Responda em formato:
## 📌 RESUMO
## 🔍 CAUSA PROVÁVEL
## 🛠️ AÇÃO RECOMENDADA
## 💻 QUERY SQL (se aplicável)
\`\`\`sql
-- query
\`\`\`
Seja direto e técnico.`,
              },
              {
                role: "user",
                content: `Assunto: ${subject}\n\nDescrição: ${body}\n\nTipo: ${tipo}${evento_esocial ? `\nEvento eSocial: ${evento_esocial}` : ""}`,
              },
            ],
          }),
        });
        if (aiResp.ok) {
          const aiData = await aiResp.json();
          sugestao_ia = aiData.choices?.[0]?.message?.content || null;
          const sqlMatch = sugestao_ia?.match(/```sql\n?([\s\S]*?)```/);
          if (sqlMatch) query_sugerida = sqlMatch[1].trim();
        }
      } catch (e) {
        console.error("AI failed:", e);
      }

      const { data: chamado, error: chamadoErr } = await supabase
        .from("chamados")
        .insert({
          titulo: subject,
          descricao: `${body}\n\n---\nDe: ${senderName} <${senderEmail}>\nData: ${dateHdr}`,
          tipo,
          prioridade,
          status: "Novo",
          cliente_id,
          eh_esocial,
          evento_esocial,
          sugestao_ia,
          query_sugerida,
        })
        .select()
        .single();

      if (chamadoErr) {
        console.error("Chamado insert failed:", chamadoErr);
        continue;
      }

      await supabase.from("imported_emails").insert({
        gmail_message_id: msg.id,
        chamado_id: chamado.id,
        assunto: subject,
        remetente: senderEmail,
      });

      if (sugestao_ia) {
        await supabase.from("chamado_interactions").insert({
          chamado_id: chamado.id,
          pergunta: `Análise automática do email: ${subject}`,
          resposta: sugestao_ia,
        });
      }

      created.push({ id: chamado.id, titulo: subject, tipo });
      imported++;
    }

    return new Response(
      JSON.stringify({ success: true, imported, skipped, total: messages.length, created }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("import-emails error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Erro" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
