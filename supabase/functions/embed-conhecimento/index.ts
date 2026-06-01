// Indexa entries (base_conhecimento ou knowledge_entries) gerando embeddings via Lovable AI Gateway.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function chunkText(text: string, size = 900, overlap = 150): string[] {
  if (!text) return [];
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + size));
    i += size - overlap;
  }
  return chunks;
}

async function embed(text: string, key: string): Promise<number[] | null> {
  const r = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai/text-embedding-3-small",
      input: text,
    }),
  });
  if (!r.ok) {
    console.error("embed failed", r.status, await r.text());
    return null;
  }
  const j = await r.json();
  return j.data?.[0]?.embedding ?? null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { target, id } = body as { target: "conhecimento" | "knowledge_entry"; id: string };
    const KEY = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (target === "conhecimento") {
      const { data: doc, error } = await supabase
        .from("base_conhecimento").select("id, titulo, conteudo, categoria, tipo").eq("id", id).single();
      if (error || !doc) throw new Error("doc não encontrado");

      await supabase.from("base_conhecimento_chunks").delete().eq("conhecimento_id", id);

      const chunks = chunkText(`${doc.titulo}\n\n${doc.conteudo}`);
      const rows: any[] = [];
      for (const c of chunks) {
        const emb = await embed(c, KEY);
        if (!emb) continue;
        rows.push({
          conhecimento_id: id,
          chunk: c,
          embedding: emb,
          metadata: { titulo: doc.titulo, categoria: doc.categoria, tipo: doc.tipo },
        });
      }
      if (rows.length) await supabase.from("base_conhecimento_chunks").insert(rows);

      return new Response(JSON.stringify({ ok: true, chunks: rows.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (target === "knowledge_entry") {
      const { data: e } = await supabase
        .from("knowledge_entries").select("id, problema, contexto, solucao").eq("id", id).single();
      if (!e) throw new Error("entry não encontrado");
      const emb = await embed(`${e.problema}\n${e.contexto || ""}\n${e.solucao}`, KEY);
      if (emb) await supabase.from("knowledge_entries").update({ embedding: emb }).eq("id", id);
      return new Response(JSON.stringify({ ok: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "target inválido" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
