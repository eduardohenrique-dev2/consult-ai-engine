import { motion } from "framer-motion";
import { Zap, ArrowRight, Power, PowerOff } from "lucide-react";
import { automacoes } from "@/data/mock-data";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";

const actionLabels: Record<string, string> = {
  criar_chamado: "Criar Chamado",
  notificar: "Notificar Equipe",
  executar_ia: "Executar IA",
  reprocessar: "Reprocessar",
  escalar_chamado: "Escalar Chamado",
  notificar_admin: "Notificar Admin",
};

const triggerLabels: Record<string, string> = {
  erro_folha: "Erro de Folha Detectado",
  divergencia_beneficio: "Divergência de Benefício",
  esocial_erro: "Erro eSocial",
  sla_excedido: "SLA Excedido",
};

export default function AutomacoesPage() {
  const [autoList, setAutoList] = useState(automacoes);

  const toggle = (id: string) => {
    setAutoList(prev => prev.map(a => a.id === id ? { ...a, ativo: !a.ativo } : a));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Zap className="h-6 w-6 text-warning" /> Automações
        </h1>
        <p className="text-sm text-muted-foreground">Fluxos automatizados estilo Node-RED</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {autoList.map((auto, i) => (
          <motion.div
            key={auto.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`card-gradient rounded-xl border p-5 transition-colors ${auto.ativo ? "border-primary/30" : "border-border/30 opacity-60"}`}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold">{auto.nome}</h3>
                <Badge variant="outline" className={`text-[9px] mt-1 ${auto.ativo ? "text-success border-success/30" : "text-muted-foreground border-border/30"}`}>
                  {auto.ativo ? "Ativo" : "Inativo"}
                </Badge>
              </div>
              <Switch checked={auto.ativo} onCheckedChange={() => toggle(auto.id)} />
            </div>

            {/* Flow visualization */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="px-3 py-1.5 rounded-lg bg-warning/10 border border-warning/30 text-[10px] font-medium text-warning">
                ⚡ {triggerLabels[auto.fluxo.trigger] || auto.fluxo.trigger}
              </div>
              {auto.fluxo.actions.map((action, j) => (
                <div key={j} className="flex items-center gap-2">
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <div className="px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30 text-[10px] font-medium text-primary">
                    {actionLabels[action] || action}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
