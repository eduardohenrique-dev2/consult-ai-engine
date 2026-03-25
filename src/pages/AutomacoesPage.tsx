import { motion } from "framer-motion";
import { Zap, ArrowRight } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

const actionLabels: Record<string, string> = {
  criar_chamado: "Criar Chamado", notificar: "Notificar Equipe", executar_ia: "Executar IA",
  reprocessar: "Reprocessar", escalar_chamado: "Escalar Chamado", notificar_admin: "Notificar Admin",
};
const triggerLabels: Record<string, string> = {
  erro_folha: "Erro de Folha Detectado", divergencia_beneficio: "Divergência de Benefício",
  esocial_erro: "Erro eSocial", sla_excedido: "SLA Excedido",
};

export default function AutomacoesPage() {
  const queryClient = useQueryClient();

  const { data: autoList = [] } = useQuery({
    queryKey: ["automacoes"],
    queryFn: async () => {
      const { data } = await supabase.from("automacoes").select("*").order("created_at");
      return data || [];
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase.from("automacoes").update({ ativo }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["automacoes"] }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Zap className="h-6 w-6 text-warning" /> Automações</h1>
        <p className="text-sm text-muted-foreground">Fluxos automatizados estilo Node-RED</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {autoList.map((auto: any, i: number) => {
          const fluxo = auto.fluxo as any;
          return (
            <motion.div key={auto.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={`card-gradient rounded-xl border p-5 transition-colors ${auto.ativo ? "border-primary/30" : "border-border/30 opacity-60"}`}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold">{auto.nome}</h3>
                  <Badge variant="outline" className={`text-[9px] mt-1 ${auto.ativo ? "text-success border-success/30" : "text-muted-foreground border-border/30"}`}>
                    {auto.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                <Switch checked={auto.ativo} onCheckedChange={() => toggleMutation.mutate({ id: auto.id, ativo: !auto.ativo })} />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="px-3 py-1.5 rounded-lg bg-warning/10 border border-warning/30 text-[10px] font-medium text-warning">
                  ⚡ {triggerLabels[fluxo?.trigger] || fluxo?.trigger}
                </div>
                {(fluxo?.actions || []).map((action: string, j: number) => (
                  <div key={j} className="flex items-center gap-2">
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <div className="px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30 text-[10px] font-medium text-primary">
                      {actionLabels[action] || action}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
