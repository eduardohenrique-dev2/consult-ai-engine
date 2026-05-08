import { useEffect, useState } from "react";
import { Mail, Send, Loader2, CheckCircle2, ShieldAlert, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  chamado: any;
  onSent?: () => void;
}

const TEMPLATES = [
  { label: "Em análise", text: "Olá, recebemos seu chamado e nossa equipe técnica já está analisando.\nRetornaremos em breve com a solução." },
  { label: "Aguardando info", text: "Olá, para avançarmos com a análise precisamos de mais detalhes:\n\n- Versão do RM\n- Empresa/Filial\n- Print do erro completo" },
  { label: "Resolvido", text: "Olá, o chamado foi resolvido conforme tratativa abaixo. Caso identifique qualquer divergência, basta responder este e-mail." },
];

function extractSenderEmail(descricao: string | null): string {
  if (!descricao) return "";
  const m = descricao.match(/<([^>]+@[^>]+)>/);
  return m ? m[1] : "";
}

function extractSuggestedReply(sugestao: string | null): string {
  if (!sugestao) return "";
  const m = sugestao.match(/##\s*✉️\s*RESPOSTA SUGERIDA AO CLIENTE\s*\n+([\s\S]*?)(?=\n##|$)/i);
  return (m ? m[1] : sugestao).trim();
}

export default function EmailReplyPanel({ chamado, onSent }: Props) {
  const [to, setTo] = useState(extractSenderEmail(chamado.descricao));
  const [subject, setSubject] = useState(chamado.titulo || "");
  const [body, setBody] = useState(extractSuggestedReply(chamado.sugestao_ia));
  const [originalAi] = useState(extractSuggestedReply(chamado.sugestao_ia));
  const [sending, setSending] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const { toast } = useToast();

  const isHighRisk = chamado.nivel_risco === "alto";

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("email_logs")
        .select("*")
        .eq("chamado_id", chamado.id)
        .order("created_at", { ascending: false });
      setLogs(data || []);
    })();
  }, [chamado.id]);

  const send = async (force = false) => {
    if (!to || !body) {
      toast({ title: "Preencha destinatário e mensagem", variant: "destructive" });
      return;
    }
    setSending(true);
    const { data, error } = await supabase.functions.invoke("send-email-reply", {
      body: { chamado_id: chamado.id, to, subject, body, original_ai_response: originalAi, force },
    });
    setSending(false);
    if (error || !data?.success) {
      toast({ title: "Erro ao enviar", description: error?.message || data?.error, variant: "destructive" });
      return;
    }
    toast({ title: "✉️ Resposta enviada", description: `Para ${to}${force ? " (envio forçado)" : ""}` });
    onSent?.();
    const { data: refreshed } = await supabase.from("email_logs").select("*").eq("chamado_id", chamado.id).order("created_at", { ascending: false });
    setLogs(refreshed || []);
  };

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-primary" /> Responder por Email</h4>
        <div className="flex items-center gap-1.5">
          {isHighRisk && (
            <Badge variant="outline" className="text-[9px] border-critical/40 text-critical gap-1">
              <ShieldAlert className="h-2.5 w-2.5" /> Alto risco
            </Badge>
          )}
          {chamado.resposta_enviada && (
            <Badge variant="outline" className="text-[9px] border-success/40 text-success gap-1">
              <CheckCircle2 className="h-2.5 w-2.5" /> Já respondido
            </Badge>
          )}
        </div>
      </div>

      {isHighRisk && chamado.motivo_bloqueio_auto && (
        <div className="rounded-lg bg-critical/5 border border-critical/30 p-2 text-[10px] text-critical">
          ⚠️ Motivo do bloqueio: {chamado.motivo_bloqueio_auto}
        </div>
      )}

      {/* Templates */}
      <div className="flex gap-1.5 flex-wrap">
        {TEMPLATES.map(t => (
          <button key={t.label} type="button" onClick={() => setBody(t.text)}
            className="text-[10px] px-2 py-0.5 rounded-full border border-border/40 hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-primary transition">
            <Sparkles className="h-2.5 w-2.5 inline mr-1" /> {t.label}
          </button>
        ))}
      </div>

      <div>
        <Label className="text-[10px]">Para</Label>
        <Input value={to} onChange={e => setTo(e.target.value)} className="bg-background border-border/50 mt-1 h-8 text-xs" placeholder="cliente@empresa.com.br" />
      </div>
      <div>
        <Label className="text-[10px]">Assunto</Label>
        <Input value={subject} onChange={e => setSubject(e.target.value)} className="bg-background border-border/50 mt-1 h-8 text-xs" />
      </div>
      <div>
        <Label className="text-[10px]">Mensagem (sugestão IA — edite antes de enviar)</Label>
        <Textarea value={body} onChange={e => setBody(e.target.value)} rows={8} className="bg-background border-border/50 mt-1 text-xs font-mono" />
      </div>

      <div className="flex gap-2">
        <Button size="sm" onClick={() => send(false)} disabled={sending || isHighRisk} className="gap-1.5">
          {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          {sending ? "Enviando..." : "Enviar resposta"}
        </Button>

        {isHighRisk && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline" disabled={sending}
                className="gap-1.5 border-critical/40 text-critical hover:bg-critical/10">
                <ShieldAlert className="h-3.5 w-3.5" /> Forçar envio
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar envio forçado</AlertDialogTitle>
                <AlertDialogDescription>
                  Este chamado foi classificado como <strong>alto risco</strong>. Você assume total responsabilidade pelo envio da resposta. A ação será registrada nos logs.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => send(true)}>Forçar envio</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {logs.length > 0 && (
        <div className="pt-3 border-t border-border/20 space-y-1.5">
          <p className="text-[10px] text-muted-foreground font-medium">Histórico de emails ({logs.length})</p>
          {logs.slice(0, 5).map(l => (
            <div key={l.id} className="text-[10px] flex items-center gap-2">
              <span className={`px-1.5 py-0.5 rounded ${l.direction === "inbound" ? "bg-accent/20 text-accent" : "bg-primary/20 text-primary"}`}>
                {l.direction === "inbound" ? "↓ recebido" : "↑ enviado"}
              </span>
              <span className="text-muted-foreground">{new Date(l.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
              <span className={l.status === "erro" ? "text-destructive" : ""}>{l.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
