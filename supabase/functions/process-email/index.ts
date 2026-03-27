import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Auto-classify type based on content
function classifyType(subject: string, body: string): string {
  const text = `${subject} ${body}`.toLowerCase();
  if (text.match(/folha|salário|salario|holerite|pagamento|rubrica|cálculo|calculo|remuneração/)) return "Folha";
  if (text.match(/ponto|jornada|hora extra|intervalo|apontamento|frequência|frequencia/)) return "Ponto";
  if (text.match(/benefício|beneficio|vale|plano de saúde|odontológico|auxílio|cesta/)) return "Benefício";
  if (text.match(/esocial|e-social|s-1200|s-1210|s-2200|s-2299|evento|dctfweb/)) return "eSocial";
  return "Folha";
}

// Auto-classify priority
function classifyPriority(subject: string, body: string, tipo: string): string {
  const text = `${subject} ${body}`.toLowerCase();
  if (text.match(/urgente|crítico|critico|parado|bloqueado|emergência|emergencia/)) return "critica";
  if (tipo === "eSocial" || tipo === "Folha") return "alta";
  if (text.match(/erro|falha|problema|não funciona/)) return "alta";
  return "media";
}

// Validate if it's a real ticket (not spam)
function isValidTicket(subject: string, body: string): boolean {
  if (!subject || subject.trim().length < 3) return false;
  if (!body || body.trim().length < 10) return false;
  const spamPatterns = /unsubscribe|newsletter|marketing|promotional|opt.out/i;
  if (spamPatterns.test(subject) || spamPatterns.test(body)) return false;
  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subject, body, sender, sender_name } = await req.json();

    if (!isValidTicket(subject, body)) {
      return new Response(
        JSON.stringify({ success: false, reason: "Email não identificado como chamado válido" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const tipo = classifyType(subject, body);
    const prioridade = classifyPriority(subject, body, tipo);

    // Try to match sender to a client
    let clienteId: string | null = null;
    if (sender) {
      const { data: clienteMatch } = await supabase
        .from("clientes")
        .select("id")
        .or(`nome.ilike.%${sender_name || ""}%,cnpj.ilike.%${sender || ""}%`)
        .limit(1);
      if (clienteMatch?.length) clienteId = clienteMatch[0].id;
    }

    // Generate AI suggestion if API key available
    let sugestaoIa: string | null = null;
    let querySugerida: string | null = null;

    if (LOVABLE_API_KEY) {
      // RAG: Search knowledge base
      const searchTerms = `${subject} ${body}`.toLowerCase().split(/\s+/).filter(t => t.length > 3).slice(0, 5);
      let ragContext = "";

      if (searchTerms.length > 0) {
        const orConditions = searchTerms.map(t => `titulo.ilike.%${t}%,conteudo.ilike.%${t}%`).join(",");
        const { data: kbResults } = await supabase
          .from("base_conhecimento")
          .select("titulo, conteudo, tipo")
          .or(orConditions)
          .limit(3);

        if (kbResults?.length) {
          ragContext = "\n\nBASE DE CONHECIMENTO:\n" +
            kbResults.map(r => `[${r.tipo}] ${r.titulo}:\n${r.conteudo}`).join("\n\n");
        }
      }

      try {
        const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [
              {
                role: "system",
                content: `Você é um especialista em TOTVS RM. Analise o chamado e forneça:
1. Diagnóstico resumido
2. Solução recomendada
3. Query SQL relevante (se aplicável)
${ragContext}`,
              },
              {
                role: "user",
                content: `Assunto: ${subject}\n\nDescrição: ${body}\n\nTipo classificado: ${tipo}`,
              },
            ],
          }),
        });

        if (aiResp.ok) {
          const aiData = await aiResp.json();
          const fullResponse = aiData.choices?.[0]?.message?.content || "";
          sugestaoIa = fullResponse;

          // Extract SQL if present
          const sqlMatch = fullResponse.match(/```sql\n?([\s\S]*?)```/);
          if (sqlMatch) querySugerida = sqlMatch[1].trim();
        }
      } catch (e) {
        console.error("AI suggestion failed:", e);
      }
    }

    // Create the chamado
    const { data: chamado, error } = await supabase.from("chamados").insert({
      titulo: subject,
      descricao: `${body}\n\n---\nRemetente: ${sender_name || ""} <${sender || ""}>`,
      tipo,
      prioridade,
      status: "Novo",
      cliente_id: clienteId,
      sugestao_ia: sugestaoIa,
      query_sugerida: querySugerida,
    }).select().single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, chamado_id: chamado.id, tipo, prioridade }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("process-email error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
