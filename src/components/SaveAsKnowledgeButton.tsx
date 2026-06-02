import { useState } from "react";
import { BookPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function SaveAsKnowledgeButton({ chamado }: { chamado: any }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    problema: chamado.titulo || "",
    contexto: chamado.descricao || "",
    solucao: chamado.sugestao_ia || "",
    resultado: "",
    confianca: "medio",
  });

  const submit = async () => {
    if (!form.problema.trim() || !form.solucao.trim()) {
      toast({ title: "Problema e solução são obrigatórios", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data: entry, error } = await supabase.from("knowledge_entries").insert({
      problema: form.problema,
      contexto: form.contexto || null,
      solucao: form.solucao,
      resultado: form.resultado || null,
      confianca: form.confianca,
      fonte: `chamado:${chamado.id}`,
      chamado_origem_id: chamado.id,
      proposed_by: user?.id,
      validacao: "pendente",
    }).select("id").maybeSingle();
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    if (entry?.id) {
      supabase.functions.invoke("embed-conhecimento", {
        body: { target: "knowledge_entry", id: entry.id },
      }).catch(() => {});
    }
    toast({ title: "📚 Enviado para validação", description: "Aguardando aprovação de um administrador." });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5 border-neon-purple/40 text-neon-purple hover:bg-neon-purple/10">
          <BookPlus className="h-3.5 w-3.5" /> Salvar como conhecimento
        </Button>
      </DialogTrigger>
      <DialogContent className="glass border-border/50 max-w-2xl">
        <DialogHeader>
          <DialogTitle>Salvar resolução na base de conhecimento</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Problema</Label>
            <Input value={form.problema} onChange={e => setForm(f => ({ ...f, problema: e.target.value }))}
              className="bg-secondary/60 border-border/40 mt-1" />
          </div>
          <div>
            <Label className="text-xs">Contexto</Label>
            <Textarea rows={3} value={form.contexto} onChange={e => setForm(f => ({ ...f, contexto: e.target.value }))}
              className="bg-secondary/60 border-border/40 mt-1 text-xs" />
          </div>
          <div>
            <Label className="text-xs">Solução aplicada</Label>
            <Textarea rows={6} value={form.solucao} onChange={e => setForm(f => ({ ...f, solucao: e.target.value }))}
              className="bg-secondary/60 border-border/40 mt-1 text-xs font-mono" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Resultado observado</Label>
              <Input value={form.resultado} onChange={e => setForm(f => ({ ...f, resultado: e.target.value }))}
                placeholder="Ex: erro resolvido, processo normalizado…"
                className="bg-secondary/60 border-border/40 mt-1" />
            </div>
            <div>
              <Label className="text-xs">Confiança</Label>
              <Select value={form.confianca} onValueChange={v => setForm(f => ({ ...f, confianca: v }))}>
                <SelectTrigger className="bg-secondary/60 border-border/40 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="alto">Alta</SelectItem>
                  <SelectItem value="medio">Média</SelectItem>
                  <SelectItem value="baixo">Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Entrará na fila de validação. Só será usada pela IA após aprovação em <strong>Conhecimento → Validações</strong>.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={saving} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Enviar para validação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
