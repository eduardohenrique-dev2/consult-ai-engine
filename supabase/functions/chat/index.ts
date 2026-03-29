import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STANDARDIZED_FORMAT = `
FORMATO OBRIGATÓRIO DE RESPOSTA — siga SEMPRE esta estrutura:

## 📌 RESUMO
Explicação curta do problema (máximo 2 linhas).

## 🔍 CAUSA PROVÁVEL
- Item 1
- Item 2
- Item 3 (máximo 4 itens)

## 🛠️ AÇÃO RECOMENDADA
- [ ] Passo 1
- [ ] Passo 2
- [ ] Passo 3

## 💻 QUERY SQL
\`\`\`sql
-- Query limpa e utilizável (se aplicável)
\`\`\`

## 💡 OBSERVAÇÃO
Nota curta opcional.

REGRAS:
- Seja direto e técnico — sem textos longos
- Foco em execução prática
- Linguagem de consultoria TOTVS RM
- Sempre sugira ação concreta
- Se não houver query relevante, omita a seção SQL
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, pageContext, conversationId, chamadoId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const lastUserMessage = [...messages].reverse().find((m: any) => m.role === "user")?.content || "";

    // RAG: Search base_conhecimento
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
          knowledgeResults.map((r: any) => `[${r.tipo}] ${r.titulo}:\n${r.conteudo}`).join("\n\n") +
          "\n--- FIM DA BASE DE CONHECIMENTO ---\n";
      }
    }

    // Fetch chamado history if chamadoId provided
    let chamadoHistory = "";
    if (chamadoId) {
      const { data: interactions } = await supabase
        .from("chamado_interactions")
        .select("pergunta, resposta, created_at")
        .eq("chamado_id", chamadoId)
        .order("created_at", { ascending: true })
        .limit(10);

      if (interactions?.length) {
        chamadoHistory = "\n\n--- HISTÓRICO DE INTERAÇÕES DESTE CHAMADO ---\n" +
          interactions.map((i: any) => `Pergunta: ${i.pergunta}\nResposta: ${i.resposta}`).join("\n---\n") +
          "\n--- FIM DO HISTÓRICO ---\n" +
          "IMPORTANTE: Use este histórico para evitar respostas repetidas e evoluir a análise.\n";
      }
    }

    // Fetch contextual data based on page
    let contextualData = "";
    
    if (pageContext === "chamados" || pageContext === "chat") {
      const { data: recentChamados } = await supabase
        .from("chamados")
        .select("titulo, tipo, status, prioridade, sugestao_ia, descricao")
        .order("created_at", { ascending: false })
        .limit(10);

      if (recentChamados?.length) {
        contextualData += "\n\n--- CHAMADOS RECENTES ---\n" +
          recentChamados.map((c: any) => `- ${c.titulo} (${c.tipo}, ${c.status}, prioridade: ${c.prioridade})${c.descricao ? ` - ${c.descricao}` : ""}`).join("\n") +
          "\n--- FIM ---\n";
      }
    }

    if (pageContext === "clientes" || pageContext === "monitoramento") {
      const { data: clientes } = await supabase
        .from("clientes")
        .select("nome, status, problemas, cnpj")
        .limit(20);

      if (clientes?.length) {
        contextualData += "\n\n--- CLIENTES ---\n" +
          clientes.map((c: any) => `- ${c.nome} (${c.status})${c.problemas?.length ? ` Problemas: ${c.problemas.join(", ")}` : ""}`).join("\n") +
          "\n--- FIM ---\n";
      }
    }

    if (pageContext === "dashboard") {
      const { data: stats } = await supabase.from("chamados").select("status, prioridade, tipo");
      if (stats?.length) {
        const total = stats.length;
        const abertos = stats.filter((s: any) => s.status !== "Finalizado").length;
        const criticos = stats.filter((s: any) => s.prioridade === "critica").length;
        contextualData += `\n\n--- MÉTRICAS DASHBOARD ---\nTotal chamados: ${total}\nAbertos: ${abertos}\nCríticos: ${criticos}\n--- FIM ---\n`;
      }
    }

    const pageInstructions: Record<string, string> = {
      dashboard: "O usuário está no Dashboard. Ajude com métricas, KPIs e análise de performance.",
      chamados: "O usuário está na tela de Chamados. Ajude a resolver tickets, sugerir SQL, e diagnosticar problemas TOTVS RM.",
      clientes: "O usuário está na tela de Clientes. Ajude com análise de clientes, integrações e status.",
      monitoramento: "O usuário está no Monitoramento. Ajude com saúde das integrações e alertas.",
      conhecimento: "O usuário está na Base de Conhecimento. Ajude a criar e organizar documentação técnica.",
      automacoes: "O usuário está em Automações. Ajude com fluxos automatizados e regras de negócio.",
      configuracoes: "O usuário está em Configurações. Ajude com configuração do sistema.",
      chat: "O usuário está no Chat IA dedicado. Responda qualquer pergunta sobre TOTVS RM.",
    };

    const pageInstruction = pageInstructions[pageContext || "chat"] || pageInstructions.chat;

    const systemPrompt = `Você é o PM Intelligence Assistant, copiloto operacional da Pereira Marques Consultoria, especialista em TOTVS RM.

${pageInstruction}

Suas capacidades:
1. Responder sobre TOTVS RM (Folha, Ponto, Benefícios, eSocial)
2. Gerar queries SQL para Oracle RM (PFUNC, PFFINANC, PBENEFICIO, PRUBRICAS, etc.)
3. Diagnosticar erros comuns
4. Sugerir soluções baseadas na base de conhecimento interna
5. Analisar dados do sistema (chamados, clientes, métricas)

${STANDARDIZED_FORMAT}

- Priorize informações da base de conhecimento (RAG) quando disponível
- Responda em português brasileiro

${ragContext}${chamadoHistory}${contextualData}`;

    // Save user message to DB if conversationId provided
    if (conversationId) {
      await supabase.from("chat_messages").insert({
        conversation_id: conversationId,
        role: "user",
        content: lastUserMessage,
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Erro no gateway de IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
