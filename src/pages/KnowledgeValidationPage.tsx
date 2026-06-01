import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, BookOpen } from "lucide-react";

export default function KnowledgeValidationPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["knowledge_entries", "pendente"],
    queryFn: async () => {
      const { data } = await supabase
        .from("knowledge_entries")
        .select("*")
        .eq("validacao", "pendente")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const validate = async (id: string, accept: boolean) => {
    const { data: u } = await supabase.auth.getUser();
    await supabase.from("knowledge_entries").update({
      validacao: accept ? "validada" : "rejeitada",
      validated_by: u?.user?.id,
      validated_at: new Date().toISOString(),
    }).eq("id", id);
    if (accept) {
      try { await supabase.functions.invoke("embed-conhecimento", { body: { target: "knowledge_entry", id } }); } catch { /* ignore */ }
    }
    toast({ title: accept ? "Validado" : "Rejeitado" });
    qc.invalidateQueries({ queryKey: ["knowledge_entries"] });
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="h-6 w-6 text-primary" /> Validação de Conhecimento</h1>
        <p className="text-sm text-muted-foreground">Aprove ou rejeite entradas propostas pela IA ou consultores antes que entrem na base validada.</p>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
      {!isLoading && entries.length === 0 && (
        <Card className="p-8 text-center text-sm text-muted-foreground">Nenhuma entrada pendente.</Card>
      )}
      <div className="space-y-3">
        {entries.map((e: any) => (
          <Card key={e.id} className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h3 className="font-semibold text-sm">{e.problema}</h3>
                {e.contexto && <p className="text-xs text-muted-foreground mt-1">{e.contexto}</p>}
              </div>
              <Badge variant="outline" className="text-[10px]">Confiança: {e.confianca}</Badge>
            </div>
            <div className="text-sm bg-muted/30 rounded p-3 whitespace-pre-wrap">{e.solucao}</div>
            {e.fonte && <p className="text-[11px] text-muted-foreground">Fonte: {e.fonte}</p>}
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={() => validate(e.id, false)} className="gap-1.5">
                <XCircle className="h-3.5 w-3.5" /> Rejeitar
              </Button>
              <Button size="sm" onClick={() => validate(e.id, true)} className="gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> Validar
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
