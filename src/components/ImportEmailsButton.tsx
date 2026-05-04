import { useState } from "react";
import { Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  onImported?: () => void;
}

export default function ImportEmailsButton({ onImported }: Props) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleImport = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("import-emails");
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro ao importar");

      toast({
        title: "📧 Importação concluída",
        description: `${data.imported} novo(s) chamado(s) criado(s) • ${data.skipped} já importado(s)`,
      });
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
    <Button
      variant="outline"
      onClick={handleImport}
      disabled={loading}
      className="gap-2 border-border/50 hover:border-primary/50 transition-all"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
      {loading ? "Importando..." : "Importar Emails"}
    </Button>
  );
}
