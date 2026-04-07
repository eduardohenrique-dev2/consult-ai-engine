import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Calendar as CalIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ReuniaoInsert, Reuniao } from "@/hooks/useReunioes";

const CORES = [
  "#6366f1", "#ec4899", "#14b8a6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#22c55e",
];

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: ReuniaoInsert) => Promise<any>;
  saving: boolean;
  initial?: Reuniao | null;
  defaultDate?: Date | null;
}

export function MeetingModal({ open, onClose, onSave, saving, initial, defaultDate }: Props) {
  const [form, setForm] = useState({
    titulo: "",
    descricao: "",
    data_inicio: "",
    data_fim: "",
    cor: "#6366f1",
    status: "agendada",
    cliente_id: "",
    chamado_id: "",
    participantes: "",
  });

  useEffect(() => {
    if (initial) {
      setForm({
        titulo: initial.titulo,
        descricao: initial.descricao || "",
        data_inicio: initial.data_inicio.slice(0, 16),
        data_fim: initial.data_fim.slice(0, 16),
        cor: initial.cor,
        status: initial.status,
        cliente_id: initial.cliente_id || "",
        chamado_id: initial.chamado_id || "",
        participantes: (initial.participantes || []).join(", "),
      });
    } else if (defaultDate) {
      const start = new Date(defaultDate);
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      const fmt = (d: Date) => {
        const pad = (n: number) => String(n).padStart(2, "0");
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      };
      setForm(f => ({ ...f, titulo: "", descricao: "", data_inicio: fmt(start), data_fim: fmt(end), cor: "#6366f1", status: "agendada", cliente_id: "", chamado_id: "", participantes: "" }));
    } else {
      setForm({ titulo: "", descricao: "", data_inicio: "", data_fim: "", cor: "#6366f1", status: "agendada", cliente_id: "", chamado_id: "", participantes: "" });
    }
  }, [initial, defaultDate, open]);

  const { data: clientes } = useQuery({
    queryKey: ["clientes-select"],
    queryFn: async () => {
      const { data } = await supabase.from("clientes").select("id, nome").order("nome");
      return data || [];
    },
  });

  const { data: chamados } = useQuery({
    queryKey: ["chamados-select"],
    queryFn: async () => {
      const { data } = await supabase.from("chamados").select("id, titulo").order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
  });

  const handleSubmit = async () => {
    if (!form.titulo || !form.data_inicio || !form.data_fim) return;
    await onSave({
      titulo: form.titulo,
      descricao: form.descricao || null,
      data_inicio: new Date(form.data_inicio).toISOString(),
      data_fim: new Date(form.data_fim).toISOString(),
      cor: form.cor,
      status: form.status,
      cliente_id: form.cliente_id || null,
      chamado_id: form.chamado_id || null,
      participantes: form.participantes ? form.participantes.split(",").map(s => s.trim()).filter(Boolean) : [],
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg glass border-border/30">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalIcon className="h-5 w-5 text-primary" />
            {initial ? "Editar Reunião" : "Nova Reunião"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          <div>
            <Label>Título *</Label>
            <Input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Ex: Alinhamento eSocial" />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Início *</Label>
              <Input type="datetime-local" value={form.data_inicio} onChange={e => setForm(f => ({ ...f, data_inicio: e.target.value }))} />
            </div>
            <div>
              <Label>Fim *</Label>
              <Input type="datetime-local" value={form.data_fim} onChange={e => setForm(f => ({ ...f, data_fim: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Cliente</Label>
              <Select value={form.cliente_id} onValueChange={v => setForm(f => ({ ...f, cliente_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum</SelectItem>
                  {clientes?.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Chamado vinculado</Label>
              <Select value={form.chamado_id} onValueChange={v => setForm(f => ({ ...f, chamado_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum</SelectItem>
                  {chamados?.map(c => <SelectItem key={c.id} value={c.id}>{c.titulo}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="agendada">Agendada</SelectItem>
                <SelectItem value="em_andamento">Em andamento</SelectItem>
                <SelectItem value="concluida">Concluída</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Participantes (separados por vírgula)</Label>
            <Input value={form.participantes} onChange={e => setForm(f => ({ ...f, participantes: e.target.value }))} placeholder="Ana, Carlos" />
          </div>
          <div>
            <Label>Cor</Label>
            <div className="flex gap-2 mt-1">
              {CORES.map(c => (
                <button key={c} className={`h-7 w-7 rounded-full border-2 transition-all ${form.cor === c ? "border-foreground scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: c }} onClick={() => setForm(f => ({ ...f, cor: c }))} />
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving || !form.titulo || !form.data_inicio || !form.data_fim}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {initial ? "Salvar" : "Criar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
