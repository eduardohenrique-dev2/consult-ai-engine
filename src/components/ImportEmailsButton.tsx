import { useState } from "react";
import { Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Props { onImported?: () => void; }

const CATEGORIAS = ["auto", "eSocial", "Folha", "Ponto", "Beneficios", "Geral"];

export default function ImportEmailsButton({ onImported }: Props) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [classificacao, setClassificacao] = useState<string>("auto");
  const { toast } = useToast();
  const { user } = useAuth();

  const handleImport = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("import-emails", {
        body: { classificacao_padrao: classificacao === "auto" ? null : classificacao, usuario_id: user?.id },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro ao importar");
      toast({
        title: "📧 Importação concluída",
        description: `${data.imported} novo(s) • ${data.skipped} duplicado(s) • ${data.anexos || 0} anexo(s)${data.errors > 0 ? ` • ${data.errors} erro(s)` : ""}`,
      });
      setOpen(false);
      onImported?.();
    } catch (e) {
      toast({
        title: "Erro ao importar emails",
        description: e instanceof Error ? e.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-border/50 hover:border-primary/50 transition-all">
          <Mail className="h-4 w-4" /> Importar Emails
        </Button>
      </DialogTrigger>
      <DialogContent className="glass border-border/50 max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2"><Mail className="h-4 w-4" /> Importar Emails do Gmail</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-xs">Classificação padrão</Label>
            <Select value={classificacao} onValueChange={setClassificacao}>
              <SelectTrigger className="bg-secondary border-border/50 mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIAS.map(c => (
                  <SelectItem key={c} value={c}>{c === "auto" ? "🤖 Detecção automática" : c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground mt-1.5">
              Aplica esta categoria como contexto inicial. A IA pode reclassificar se identificar algo claro (ex: eSocial).
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancelar</Button>
          <Button onClick={handleImport} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            {loading ? "Importando..." : "Importar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
