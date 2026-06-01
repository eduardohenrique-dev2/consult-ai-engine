import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Activity, AlertTriangle, Clock, Users, TrendingUp } from "lucide-react";

export default function OperationsPage() {
  const { data: chamados = [] } = useQuery({
    queryKey: ["ops-chamados"],
    queryFn: async () => (await supabase.from("chamados").select("status, prioridade, categoria, responsavel_id, created_at, owner_user_id")).data || [],
    refetchInterval: 30_000,
  });
  const { data: feedback = [] } = useQuery({
    queryKey: ["ops-feedback"],
    queryFn: async () => (await supabase.from("conversation_feedback").select("resultado")).data || [],
  });
  const { data: gaps = [] } = useQuery({
    queryKey: ["ops-gaps"],
    queryFn: async () => (await supabase.from("knowledge_gaps").select("status").eq("status", "aberto")).data || [],
  });
  const { data: pendentes = [] } = useQuery({
    queryKey: ["ops-validacoes"],
    queryFn: async () => (await supabase.from("knowledge_entries").select("id").eq("validacao", "pendente")).data || [],
  });

  const abertos = chamados.filter((c: any) => c.status !== "Finalizado").length;
  const criticos = chamados.filter((c: any) => c.prioridade === "critica").length;
  const resolvidos = feedback.filter((f: any) => f.resultado === "resolvido").length;
  const taxaResolucao = feedback.length ? Math.round((resolvidos / feedback.length) * 100) : 0;

  // Carga por consultor
  const cargaMap = new Map<string, number>();
  chamados.forEach((c: any) => {
    if (c.responsavel_id && c.status !== "Finalizado") {
      cargaMap.set(c.responsavel_id, (cargaMap.get(c.responsavel_id) || 0) + 1);
    }
  });
  const cargaList = Array.from(cargaMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);

  // Backlog por categoria
  const catMap = new Map<string, number>();
  chamados.forEach((c: any) => { if (c.status !== "Finalizado") catMap.set(c.categoria || "Sem categoria", (catMap.get(c.categoria || "Sem categoria") || 0) + 1); });
  const catList = Array.from(catMap.entries()).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Activity className="h-6 w-6 text-primary" /> Saúde Operacional</h1>
        <p className="text-sm text-muted-foreground">Visão consolidada para supervisores e administradores.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4"><div className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Chamados abertos</div><p className="text-2xl font-bold mt-1">{abertos}</p></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Críticos</div><p className="text-2xl font-bold mt-1 text-destructive">{criticos}</p></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Resolução IA</div><p className="text-2xl font-bold mt-1">{taxaResolucao}%</p></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Validações pendentes</div><p className="text-2xl font-bold mt-1">{pendentes.length}</p></Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Users className="h-4 w-4" /> Carga por consultor</h3>
          {cargaList.length === 0 && <p className="text-xs text-muted-foreground">Sem dados.</p>}
          <div className="space-y-2">
            {cargaList.map(([uid, n]) => (
              <div key={uid} className="flex justify-between text-xs">
                <span className="font-mono truncate">{uid.slice(0, 8)}</span>
                <span className="font-semibold">{n}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3">Backlog por categoria</h3>
          {catList.length === 0 && <p className="text-xs text-muted-foreground">Sem backlog.</p>}
          <div className="space-y-2">
            {catList.map(([cat, n]) => (
              <div key={cat} className="flex justify-between text-xs"><span>{cat}</span><span className="font-semibold">{n}</span></div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-2">Lacunas de conhecimento abertas</h3>
        <p className="text-2xl font-bold">{gaps.length}</p>
        <p className="text-xs text-muted-foreground mt-1">Vá em Conhecimento → Lacunas para priorizar.</p>
      </Card>
    </div>
  );
}
