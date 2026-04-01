import { useState } from "react";
import { motion } from "framer-motion";
import { Building2, AlertTriangle, CheckCircle, XCircle, Search, Plus, Pencil, Trash2, Ticket, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

const statusConfig: Record<string, any> = {
  OK: { icon: CheckCircle, color: "text-success", bg: "bg-success/10 border-success/30", label: "Operacional" },
  ALERTA: { icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10 border-warning/30", label: "Alerta" },
  CRITICO: { icon: XCircle, color: "text-critical", bg: "bg-critical/10 border-critical/30", label: "Crítico" },
};

export default function ClientesPage() {
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editingCliente, setEditingCliente] = useState<any | null>(null);
  const [selectedCliente, setSelectedCliente] = useState<any | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes"],
    queryFn: async () => {
      const { data } = await supabase.from("clientes").select("*").order("created_at");
      return data || [];
    },
  });

  const { data: chamados = [] } = useQuery({
    queryKey: ["chamados"],
    queryFn: async () => {
      const { data } = await supabase.from("chamados").select("id, cliente_id, titulo, status, prioridade, created_at");
      return data || [];
    },
  });

  const deleteCliente = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clientes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      toast({ title: "🗑️ Cliente excluído" });
    },
  });

  const filtered = clientes.filter((c: any) => c.nome.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-sm text-muted-foreground">Gestão e monitoramento de clientes</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"><Plus className="h-4 w-4" /> Novo Cliente</Button>
          </DialogTrigger>
          <DialogContent className="glass border-border/50 max-w-md">
            <DialogHeader><DialogTitle>Cadastrar Cliente</DialogTitle></DialogHeader>
            <ClienteForm onSuccess={() => { setShowCreate(false); queryClient.invalidateQueries({ queryKey: ["clientes"] }); toast({ title: "✅ Cliente cadastrado" }); }} onCancel={() => setShowCreate(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente..." className="pl-9 bg-secondary border-border/50" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((cliente: any, i: number) => {
          const config = statusConfig[cliente.status] || statusConfig.OK;
          const Icon = config.icon;
          const numChamados = chamados.filter((c: any) => c.cliente_id === cliente.id).length;

          return (
            <motion.div key={cliente.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="card-gradient rounded-xl border border-border/40 p-5 hover:border-primary/30 transition-colors group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => setSelectedCliente(cliente)}>
                  <div className="p-2 rounded-lg bg-primary/10"><Building2 className="h-5 w-5 text-primary" /></div>
                  <div>
                    <h3 className="text-sm font-semibold">{cliente.nome}</h3>
                    <p className="text-[10px] text-muted-foreground font-mono">{cliente.cnpj || "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className={`text-[10px] ${config.bg} ${config.color}`}>
                    <Icon className="h-3 w-3 mr-1" /> {config.label}
                  </Badge>
                </div>
              </div>

              {(cliente as any).contato && (
                <p className="text-[10px] text-muted-foreground mb-2">📞 {(cliente as any).contato}</p>
              )}

              <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                <span>Chamados: <span className="text-foreground font-medium">{numChamados}</span></span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingCliente(cliente)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="glass border-border/50">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
                        <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteCliente.mutate(cliente.id)} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              {cliente.problemas && cliente.problemas.length > 0 && (
                <div className="space-y-1">
                  {cliente.problemas.map((p: string, j: number) => (
                    <div key={j} className="flex items-center gap-2 text-[10px] text-warning bg-warning/5 rounded px-2 py-1">
                      <AlertTriangle className="h-3 w-3 shrink-0" /> {p}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Edit modal */}
      <Dialog open={!!editingCliente} onOpenChange={() => setEditingCliente(null)}>
        <DialogContent className="glass border-border/50 max-w-md">
          <DialogHeader><DialogTitle>Editar Cliente</DialogTitle></DialogHeader>
          {editingCliente && (
            <ClienteForm
              initial={editingCliente}
              onSuccess={() => { setEditingCliente(null); queryClient.invalidateQueries({ queryKey: ["clientes"] }); toast({ title: "✅ Cliente atualizado" }); }}
              onCancel={() => setEditingCliente(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Detail modal with chamados */}
      <Dialog open={!!selectedCliente} onOpenChange={() => setSelectedCliente(null)}>
        <DialogContent className="glass border-border/50 max-w-lg">
          {selectedCliente && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" /> {selectedCliente.nome}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div><span className="text-muted-foreground block">CNPJ</span><span className="font-medium">{selectedCliente.cnpj || "—"}</span></div>
                  <div><span className="text-muted-foreground block">Contato</span><span className="font-medium">{(selectedCliente as any).contato || "—"}</span></div>
                  <div><span className="text-muted-foreground block">Status</span><Badge variant="outline" className={`text-[10px] ${(statusConfig[selectedCliente.status] || statusConfig.OK).bg} ${(statusConfig[selectedCliente.status] || statusConfig.OK).color}`}>{(statusConfig[selectedCliente.status] || statusConfig.OK).label}</Badge></div>
                </div>
                <div>
                  <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5"><Ticket className="h-3.5 w-3.5 text-primary" /> Chamados vinculados</h4>
                  {chamados.filter((c: any) => c.cliente_id === selectedCliente.id).length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nenhum chamado encontrado</p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-auto scrollbar-thin">
                      {chamados.filter((c: any) => c.cliente_id === selectedCliente.id).map((ch: any) => (
                        <div key={ch.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/20">
                          <div>
                            <p className="text-xs font-medium">{ch.titulo}</p>
                            <p className="text-[10px] text-muted-foreground">{new Date(ch.created_at).toLocaleDateString("pt-BR")}</p>
                          </div>
                          <Badge variant="outline" className="text-[9px]">{ch.status}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ClienteForm({ initial, onSuccess, onCancel }: { initial?: any; onSuccess: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    nome: initial?.nome || "",
    cnpj: initial?.cnpj || "",
    contato: initial?.contato || "",
    status: initial?.status || "OK",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.nome.trim()) return;
    setSaving(true);
    if (initial) {
      await supabase.from("clientes").update({
        nome: form.nome,
        cnpj: form.cnpj || null,
        contato: form.contato || null,
        status: form.status,
      } as any).eq("id", initial.id);
    } else {
      await supabase.from("clientes").insert({
        nome: form.nome,
        cnpj: form.cnpj || null,
        contato: form.contato || null,
        status: form.status,
      } as any);
    }
    setSaving(false);
    onSuccess();
  };

  return (
    <div className="space-y-4">
      <div><Label className="text-xs">Nome</Label><Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} className="bg-secondary border-border/50 mt-1" placeholder="Nome da empresa" /></div>
      <div><Label className="text-xs">CNPJ</Label><Input value={form.cnpj} onChange={e => setForm(f => ({ ...f, cnpj: e.target.value }))} className="bg-secondary border-border/50 mt-1" placeholder="00.000.000/0001-00" /></div>
      <div><Label className="text-xs">Contato</Label><Input value={form.contato} onChange={e => setForm(f => ({ ...f, contato: e.target.value }))} className="bg-secondary border-border/50 mt-1" placeholder="Email ou telefone" /></div>
      <div>
        <Label className="text-xs">Status</Label>
        <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
          <SelectTrigger className="bg-secondary border-border/50 mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="OK">Operacional</SelectItem>
            <SelectItem value="ALERTA">Alerta</SelectItem>
            <SelectItem value="CRITICO">Crítico</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <Button variant="outline" onClick={onCancel} className="border-border/50">Cancelar</Button>
        <Button onClick={handleSubmit} disabled={!form.nome.trim() || saving} className="gap-2">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {initial ? "Salvar" : "Cadastrar"}
        </Button>
      </div>
    </div>
  );
}
