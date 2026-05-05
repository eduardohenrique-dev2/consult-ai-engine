import { useQuery } from "@tanstack/react-query";
import { Paperclip, FileText, Image as ImageIcon, FileType, Download, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props { chamadoId: string }

const iconByTipo: Record<string, any> = {
  imagem: ImageIcon,
  pdf: FileText,
  texto: FileType,
  outro: Paperclip,
};

function formatBytes(b?: number | null) {
  if (!b) return "";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

export default function AttachmentsList({ chamadoId }: Props) {
  const { data: anexos = [] } = useQuery({
    queryKey: ["chamado-anexos", chamadoId],
    queryFn: async () => {
      const { data } = await supabase.from("chamado_anexos").select("*").eq("chamado_id", chamadoId).order("created_at", { ascending: true });
      return data || [];
    },
  });

  if (anexos.length === 0) return null;

  return (
    <div className="rounded-xl border border-border/30 bg-secondary/20 p-4">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
        <Paperclip className="h-3.5 w-3.5" /> Anexos ({anexos.length})
      </h4>
      <div className="space-y-2">
        {anexos.map((a: any) => {
          const Icon = iconByTipo[a.tipo] || Paperclip;
          return (
            <div key={a.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-background/40 border border-border/20 hover:border-primary/30 transition-colors">
              <Icon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{a.nome_arquivo}</p>
                <p className="text-[10px] text-muted-foreground">{a.tipo} • {formatBytes(a.tamanho_bytes)} • {a.origem}</p>
                {a.tipo === "imagem" && (
                  <a href={a.url} target="_blank" rel="noreferrer" className="block mt-2">
                    <img src={a.url} alt={a.nome_arquivo} className="max-h-40 rounded-md border border-border/30" />
                  </a>
                )}
                {a.texto_extraido && (
                  <details className="mt-2">
                    <summary className="text-[10px] text-neon-purple cursor-pointer">🔍 Texto extraído pela IA</summary>
                    <pre className="text-[10px] whitespace-pre-wrap mt-1 p-2 rounded bg-background/60 max-h-40 overflow-auto">{a.texto_extraido}</pre>
                  </details>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                <a href={a.url} target="_blank" rel="noreferrer" className="p-1.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary"><ExternalLink className="h-3 w-3" /></a>
                <a href={a.url} download={a.nome_arquivo} className="p-1.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary"><Download className="h-3 w-3" /></a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
