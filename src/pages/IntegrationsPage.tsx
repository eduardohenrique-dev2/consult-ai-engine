import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Plug, Trash2, RefreshCcw, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
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
}

export default function IntegrationsPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [list, setList] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("user_integrations")
      .select("*")
      .eq("user_id", user?.id)
      .order("created_at", { ascending: false });
    setList((data as Integration[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (user) load();
  }, [user]);

  useEffect(() => {
    const connected = params.get("connected");
    if (connected) {
      toast.success(`Gmail conectado: ${connected}`);
      params.delete("connected");
      setParams(params, { replace: true });
      load();
    }
  }, [params]);

  const connectGmail = async () => {
    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("gmail-oauth-start", {
        body: { origin: window.location.origin },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("URL de autorização não retornada");
      }
    } catch (e: any) {
      toast.error(`Erro ao iniciar conexão: ${e.message}`);
      setConnecting(false);
    }
  };

  const disconnect = async (id: string) => {
    if (!confirm("Desconectar esta integração? Os chamados existentes serão mantidos.")) return;
    const { error } = await supabase.from("user_integrations").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Integração removida"); load(); }
  };

  const toggleSync = async (i: Integration) => {
    const { error } = await supabase
      .from("user_integrations")
      .update({ sync_enabled: !i.sync_enabled })
      .eq("id", i.id);
    if (error) toast.error(error.message);
    else { toast.success(i.sync_enabled ? "Sincronização pausada" : "Sincronização retomada"); load(); }
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
          <CardDescription>Cada usuário pode ter suas próprias integrações.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button onClick={connectGmail} disabled={connecting}>
            {connecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
            Conectar Gmail
          </Button>
          <Button variant="outline" disabled>Outlook (em breve)</Button>
          <Button variant="outline" disabled>IMAP customizado (em breve)</Button>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle>Contas conectadas</CardTitle>
        </CardHeader>
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
                    <Mail className="h-5 w-5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{i.email_address}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {i.provider.toUpperCase()} · adicionado {formatDistanceToNow(new Date(i.created_at), { locale: ptBR, addSuffix: true })}
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
