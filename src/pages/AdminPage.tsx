import { useEffect, useState } from "react";
import { Shield, Users, Search, Trash2, Mail, AlertTriangle, Power, Loader2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";

const ROLE_COLORS: Record<string, string> = {
  admin: "border-warning/40 text-warning",
  supervisor: "border-accent/40 text-accent",
  consultor: "border-primary/30 text-primary",
};

export default function AdminPage() {
  const [search, setSearch] = useState("");
  const [importEnabled, setImportEnabled] = useState(true);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    setImportEnabled(localStorage.getItem("pm_import_enabled") !== "false");
  }, []);

  const { data: users = [] } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("*");
      const { data: roles } = await supabase.from("user_roles").select("*");
      return (profiles || []).map((p: any) => ({
        ...p,
        role: roles?.find((r: any) => r.user_id === p.user_id)?.role || "consultor",
        roleId: roles?.find((r: any) => r.user_id === p.user_id)?.id,
      }));
    },
  });

  const { data: importedCount = 0 } = useQuery({
    queryKey: ["imported-chamados-count"],
    queryFn: async () => {
      const { count } = await supabase.from("imported_emails").select("chamado_id", { count: "exact", head: true });
      return count || 0;
    },
    refetchInterval: 30000,
  });

  const handleRoleChange = async (userId: string, roleId: string, newRole: string) => {
    const { error } = await supabase.from("user_roles").update({ role: newRole } as any).eq("id", roleId);
    if (error) { toast({ title: "Erro ao alterar role", variant: "destructive" }); return; }
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    toast({ title: `Role atualizado para ${newRole}` });
  };

  const handleBulkDeleteImported = async () => {
    setBulkDeleting(true);
    // pega ids dos chamados importados
    const { data: imported } = await supabase.from("imported_emails").select("chamado_id");
    const ids = (imported || []).map((i: any) => i.chamado_id).filter(Boolean);
    if (ids.length === 0) {
      toast({ title: "Nada para excluir" });
      setBulkDeleting(false);
      return;
    }
    const { error } = await supabase.from("chamados").delete().in("id", ids);
    setBulkDeleting(false);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `🗑️ ${ids.length} chamados importados excluídos` });
    queryClient.invalidateQueries({ queryKey: ["chamados"] });
    queryClient.invalidateQueries({ queryKey: ["chamados-with-clients"] });
    queryClient.invalidateQueries({ queryKey: ["imported-chamados-count"] });
  };

  const toggleImport = (v: boolean) => {
    setImportEnabled(v);
    localStorage.setItem("pm_import_enabled", String(v));
    toast({ title: v ? "Importação ativada" : "Importação pausada" });
  };

  const filtered = users.filter((u: any) =>
    u.nome?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground">
        <Shield className="h-12 w-12 mb-4 opacity-30" />
        <p className="text-lg font-semibold">Acesso Restrito</p>
        <p className="text-sm">Apenas administradores podem acessar esta área.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="h-6 w-6 text-warning" /> Administração</h1>
        <p className="text-sm text-muted-foreground">Gestão de usuários, permissões e operações críticas</p>
      </div>

      {/* Controles globais */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card-gradient rounded-xl border border-border/40 p-5 space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /> Integração de E-mail</h3>
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/20">
            <div>
              <p className="text-xs font-medium flex items-center gap-2">
                <Power className="h-3.5 w-3.5" /> Importação automática
                {importEnabled
                  ? <Badge className="text-[9px] bg-success/15 text-success border-success/30">Ativo</Badge>
                  : <Badge variant="outline" className="text-[9px]">Pausado</Badge>}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Liga/desliga sincronização de e-mails Gmail.</p>
            </div>
            <Switch checked={importEnabled} onCheckedChange={toggleImport} />
          </div>
        </div>

        <div className="card-gradient rounded-xl border border-critical/30 p-5 space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2 text-critical"><AlertTriangle className="h-4 w-4" /> Zona perigosa</h3>
          <p className="text-[10px] text-muted-foreground">
            Existem <strong className="text-foreground">{importedCount}</strong> chamados originados de e-mail.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={bulkDeleting || importedCount === 0}
                className="gap-2 border-critical/40 text-critical hover:bg-critical/10 w-full">
                {bulkDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Excluir Chamados Importados
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir todos os chamados importados?</AlertDialogTitle>
                <AlertDialogDescription>
                  Isso removerá <strong>{importedCount}</strong> chamados criados via importação de e-mail e seus dados relacionados.
                  <br /><strong className="text-critical">Esta ação não pode ser desfeita.</strong>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleBulkDeleteImported} className="bg-critical text-critical-foreground hover:bg-critical/90">
                  Sim, excluir tudo
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Usuários */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar usuário..." className="pl-9 bg-secondary border-border/50" />
      </div>

      <div className="card-gradient rounded-xl border border-border/40 p-5">
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Usuários ({filtered.length})</h2>
        <div className="space-y-3">
          {filtered.map((u: any, i: number) => (
            <motion.div key={u.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 border border-border/20 hover:border-primary/20 transition-colors">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                  {u.nome?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "??"}
                </div>
                <div>
                  <p className="text-sm font-medium">{u.nome || "Sem nome"}</p>
                  <p className="text-[10px] text-muted-foreground">{u.email}</p>
                </div>
                <Badge variant="outline" className={`text-[9px] capitalize ${ROLE_COLORS[u.role] || ""}`}>{u.role}</Badge>
              </div>
              <div className="flex items-center gap-3">
                {u.roleId ? (
                  <Select value={u.role} onValueChange={v => handleRoleChange(u.user_id, u.roleId, v)}>
                    <SelectTrigger className="w-36 h-8 text-xs bg-background border-border/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                      <SelectItem value="consultor">Consultor</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="outline" className="text-[10px]">Sem role</Badge>
                )}
              </div>
            </motion.div>
          ))}
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">Nenhum usuário encontrado</p>
          )}
        </div>
      </div>
    </div>
  );
}
