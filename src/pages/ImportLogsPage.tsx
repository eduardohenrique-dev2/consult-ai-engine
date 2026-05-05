import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, CheckCircle2, AlertCircle, AlertTriangle, FileText, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const statusColor: Record<string, string> = {
  sucesso: "border-success/30 text-success bg-success/5",
  parcial: "border-warning/30 text-warning bg-warning/5",
  erro: "border-critical/30 text-critical bg-critical/5",
};
const statusIcon: Record<string, any> = { sucesso: CheckCircle2, parcial: AlertTriangle, erro: AlertCircle };

export default function ImportLogsPage() {
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: logs = [] } = useQuery({
    queryKey: ["email-import-logs"],
    queryFn: async () => {
      const { data } = await supabase.from("email_import_logs").select("*").order("data_importacao", { ascending: false }).limit(100);
      return data || [];
    },
    refetchInterval: 15000,
  });

  const exportCsv = () => {
    const headers = ["data", "status", "processados", "importados", "duplicados", "erros", "classificacao"];
    const rows = logs.map((l: any) => [
      new Date(l.data_importacao).toISOString(),
      l.status, l.total_processados, l.total_importados, l.total_duplicados, l.total_erros,
      l.classificacao_padrao || "-",
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `importacoes_${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="h-6 w-6 text-primary" /> Logs de Importação</h1>
          <p className="text-sm text-muted-foreground mt-1">Histórico completo de importações de emails</p>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={logs.length === 0} className="gap-2">
          <Download className="h-4 w-4" /> Exportar CSV
        </Button>
      </div>

      <div className="space-y-2">
        {logs.length === 0 && (
          <div className="rounded-xl border border-border/30 bg-secondary/20 p-12 text-center">
            <FileText className="h-10 w-10 mx-auto opacity-30 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhuma importação registrada ainda</p>
          </div>
        )}

        {logs.map((log: any) => {
          const Icon = statusIcon[log.status] || CheckCircle2;
          const isOpen = expanded === log.id;
          return (
            <div key={log.id} className="rounded-xl border border-border/30 bg-card/30 overflow-hidden">
              <button onClick={() => setExpanded(isOpen ? null : log.id)} className="w-full p-4 flex items-center gap-3 hover:bg-secondary/30 transition-colors text-left">
                {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                <Icon className={`h-4 w-4 ${log.status === "sucesso" ? "text-success" : log.status === "parcial" ? "text-warning" : "text-critical"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium">{new Date(log.data_importacao).toLocaleString("pt-BR")}</span>
                    <Badge variant="outline" className={`text-[10px] ${statusColor[log.status]}`}>{log.status}</Badge>
                    {log.classificacao_padrao && <Badge variant="secondary" className="text-[10px]">{log.classificacao_padrao}</Badge>}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {log.total_processados} processados • {log.total_importados} importados • {log.total_duplicados} duplicados{log.total_erros > 0 && ` • ${log.total_erros} erros`}
                  </p>
                </div>
              </button>
              {isOpen && <LogDetail logId={log.id} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LogDetail({ logId }: { logId: string }) {
  const { data: itens = [] } = useQuery({
    queryKey: ["email-import-log-itens", logId],
    queryFn: async () => {
      const { data } = await supabase.from("email_import_log_itens").select("*").eq("log_id", logId).order("created_at", { ascending: true });
      return data || [];
    },
  });

  return (
    <div className="border-t border-border/30 bg-background/40 p-4">
      {itens.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">Sem detalhes</p>
      ) : (
        <div className="space-y-1.5">
          {itens.map((it: any) => (
            <div key={it.id} className="flex items-center gap-3 text-xs p-2 rounded-md bg-secondary/30">
              <Badge variant="outline" className={`text-[9px] ${it.status === "importado" ? "text-success border-success/30" : it.status === "duplicado" ? "text-muted-foreground" : "text-critical border-critical/30"}`}>
                {it.status}
              </Badge>
              <span className="flex-1 truncate">{it.assunto || it.email_id}</span>
              {it.remetente && <span className="text-[10px] text-muted-foreground">{it.remetente}</span>}
              {it.anexos_processados > 0 && <span className="text-[10px] text-primary">📎 {it.anexos_processados}</span>}
              {it.mensagem_erro && <span className="text-[10px] text-critical truncate max-w-[200px]" title={it.mensagem_erro}>{it.mensagem_erro}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
