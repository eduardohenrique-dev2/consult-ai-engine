import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Plug, Trash2, RefreshCcw, CheckCircle2, AlertTriangle, Loader2, Server } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Integration {
  id: string;
  provider: string;
  email_address: string;
  display_name: string | null;
  status: string;
  last_sync_at: string | null;
  last_error: string | null;
  sync_enabled: boolean;
  created_at: string;
  imap_host?: string | null;
  smtp_host?: string | null;
}

const PRESETS = [
  { id: "gmail",   label: "Gmail (App Password)", imap: "imap.gmail.com:993",        smtp: "smtp.gmail.com:465" },
  { id: "outlook", label: "Outlook / Microsoft 365", imap: "outlook.office365.com:993", smtp: "smtp.office365.com:587" },
  { id: "zoho",    label: "Zoho Mail",            imap: "imap.zoho.com:993",          smtp: "smtp.zoho.com:465" },
  { id: "yahoo",   label: "Yahoo",                imap: "imap.mail.yahoo.com:993",    smtp: "smtp.mail.yahoo.com:465" },
  { id: "custom",  label: "Servidor customizado", imap: "", smtp: "" },
];

export default function IntegrationsPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [list, setList] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [imapOpen, setImapOpen] = useState(false);
  const [imapSaving, setImapSaving] = useState(false);
  const [imapForm, setImapForm] = useState({
    preset: "gmail", email: "", password: "", display_name: "",
    imap_host: "", imap_port: 993, smtp_host: "", smtp_port: 465,
  });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("user_integrations").select("*").eq("user_id", user?.id).order("created_at", { ascending: false });
    setList((data as Integration[]) || []);
    setLoading(false);
  };

  useEffect(() => { if (user) load(); }, [user]);

  useEffect(() => {
    const connected = params.get("connected");
    if (connected) {
      toast.success(`Gmail conectado: ${connected}`);
      params.delete("connected"); setParams(params, { replace: true }); load();
    }
  }, [params]);

  const connectGmail = async () => {
    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("gmail-oauth-start", { body: { origin: window.location.origin } });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
      else throw new Error("URL de autorização não retornada");
    } catch (e: any) {
      toast.error(`Erro ao iniciar conexão: ${e.message}`);
      setConnecting(false);
    }
  };

  const saveImap = async () => {
    if (!imapForm.email || !imapForm.password) { toast.error("Email e senha obrigatórios"); return; }
    setImapSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("imap-connect", {
        body: {
          provider_preset: imapForm.preset !== "custom" ? imapForm.preset : undefined,
          email_address: imapForm.email,
          password: imapForm.password,
          display_name: imapForm.display_name || undefined,
          imap_host: imapForm.preset === "custom" ? imapForm.imap_host : undefined,
          imap_port: imapForm.preset === "custom" ? imapForm.imap_port : undefined,
          smtp_host: imapForm.preset === "custom" ? imapForm.smtp_host : undefined,
          smtp_port: imapForm.preset === "custom" ? imapForm.smtp_port : undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Conta IMAP conectada com sucesso!");
      setImapOpen(false);
      setImapForm({ preset: "gmail", email: "", password: "", display_name: "", imap_host: "", imap_port: 993, smtp_host: "", smtp_port: 465 });
      load();
    } catch (e: any) {
      toast.error(`Falha: ${e.message}`);
    } finally { setImapSaving(false); }
  };

  const disconnect = async (id: string) => {
    if (!confirm("Desconectar esta integração? Os chamados existentes serão mantidos.")) return;
    const { error } = await supabase.from("user_integrations").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Integração removida"); load(); }
  };

  const toggleSync = async (i: Integration) => {
    const { error } = await supabase.from("user_integrations").update({ sync_enabled: !i.sync_enabled }).eq("id", i.id);
    if (error) toast.error(error.message); else { toast.success(i.sync_enabled ? "Sincronização pausada" : "Sincronização retomada"); load(); }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold gold-gradient">Minhas Integrações</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Conecte sua própria conta de email. Os chamados importados ficarão visíveis apenas para você.
        </p>
      </div>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Plug className="h-5 w-5" /> Conectar nova conta</CardTitle>
          <CardDescription>Use OAuth (Gmail) ou IMAP/SMTP (qualquer provedor) — sem configuração no Google.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button onClick={connectGmail} disabled={connecting} variant="outline">
            {connecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
            Conectar Gmail (OAuth)
          </Button>

          <Dialog open={imapOpen} onOpenChange={setImapOpen}>
            <DialogTrigger asChild>
              <Button><Server className="h-4 w-4 mr-2" /> Conectar IMAP/SMTP</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Conectar IMAP/SMTP</DialogTitle>
                <DialogDescription>
                  Funciona com Gmail (App Password), Outlook, Zoho, Yahoo ou qualquer servidor.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Provedor</Label>
                  <Select value={imapForm.preset} onValueChange={(v) => setImapForm({ ...imapForm, preset: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRESETS.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input className="mt-1" type="email" value={imapForm.email} onChange={(e) => setImapForm({ ...imapForm, email: e.target.value })} placeholder="voce@dominio.com" />
                </div>
                <div>
                  <Label className="text-xs">Senha {imapForm.preset === "gmail" && "(App Password do Google)"}</Label>
                  <Input className="mt-1" type="password" value={imapForm.password} onChange={(e) => setImapForm({ ...imapForm, password: e.target.value })} placeholder="••••••••" />
                  {imapForm.preset === "gmail" && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Use uma <a className="underline" href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer">senha de app</a> (2FA precisa estar ativo).
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-xs">Nome de exibição (opcional)</Label>
                  <Input className="mt-1" value={imapForm.display_name} onChange={(e) => setImapForm({ ...imapForm, display_name: e.target.value })} placeholder="Seu Nome" />
                </div>
                {imapForm.preset === "custom" && (
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label className="text-xs">IMAP host</Label><Input className="mt-1" value={imapForm.imap_host} onChange={(e) => setImapForm({ ...imapForm, imap_host: e.target.value })} /></div>
                    <div><Label className="text-xs">IMAP porta</Label><Input className="mt-1" type="number" value={imapForm.imap_port} onChange={(e) => setImapForm({ ...imapForm, imap_port: +e.target.value })} /></div>
                    <div><Label className="text-xs">SMTP host</Label><Input className="mt-1" value={imapForm.smtp_host} onChange={(e) => setImapForm({ ...imapForm, smtp_host: e.target.value })} /></div>
                    <div><Label className="text-xs">SMTP porta</Label><Input className="mt-1" type="number" value={imapForm.smtp_port} onChange={(e) => setImapForm({ ...imapForm, smtp_port: +e.target.value })} /></div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setImapOpen(false)} disabled={imapSaving}>Cancelar</Button>
                <Button onClick={saveImap} disabled={imapSaving}>
                  {imapSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Testar e conectar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader><CardTitle>Contas conectadas</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline" /></div>
          ) : list.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma integração conectada ainda.</p>
          ) : (
            <div className="space-y-3">
              {list.map((i) => (
                <div key={i.id} className="flex items-center justify-between p-4 rounded-xl border border-border/40 bg-background/30">
                  <div className="flex items-center gap-3 min-w-0">
                    {i.provider === "imap" ? <Server className="h-5 w-5 text-primary shrink-0" /> : <Mail className="h-5 w-5 text-primary shrink-0" />}
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{i.email_address}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {i.provider.toUpperCase()} {i.imap_host && `· ${i.imap_host}`} · adicionado {formatDistanceToNow(new Date(i.created_at), { locale: ptBR, addSuffix: true })}
                        {i.last_sync_at && ` · última sync ${formatDistanceToNow(new Date(i.last_sync_at), { locale: ptBR, addSuffix: true })}`}
                      </p>
                      {i.last_error && <p className="text-[11px] text-destructive mt-1">{i.last_error}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={i.status === "ativa" ? "default" : "destructive"} className="text-[10px]">
                      {i.status === "ativa" ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <AlertTriangle className="h-3 w-3 mr-1" />}
                      {i.status}
                    </Badge>
                    <Button size="sm" variant="ghost" onClick={() => toggleSync(i)} title={i.sync_enabled ? "Pausar sync" : "Retomar sync"}>
                      <RefreshCcw className={`h-4 w-4 ${!i.sync_enabled && "opacity-30"}`} />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => disconnect(i.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
