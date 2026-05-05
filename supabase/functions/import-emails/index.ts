import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GMAIL_GATEWAY = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";
const ALLOWED_MIME = /^(image\/(png|jpe?g|gif|webp)|application\/pdf|text\/plain)$/i;
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10MB

function decodeBase64Url(s: string): string {
  try {
    const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 ? b64 + "=".repeat(4 - (b64.length % 4)) : b64;
    return new TextDecoder().decode(Uint8Array.from(atob(pad), (c) => c.charCodeAt(0)));
  } catch {
    return "";
  }
}

function decodeBase64UrlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 ? b64 + "=".repeat(4 - (b64.length % 4)) : b64;
  return Uint8Array.from(atob(pad), (c) => c.charCodeAt(0));
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

function collectAttachments(payload: any, out: any[] = []): any[] {
  if (!payload) return out;
  if (payload.filename && payload.body?.attachmentId) {
    out.push({
      filename: payload.filename,
      mimeType: payload.mimeType || "application/octet-stream",
      attachmentId: payload.body.attachmentId,
      size: payload.body.size || 0,
    });
  }
  if (payload.parts) for (const p of payload.parts) collectAttachments(p, out);
  return out;
}

function parseSender(from: string): { name: string; email: string } {
  const m = from.match(/^(.*?)\s*<(.+?)>\s*$/);
  if (m) return { name: m[1].replace(/"/g, "").trim(), email: m[2].trim() };
  return { name: from.trim(), email: from.trim() };
}

function classify(subject: string, body: string, defaultCat?: string | null) {
  const text = `${subject} ${body}`.toLowerCase();
  const esocialMatch = text.match(/s-(1200|1210|2200|2299|1010|1020|2230|3000)/);
  const eh_esocial = !!esocialMatch || /esocial|e-social|dctfweb/.test(text);
  const evento_esocial = esocialMatch ? `S-${esocialMatch[1]}` : null;
  let tipo = "Folha";
  let categoria = defaultCat && defaultCat !== "auto" ? defaultCat : "Geral";
  if (eh_esocial) { tipo = "eSocial"; categoria = "eSocial"; }
  else if (/folha|salário|salario|holerite|rubrica/.test(text)) { tipo = "Folha"; categoria = categoria === "Geral" ? "Folha" : categoria; }
  else if (/ponto|jornada|hora extra/.test(text)) { tipo = "Ponto"; categoria = categoria === "Geral" ? "Ponto" : categoria; }
  else if (/benefíc|beneficio|vale|plano de saúde/.test(text)) { tipo = "Benefício"; categoria = categoria === "Geral" ? "Benefícios" : categoria; }
  return { tipo, categoria, eh_esocial, evento_esocial };
}

function classifyPriority(subject: string, body: string): string {
  const t = `${subject} ${body}`.toLowerCase();
  if (/urgente|crítico|critico|parado|bloqueado/.test(t)) return "critica";
  if (/erro|falha|problema/.test(t)) return "alta";
  return "media";
}

function classifyRisk(subject: string, body: string, settings: any): { nivel: string; motivo: string | null } {
  const t = `${subject} ${body}`.toLowerCase();
  // Alto risco: rescisão, jurídico, valores altos
  if (settings?.bloquear_rescisoes && /rescis[aã]o|demiss[aã]o|justa causa|acordo trabalhista/.test(t)) {
    return { nivel: "alto", motivo: "Conteúdo sobre rescisão/demissão" };
  }
  if (/jur[ií]dic|processo trabalhista|advogado|reclamat[óo]ria/.test(t)) {
    return { nivel: "alto", motivo: "Conteúdo jurídico" };
  }
  // Valores altos
  if (settings?.bloquear_valores_altos) {
    const limite = Number(settings?.valor_limite ?? 10000);
    const valores = [...t.matchAll(/r\$?\s*([\d\.\,]+)/g)].map(m => Number(m[1].replace(/\./g, "").replace(",", ".")));
    if (valores.some(v => !isNaN(v) && v >= limite)) return { nivel: "alto", motivo: `Valor financeiro alto (>= R$ ${limite})` };
  }
  // Médio: cálculos, legislação
  if (/c[áa]lculo|encargos|legisla[cç][aã]o|interpreta[cç][aã]o/.test(t)) {
    return { nivel: "medio", motivo: "Conteúdo envolve cálculo/legislação" };
  }
  return { nivel: "baixo", motivo: null };
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

function detectAttachmentType(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "imagem";
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.startsWith("text/")) return "texto";
  return "outro";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GOOGLE_MAIL_API_KEY = Deno.env.get("GOOGLE_MAIL_API_KEY");
    if (!LOVABLE_API_KEY || !GOOGLE_MAIL_API_KEY) {
      throw new Error("Gmail não conectado");
    }

    let body: any = {};
    try { body = await req.json(); } catch { /* trigger sem body */ }
    const classificacao_padrao: string | null = body?.classificacao_padrao || null;
    const usuario_id: string | null = body?.usuario_id || null;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: settings } = await supabase.from("system_settings").select("*").limit(1).maybeSingle();
    const autoReply = settings?.auto_reply_enabled === true;
    const threshold = Number(settings?.confidence_threshold ?? 0.85);
    const categoriasAuto: string[] = settings?.categorias_permitidas_auto || ["Geral", "Folha", "Ponto", "Beneficios"];

    const gmailHeaders = {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": GOOGLE_MAIL_API_KEY,
    };

    const listResp = await fetch(`${GMAIL_GATEWAY}/users/me/messages?maxResults=20&q=in:inbox`, { headers: gmailHeaders });
    if (!listResp.ok) throw new Error(`Gmail list falhou [${listResp.status}]: ${await listResp.text()}`);
    const listData = await listResp.json();
    const messages = listData.messages || [];

    // Cria log de importação inicial
    const { data: logRow } = await supabase.from("email_import_logs").insert({
      usuario_id,
      classificacao_padrao,
      total_processados: 0,
      total_importados: 0,
      total_duplicados: 0,
      total_erros: 0,
      status: "sucesso",
    }).select().single();
    const logId = logRow?.id;

    let imported = 0, skipped = 0, linked = 0, autoReplied = 0, errors = 0, totalAnexos = 0;

    for (const msg of messages) {
      try {
        const { data: existing } = await supabase
          .from("imported_emails").select("id").eq("gmail_message_id", msg.id).maybeSingle();
        if (existing) {
          skipped++;
          if (logId) await supabase.from("email_import_log_itens").insert({
            log_id: logId, email_id: msg.id, status: "duplicado",
          });
          continue;
        }

        const detailResp = await fetch(`${GMAIL_GATEWAY}/users/me/messages/${msg.id}?format=full`, { headers: gmailHeaders });
        if (!detailResp.ok) { errors++; continue; }
        const detail = await detailResp.json();

        const headers = detail.payload?.headers || [];
        const getH = (n: string) => headers.find((h: any) => h.name.toLowerCase() === n)?.value || "";
        const subject = getH("subject") || "(sem assunto)";
        const from = getH("from");
        const dateHdr = getH("date");
        const messageIdHdr = getH("message-id");
        const emailBody = extractBody(detail.payload).slice(0, 5000);
        const { name: senderName, email: senderEmail } = parseSender(from);
        const threadId = detail.threadId || null;

        const { tipo, categoria, eh_esocial, evento_esocial } = classify(subject, emailBody, classificacao_padrao);
        const prioridade = classifyPriority(subject, emailBody);
        const confianca = estimateConfidence(subject, emailBody, tipo);
        const risco = classifyRisk(subject, emailBody, settings);

        // Cliente match
        let cliente_id: string | null = null;
        if (senderEmail) {
          const { data: clienteMatch } = await supabase.from("clientes").select("id")
            .or(`contato.ilike.%${senderEmail}%,nome.ilike.%${senderName}%`).limit(1);
          if (clienteMatch?.length) cliente_id = clienteMatch[0].id;
        }

        // Existing chamado por thread
        let existingChamado: any = null;
        if (threadId) {
          const { data } = await supabase.from("chamados").select("*").eq("thread_id", threadId).limit(1).maybeSingle();
          if (data) existingChamado = data;
        }

        // AI suggestion
        let sugestao_ia: string | null = null;
        let query_sugerida: string | null = null;
        try {
          const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                { role: "system", content: `Você é especialista em TOTVS RM (Folha, Ponto, Benefícios, eSocial). Responda em português, formato:
## 📌 RESUMO
## 🔍 CAUSA PROVÁVEL
## 🛠️ AÇÃO RECOMENDADA
## ✉️ RESPOSTA SUGERIDA AO CLIENTE
(texto pronto)
## 💻 QUERY SQL
\`\`\`sql
-- query
\`\`\`` },
                { role: "user", content: `Categoria pré-classificada: ${categoria}\nAssunto: ${subject}\n\nDescrição: ${emailBody}\n\nTipo: ${tipo}${evento_esocial ? `\nEvento eSocial: ${evento_esocial}` : ""}` },
              ],
            }),
          });
          if (aiResp.ok) {
            const aiData = await aiResp.json();
            sugestao_ia = aiData.choices?.[0]?.message?.content || null;
            const sqlMatch = sugestao_ia?.match(/```sql\n?([\s\S]*?)```/);
            if (sqlMatch) query_sugerida = sqlMatch[1].trim();
          }
        } catch (e) { console.error("AI failed:", e); }

        let chamadoId: string;
        if (existingChamado) {
          const novaDescricao = `${existingChamado.descricao || ""}\n\n--- Nova mensagem (${dateHdr}) ---\n${emailBody}`;
          await supabase.from("chamados").update({
            descricao: novaDescricao,
            status: existingChamado.status === "Finalizado" ? "Em análise" : existingChamado.status,
            sugestao_ia, query_sugerida, confianca_ia: confianca,
            nivel_risco: risco.nivel, motivo_bloqueio_auto: risco.motivo,
          }).eq("id", existingChamado.id);
          chamadoId = existingChamado.id;
          linked++;
        } else {
          const { data: chamado, error: chamadoErr } = await supabase.from("chamados").insert({
            titulo: subject,
            descricao: `${emailBody}\n\n---\nDe: ${senderName} <${senderEmail}>\nData: ${dateHdr}`,
            tipo, categoria, prioridade, status: "Novo", cliente_id,
            eh_esocial, evento_esocial, sugestao_ia, query_sugerida,
            thread_id: threadId, confianca_ia: confianca,
            nivel_risco: risco.nivel, motivo_bloqueio_auto: risco.motivo,
          }).select().single();
          if (chamadoErr) {
            errors++;
            if (logId) await supabase.from("email_import_log_itens").insert({
              log_id: logId, email_id: msg.id, assunto: subject, remetente: senderEmail,
              status: "erro", mensagem_erro: chamadoErr.message,
            });
            continue;
          }
          chamadoId = chamado.id;
          imported++;
        }

        // === ANEXOS ===
        const anexos = collectAttachments(detail.payload);
        let anexosOk = 0;
        for (const att of anexos) {
          if (!ALLOWED_MIME.test(att.mimeType)) continue;
          if (att.size > MAX_ATTACHMENT_BYTES) continue;
          try {
            const attResp = await fetch(
              `${GMAIL_GATEWAY}/users/me/messages/${msg.id}/attachments/${att.attachmentId}`,
              { headers: gmailHeaders },
            );
            if (!attResp.ok) continue;
            const attData = await attResp.json();
            const bytes = decodeBase64UrlToBytes(attData.data);
            const safeName = att.filename.replace(/[^\w.\-]/g, "_");
            const path = `${chamadoId}/${Date.now()}_${safeName}`;
            const { error: upErr } = await supabase.storage.from("chamado-anexos").upload(path, bytes, {
              contentType: att.mimeType, upsert: false,
            });
            if (upErr) { console.error("upload err:", upErr); continue; }
            const { data: pub } = supabase.storage.from("chamado-anexos").getPublicUrl(path);

            // OCR/extração simples via IA para imagens (texto extraído)
            let texto_extraido: string | null = null;
            if (att.mimeType.startsWith("image/")) {
              try {
                const visionResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                  method: "POST",
                  headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
                  body: JSON.stringify({
                    model: "google/gemini-2.5-flash",
                    messages: [{
                      role: "user",
                      content: [
                        { type: "text", text: "Extraia todo o texto visível desta imagem (OCR). Se houver mensagem de erro do TOTVS RM, destaque. Responda em português, conciso." },
                        { type: "image_url", image_url: { url: `data:${att.mimeType};base64,${attData.data.replace(/-/g, "+").replace(/_/g, "/")}` } },
                      ],
                    }],
                  }),
                });
                if (visionResp.ok) {
                  const vd = await visionResp.json();
                  texto_extraido = vd.choices?.[0]?.message?.content || null;
                }
              } catch (e) { console.error("vision failed:", e); }
            }

            await supabase.from("chamado_anexos").insert({
              chamado_id: chamadoId, nome_arquivo: att.filename, url: pub.publicUrl,
              storage_path: path, tipo: detectAttachmentType(att.mimeType),
              tamanho_bytes: att.size, texto_extraido, origem: "email",
            });
            anexosOk++; totalAnexos++;
          } catch (e) {
            console.error("attachment failed:", e);
          }
        }

        await supabase.from("imported_emails").insert({
          gmail_message_id: msg.id, chamado_id: chamadoId, assunto: subject,
          remetente: senderEmail, thread_id: threadId,
          data_email: dateHdr ? new Date(dateHdr).toISOString() : null,
          processed_status: existingChamado ? "linked" : "created",
        });
        await supabase.from("email_logs").insert({
          chamado_id: chamadoId, direction: "inbound", status: "recebido",
          destinatario: senderEmail, assunto: subject, conteudo: emailBody.slice(0, 2000),
        });
        if (sugestao_ia) {
          await supabase.from("chamado_interactions").insert({
            chamado_id: chamadoId, pergunta: `Análise automática do email: ${subject}`, resposta: sugestao_ia,
          });
        }
        if (logId) await supabase.from("email_import_log_itens").insert({
          log_id: logId, email_id: msg.id, assunto: subject, remetente: senderEmail,
          status: "importado", chamado_id: chamadoId, anexos_processados: anexosOk,
        });

        // === AUTO-REPLY com PROTEÇÕES ===
        const podeAutomatico = autoReply
          && sugestao_ia
          && confianca >= threshold
          && senderEmail
          && !existingChamado
          && risco.nivel === "baixo"
          && categoriasAuto.includes(categoria);

        if (podeAutomatico) {
          try {
            const replyMatch = sugestao_ia!.match(/##\s*✉️\s*RESPOSTA SUGERIDA AO CLIENTE\s*\n+([\s\S]*?)(?=\n##|$)/i);
            const replyText = (replyMatch ? replyMatch[1] : sugestao_ia!).trim();
            const signature = settings?.signature || "Resposta automática gerada pelo Assistente PM (revisada por IA)";
            const fullBody = `${replyText}\n\n---\n${signature}`;
            const replySubject = subject.startsWith("Re:") ? subject : `Re: ${subject}`;
            const rfc = [
              `To: ${senderEmail}`, `Subject: ${replySubject}`,
              messageIdHdr ? `In-Reply-To: ${messageIdHdr}` : "",
              messageIdHdr ? `References: ${messageIdHdr}` : "",
              'Content-Type: text/plain; charset="UTF-8"', "", fullBody,
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
                chamado_id: chamadoId, direction: "outbound", status: "enviado",
                destinatario: senderEmail, assunto: replySubject, conteudo: fullBody.slice(0, 2000),
              });
              autoReplied++;
            }
          } catch (e) { console.error("auto-reply failed:", e); }
        } else if (autoReply && sugestao_ia && !existingChamado) {
          // Marca motivo do bloqueio
          const motivo = risco.nivel !== "baixo" ? `risco ${risco.nivel}: ${risco.motivo}` :
            confianca < threshold ? `confiança baixa (${confianca.toFixed(2)} < ${threshold})` :
            !categoriasAuto.includes(categoria) ? `categoria '${categoria}' fora do escopo automático` :
            "modo manual";
          await supabase.from("chamados").update({ motivo_bloqueio_auto: motivo }).eq("id", chamadoId);
        }
      } catch (e) {
        console.error("processing email failed:", e);
        errors++;
      }
    }

    // Atualiza log final
    if (logId) {
      const status = errors > 0 ? (imported > 0 ? "parcial" : "erro") : "sucesso";
      await supabase.from("email_import_logs").update({
        total_processados: messages.length,
        total_importados: imported,
        total_duplicados: skipped,
        total_erros: errors,
        status,
      }).eq("id", logId);
    }

    return new Response(
      JSON.stringify({ success: true, imported, skipped, linked, autoReplied, errors, anexos: totalAnexos, total: messages.length, log_id: logId }),
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
