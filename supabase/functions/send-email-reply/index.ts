import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GMAIL_GATEWAY = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { chamado_id, to, subject, body, original_ai_response } = await req.json();
    if (!chamado_id || !to || !subject || !body) {
      return new Response(JSON.stringify({ error: "campos obrigatórios faltando" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
    const GOOGLE_MAIL_API_KEY = Deno.env.get("GOOGLE_MAIL_API_KEY")!;
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: chamado } = await supabase.from("chamados").select("thread_id").eq("id", chamado_id).maybeSingle();
    const { data: settings } = await supabase.from("system_settings").select("signature").limit(1).maybeSingle();
    const signature = settings?.signature || "Resposta gerada pelo Assistente PM (revisada por consultor)";

    const fullBody = `${body}\n\n---\n${signature}`;
    const replySubject = subject.startsWith("Re:") ? subject : `Re: ${subject}`;
    const rfc = [
      `To: ${to}`,
      `Subject: ${replySubject}`,
      'Content-Type: text/plain; charset="UTF-8"',
      "",
      fullBody,
    ].join("\r\n");
    const raw = btoa(unescape(encodeURIComponent(rfc))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

    const sendResp = await fetch(`${GMAIL_GATEWAY}/users/me/messages/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": GOOGLE_MAIL_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw, threadId: chamado?.thread_id || undefined }),
    });

    if (!sendResp.ok) {
      const err = await sendResp.text();
      await supabase.from("email_logs").insert({
        chamado_id, direction: "outbound", status: "erro",
        destinatario: to, assunto: replySubject, erro: err,
      });
      throw new Error(`Falha ao enviar: ${err}`);
    }

    await supabase.from("chamados").update({ resposta_enviada: true }).eq("id", chamado_id);

    await supabase.from("email_logs").insert({
      chamado_id, direction: "outbound", status: "enviado",
      destinatario: to, assunto: replySubject, conteudo: fullBody.slice(0, 2000),
    });

    // Loop de aprendizado: se a resposta enviada difere da sugerida, registrar
    if (original_ai_response && original_ai_response.trim() !== body.trim()) {
      await supabase.from("ai_learning").insert({
        chamado_id,
        resposta_original: original_ai_response.slice(0, 5000),
        resposta_corrigida: body.slice(0, 5000),
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-email-reply error:", e);
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
