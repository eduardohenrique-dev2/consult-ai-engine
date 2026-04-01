import { useState } from "react";
import { Shield, Users, Search } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";

export default function AdminPage() {
  const [search, setSearch] = useState("");
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

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

  const handleRoleChange = async (userId: string, roleId: string, newRole: string) => {
    const { error } = await supabase.from("user_roles").update({ role: newRole } as any).eq("id", roleId);
    if (error) {
      toast({ title: "Erro ao alterar role", variant: "destructive" });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    toast({ title: `Role atualizado para ${newRole}` });
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
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="h-6 w-6 text-warning" /> Administração</h1>
        <p className="text-sm text-muted-foreground">Gestão de usuários e permissões</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar usuário..." className="pl-9 bg-secondary border-border/50" />
      </div>

      <div className="card-gradient rounded-xl border border-border/40 p-5">
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Usuários ({filtered.length})</h2>
        <div className="space-y-3">
          {filtered.map((u: any, i: number) => (
            <motion.div key={u.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 border border-border/20 hover:border-primary/20 transition-colors">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                  {u.nome?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "??"}
                </div>
                <div>
                  <p className="text-sm font-medium">{u.nome || "Sem nome"}</p>
                  <p className="text-[10px] text-muted-foreground">{u.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {u.roleId ? (
                  <Select value={u.role} onValueChange={v => handleRoleChange(u.user_id, u.roleId, v)}>
                    <SelectTrigger className="w-32 h-8 text-xs bg-background border-border/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
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
