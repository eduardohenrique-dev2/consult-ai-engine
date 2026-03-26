import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Sparkles, Loader2 } from "lucide-react";
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

// Auto-classify priority based on type
function autoClassifyPriority(tipo: string, descricao: string): string {
  const desc = descricao.toLowerCase();
  if (tipo === "Folha" || tipo === "eSocial") return "alta";
  if (desc.includes("erro") || desc.includes("falha") || desc.includes("urgente")) return "alta";
  if (desc.includes("crítico") || desc.includes("parado")) return "critica";
  if (tipo === "Benefício") return "media";
  return "media";
}

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chamados-with-clients"] });
      queryClient.invalidateQueries({ queryKey: ["chamados"] });
    },
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
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestão de Chamados</h1>
          <p className="text-sm text-muted-foreground mt-1">Arraste os cards para alterar status</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all"><Plus className="h-4 w-4" /> Novo Chamado</Button>
          </DialogTrigger>
          <DialogContent className="glass border-border/50 max-w-md">
            <DialogHeader><DialogTitle>Criar Chamado</DialogTitle></DialogHeader>
            <CreateChamadoForm clientes={clientes} onClose={() => setShowCreate(false)} onSuccess={() => {
              setShowCreate(false);
              queryClient.invalidateQueries({ queryKey: ["chamados-with-clients"] });
              queryClient.invalidateQueries({ queryKey: ["chamados"] });
              toast({ title: "✅ Chamado criado!", description: "Prioridade definida automaticamente." });
            }} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar chamados..." className="pl-9 bg-secondary border-border/50 focus:border-primary/50 transition-colors" />
      </div>

      <div className="grid grid-cols-5 gap-4 min-h-[70vh]">
        {columns.map(col => {
          const items = filtered.filter((c: any) => c.status === col.status);
          return (
            <div key={col.status} className="flex flex-col rounded-xl border border-border/30 bg-muted/20 p-3"
              onDragOver={e => e.preventDefault()} onDrop={() => handleDrop(col.status)}>
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/20">
                <span className={`h-2.5 w-2.5 rounded-full ${col.color}`} />
                <span className="text-xs font-semibold">{col.status}</span>
                <Badge variant="secondary" className="ml-auto text-[10px] h-5 min-w-5 flex items-center justify-center">{items.length}</Badge>
              </div>
              <div className="space-y-2.5 flex-1 overflow-auto scrollbar-thin">
                <AnimatePresence>
                  {items.map((chamado: any) => (
                    <motion.div key={chamado.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                      draggable onDragStart={() => setDraggedId(chamado.id)} onClick={() => setSelectedChamado(chamado)}
                      className="card-gradient rounded-xl border border-border/40 p-3.5 cursor-pointer hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 group">
                      <p className="text-xs font-medium mb-2.5 leading-snug group-hover:text-primary transition-colors">{chamado.titulo}</p>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium ${tipoColors[chamado.tipo] || ""}`}>{chamado.tipo}</span>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full border font-medium ${prioridadeColors[chamado.prioridade] || ""}`}>{chamado.prioridade}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{chamado.clientes?.nome?.split(" ")[0] || "—"}</span>
                      {chamado.sugestao_ia && (
                        <div className="mt-2.5 flex items-center gap-1 text-[9px] text-neon-purple font-medium">
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
              <div className="space-y-5">
                <p className="text-sm text-muted-foreground leading-relaxed">{selectedChamado.descricao}</p>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1"><span className="text-muted-foreground block">Cliente</span><span className="font-medium">{selectedChamado.clientes?.nome || "—"}</span></div>
                  <div className="space-y-1"><span className="text-muted-foreground block">Tipo</span><span className={`px-2 py-0.5 rounded-full text-[10px] ${tipoColors[selectedChamado.tipo] || ""}`}>{selectedChamado.tipo}</span></div>
                  <div className="space-y-1"><span className="text-muted-foreground block">Prioridade</span><span className="font-medium capitalize">{selectedChamado.prioridade}</span></div>
                  <div className="space-y-1"><span className="text-muted-foreground block">Status</span><span className="font-medium">{selectedChamado.status}</span></div>
                </div>
                {selectedChamado.sugestao_ia && (
                  <div className="rounded-xl border border-neon-purple/30 bg-neon-purple/5 p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold text-neon-purple mb-2"><Sparkles className="h-3.5 w-3.5" /> Sugestão da IA</div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{selectedChamado.sugestao_ia}</p>
                  </div>
                )}
                {selectedChamado.query_sugerida && (
                  <div className="rounded-xl bg-secondary/80 p-4">
                    <p className="text-[10px] text-muted-foreground mb-2 font-medium uppercase tracking-wider">Query SQL Sugerida</p>
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
  const [form, setForm] = useState({ titulo: "", descricao: "", tipo: "Folha", prioridade: "", clienteId: "" });
  const [submitting, setSubmitting] = useState(false);

  // Auto-classify when tipo or descricao changes
  const suggestedPriority = autoClassifyPriority(form.tipo, form.descricao);
  const effectivePriority = form.prioridade || suggestedPriority;

  const handleSubmit = async () => {
    setSubmitting(true);
    const { error } = await supabase.from("chamados").insert({
      titulo: form.titulo,
      descricao: form.descricao,
      tipo: form.tipo,
      prioridade: effectivePriority,
      cliente_id: form.clienteId || null,
      responsavel_id: user?.id,
      status: "Novo",
    });
    setSubmitting(false);
    if (error) return;
    onSuccess();
  };

  return (
    <div className="space-y-5">
      <div><Label className="text-xs font-medium">Título</Label><Input value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} className="bg-secondary border-border/50 mt-1.5" placeholder="Descreva o problema..." /></div>
      <div><Label className="text-xs font-medium">Descrição</Label><Textarea value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} className="bg-secondary border-border/50 mt-1.5" placeholder="Detalhes do chamado..." /></div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-xs font-medium">Tipo</Label>
          <Select value={form.tipo} onValueChange={v => setForm({ ...form, tipo: v, prioridade: "" })}>
            <SelectTrigger className="bg-secondary border-border/50 mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>{["Folha", "Ponto", "Benefício", "eSocial"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs font-medium">Prioridade</Label>
          <Select value={effectivePriority} onValueChange={v => setForm({ ...form, prioridade: v })}>
            <SelectTrigger className="bg-secondary border-border/50 mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>{["baixa", "media", "alta", "critica"].map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
          </Select>
          {!form.prioridade && (
            <p className="text-[9px] text-neon-purple mt-1 flex items-center gap-1">
              <Sparkles className="h-2.5 w-2.5" /> Auto: {suggestedPriority}
            </p>
          )}
        </div>
      </div>
      <div>
        <Label className="text-xs font-medium">Cliente</Label>
        <Select value={form.clienteId} onValueChange={v => setForm({ ...form, clienteId: v })}>
          <SelectTrigger className="bg-secondary border-border/50 mt-1.5"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
          <SelectContent>{clientes.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <Button variant="outline" onClick={onClose} className="border-border/50">Cancelar</Button>
        <Button onClick={handleSubmit} disabled={!form.titulo || submitting} className="gap-2 shadow-lg shadow-primary/20">
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Criar Chamado
        </Button>
      </div>
    </div>
  );
}
