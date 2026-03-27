import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { monthStart, monthEnd, monthLabel } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: chamados } = await supabase
      .from("chamados")
      .select("*, clientes(nome)")
      .gte("created_at", monthStart)
      .lte("created_at", monthEnd);

    const tickets = chamados || [];
    const total = tickets.length;
    const finalizados = tickets.filter((c: any) => c.status === "Finalizado").length;
    const abertos = total - finalizados;
    const taxaResolucao = total > 0 ? Math.round((finalizados / total) * 100) : 0;

    const byType: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    const byClient: Record<string, number> = {};

    for (const c of tickets) {
      byType[c.tipo] = (byType[c.tipo] || 0) + 1;
      byPriority[c.prioridade] = (byPriority[c.prioridade] || 0) + 1;
      const clientName = (c as any).clientes?.nome || "Sem cliente";
      byClient[clientName] = (byClient[clientName] || 0) + 1;
    }

    const metricsContext = `
Relatório Mensal: ${monthLabel}
- Total de chamados: ${total}
- Finalizados: ${finalizados}
- Em aberto: ${abertos}
- Taxa de resolução: ${taxaResolucao}%
- Por tipo: ${Object.entries(byType).map(([k, v]) => `${k}: ${v}`).join(", ")}
- Por prioridade: ${Object.entries(byPriority).map(([k, v]) => `${k}: ${v}`).join(", ")}
- Por cliente: ${Object.entries(byClient).map(([k, v]) => `${k}: ${v}`).join(", ")}
`;

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
            content: `Você é um analista gerencial da Pereira Marques Consultoria (TOTVS RM). 
Gere um resumo executivo do relatório mensal com:
1. Visão geral do mês
2. Destaques positivos
3. Pontos de atenção
4. Recomendações estratégicas
Seja conciso, profissional e objetivo. Máximo 300 palavras. Responda em português.`,
          },
          { role: "user", content: metricsContext },
        ],
      }),
    });

    if (!aiResp.ok) throw new Error("AI gateway error");

    const aiData = await aiResp.json();
    const summary = aiData.choices?.[0]?.message?.content || "Resumo não disponível.";

    return new Response(
      JSON.stringify({
        summary,
        metrics: { total, finalizados, abertos, taxaResolucao, byType, byPriority, byClient },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-report error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
