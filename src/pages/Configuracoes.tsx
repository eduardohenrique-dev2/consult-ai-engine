import { useState } from "react";
import { Settings, User, Bell, Sparkles, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function Configuracoes() {
  const { profile, role, signOut } = useAuth();
  const { toast } = useToast();

  const [notifSettings, setNotifSettings] = useState({
    novoChamado: true,
    statusChange: true,
    alertaCritico: true,
  });
  const [aiSettings, setAiSettings] = useState({
    detalhe: "padrao",
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Settings className="h-6 w-6 text-muted-foreground" /> Configurações</h1>
        <p className="text-sm text-muted-foreground">Preferências do sistema</p>
      </div>

      <Tabs defaultValue="perfil" className="space-y-4">
        <TabsList className="bg-secondary/50 grid w-full grid-cols-3">
          <TabsTrigger value="perfil" className="text-xs gap-1.5"><User className="h-3 w-3" /> Perfil</TabsTrigger>
          <TabsTrigger value="notificacoes" className="text-xs gap-1.5"><Bell className="h-3 w-3" /> Notificações</TabsTrigger>
          <TabsTrigger value="ia" className="text-xs gap-1.5"><Sparkles className="h-3 w-3" /> IA</TabsTrigger>
        </TabsList>

        <TabsContent value="perfil">
          <div className="card-gradient rounded-xl border border-border/40 p-5 space-y-4">
            <div className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50">
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                {profile?.nome?.split(" ").map((n: string) => n[0]).join("").slice(0, 2) || "??"}
              </div>
              <div>
                <p className="text-sm font-medium">{profile?.nome || "Usuário"}</p>
                <p className="text-xs text-muted-foreground">{profile?.email}</p>
                <Badge variant="outline" className="text-[9px] mt-1 border-primary/30 text-primary capitalize">{role || "consultor"}</Badge>
              </div>
            </div>
            <div className="space-y-3">
              <div><Label className="text-xs">Nome</Label><Input defaultValue={profile?.nome || ""} className="bg-secondary border-border/50 mt-1" /></div>
              <div><Label className="text-xs">Email</Label><Input defaultValue={profile?.email || ""} disabled className="bg-secondary border-border/50 mt-1 opacity-60" /></div>
            </div>
            <Button variant="outline" onClick={signOut} className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 mt-4">
              <LogOut className="h-4 w-4" /> Sair do sistema
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="notificacoes">
          <div className="card-gradient rounded-xl border border-border/40 p-5 space-y-5">
            <h3 className="text-sm font-semibold">Preferências de Notificação</h3>
            {[
              { key: "novoChamado", label: "Novo chamado criado", desc: "Receber alerta quando um chamado for aberto" },
              { key: "statusChange", label: "Alteração de status", desc: "Receber alerta quando um chamado mudar de status" },
              { key: "alertaCritico", label: "Alertas críticos", desc: "Receber alerta para clientes em estado crítico" },
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/20">
                <div>
                  <p className="text-xs font-medium">{item.label}</p>
                  <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                </div>
                <Switch
                  checked={(notifSettings as any)[item.key]}
                  onCheckedChange={v => setNotifSettings(s => ({ ...s, [item.key]: v }))}
                />
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="ia">
          <div className="card-gradient rounded-xl border border-border/40 p-5 space-y-5">
            <h3 className="text-sm font-semibold">Configurações da IA</h3>
            <div>
              <Label className="text-xs">Nível de detalhe das respostas</Label>
              <Select value={aiSettings.detalhe} onValueChange={v => setAiSettings(s => ({ ...s, detalhe: v }))}>
                <SelectTrigger className="bg-secondary border-border/50 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="resumido">Resumido</SelectItem>
                  <SelectItem value="padrao">Padrão</SelectItem>
                  <SelectItem value="detalhado">Detalhado</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-1">Define o nível de detalhe nas respostas do assistente IA</p>
            </div>
            <div className="p-3 rounded-lg bg-neon-purple/5 border border-neon-purple/20">
              <p className="text-xs text-neon-purple font-medium mb-1">🤖 Modelo ativo</p>
              <p className="text-[10px] text-muted-foreground">Gemini 2.5 Flash — otimizado para consultoria TOTVS RM</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
