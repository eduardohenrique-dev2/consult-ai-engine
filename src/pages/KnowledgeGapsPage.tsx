import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  aberto: "Aberto", em_analise: "Em análise", resolvido: "Resolvido", descartado: "Descartado",
};

export default function KnowledgeGapsPage() {
  const qc = useQueryClient();
  const { data: gaps = [] } = useQuery({
    queryKey: ["knowledge_gaps"],
    queryFn: async () => {
      const { data } = await supabase.from("knowledge_gaps").select("*").order("created_at", { ascending: false }).limit(100);
      return data || [];
    },
  });

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("knowledge_gaps").update({ status }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["knowledge_gaps"] });
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><AlertTriangle className="h-6 w-6 text-warning" /> Lacunas de Conhecimento</h1>
        <p className="text-sm text-muted-foreground">Perguntas que a IA não conseguiu responder bem — priorize para enriquecer a base.</p>
      </div>
      {gaps.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">Nenhuma lacuna registrada.</Card>}
      <div className="space-y-3">
        {gaps.map((g: any) => (
          <Card key={g.id} className="p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <p className="text-sm font-medium flex-1">{g.pergunta}</p>
              <Badge variant="outline">{STATUS_LABELS[g.status] || g.status}</Badge>
            </div>
            {g.motivo && <p className="text-xs text-muted-foreground mb-2">Motivo: {g.motivo}</p>}
            {g.sugestao && <p className="text-xs text-primary">Sugestão: {g.sugestao}</p>}
            <div className="flex gap-2 justify-end mt-3">
              {g.status !== "em_analise" && <Button size="sm" variant="outline" onClick={() => updateStatus(g.id, "em_analise")}>Em análise</Button>}
              {g.status !== "resolvido" && <Button size="sm" variant="outline" onClick={() => updateStatus(g.id, "resolvido")}>Marcar resolvido</Button>}
              {g.status !== "descartado" && <Button size="sm" variant="ghost" onClick={() => updateStatus(g.id, "descartado")}>Descartar</Button>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
