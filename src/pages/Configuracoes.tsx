import { Settings, User, Shield, Bell, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function Configuracoes() {
  const { profile, role, signOut } = useAuth();

  const { data: profiles = [] } = useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => {
      const { data: profs } = await supabase.from("profiles").select("*");
      if (!profs) return [];
      const { data: roles } = await supabase.from("user_roles").select("*");
      return profs.map((p: any) => ({
        ...p,
        role: roles?.find((r: any) => r.user_id === p.user_id)?.role || "consultor",
      }));
    },
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Settings className="h-6 w-6 text-muted-foreground" /> Configurações</h1>
        <p className="text-sm text-muted-foreground">Gerenciar sistema e usuários</p>
      </div>

      <div className="card-gradient rounded-xl border border-border/40 p-5">
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2"><User className="h-4 w-4 text-primary" /> Meu Perfil</h2>
        <div className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50">
          <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
            {profile?.nome?.split(" ").map(n => n[0]).join("").slice(0, 2) || "??"}
          </div>
          <div>
            <p className="text-sm font-medium">{profile?.nome}</p>
            <p className="text-xs text-muted-foreground">{profile?.email}</p>
            <Badge variant="outline" className="text-[9px] mt-1 border-primary/30 text-primary capitalize">{role}</Badge>
          </div>
        </div>
      </div>

      {profiles.length > 1 && (
        <div className="card-gradient rounded-xl border border-border/40 p-5">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> Equipe</h2>
          <div className="space-y-3">
            {profiles.map((u: any) => (
              <div key={u.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                    {u.nome?.split(" ").map((n: string) => n[0]).join("").slice(0, 2) || "??"}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{u.nome}</p>
                    <p className="text-[10px] text-muted-foreground">{u.email}</p>
                  </div>
                </div>
                <Badge variant="outline" className={`text-[10px] ${u.role === "admin" ? "text-warning border-warning/30" : "text-primary border-primary/30"}`}>
                  {u.role}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      <Button variant="outline" onClick={signOut} className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10">
        <LogOut className="h-4 w-4" /> Sair do sistema
      </Button>
    </div>
  );
}
