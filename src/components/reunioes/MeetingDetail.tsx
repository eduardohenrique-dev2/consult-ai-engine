import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Pencil, Trash2, Sparkles, Loader2, Calendar, Clock, User, FileText, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Reuniao } from "@/hooks/useReunioes";
import ReactMarkdown from "react-markdown";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  reuniao: Reuniao;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onUpdate: (id: string, data: Partial<Reuniao>) => Promise<any>;
}

const statusLabels: Record<string, string> = {
  agendada: "Agendada",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

export function MeetingDetail({ reuniao, onClose, onEdit, onDelete, onUpdate }: Props) {
  const [notas, setNotas] = useState(reuniao.notas || "");
  const [savingNotas, setSavingNotas] = useState(false);
  const [aiLoading, setAiLoading] = useState<string | null>(null);

  const saveNotas = async () => {
    setSavingNotas(true);
    await onUpdate(reuniao.id, { notas });
    setSavingNotas(false);
  };

  const callAI = async (tipo: "pauta" | "resumo" | "proximos_passos") => {
    setAiLoading(tipo);
    try {
      const promptMap = {
        pauta: `Gere uma pauta profissional para a reunião "${reuniao.titulo}". Descrição: ${reuniao.descricao || "N/A"}. Notas: ${reuniao.notas || "N/A"}. Cliente: ${reuniao.clientes?.nome || "N/A"}.`,
        resumo: `Gere um resumo executivo da reunião "${reuniao.titulo}". Descrição: ${reuniao.descricao || "N/A"}. Notas: ${reuniao.notas || "N/A"}.`,
        proximos_passos: `Gere uma lista de próximos passos após a reunião "${reuniao.titulo}". Descrição: ${reuniao.descricao || "N/A"}. Notas: ${reuniao.notas || "N/A"}.`,
      };

      const { data, error } = await supabase.functions.invoke("chat", {
        body: { messages: [{ role: "user", content: promptMap[tipo] }] },
      });

      if (error) throw error;

      let content = "";
      if (typeof data === "string") {
        // Parse SSE
        for (const line of data.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            content += parsed.choices?.[0]?.delta?.content || "";
          } catch {}
        }
      } else {
        content = data?.choices?.[0]?.message?.content || JSON.stringify(data);
      }

      const fieldMap = { pauta: "pauta_ia", resumo: "resumo_ia", proximos_passos: "proximos_passos_ia" } as const;
      await onUpdate(reuniao.id, { [fieldMap[tipo]]: content });
      toast.success(`${tipo === "pauta" ? "Pauta" : tipo === "resumo" ? "Resumo" : "Próximos passos"} gerado(a) com sucesso`);
    } catch (e) {
      toast.error("Erro ao gerar conteúdo com IA");
    } finally {
      setAiLoading(null);
    }
  };

  const fmtDate = (d: string) => format(new Date(d), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: 300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 300, opacity: 0 }}
        className="w-[400px] h-full glass border-l border-border/30 flex flex-col"
      >
        <div className="flex items-center justify-between p-4 border-b border-border/20">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: reuniao.cor }} />
            <h3 className="font-semibold text-sm truncate max-w-[250px]">{reuniao.titulo}</h3>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}><Pencil className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onDelete}><Trash2 className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}><X className="h-3.5 w-3.5" /></Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span>{fmtDate(reuniao.data_inicio)}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>Até {fmtDate(reuniao.data_fim)}</span>
              </div>
              {reuniao.clientes?.nome && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-3.5 w-3.5" />
                  <span>{reuniao.clientes.nome}</span>
                </div>
              )}
              {reuniao.chamados?.titulo && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Link2 className="h-3.5 w-3.5" />
                  <span>{reuniao.chamados.titulo}</span>
                </div>
              )}
              <Badge variant="outline" className="text-[10px]">{statusLabels[reuniao.status] || reuniao.status}</Badge>
            </div>

            {reuniao.descricao && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Descrição</p>
                <p className="text-sm">{reuniao.descricao}</p>
              </div>
            )}

            {reuniao.participantes && reuniao.participantes.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Participantes</p>
                <div className="flex flex-wrap gap-1">
                  {reuniao.participantes.map((p, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px]">{p}</Badge>
                  ))}
                </div>
              </div>
            )}

            <Tabs defaultValue="notas" className="mt-2">
              <TabsList className="w-full grid grid-cols-4 h-8">
                <TabsTrigger value="notas" className="text-[10px]">Notas</TabsTrigger>
                <TabsTrigger value="pauta" className="text-[10px]">Pauta IA</TabsTrigger>
                <TabsTrigger value="resumo" className="text-[10px]">Resumo IA</TabsTrigger>
                <TabsTrigger value="passos" className="text-[10px]">Próx. Passos</TabsTrigger>
              </TabsList>

              <TabsContent value="notas" className="mt-2">
                <Textarea value={notas} onChange={e => setNotas(e.target.value)} rows={6} placeholder="Anotações da reunião..." className="text-xs" />
                <Button size="sm" className="mt-2 w-full text-xs" onClick={saveNotas} disabled={savingNotas}>
                  {savingNotas ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <FileText className="h-3 w-3 mr-1" />}
                  Salvar notas
                </Button>
              </TabsContent>

              <TabsContent value="pauta" className="mt-2">
                <Button size="sm" variant="outline" className="w-full mb-2 text-xs" onClick={() => callAI("pauta")} disabled={!!aiLoading}>
                  {aiLoading === "pauta" ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                  Gerar Pauta com IA
                </Button>
                {reuniao.pauta_ia && <div className="prose prose-sm prose-invert max-w-none text-xs"><ReactMarkdown>{reuniao.pauta_ia}</ReactMarkdown></div>}
              </TabsContent>

              <TabsContent value="resumo" className="mt-2">
                <Button size="sm" variant="outline" className="w-full mb-2 text-xs" onClick={() => callAI("resumo")} disabled={!!aiLoading}>
                  {aiLoading === "resumo" ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                  Gerar Resumo com IA
                </Button>
                {reuniao.resumo_ia && <div className="prose prose-sm prose-invert max-w-none text-xs"><ReactMarkdown>{reuniao.resumo_ia}</ReactMarkdown></div>}
              </TabsContent>

              <TabsContent value="passos" className="mt-2">
                <Button size="sm" variant="outline" className="w-full mb-2 text-xs" onClick={() => callAI("proximos_passos")} disabled={!!aiLoading}>
                  {aiLoading === "proximos_passos" ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                  Gerar Próximos Passos
                </Button>
                {reuniao.proximos_passos_ia && <div className="prose prose-sm prose-invert max-w-none text-xs"><ReactMarkdown>{reuniao.proximos_passos_ia}</ReactMarkdown></div>}
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </motion.div>
    </AnimatePresence>
  );
}
