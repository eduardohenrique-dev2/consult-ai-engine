import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { image_base64, mime_type, prompt } = await req.json();
    if (!image_base64 || !mime_type) {
      return new Response(JSON.stringify({ error: "image_base64 e mime_type obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurado");

    const userPrompt = prompt?.trim()
      || `Você recebeu uma imagem (provavelmente print de tela do TOTVS RM, eSocial ou erro de sistema).

ANALISE:
1. Extraia todo texto visível (OCR)
2. Identifique mensagens de erro / códigos
3. Determine o contexto (qual módulo / qual evento eSocial)

RESPONDA em português, formato:
## 📌 O QUE A IMAGEM MOSTRA
## ⚠️ ERRO IDENTIFICADO
## 🔍 CAUSA PROVÁVEL
## 🛠️ SOLUÇÃO PRÁTICA
Seja objetivo e técnico.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: userPrompt },
            { type: "image_url", image_url: { url: `data:${mime_type};base64,${image_base64}` } },
          ],
        }],
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      if (resp.status === 429) return new Response(JSON.stringify({ error: "Limite de requisições excedido" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (resp.status === 402) return new Response(JSON.stringify({ error: "Créditos esgotados" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`Vision API failed [${resp.status}]: ${t}`);
    }
    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || "";
    return new Response(JSON.stringify({ success: true, analysis: content }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-image error:", e);
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
