import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, User, Settings as SettingsIcon, Shield, Mail } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ProfilePage() {
  const { user, profile, role } = useAuth();
  const [nome, setNome] = useState("");
  const [setor, setSetor] = useState("");
  const [cargo, setCargo] = useState("");
  const [assinatura, setAssinatura] = useState("");
  const [settings, setSettings] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [pw, setPw] = useState("");

  const load = async () => {
    if (!user) return;
    const [p, s, l, i] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", user.id).single(),
      supabase.from("user_settings").select("*").eq("user_id", user.id).single(),
      supabase.from("access_logs").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
      supabase.from("user_integrations").select("*").eq("user_id", user.id),
    ]);
    if (p.data) {
      setNome(p.data.nome || "");
      setSetor((p.data as any).setor || "");
      setCargo((p.data as any).cargo || "");
      setAssinatura((p.data as any).assinatura || "");
    }
    setSettings(s.data);
    setLogs(l.data || []);
    setIntegrations(i.data || []);
  };

  useEffect(() => { load(); }, [user]);

  const saveProfile = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ nome, setor, cargo, assinatura } as any)
      .eq("user_id", user!.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Perfil atualizado");
  };

  const saveSettings = async (patch: any) => {
    const { error } = await supabase
      .from("user_settings")
      .update(patch)
      .eq("user_id", user!.id);
    if (error) toast.error(error.message);
    else { toast.success("Preferências salvas"); load(); }
  };

  const changePassword = async () => {
    if (pw.length < 8) return toast.error("Mínimo 8 caracteres");
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) toast.error(error.message);
    else { toast.success("Senha alterada"); setPw(""); }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold gold-gradient flex items-center gap-2"><User className="h-6 w-6" /> Meu Perfil</h1>
        <p className="text-sm text-muted-foreground mt-1">{profile?.email} · <Badge variant="outline" className="ml-1 capitalize">{role}</Badge></p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="glass">
          <CardHeader><CardTitle>Dados pessoais</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Nome</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} /></div>
            <div><Label>Cargo</Label><Input value={cargo} onChange={(e) => setCargo(e.target.value)} /></div>
            <div><Label>Setor</Label><Input value={setor} onChange={(e) => setSetor(e.target.value)} placeholder="ex: Folha, Ponto, Suporte" /></div>
            <div><Label>Assinatura de email</Label><Textarea rows={3} value={assinatura} onChange={(e) => setAssinatura(e.target.value)} /></div>
            <Button onClick={saveProfile} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Salvar
            </Button>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader><CardTitle className="flex items-center gap-2"><SettingsIcon className="h-4 w-4" /> Preferências</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {settings && (
              <>
                <div className="flex items-center justify-between">
                  <div><Label>Resposta automática</Label><p className="text-xs text-muted-foreground">IA responde sem revisar</p></div>
                  <Switch checked={settings.auto_reply_enabled} onCheckedChange={(v) => saveSettings({ auto_reply_enabled: v })} />
                </div>
                <div className="flex items-center justify-between">
                  <div><Label>Notificações</Label><p className="text-xs text-muted-foreground">Alertas in-app</p></div>
                  <Switch checked={settings.notificacoes_push} onCheckedChange={(v) => saveSettings({ notificacoes_push: v })} />
                </div>
                <div>
                  <Label>Limite de confiança da IA: {Number(settings.confidence_threshold).toFixed(2)}</Label>
                  <Input type="range" min="0.5" max="1" step="0.05" value={settings.confidence_threshold}
                    onChange={(e) => saveSettings({ confidence_threshold: parseFloat(e.target.value) })} />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-4 w-4" /> Segurança</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Nova senha</Label><Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} /></div>
            <Button onClick={changePassword} variant="outline">Alterar senha</Button>
            <div className="mt-4">
              <Label>Acessos recentes</Label>
              <div className="mt-2 space-y-1.5 text-xs">
                {logs.length === 0 ? <p className="text-muted-foreground">Nenhum registro ainda.</p> :
                  logs.map((l) => (
                    <div key={l.id} className="flex justify-between border-b border-border/30 py-1">
                      <span>{l.event_type}</span>
                      <span className="text-muted-foreground">{formatDistanceToNow(new Date(l.created_at), { locale: ptBR, addSuffix: true })}</span>
                    </div>
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Mail className="h-4 w-4" /> Minhas integrações</CardTitle>
            <CardDescription>{integrations.length} conta(s) conectada(s)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {integrations.map((i) => (
              <div key={i.id} className="flex justify-between text-sm p-2 rounded border border-border/30">
                <span>{i.email_address}</span>
                <Badge variant={i.status === "ativa" ? "default" : "destructive"} className="text-[10px]">{i.status}</Badge>
              </div>
            ))}
            <Button asChild variant="outline" className="w-full mt-2"><Link to="/integracoes">Gerenciar integrações</Link></Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
