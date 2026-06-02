import { useEffect, useState } from "react";
import { Mail, Send, Loader2, CheckCircle2, ShieldAlert, Sparkles, Wand2, FileText, BookMarked } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

const TONES: { id: string; label: string; instruction: string }[] = [
  { id: "formal", label: "Formal", instruction: "Tom formal e corporativo, em pt-BR. Sem gírias. Mantenha o conteúdo técnico." },
  { id: "cordial", label: "Cordial", instruction: "Tom cordial, empático e próximo, em pt-BR. Mantenha clareza técnica." },
  { id: "tecnico", label: "Técnico", instruction: "Tom técnico, direto e objetivo, em pt-BR. Use termos do TOTVS RM com precisão." },
  { id: "resumido", label: "Resumido", instruction: "Resuma a resposta em no máximo 5 linhas, em pt-BR, mantendo as instruções essenciais." },
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

async function streamChat(messages: any[], chamadoId: string): Promise<string> {
  const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages, pageContext: "email-reply", chamadoId }),
  });
  if (!resp.ok || !resp.body) throw new Error("Falha IA");
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") break;
      try {
        const parsed = JSON.parse(json);
        const c = parsed.choices?.[0]?.delta?.content;
        if (c) full += c;
      } catch {}
    }
  }
  return full.trim();
}

export default function EmailReplyPanel({ chamado, onSent }: Props) {
  const [to, setTo] = useState(extractSenderEmail(chamado.descricao));
  const [subject, setSubject] = useState(chamado.titulo || "");
  const [body, setBody] = useState(extractSuggestedReply(chamado.sugestao_ia));
  const [originalAi] = useState(extractSuggestedReply(chamado.sugestao_ia));
  const [sending, setSending] = useState(false);
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [snippets, setSnippets] = useState<any[]>([]);
  const { toast } = useToast();

  const isHighRisk = chamado.nivel_risco === "alto";

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("email_logs").select("*").eq("chamado_id", chamado.id)
        .order("created_at", { ascending: false });
      setLogs(data || []);
      const { data: snips } = await supabase
        .from("response_snippets").select("id,title,body,shortcut")
        .order("title", { ascending: true });
      setSnippets(snips || []);
    })();
  }, [chamado.id]);

  const applyTone = async (tone: typeof TONES[number]) => {
    if (!body.trim()) {
      toast({ title: "Escreva ou gere um rascunho primeiro", variant: "destructive" });
      return;
    }
    setAiLoading(tone.id);
    try {
      const text = await streamChat([{
        role: "user",
        content: `Reescreva o e-mail abaixo aplicando o tom solicitado. Devolva APENAS o texto final do e-mail, sem comentários, sem markdown e sem assinatura.\n\nTOM: ${tone.instruction}\n\nE-MAIL ORIGINAL:\n${body}`,
      }], chamado.id);
      if (text) setBody(text);
    } catch (e: any) {
      toast({ title: "Falha ao aplicar tom", description: e.message, variant: "destructive" });
    } finally {
      setAiLoading(null);
    }
  };

  const generateDraft = async () => {
    setAiLoading("draft");
    try {
      const text = await streamChat([{
        role: "user",
        content: `Gere um rascunho de resposta ao cliente para o chamado abaixo. Use a base de conhecimento e o histórico. Devolva APENAS o texto do e-mail (sem assinatura, sem markdown).\n\nTÍTULO: ${chamado.titulo}\nTIPO: ${chamado.tipo}\nPRIORIDADE: ${chamado.prioridade}\nDESCRIÇÃO:\n${chamado.descricao || "—"}`,
      }], chamado.id);
      if (text) setBody(text);
    } catch (e: any) {
      toast({ title: "Falha ao gerar rascunho", description: e.message, variant: "destructive" });
    } finally {
      setAiLoading(null);
    }
  };

  const summarizeThread = async () => {
    setAiLoading("summary");
    try {
      const { data: thread } = await supabase
        .from("email_logs").select("direction,assunto,conteudo,created_at")
        .eq("chamado_id", chamado.id).order("created_at", { ascending: true });
      const corpus = (thread || []).map(t =>
        `[${t.direction === "inbound" ? "Cliente" : "Consultor"} - ${new Date(t.created_at).toLocaleString("pt-BR")}]\n${t.assunto || ""}\n${(t.conteudo || "").slice(0, 1500)}`
      ).join("\n\n---\n\n") || `Descrição inicial:\n${chamado.descricao || ""}`;
      const text = await streamChat([{
        role: "user",
        content: `Resuma a thread de e-mails abaixo em pt-BR. Liste: (1) pedido do cliente, (2) ações já feitas, (3) pendências, (4) próximo passo recomendado. Seja conciso.\n\n${corpus}`,
      }], chamado.id);
      if (text) {
        toast({ title: "Resumo da thread", description: text.slice(0, 240) + (text.length > 240 ? "…" : "") });
        setBody(prev => prev ? prev + "\n\n---\nResumo da thread:\n" + text : text);
      }
    } catch (e: any) {
      toast({ title: "Falha ao resumir", description: e.message, variant: "destructive" });
    } finally {
      setAiLoading(null);
    }
  };

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

      {/* Templates rápidos */}
      <div className="flex gap-1.5 flex-wrap">
        {TEMPLATES.map(t => (
          <button key={t.label} type="button" onClick={() => setBody(t.text)}
            className="text-[10px] px-2 py-0.5 rounded-full border border-border/40 hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-primary transition">
            <Sparkles className="h-2.5 w-2.5 inline mr-1" /> {t.label}
          </button>
        ))}
        {snippets.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button"
                className="text-[10px] px-2 py-0.5 rounded-full border border-accent/40 text-accent hover:bg-accent/10 transition flex items-center gap-1">
                <BookMarked className="h-2.5 w-2.5" /> Snippets ({snippets.length})
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-72 overflow-auto">
              {snippets.map(s => (
                <DropdownMenuItem key={s.id} onClick={() => setBody(s.body)} className="text-xs flex flex-col items-start">
                  <span className="font-medium">{s.title}</span>
                  {s.shortcut && <span className="text-[9px] text-muted-foreground">/{s.shortcut}</span>}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Ações IA */}
      <div className="flex gap-1.5 flex-wrap pt-1 border-t border-border/20">
        <Button size="sm" variant="outline" onClick={generateDraft} disabled={!!aiLoading}
          className="h-7 text-[10px] gap-1 border-neon-purple/40 text-neon-purple hover:bg-neon-purple/10">
          {aiLoading === "draft" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
          Gerar rascunho com IA
        </Button>
        <Button size="sm" variant="outline" onClick={summarizeThread} disabled={!!aiLoading}
          className="h-7 text-[10px] gap-1 border-accent/40 text-accent hover:bg-accent/10">
          {aiLoading === "summary" ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
          Resumir thread
        </Button>
        <div className="w-px bg-border/30 mx-1" />
        <span className="text-[10px] text-muted-foreground self-center">Tom:</span>
        {TONES.map(t => (
          <Button key={t.id} size="sm" variant="outline" onClick={() => applyTone(t)} disabled={!!aiLoading || !body.trim()}
            className="h-7 text-[10px] px-2 border-border/40 hover:border-primary/40">
            {aiLoading === t.id ? <Loader2 className="h-3 w-3 animate-spin" /> : t.label}
          </Button>
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
        <Label className="text-[10px]">Mensagem (rascunho IA — edite antes de enviar)</Label>
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
