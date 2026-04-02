import { useState } from "react";
import { motion } from "framer-motion";
import { Zap, ArrowRight, Plus, Loader2, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

const actionLabels: Record<string, string> = {
  criar_chamado: "Criar Chamado", notificar: "Notificar Equipe", executar_ia: "Executar IA",
  reprocessar: "Reprocessar", escalar_chamado: "Escalar Chamado", notificar_admin: "Notificar Admin",
  definir_prioridade_critica: "Prioridade Crítica", enviar_alerta: "Enviar Alerta",
};
const triggerLabels: Record<string, string> = {
  erro_folha: "Erro de Folha Detectado", divergencia_beneficio: "Divergência de Benefício",
  esocial_erro: "Erro eSocial", sla_excedido: "SLA Excedido",
  novo_chamado: "Novo Chamado Criado", chamado_critico: "Chamado Crítico",
};

const availableTriggers = Object.keys(triggerLabels);
const availableActions = Object.keys(actionLabels);

const conditionFields = [
  { value: "tipo", label: "Tipo" },
  { value: "prioridade", label: "Prioridade" },
  { value: "status", label: "Status" },
];
const conditionValues: Record<string, string[]> = {
  tipo: ["Folha", "Ponto", "Benefício", "eSocial"],
  prioridade: ["baixa", "media", "alta", "critica"],
  status: ["Novo", "Em análise", "Execução", "Validação", "Finalizado"],
};

export default function AutomacoesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <Zap className="h-6 w-6 text-warning" /> Automações
          </h1>
          <p className="text-xs text-muted-foreground mt-1">Regras inteligentes com condições AND/OR</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-primary hover:bg-primary/90 h-9 text-xs"><Plus className="h-3.5 w-3.5" /> Nova Automação</Button>
          </DialogTrigger>
          <DialogContent className="glass border-border/40 max-w-lg">
            <DialogHeader><DialogTitle className="text-base">Criar Automação</DialogTitle></DialogHeader>
            <CreateAutomationForm onSuccess={() => {
              setShowCreate(false);
              queryClient.invalidateQueries({ queryKey: ["automacoes"] });
              toast({ title: "✅ Automação criada" });
            }} onCancel={() => setShowCreate(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {autoList.map((auto: any, i: number) => {
          const fluxo = auto.fluxo as any;
          const conditions = fluxo?.conditions || [];
          return (
            <motion.div key={auto.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className={`glass rounded-2xl border p-5 transition-all ${auto.ativo ? "border-primary/30" : "border-border/20 opacity-50"}`}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold">{auto.nome}</h3>
                  <Badge variant="outline" className={`text-[8px] mt-1 ${auto.ativo ? "text-success border-success/20" : "text-muted-foreground border-border/20"}`}>
                    {auto.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                <Switch checked={auto.ativo} onCheckedChange={() => toggleMutation.mutate({ id: auto.id, ativo: !auto.ativo })} />
              </div>

              {/* Trigger */}
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <div className="px-2.5 py-1 rounded-lg bg-warning/10 border border-warning/20 text-[10px] font-medium text-warning">
                  ⚡ {triggerLabels[fluxo?.trigger] || fluxo?.trigger}
                </div>
              </div>

              {/* Conditions */}
              {conditions.length > 0 && (
                <div className="mb-3 p-2.5 rounded-lg bg-secondary/30 border border-border/20">
                  <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5">Condições ({fluxo?.operator || "AND"})</p>
                  <div className="space-y-1">
                    {conditions.map((cond: any, j: number) => (
                      <p key={j} className="text-[10px] text-foreground/80">
                        {cond.field} = <span className="font-medium text-accent">{cond.value}</span>
                        {j < conditions.length - 1 && <span className="text-muted-foreground ml-1">{fluxo?.operator || "AND"}</span>}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                {(fluxo?.actions || []).map((action: string, j: number) => (
                  <div key={j} className="flex items-center gap-1.5">
                    {j > 0 && <ArrowRight className="h-3 w-3 text-muted-foreground/40" />}
                    <div className="px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-[10px] font-medium text-primary">
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

function CreateAutomationForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState("");
  const [operator, setOperator] = useState("AND");
  const [conditions, setConditions] = useState<{ field: string; value: string }[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const addCondition = () => setConditions(c => [...c, { field: "tipo", value: "" }]);
  const removeCondition = (i: number) => setConditions(c => c.filter((_, idx) => idx !== i));
  const toggleAction = (a: string) => setActions(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);

  const handleSubmit = async () => {
    if (!name.trim() || !trigger || actions.length === 0) return;
    setSaving(true);
    await supabase.from("automacoes").insert({
      nome: name,
      fluxo: { trigger, conditions, operator, actions },
    } as any);
    setSaving(false);
    onSuccess();
  };

  return (
    <div className="space-y-4 max-h-[60vh] overflow-auto scrollbar-thin">
      <div><Label className="text-xs">Nome</Label><Input value={name} onChange={e => setName(e.target.value)} className="bg-secondary/60 border-border/40 mt-1" placeholder="Ex: Escalar chamados críticos" /></div>

      <div>
        <Label className="text-xs">Trigger</Label>
        <Select value={trigger} onValueChange={setTrigger}>
          <SelectTrigger className="bg-secondary/60 border-border/40 mt-1"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
          <SelectContent>{availableTriggers.map(t => <SelectItem key={t} value={t}>{triggerLabels[t]}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {/* Conditions */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs">Condições</Label>
          <div className="flex items-center gap-2">
            <Select value={operator} onValueChange={setOperator}>
              <SelectTrigger className="h-7 w-20 text-[10px] bg-secondary/60 border-border/40"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="AND">AND</SelectItem><SelectItem value="OR">OR</SelectItem></SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={addCondition} className="h-7 text-[10px] border-border/40"><Plus className="h-3 w-3 mr-1" /> Add</Button>
          </div>
        </div>
        {conditions.map((cond, i) => (
          <div key={i} className="flex items-center gap-2 mb-2">
            <Select value={cond.field} onValueChange={v => setConditions(c => c.map((x, j) => j === i ? { ...x, field: v, value: "" } : x))}>
              <SelectTrigger className="h-8 text-[10px] bg-secondary/60 border-border/40 w-28"><SelectValue /></SelectTrigger>
              <SelectContent>{conditionFields.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
            </Select>
            <span className="text-[10px] text-muted-foreground">=</span>
            <Select value={cond.value} onValueChange={v => setConditions(c => c.map((x, j) => j === i ? { ...x, value: v } : x))}>
              <SelectTrigger className="h-8 text-[10px] bg-secondary/60 border-border/40 flex-1"><SelectValue placeholder="Valor" /></SelectTrigger>
              <SelectContent>{(conditionValues[cond.field] || []).map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
            </Select>
            <Button size="sm" variant="ghost" onClick={() => removeCondition(i)} className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive">
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div>
        <Label className="text-xs mb-2 block">Ações</Label>
        <div className="grid grid-cols-2 gap-2">
          {availableActions.map(a => (
            <label key={a} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30 border border-border/20 cursor-pointer hover:border-primary/20 transition-colors">
              <Checkbox checked={actions.includes(a)} onCheckedChange={() => toggleAction(a)} />
              <span className="text-[10px] font-medium">{actionLabels[a]}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <Button variant="outline" onClick={onCancel} className="border-border/40 h-9 text-xs">Cancelar</Button>
        <Button onClick={handleSubmit} disabled={!name.trim() || !trigger || actions.length === 0 || saving} className="gap-2 h-9 text-xs">
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Criar
        </Button>
      </div>
    </div>
  );
}
