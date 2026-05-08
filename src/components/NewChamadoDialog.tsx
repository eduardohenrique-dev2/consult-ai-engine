import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface Props { variant?: "default" | "outline" }

export default function NewChamadoDialog({ variant = "default" }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [form, setForm] = useState({
    titulo: "", descricao: "", tipo: "Geral",
    prioridade: "media", status: "Novo",
    cliente_id: "", responsavel_id: "", observacoes: "",
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes-min"],
    queryFn: async () => (await supabase.from("clientes").select("id,nome").order("nome")).data || [],
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-min"],
    queryFn: async () => (await supabase.from("profiles").select("user_id,nome").order("nome")).data || [],
  });

  const handleCreate = async () => {
    if (!form.titulo.trim()) {
      toast({ title: "Título obrigatório", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("chamados").insert({
      titulo: form.titulo,
      descricao: form.descricao || null,
      tipo: form.tipo,
      prioridade: form.prioridade,
      status: form.status,
      cliente_id: form.cliente_id || null,
      responsavel_id: form.responsavel_id || null,
      observacoes: form.observacoes || null,
    } as any);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao criar chamado", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "✅ Chamado criado" });
    qc.invalidateQueries({ queryKey: ["chamados"] });
    qc.invalidateQueries({ queryKey: ["chamados-with-clients"] });
    setOpen(false);
    setForm({ titulo: "", descricao: "", tipo: "Geral", prioridade: "media", status: "Novo", cliente_id: "", responsavel_id: "", observacoes: "" });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} className="gap-2 text-xs h-9">
          <Plus className="h-3.5 w-3.5" /> Novo Chamado
        </Button>
      </DialogTrigger>
      <DialogContent className="glass border-border/40 max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4 text-primary" /> Novo Chamado
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div>
            <Label className="text-xs">Título *</Label>
            <Input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} className="bg-secondary/60 border-border/40 mt-1.5" />
          </div>
          <div>
            <Label className="text-xs">Descrição</Label>
            <Textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} className="bg-secondary/60 border-border/40 mt-1.5 min-h-[80px]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Tipo</Label>
              <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
                <SelectTrigger className="bg-secondary/60 border-border/40 mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Geral", "Folha", "eSocial", "Financeiro", "Ponto", "Beneficios"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Prioridade</Label>
              <Select value={form.prioridade} onValueChange={v => setForm(f => ({ ...f, prioridade: v }))}>
                <SelectTrigger className="bg-secondary/60 border-border/40 mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="critica">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger className="bg-secondary/60 border-border/40 mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Novo", "Em análise", "Execução", "Validação", "Finalizado"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Cliente</Label>
              <Select value={form.cliente_id || "none"} onValueChange={v => setForm(f => ({ ...f, cliente_id: v === "none" ? "" : v }))}>
                <SelectTrigger className="bg-secondary/60 border-border/40 mt-1.5"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Nenhum —</SelectItem>
                  {clientes.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Responsável</Label>
            <Select value={form.responsavel_id || "none"} onValueChange={v => setForm(f => ({ ...f, responsavel_id: v === "none" ? "" : v }))}>
              <SelectTrigger className="bg-secondary/60 border-border/40 mt-1.5"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Não atribuído —</SelectItem>
                {profiles.map((p: any) => <SelectItem key={p.user_id} value={p.user_id}>{p.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Observações</Label>
            <Textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} className="bg-secondary/60 border-border/40 mt-1.5 min-h-[60px]" />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => setOpen(false)} className="h-9 text-xs">Cancelar</Button>
            <Button onClick={handleCreate} disabled={saving || !form.titulo.trim()} className="gap-2 h-9 text-xs">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              {saving ? "Criando..." : "Criar chamado"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
