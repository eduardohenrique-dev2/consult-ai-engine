import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Sparkles, Loader2, MessageSquare, Send, History, Pencil, Trash2, Save, X, AlertTriangle, FileWarning } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

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
  const [onlyEsocial, setOnlyEsocial] = useState(false);
  const [onlyCritica, setOnlyCritica] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    const channel = supabase
      .channel("chamados-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "chamados" }, () => {
        queryClient.invalidateQueries({ queryKey: ["chamados-with-clients"] });
        queryClient.invalidateQueries({ queryKey: ["chamados"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

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

  const deleteChamado = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("chamados").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chamados-with-clients"] });
      queryClient.invalidateQueries({ queryKey: ["chamados"] });
      setSelectedChamado(null);
      toast({ title: "🗑️ Chamado excluído" });
    },
  });

  const filtered = chamados.filter((c: any) => {
    const matchesSearch = c.titulo.toLowerCase().includes(search.toLowerCase()) ||
      (c.clientes?.nome || "").toLowerCase().includes(search.toLowerCase());
    const matchesEsocial = !onlyEsocial || c.eh_esocial === true || c.tipo === "eSocial";
    const matchesCritica = !onlyCritica || c.prioridade === "critica";
    return matchesSearch && matchesEsocial && matchesCritica;
  });

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

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar chamados..." className="pl-9 bg-secondary border-border/50 focus:border-primary/50 transition-colors" />
        </div>
        <Button
          size="sm"
          variant={onlyEsocial ? "default" : "outline"}
          onClick={() => setOnlyEsocial(v => !v)}
          className={`h-9 text-[11px] gap-1.5 ${onlyEsocial ? "bg-warning text-warning-foreground hover:bg-warning/90" : "border-warning/40 text-warning hover:bg-warning/10"}`}
        >
          <FileWarning className="h-3.5 w-3.5" /> Somente eSocial
        </Button>
        <Button
          size="sm"
          variant={onlyCritica ? "default" : "outline"}
          onClick={() => setOnlyCritica(v => !v)}
          className={`h-9 text-[11px] gap-1.5 ${onlyCritica ? "bg-critical text-white hover:bg-critical/90" : "border-critical/40 text-critical hover:bg-critical/10"}`}
        >
          <AlertTriangle className="h-3.5 w-3.5" /> Somente críticos
        </Button>
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
                  {items.map((chamado: any) => {
                    const isCritica = chamado.prioridade === "critica";
                    const isEsocial = chamado.eh_esocial === true || chamado.tipo === "eSocial";
                    return (
                      <motion.div
                        key={chamado.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        draggable
                        onDragStart={() => setDraggedId(chamado.id)}
                        onClick={() => setSelectedChamado(chamado)}
                        className={`card-gradient rounded-xl border p-3.5 cursor-pointer transition-all duration-200 group ${
                          isCritica
                            ? "border-critical/60 shadow-lg shadow-critical/20 ring-1 ring-critical/30 animate-pulse-soft hover:border-critical hover:shadow-critical/30"
                            : "border-border/40 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
                        }`}
                      >
                        {isCritica && (
                          <div className="flex items-center gap-1 text-[9px] text-critical font-bold uppercase tracking-wider mb-1.5">
                            <AlertTriangle className="h-3 w-3" /> Crítico
                          </div>
                        )}
                        <p className="text-xs font-medium mb-2.5 leading-snug group-hover:text-primary transition-colors">{chamado.titulo}</p>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium ${tipoColors[chamado.tipo] || ""}`}>{chamado.tipo}</span>
                          <span className={`text-[9px] px-2 py-0.5 rounded-full border font-medium ${prioridadeColors[chamado.prioridade] || ""}`}>{chamado.prioridade}</span>
                          {isEsocial && (
                            <span className="text-[9px] px-2 py-0.5 rounded-full font-medium bg-warning/15 text-warning border border-warning/30 flex items-center gap-1">
                              <FileWarning className="h-2.5 w-2.5" />
                              {chamado.evento_esocial || "eSocial"}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground">{chamado.clientes?.nome?.split(" ")[0] || "—"}</span>
                        {chamado.sugestao_ia && (
                          <div className="mt-2.5 flex items-center gap-1 text-[9px] text-neon-purple font-medium">
                            <Sparkles className="h-3 w-3" /> IA disponível
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={!!selectedChamado} onOpenChange={() => setSelectedChamado(null)}>
        <DialogContent className="glass border-border/50 max-w-2xl max-h-[85vh]">
          {selectedChamado && (
            <ChamadoDetail
              chamado={selectedChamado}
              clientes={clientes}
              onDelete={() => deleteChamado.mutate(selectedChamado.id)}
              onUpdated={(updated: any) => {
                setSelectedChamado(updated);
                queryClient.invalidateQueries({ queryKey: ["chamados-with-clients"] });
                queryClient.invalidateQueries({ queryKey: ["chamados"] });
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ChamadoDetail({ chamado, clientes, onDelete, onUpdated }: { chamado: any; clientes: any[]; onDelete: () => void; onUpdated: (c: any) => void }) {
  const [activeTab, setActiveTab] = useState("detalhes");
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [aiResponse, setAiResponse] = useState("");
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    titulo: chamado.titulo,
    descricao: chamado.descricao || "",
    tipo: chamado.tipo,
    prioridade: chamado.prioridade,
    status: chamado.status,
    cliente_id: chamado.cliente_id || "",
    observacoes: (chamado as any).observacoes || "",
  });
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: interactions = [], refetch: refetchInteractions } = useQuery({
    queryKey: ["chamado-interactions", chamado.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("chamado_interactions")
        .select("*")
        .eq("chamado_id", chamado.id)
        .order("created_at", { ascending: true });
      return data || [];
    },
  });

  const handleSaveEdit = async () => {
    setSaving(true);
    const { error } = await supabase.from("chamados").update({
      titulo: editForm.titulo,
      descricao: editForm.descricao || null,
      tipo: editForm.tipo,
      prioridade: editForm.prioridade,
      status: editForm.status,
      cliente_id: editForm.cliente_id || null,
      observacoes: editForm.observacoes || null,
    } as any).eq("id", chamado.id);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", variant: "destructive" });
      return;
    }
    toast({ title: "✅ Chamado atualizado" });
    setEditing(false);
    // Refresh with updated data
    const { data } = await supabase.from("chamados").select("*, clientes(nome)").eq("id", chamado.id).single();
    if (data) onUpdated(data);
  };

  const handleStatusChange = async (newStatus: string) => {
    const { error } = await supabase.from("chamados").update({ status: newStatus }).eq("id", chamado.id);
    if (!error) {
      setEditForm(f => ({ ...f, status: newStatus }));
      const { data } = await supabase.from("chamados").select("*, clientes(nome)").eq("id", chamado.id).single();
      if (data) onUpdated(data);
      toast({ title: `Status → ${newStatus}` });
    }
  };

  const handleAskAI = async () => {
    if (!question.trim()) return;
    setAsking(true);
    setAiResponse("");

    const contextMessage = `Chamado: ${chamado.titulo}\nTipo: ${chamado.tipo}\nPrioridade: ${chamado.prioridade}\nDescrição: ${chamado.descricao || "N/A"}\n\nPergunta do consultor: ${question}`;

    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: contextMessage }],
          pageContext: "chamados",
          chamadoId: chamado.id,
        }),
      });

      if (!resp.ok || !resp.body) throw new Error("Falha na IA");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullResponse += content;
              setAiResponse(fullResponse);
            }
          } catch {}
        }
      }

      if (fullResponse) {
        await supabase.from("chamado_interactions").insert({
          chamado_id: chamado.id,
          pergunta: question,
          resposta: fullResponse,
        });
        refetchInteractions();
        setQuestion("");
      }
    } catch (e) {
      toast({ title: "Erro", description: "Falha ao consultar IA", variant: "destructive" });
    } finally {
      setAsking(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <div className="flex items-center justify-between pr-6">
          <DialogTitle className="text-lg">{chamado.titulo}</DialogTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-xs" onClick={() => setEditing(!editing)}>
              {editing ? <X className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
              {editing ? "Cancelar" : "Editar"}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-xs text-destructive hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" /> Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="glass border-border/50">
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir chamado?</AlertDialogTitle>
                  <AlertDialogDescription>Esta ação não pode ser desfeita. O chamado e seu histórico serão removidos permanentemente.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </DialogHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
        <TabsList className="grid w-full grid-cols-3 bg-secondary/50">
          <TabsTrigger value="detalhes" className="text-xs gap-1.5"><Search className="h-3 w-3" /> Detalhes</TabsTrigger>
          <TabsTrigger value="ia" className="text-xs gap-1.5"><MessageSquare className="h-3 w-3" /> Consultar IA</TabsTrigger>
          <TabsTrigger value="historico" className="text-xs gap-1.5"><History className="h-3 w-3" /> Histórico IA <Badge variant="secondary" className="text-[9px] h-4 ml-1">{interactions.length}</Badge></TabsTrigger>
        </TabsList>

        <TabsContent value="detalhes" className="mt-4">
          <ScrollArea className="h-[500px] pr-2">
            <div className="space-y-5">
              {/* Status quick-change */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 border border-border/20">
                <span className="text-xs text-muted-foreground font-medium">Status:</span>
                <Select value={editForm.status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="w-40 h-8 text-xs bg-background border-border/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {columns.map(c => <SelectItem key={c.status} value={c.status}>{c.status}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {editing ? (
                <div className="space-y-4">
                  <div><Label className="text-xs">Título</Label><Input value={editForm.titulo} onChange={e => setEditForm(f => ({ ...f, titulo: e.target.value }))} className="bg-secondary border-border/50 mt-1" /></div>
                  <div><Label className="text-xs">Descrição</Label><Textarea value={editForm.descricao} onChange={e => setEditForm(f => ({ ...f, descricao: e.target.value }))} className="bg-secondary border-border/50 mt-1" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Tipo</Label>
                      <Select value={editForm.tipo} onValueChange={v => setEditForm(f => ({ ...f, tipo: v }))}>
                        <SelectTrigger className="bg-secondary border-border/50 mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>{["Folha", "Ponto", "Benefício", "eSocial"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Prioridade</Label>
                      <Select value={editForm.prioridade} onValueChange={v => setEditForm(f => ({ ...f, prioridade: v }))}>
                        <SelectTrigger className="bg-secondary border-border/50 mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>{["baixa", "media", "alta", "critica"].map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Cliente</Label>
                    <Select value={editForm.cliente_id} onValueChange={v => setEditForm(f => ({ ...f, cliente_id: v }))}>
                      <SelectTrigger className="bg-secondary border-border/50 mt-1"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                      <SelectContent>{clientes.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-xs">Observações internas</Label><Textarea value={editForm.observacoes} onChange={e => setEditForm(f => ({ ...f, observacoes: e.target.value }))} className="bg-secondary border-border/50 mt-1" placeholder="Notas internas..." /></div>
                  <Button onClick={handleSaveEdit} disabled={saving} className="gap-2">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar
                  </Button>
                </div>
              ) : (
                <>
                  {/* Info section */}
                  <div className="rounded-xl border border-border/30 bg-secondary/20 p-4 space-y-3">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">📌 Informações Gerais</h4>
                    {chamado.descricao && <p className="text-sm text-muted-foreground leading-relaxed">{chamado.descricao}</p>}
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div className="space-y-1"><span className="text-muted-foreground block">Cliente</span><span className="font-medium">{chamado.clientes?.nome || "—"}</span></div>
                      <div className="space-y-1"><span className="text-muted-foreground block">Tipo</span><span className={`px-2 py-0.5 rounded-full text-[10px] ${tipoColors[chamado.tipo] || ""}`}>{chamado.tipo}</span></div>
                      <div className="space-y-1"><span className="text-muted-foreground block">Prioridade</span><span className="font-medium capitalize">{chamado.prioridade}</span></div>
                      <div className="space-y-1"><span className="text-muted-foreground block">Criado em</span><span className="font-medium">{new Date(chamado.created_at).toLocaleDateString("pt-BR")}</span></div>
                    </div>
                    {(chamado as any).observacoes && (
                      <div className="pt-2 border-t border-border/20">
                        <span className="text-[10px] text-muted-foreground font-medium block mb-1">Observações</span>
                        <p className="text-xs text-foreground/80">{(chamado as any).observacoes}</p>
                      </div>
                    )}
                  </div>

                  {/* AI Analysis */}
                  {chamado.sugestao_ia && (
                    <div className="rounded-xl border border-neon-purple/30 bg-neon-purple/5 p-4">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">🤖 Análise da IA</h4>
                      <div className="text-xs text-muted-foreground leading-relaxed prose prose-sm prose-invert max-w-none">
                        <ReactMarkdown>{chamado.sugestao_ia}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                  {chamado.query_sugerida && (
                    <div className="rounded-xl bg-secondary/80 p-4">
                      <p className="text-[10px] text-muted-foreground mb-2 font-medium uppercase tracking-wider">💻 Query SQL Sugerida</p>
                      <code className="text-xs text-accent font-mono block whitespace-pre-wrap">{chamado.query_sugerida}</code>
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="ia" className="space-y-4 mt-4">
          <div className="rounded-xl border border-border/30 bg-secondary/30 p-4">
            <p className="text-xs text-muted-foreground mb-3">Faça perguntas sobre este chamado. A IA usará o contexto e histórico para responder.</p>
            <div className="flex gap-2">
              <Input
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !asking && handleAskAI()}
                placeholder="Ex: Como verificar o cálculo no RM?"
                className="bg-background border-border/50 text-xs"
              />
              <Button size="sm" onClick={handleAskAI} disabled={asking || !question.trim()} className="gap-1.5 shrink-0">
                {asking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
          {(asking || aiResponse) && (
            <div className="rounded-xl border border-neon-purple/30 bg-neon-purple/5 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-neon-purple mb-3">
                <Sparkles className="h-3.5 w-3.5" />
                {asking && !aiResponse ? "Analisando..." : "Resposta da IA"}
              </div>
              {asking && !aiResponse ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Processando com contexto do chamado...
                </div>
              ) : (
                <div className="text-xs leading-relaxed prose prose-sm prose-invert max-w-none">
                  <ReactMarkdown>{aiResponse}</ReactMarkdown>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="historico" className="mt-4">
          <ScrollArea className="h-[400px]">
            {interactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <History className="h-8 w-8 mb-3 opacity-40" />
                <p className="text-xs">Nenhuma interação registrada</p>
                <p className="text-[10px] mt-1">Use a aba "Consultar IA" para iniciar</p>
              </div>
            ) : (
              <div className="space-y-4">
                {interactions.map((item: any, idx: number) => (
                  <div key={item.id} className="rounded-xl border border-border/30 bg-secondary/20 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] text-muted-foreground font-medium">Interação #{idx + 1}</span>
                      <span className="text-[9px] text-muted-foreground">
                        {new Date(item.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div className="mb-3 p-2 rounded-lg bg-background/50 border border-border/20">
                      <p className="text-[10px] text-muted-foreground font-medium mb-0.5">Pergunta:</p>
                      <p className="text-xs">{item.pergunta}</p>
                    </div>
                    <div className="prose prose-sm prose-invert max-w-none text-xs">
                      <ReactMarkdown>{item.resposta}</ReactMarkdown>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </>
  );
}

function CreateChamadoForm({ clientes, onClose, onSuccess }: { clientes: any[]; onClose: () => void; onSuccess: () => void }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ titulo: "", descricao: "", tipo: "Folha", prioridade: "", clienteId: "" });
  const [submitting, setSubmitting] = useState(false);

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
