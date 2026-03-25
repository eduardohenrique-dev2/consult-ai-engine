import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Sparkles } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

type ChamadoStatus = "Novo" | "Em análise" | "Execução" | "Validação" | "Finalizado";

const columns: { status: ChamadoStatus; color: string }[] = [
  { status: "Novo", color: "bg-accent" },
  { status: "Em análise", color: "bg-neon-purple" },
  { status: "Execução", color: "bg-primary" },
  { status: "Validação", color: "bg-warning" },
  { status: "Finalizado", color: "bg-success" },
];

const prioridadeColors: Record<string, string> = {
  baixa: "border-muted-foreground/30 text-muted-foreground",
  media: "border-accent/30 text-accent",
  alta: "border-warning/30 text-warning",
  critica: "border-critical/30 text-critical",
};

const tipoColors: Record<string, string> = {
  Folha: "bg-primary/15 text-primary",
  Ponto: "bg-accent/15 text-accent",
  Benefício: "bg-neon-purple/15 text-neon-purple",
  eSocial: "bg-warning/15 text-warning",
};

export default function Chamados() {
  const [search, setSearch] = useState("");
  const [selectedChamado, setSelectedChamado] = useState<any | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: chamados = [] } = useQuery({
    queryKey: ["chamados-with-clients"],
    queryFn: async () => {
      const { data } = await supabase
        .from("chamados")
        .select("*, clientes(nome)")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes"],
    queryFn: async () => {
      const { data } = await supabase.from("clientes").select("*");
      return data || [];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("chamados").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["chamados-with-clients"] }),
  });

  const filtered = chamados.filter((c: any) =>
    c.titulo.toLowerCase().includes(search.toLowerCase()) ||
    (c.clientes?.nome || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleDrop = (newStatus: ChamadoStatus) => {
    if (!draggedId) return;
    updateStatus.mutate({ id: draggedId, status: newStatus });
    setDraggedId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestão de Chamados</h1>
          <p className="text-sm text-muted-foreground">Kanban com dados reais</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-primary hover:bg-primary/90"><Plus className="h-4 w-4" /> Novo Chamado</Button>
          </DialogTrigger>
          <DialogContent className="glass border-border/50 max-w-md">
            <DialogHeader><DialogTitle>Criar Chamado</DialogTitle></DialogHeader>
            <CreateChamadoForm clientes={clientes} onClose={() => setShowCreate(false)} onSuccess={() => {
              setShowCreate(false);
              queryClient.invalidateQueries({ queryKey: ["chamados-with-clients"] });
              toast({ title: "Chamado criado com sucesso!" });
            }} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar chamados..." className="pl-9 bg-secondary border-border/50" />
      </div>

      <div className="grid grid-cols-5 gap-3 min-h-[70vh]">
        {columns.map(col => {
          const items = filtered.filter((c: any) => c.status === col.status);
          return (
            <div key={col.status} className="flex flex-col rounded-xl border border-border/30 bg-muted/30 p-3"
              onDragOver={e => e.preventDefault()} onDrop={() => handleDrop(col.status)}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`h-2.5 w-2.5 rounded-full ${col.color}`} />
                <span className="text-xs font-semibold">{col.status}</span>
                <Badge variant="secondary" className="ml-auto text-[10px] h-5">{items.length}</Badge>
              </div>
              <div className="space-y-2 flex-1 overflow-auto scrollbar-thin">
                <AnimatePresence>
                  {items.map((chamado: any) => (
                    <motion.div key={chamado.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                      draggable onDragStart={() => setDraggedId(chamado.id)} onClick={() => setSelectedChamado(chamado)}
                      className="card-gradient rounded-lg border border-border/40 p-3 cursor-pointer hover:border-primary/40 transition-colors group">
                      <p className="text-xs font-medium mb-2 leading-snug group-hover:text-primary transition-colors">{chamado.titulo}</p>
                      <div className="flex flex-wrap gap-1 mb-2">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${tipoColors[chamado.tipo] || ""}`}>{chamado.tipo}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${prioridadeColors[chamado.prioridade] || ""}`}>{chamado.prioridade}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{chamado.clientes?.nome?.split(" ")[0] || "—"}</span>
                      {chamado.sugestao_ia && (
                        <div className="mt-2 flex items-center gap-1 text-[9px] text-neon-purple">
                          <Sparkles className="h-3 w-3" /> IA disponível
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={!!selectedChamado} onOpenChange={() => setSelectedChamado(null)}>
        <DialogContent className="glass border-border/50 max-w-lg">
          {selectedChamado && (
            <>
              <DialogHeader><DialogTitle>{selectedChamado.titulo}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">{selectedChamado.descricao}</p>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div><span className="text-muted-foreground">Cliente:</span> <span className="font-medium">{selectedChamado.clientes?.nome || "—"}</span></div>
                  <div><span className="text-muted-foreground">Tipo:</span> <span className={`px-1.5 py-0.5 rounded ${tipoColors[selectedChamado.tipo] || ""}`}>{selectedChamado.tipo}</span></div>
                  <div><span className="text-muted-foreground">Prioridade:</span> <span className="font-medium capitalize">{selectedChamado.prioridade}</span></div>
                  <div><span className="text-muted-foreground">Status:</span> <span className="font-medium">{selectedChamado.status}</span></div>
                </div>
                {selectedChamado.sugestao_ia && (
                  <div className="rounded-lg border border-neon-purple/30 bg-neon-purple/5 p-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-neon-purple mb-2"><Sparkles className="h-3.5 w-3.5" /> Sugestão da IA</div>
                    <p className="text-xs text-muted-foreground">{selectedChamado.sugestao_ia}</p>
                  </div>
                )}
                {selectedChamado.query_sugerida && (
                  <div className="rounded-lg bg-secondary p-3">
                    <p className="text-[10px] text-muted-foreground mb-1">Query SQL Sugerida:</p>
                    <code className="text-xs text-accent font-mono block whitespace-pre-wrap">{selectedChamado.query_sugerida}</code>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreateChamadoForm({ clientes, onClose, onSuccess }: { clientes: any[]; onClose: () => void; onSuccess: () => void }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ titulo: "", descricao: "", tipo: "Folha", prioridade: "media", clienteId: "" });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    const { error } = await supabase.from("chamados").insert({
      titulo: form.titulo,
      descricao: form.descricao,
      tipo: form.tipo,
      prioridade: form.prioridade,
      cliente_id: form.clienteId || null,
      responsavel_id: user?.id,
      status: "Novo",
    });
    setSubmitting(false);
    if (error) return;
    onSuccess();
  };

  return (
    <div className="space-y-4">
      <div><Label className="text-xs">Título</Label><Input value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} className="bg-secondary border-border/50" /></div>
      <div><Label className="text-xs">Descrição</Label><Textarea value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} className="bg-secondary border-border/50" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Tipo</Label>
          <Select value={form.tipo} onValueChange={v => setForm({ ...form, tipo: v })}>
            <SelectTrigger className="bg-secondary border-border/50"><SelectValue /></SelectTrigger>
            <SelectContent>{["Folha", "Ponto", "Benefício", "eSocial"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Prioridade</Label>
          <Select value={form.prioridade} onValueChange={v => setForm({ ...form, prioridade: v })}>
            <SelectTrigger className="bg-secondary border-border/50"><SelectValue /></SelectTrigger>
            <SelectContent>{["baixa", "media", "alta", "critica"].map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label className="text-xs">Cliente</Label>
        <Select value={form.clienteId} onValueChange={v => setForm({ ...form, clienteId: v })}>
          <SelectTrigger className="bg-secondary border-border/50"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
          <SelectContent>{clientes.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSubmit} disabled={!form.titulo || submitting}>Criar Chamado</Button>
      </div>
    </div>
  );
}
