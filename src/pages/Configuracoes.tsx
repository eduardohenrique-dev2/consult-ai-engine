import { Settings, User, Shield, Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { usuarios } from "@/data/mock-data";

export default function Configuracoes() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6 text-muted-foreground" /> Configurações
        </h1>
        <p className="text-sm text-muted-foreground">Gerenciar sistema e usuários</p>
      </div>

      <div className="card-gradient rounded-xl border border-border/40 p-5">
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <User className="h-4 w-4 text-primary" /> Usuários do Sistema
        </h2>
        <div className="space-y-3">
          {usuarios.map(u => (
            <div key={u.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                  {u.nome.split(" ").map(n => n[0]).join("")}
                </div>
                <div>
                  <p className="text-sm font-medium">{u.nome}</p>
                  <p className="text-[10px] text-muted-foreground">{u.email}</p>
                </div>
              </div>
              <Badge variant="outline" className={`text-[10px] ${u.perfil === "admin" ? "text-warning border-warning/30" : "text-primary border-primary/30"}`}>
                <Shield className="h-3 w-3 mr-1" /> {u.perfil}
              </Badge>
            </div>
          ))}
        </div>
      </div>

      <div className="card-gradient rounded-xl border border-border/40 p-5">
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" /> Notificações
        </h2>
        <p className="text-xs text-muted-foreground">WebSocket ativo — alertas em tempo real habilitados</p>
      </div>
    </div>
  );
}
