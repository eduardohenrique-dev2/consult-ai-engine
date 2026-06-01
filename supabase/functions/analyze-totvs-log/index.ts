// Analisa log/erro TOTVS RM. Cruza com base local antes de chamar IA externa. Respeita modo offline.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PATTERNS: { re: RegExp; label: string; hint: string }[] = [
  { re: /ORA-(\d{4,5})/i, label: "Erro Oracle", hint: "Erro do banco Oracle. Validar permissão, lock ou integridade referencial." },
  { re: /S-(1\d{3}|2\d{3}|3000)/i, label: "Evento eSocial", hint: "Validar XML do evento em Folha → eSocial → Monitor." },
  { re: /CODCOLIGADA/i, label: "Coligada RM", hint: "Possível divergência entre coligada do usuário e do registro." },
  { re: /timeout|connection refused/i, label: "Conectividade", hint: "Verificar serviço RM.Host e conectividade com SQL." },
  { re: /lock|deadlock/i, label: "Lock de tabela", hint: "Sessão travando recurso; analisar V$LOCK e processo concorrente." },
  { re: /null pointer|stack trace|exception/i, label: "Exception .NET", hint: "Falha de runtime no RM. Coletar stack e versão da fórmula/customização." },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { log, chamadoId } = await req.json();
    if (!log || typeof log !== "string") {
      return new Response(JSON.stringify({ error: "log obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const KEY = Deno.env.get("LOVABLE_API_KEY");

    // 1. Reconhecer padrões
    const matched = PATTERNS.filter((p) => p.re.test(log)).map((p) => ({ label: p.label, hint: p.hint }));

    // 2. Buscar base local pelos termos detectados
    const tokens = Array.from(new Set((log.match(/ORA-\d{4,5}|S-\d{4}|[A-Z]{3,}/g) || []).slice(0, 5)));
    let baseHits: any[] = [];
    if (tokens.length) {
      const cond = tokens.map((t) => `titulo.ilike.%${t}%,conteudo.ilike.%${t}%`).join(",");
      const { data } = await supabase.from("base_conhecimento")
        .select("titulo, conteudo, categoria").or(cond).limit(4);
      baseHits = data || [];
    }

    const { data: state } = await supabase.from("ai_runtime_state").select("mode").eq("id", 1).maybeSingle();
    const offline = state?.mode === "offline" || !KEY;

    // 3. Compor análise
    let analysis = "";
    if (offline) {
      analysis = `## 📌 ANÁLISE LOCAL (offline)\n\nPadrões reconhecidos:\n` +
        (matched.length ? matched.map((m) => `- **${m.label}** — ${m.hint}`).join("\n") : "- Nenhum padrão conhecido reconhecido.") +
        (baseHits.length ? `\n\n## 📚 Referências internas\n` + baseHits.map((b) => `- [${b.categoria}] ${b.titulo}`).join("\n") : "");
      return new Response(JSON.stringify({ analysis, matched, baseHits, mode: "offline" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const sys = `Você é especialista em análise de logs TOTVS RM. Receberá um log e padrões já reconhecidos. ` +
      `Identifique causa raiz, ação corretiva, e (se aplicável) query SQL de diagnóstico no banco RM (Oracle ou SQL Server). ` +
      `Formato em markdown.`;
    const user = `LOG:\n${log.slice(0, 6000)}\n\nPADRÕES:\n${JSON.stringify(matched)}\n\nBASE INTERNA:\n${JSON.stringify(baseHits)}`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: sys }, { role: "user", content: user }],
      }),
    });

    if (r.status === 402 || r.status === 429) {
      // fallback ad-hoc
      analysis = `> ⚠️ IA externa indisponível. Análise local.\n\n` +
        (matched.length ? matched.map((m) => `- **${m.label}** — ${m.hint}`).join("\n") : "- Sem padrão conhecido.");
      return new Response(JSON.stringify({ analysis, matched, baseHits, mode: "offline" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!r.ok) throw new Error(`gateway ${r.status}`);
    const j = await r.json();
    analysis = j.choices?.[0]?.message?.content || "Sem resposta.";

    // log opcional no chamado
    if (chamadoId) {
      await supabase.from("chamado_interactions").insert({
        chamado_id: chamadoId,
        pergunta: "[Analisar log] " + log.slice(0, 200),
        resposta: analysis,
      });
    }

    return new Response(JSON.stringify({ analysis, matched, baseHits, mode: "online" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
