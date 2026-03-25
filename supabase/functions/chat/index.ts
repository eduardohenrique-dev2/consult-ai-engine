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
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // RAG: Search base_conhecimento for relevant context
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const lastUserMessage = [...messages].reverse().find((m: any) => m.role === "user")?.content || "";

    // Search knowledge base using text matching
    const searchTerms = lastUserMessage
      .toLowerCase()
      .split(/\s+/)
      .filter((t: string) => t.length > 3)
      .slice(0, 5);

    let ragContext = "";

    if (searchTerms.length > 0) {
      const orConditions = searchTerms
        .map((term: string) => `titulo.ilike.%${term}%,conteudo.ilike.%${term}%`)
        .join(",");

      const { data: knowledgeResults } = await supabase
        .from("base_conhecimento")
        .select("titulo, conteudo, tipo")
        .or(orConditions)
        .limit(5);

      if (knowledgeResults && knowledgeResults.length > 0) {
        ragContext = "\n\n--- BASE DE CONHECIMENTO INTERNA (RAG) ---\n" +
          knowledgeResults
            .map((r: any) => `[${r.tipo}] ${r.titulo}:\n${r.conteudo}`)
            .join("\n\n") +
          "\n--- FIM DA BASE DE CONHECIMENTO ---\n";
      }
    }

    // Also fetch recent chamados for context
    const { data: recentChamados } = await supabase
      .from("chamados")
      .select("titulo, tipo, status, prioridade, sugestao_ia")
      .order("created_at", { ascending: false })
      .limit(5);

    let chamadosContext = "";
    if (recentChamados && recentChamados.length > 0) {
      chamadosContext = "\n\n--- CHAMADOS RECENTES ---\n" +
        recentChamados
          .map((c: any) => `- ${c.titulo} (${c.tipo}, ${c.status}, prioridade: ${c.prioridade})`)
          .join("\n") +
        "\n--- FIM DOS CHAMADOS ---\n";
    }

    const systemPrompt = `Você é o PM Intelligence Assistant, o assistente de IA especializado da Pereira Marques Consultoria, focado em TOTVS RM.

Suas capacidades:
1. Responder perguntas sobre o sistema TOTVS RM (módulos Folha, Ponto, Benefícios, eSocial)
2. Gerar queries SQL para o banco Oracle do RM (tabelas PFUNC, PFFINANC, PBENEFICIO, PRUBRICAS, etc.)
3. Diagnosticar e explicar erros comuns
4. Sugerir soluções baseadas na base de conhecimento interna
5. Resumir e analisar chamados

Regras:
- SEMPRE priorize informações da base de conhecimento interna (RAG) quando disponível
- Formate queries SQL em blocos de código com \`\`\`sql
- Seja direto e profissional, mas acessível
- Quando gerar SQL, explique o que a query faz
- Se não souber algo, diga e sugira onde buscar
- Responda em português brasileiro

${ragContext}${chamadosContext}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados. Adicione fundos na sua conta Lovable." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro no gateway de IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
