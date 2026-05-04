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

function classify(subject: string, body: string): { tipo: string; categoria: string; eh_esocial: boolean; evento_esocial: string | null } {
  const text = `${subject} ${body}`.toLowerCase();
  const esocialMatch = text.match(/s-(1200|1210|2200|2299|1010|1020)/);
  const eh_esocial = !!esocialMatch || /esocial|e-social|dctfweb/.test(text);
  const evento_esocial = esocialMatch ? `S-${esocialMatch[1]}` : null;
  let tipo = "Folha";
  let categoria = "Geral";
  if (eh_esocial) { tipo = "eSocial"; categoria = "eSocial"; }
  else if (/folha|salário|salario|holerite|rubrica/.test(text)) { tipo = "Folha"; categoria = "Folha"; }
  else if (/ponto|jornada|hora extra/.test(text)) { tipo = "Ponto"; categoria = "Ponto"; }
  else if (/benefíc|beneficio|vale|plano de saúde/.test(text)) { tipo = "Benefício"; categoria = "Benefícios"; }
  return { tipo, categoria, eh_esocial, evento_esocial };
}

function classifyPriority(subject: string, body: string): string {
  const t = `${subject} ${body}`.toLowerCase();
  if (/urgente|crítico|critico|parado|bloqueado/.test(t)) return "critica";
  if (/erro|falha|problema/.test(t)) return "alta";
  return "media";
}

function estimateConfidence(subject: string, body: string, tipo: string): number {
  let score = 0.5;
  const text = `${subject} ${body}`.toLowerCase();
  if (tipo === "eSocial" && /s-\d{4}/.test(text)) score += 0.3;
  if (body.length > 100) score += 0.1;
  if (/urgente|crítico|ambíguo|não sei|talvez/.test(text)) score -= 0.2;
  if (subject.length > 10) score += 0.05;
  return Math.max(0, Math.min(1, score));
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

    // Load system settings
    const { data: settings } = await supabase.from("system_settings").select("*").limit(1).maybeSingle();
    const autoReply = settings?.auto_reply_enabled === true;
    const threshold = Number(settings?.confidence_threshold ?? 0.85);

    const gmailHeaders = {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": GOOGLE_MAIL_API_KEY,
    };

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
    let linked = 0;
    let autoReplied = 0;

    for (const msg of messages) {
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
      const getH = (n: string) => headers.find((h: any) => h.name.toLowerCase() === n)?.value || "";
      const subject = getH("subject") || "(sem assunto)";
      const from = getH("from");
      const dateHdr = getH("date");
      const messageIdHdr = getH("message-id");
      const body = extractBody(detail.payload).slice(0, 5000);
      const { name: senderName, email: senderEmail } = parseSender(from);
      const threadId = detail.threadId || null;

      const { tipo, categoria, eh_esocial, evento_esocial } = classify(subject, body);
      const prioridade = classifyPriority(subject, body);
      const confianca = estimateConfidence(subject, body, tipo);

      // Try to link to existing chamado by thread_id
      let existingChamado: any = null;
      if (threadId) {
        const { data } = await supabase
          .from("chamados")
          .select("*")
          .eq("thread_id", threadId)
          .limit(1)
          .maybeSingle();
        if (data) existingChamado = data;
      }

      // Match cliente
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
                content: `Você é especialista em TOTVS RM (Folha, Ponto, Benefícios, eSocial). Gere uma resposta de email profissional ao cliente, em português, formato:
## 📌 RESUMO
## 🔍 CAUSA PROVÁVEL
## 🛠️ AÇÃO RECOMENDADA
## ✉️ RESPOSTA SUGERIDA AO CLIENTE
(texto do email pronto para envio)
## 💻 QUERY SQL (se aplicável)
\`\`\`sql
-- query
\`\`\`
Seja direto, técnico e cordial.`,
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

      let chamadoId: string;

      if (existingChamado) {
        // Append to existing
        const novaDescricao = `${existingChamado.descricao || ""}\n\n--- Nova mensagem (${dateHdr}) ---\n${body}`;
        await supabase.from("chamados").update({
          descricao: novaDescricao,
          status: existingChamado.status === "Finalizado" ? "Em análise" : existingChamado.status,
          sugestao_ia,
          query_sugerida,
          confianca_ia: confianca,
        }).eq("id", existingChamado.id);
        chamadoId = existingChamado.id;
        linked++;
      } else {
        const { data: chamado, error: chamadoErr } = await supabase
          .from("chamados")
          .insert({
            titulo: subject,
            descricao: `${body}\n\n---\nDe: ${senderName} <${senderEmail}>\nData: ${dateHdr}`,
            tipo,
            categoria,
            prioridade,
            status: "Novo",
            cliente_id,
            eh_esocial,
            evento_esocial,
            sugestao_ia,
            query_sugerida,
            thread_id: threadId,
            confianca_ia: confianca,
          })
          .select()
          .single();
        if (chamadoErr) { console.error("Chamado insert failed:", chamadoErr); continue; }
        chamadoId = chamado.id;
        imported++;
      }

      await supabase.from("imported_emails").insert({
        gmail_message_id: msg.id,
        chamado_id: chamadoId,
        assunto: subject,
        remetente: senderEmail,
        thread_id: threadId,
        data_email: dateHdr ? new Date(dateHdr).toISOString() : null,
        processed_status: existingChamado ? "linked" : "created",
      });

      await supabase.from("email_logs").insert({
        chamado_id: chamadoId,
        direction: "inbound",
        status: "recebido",
        destinatario: senderEmail,
        assunto: subject,
        conteudo: body.slice(0, 2000),
      });

      if (sugestao_ia) {
        await supabase.from("chamado_interactions").insert({
          chamado_id: chamadoId,
          pergunta: `Análise automática do email: ${subject}`,
          resposta: sugestao_ia,
        });
      }

      // AUTO-REPLY (modo automático) — só se confiança alta e habilitado
      if (autoReply && sugestao_ia && confianca >= threshold && senderEmail && !existingChamado) {
        try {
          const replyMatch = sugestao_ia.match(/##\s*✉️\s*RESPOSTA SUGERIDA AO CLIENTE\s*\n+([\s\S]*?)(?=\n##|$)/i);
          const replyText = (replyMatch ? replyMatch[1] : sugestao_ia).trim();
          const signature = settings?.signature || "Resposta automática gerada pelo Assistente PM (revisada por IA)";
          const fullBody = `${replyText}\n\n---\n${signature}`;

          const replySubject = subject.startsWith("Re:") ? subject : `Re: ${subject}`;
          const rfc = [
            `To: ${senderEmail}`,
            `Subject: ${replySubject}`,
            messageIdHdr ? `In-Reply-To: ${messageIdHdr}` : "",
            messageIdHdr ? `References: ${messageIdHdr}` : "",
            'Content-Type: text/plain; charset="UTF-8"',
            "",
            fullBody,
          ].filter(Boolean).join("\r\n");
          const raw = btoa(unescape(encodeURIComponent(rfc))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

          const sendResp = await fetch(`${GMAIL_GATEWAY}/users/me/messages/send`, {
            method: "POST",
            headers: { ...gmailHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({ raw, threadId }),
          });

          if (sendResp.ok) {
            await supabase.from("chamados").update({ resposta_enviada: true, status: "Em análise" }).eq("id", chamadoId);
            await supabase.from("email_logs").insert({
              chamado_id: chamadoId,
              direction: "outbound",
              status: "enviado",
              destinatario: senderEmail,
              assunto: replySubject,
              conteudo: fullBody.slice(0, 2000),
            });
            autoReplied++;
          } else {
            await supabase.from("email_logs").insert({
              chamado_id: chamadoId, direction: "outbound", status: "erro",
              destinatario: senderEmail, assunto: replySubject,
              erro: `Gmail send failed [${sendResp.status}]: ${await sendResp.text()}`,
            });
          }
        } catch (e) {
          console.error("auto-reply failed:", e);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, imported, skipped, linked, autoReplied, total: messages.length }),
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
