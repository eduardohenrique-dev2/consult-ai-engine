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

## 🛠️ AÇÃO RECOMENDADA
- [ ] Passo 1
- [ ] Passo 2

## 💻 QUERY SQL
\`\`\`sql
-- Query limpa e utilizável (se aplicável)
\`\`\`

## 💡 OBSERVAÇÃO
Nota curta opcional.
`;

function detectCategoria(q: string): string[] {
  const text = q.toLowerCase();
  const cats: string[] = [];
  if (/(esocial|s-1[02]\d{2}|s-2[02]\d{2}|s-3000|evento s-)/i.test(text)) cats.push("eSocial");
  if (/(folha|fopag|holerite|pfunc|pffinanc|prubrica|rescis[aã]o|f[eé]rias|13[ºo°])/i.test(text)) cats.push("Folha");
  if (/(ponto|batida|hor[aá]rio|jornada|afd|afdt|banco de horas|ppont)/i.test(text)) cats.push("Ponto");
  if (/(benef[ií]cio|vale|vt|vr|va|plano de sa[uú]de|pbenef)/i.test(text)) cats.push("Benefícios");
  if (/(financeiro|cont[aá]bil|lan[cç]amento|fluxo de caixa)/i.test(text)) cats.push("Financeiro");
  if (cats.length === 0) cats.push("Geral");
  return cats;
}

function sseChunk(text: string) {
  const payload = { choices: [{ delta: { content: text } }] };
  return `data: ${JSON.stringify(payload)}\n\n`;
}

function streamFromText(text: string): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  // Split into ~80 char chunks to feel like streaming
  const chunks = text.match(/[\s\S]{1,80}/g) || [text];
  let i = 0;
  return new ReadableStream({
    pull(controller) {
      if (i >= chunks.length) {
        controller.enqueue(enc.encode("data: [DONE]\n\n"));
        controller.close();
        return;
      }
      controller.enqueue(enc.encode(sseChunk(chunks[i])));
      i++;
    },
  });
}

async function setRuntimeMode(supabase: any, mode: string, reason: string | null) {
  await supabase
    .from("ai_runtime_state")
    .update({ mode, reason, since: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", 1);
}

function buildOfflineAnswer(params: {
  question: string;
  categorias: string[];
  knowledge: any[];
  validated: any[];
  chamadoHistory: string;
}): { text: string; confidence: "alto" | "medio" | "baixo" } {
  const { question, categorias, knowledge, validated, chamadoHistory } = params;
  const sources = knowledge.length + validated.length;
  const confidence: "alto" | "medio" | "baixo" =
    sources >= 4 ? "alto" : sources >= 2 ? "medio" : "baixo";

  const header =
    `> ⚠️ **Resposta gerada usando base local e histórico interno.** ` +
    `Busca externa indisponível. **Confiança: ${confidence === "alto" ? "Alta" : confidence === "medio" ? "Média" : "Baixa"}.**\n\n`;

  let body = `## 📌 RESUMO\nPergunta: "${question.slice(0, 200)}"\nCategoria(s): ${categorias.join(", ")}.\n\n`;

  if (validated.length > 0) {
    body += `## 🔍 CONHECIMENTO VALIDADO RELEVANTE\n`;
    validated.slice(0, 3).forEach((v: any, i: number) => {
      body += `**${i + 1}. ${v.problema}**\n${v.solucao}\n\n`;
    });
  }

  if (knowledge.length > 0) {
    body += `## 📚 BASE DE CONHECIMENTO INTERNA\n`;
    knowledge.slice(0, 4).forEach((k: any) => {
      body += `**[${k.categoria || k.tipo}] ${k.titulo}**\n${(k.conteudo || "").slice(0, 600)}\n\n`;
    });
  }

  if (chamadoHistory) {
    body += `## 🧵 CONTEXTO DO CHAMADO\nO histórico anterior deste chamado foi considerado na composição desta resposta.\n\n`;
  }

  if (sources === 0) {
    body += `## ⚠️ SEM REFERÊNCIAS LOCAIS\nNão encontrei conteúdo validado na base local para esta pergunta. ` +
      `Recomendo aguardar o restabelecimento da IA online ou cadastrar conhecimento sobre este tema em **Base de Conhecimento**.\n\n`;
  }

  body += `## 🛠️ AÇÃO RECOMENDADA\n- [ ] Revisar as referências acima\n- [ ] Validar manualmente antes de aplicar em produção\n- [ ] Quando a IA online voltar, reenviar a pergunta para análise complementar\n`;

  return { text: header + body, confidence };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, pageContext, conversationId, chamadoId, forceOffline } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const lastUserMessage = [...messages].reverse().find((m: any) => m.role === "user")?.content || "";
    const categorias = detectCategoria(lastUserMessage);

    // === Runtime state ===
    const { data: state } = await supabase.from("ai_runtime_state").select("*").eq("id", 1).maybeSingle();
    const offlineMode = forceOffline || state?.mode === "offline";

    // === RAG textual (sempre roda, barato) ===
    const searchTerms = lastUserMessage.toLowerCase().split(/\s+/).filter((t: string) => t.length > 3).slice(0, 6);
    let knowledgeResults: any[] = [];

    if (!categorias.includes("Geral")) {
      const { data } = await supabase
        .from("base_conhecimento")
        .select("titulo, conteudo, tipo, categoria")
        .in("categoria", categorias)
        .limit(6);
      if (data) knowledgeResults = data;
    }
    if (searchTerms.length > 0) {
      const orConditions = searchTerms.map((t: string) => `titulo.ilike.%${t}%,conteudo.ilike.%${t}%`).join(",");
      const { data } = await supabase
        .from("base_conhecimento")
        .select("titulo, conteudo, tipo, categoria")
        .or(orConditions)
        .limit(6);
      if (data) {
        const seen = new Set(knowledgeResults.map((r) => r.titulo));
        for (const r of data) if (!seen.has(r.titulo)) { knowledgeResults.push(r); seen.add(r.titulo); }
      }
    }
    knowledgeResults = knowledgeResults.slice(0, 6);

    // === Conhecimento validado ===
    let validatedEntries: any[] = [];
    if (searchTerms.length > 0) {
      const orConditions = searchTerms.map((t: string) => `problema.ilike.%${t}%,solucao.ilike.%${t}%`).join(",");
      const { data } = await supabase
        .from("knowledge_entries")
        .select("problema, solucao, contexto, confianca")
        .eq("validacao", "validada")
        .or(orConditions)
        .limit(4);
      if (data) validatedEntries = data;
    }

    // === Histórico do chamado ===
    let chamadoHistory = "";
    if (chamadoId) {
      const { data: interactions } = await supabase
        .from("chamado_interactions")
        .select("pergunta, resposta")
        .eq("chamado_id", chamadoId)
        .order("created_at", { ascending: true })
        .limit(10);
      if (interactions?.length) {
        chamadoHistory = "\n\n--- HISTÓRICO DO CHAMADO ---\n" +
          interactions.map((i: any) => `P: ${i.pergunta}\nR: ${i.resposta}`).join("\n---\n");
      }
    }

    // === Persistência da mensagem do usuário ===
    if (conversationId) {
      await supabase.from("chat_messages").insert({
        conversation_id: conversationId, role: "user", content: lastUserMessage,
      });
    }

    // ========== MODO FALLBACK ==========
    if (offlineMode || !LOVABLE_API_KEY) {
      const { text, confidence } = buildOfflineAnswer({
        question: lastUserMessage, categorias, knowledge: knowledgeResults, validated: validatedEntries, chamadoHistory,
      });

      // Registra gap se baixa confiança
      if (confidence === "baixo") {
        await supabase.from("knowledge_gaps").insert({
          pergunta: lastUserMessage,
          motivo: "Resposta em modo offline com baixa confiança",
          origem: "chat",
          chamado_id: chamadoId || null,
          conversation_id: conversationId || null,
        });
      }

      return new Response(streamFromText(text), {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "X-AI-Mode": "offline",
          "X-AI-Confidence": confidence,
        },
      });
    }

    // ========== MODO ONLINE ==========
    let ragContext = "";
    if (knowledgeResults.length > 0) {
      ragContext += "\n\n--- BASE DE CONHECIMENTO (Nível 3) ---\n" +
        knowledgeResults.map((r: any) => `[${r.categoria || r.tipo}] ${r.titulo}:\n${r.conteudo}`).join("\n\n");
    }
    if (validatedEntries.length > 0) {
      ragContext += "\n\n--- CONHECIMENTO VALIDADO ---\n" +
        validatedEntries.map((v: any) => `Problema: ${v.problema}\nSolução: ${v.solucao}`).join("\n---\n");
    }

    const systemPrompt = `Você é o PM Intelligence Assistant, copiloto operacional especialista em TOTVS RM e eSocial.

PRIORIDADE DE FONTES:
1. Documentação oficial TOTVS (quando indicada no contexto como tipo='oficial_totvs')
2. Conhecimento validado interno
3. Base de conhecimento geral
4. Seu próprio conhecimento (último recurso, indique explicitamente)

Categoria(s) detectada(s): ${categorias.join(", ")}.

${STANDARDIZED_FORMAT}

- Cite a fonte quando usar trecho da base
- Se a base não cobrir, diga claramente "Conhecimento próprio — recomenda-se validar"
- Português brasileiro

${ragContext}${chamadoHistory}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });

    // ===== Detecta esgotamento e ativa fallback automaticamente =====
    if (response.status === 402 || response.status === 429) {
      await setRuntimeMode(supabase, "offline",
        response.status === 402 ? "Créditos da IA esgotados" : "Rate limit excedido");

      const { text, confidence } = buildOfflineAnswer({
        question: lastUserMessage, categorias, knowledge: knowledgeResults, validated: validatedEntries, chamadoHistory,
      });

      return new Response(streamFromText(text), {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "X-AI-Mode": "offline",
          "X-AI-Confidence": confidence,
          "X-AI-Fallback-Reason": response.status === 402 ? "no_credits" : "rate_limit",
        },
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Erro no gateway de IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sucesso → garante que o estado volta a online
    if (state?.mode !== "online") {
      await setRuntimeMode(supabase, "online", null);
    }

    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "X-AI-Mode": "online",
        "X-AI-Confidence": "alto",
      },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
