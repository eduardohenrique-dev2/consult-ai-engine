import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, CheckCircle2, AlertCircle, AlertTriangle, FileText, Download, Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PAGE_SIZE = 15;

const statusColor: Record<string, string> = {
  sucesso: "border-success/30 text-success bg-success/5",
  parcial: "border-warning/30 text-warning bg-warning/5",
  erro: "border-critical/30 text-critical bg-critical/5",
};
const statusIcon: Record<string, any> = { sucesso: CheckCircle2, parcial: AlertTriangle, erro: AlertCircle };

export default function ImportLogsPage() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const { data: logs = [] } = useQuery({
    queryKey: ["email-import-logs"],
    queryFn: async () => {
      const { data } = await supabase.from("email_import_logs").select("*").order("data_importacao", { ascending: false }).limit(500);
      return data || [];
    },
    refetchInterval: 15000,
  });

  const filtered = useMemo(() => {
    return logs.filter((l: any) => {
      if (statusFilter !== "todos" && l.status !== statusFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        const haystack = `${l.classificacao_padrao || ""} ${new Date(l.data_importacao).toLocaleString("pt-BR")}`.toLowerCase();
        if (!haystack.includes(s)) return false;
      }
      return true;
    });
  }, [logs, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const exportCsv = () => {
    const headers = ["data", "status", "processados", "importados", "duplicados", "erros", "classificacao"];
    const rows = filtered.map((l: any) => [
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

  const totals = useMemo(() => filtered.reduce((acc: any, l: any) => ({
    processados: acc.processados + (l.total_processados || 0),
    importados: acc.importados + (l.total_importados || 0),
    duplicados: acc.duplicados + (l.total_duplicados || 0),
    erros: acc.erros + (l.total_erros || 0),
  }), { processados: 0, importados: 0, duplicados: 0, erros: 0 }), [filtered]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="h-6 w-6 text-primary" /> Logs de Importação</h1>
          <p className="text-sm text-muted-foreground mt-1">Histórico completo e auditoria das importações</p>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={filtered.length === 0} className="gap-2">
          <Download className="h-4 w-4" /> Exportar CSV ({filtered.length})
        </Button>
      </div>

      {/* Métricas filtradas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Processados", value: totals.processados, color: "text-primary" },
          { label: "Importados", value: totals.importados, color: "text-success" },
          { label: "Duplicados", value: totals.duplicados, color: "text-muted-foreground" },
          { label: "Erros", value: totals.erros, color: "text-critical" },
        ].map(m => (
          <div key={m.label} className="rounded-xl border border-border/30 bg-card/30 p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{m.label}</p>
            <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="Buscar por data ou classificação..." className="pl-9 bg-secondary border-border/50" />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-secondary rounded">
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(0); }}>
          <SelectTrigger className="w-40 bg-secondary border-border/50"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos status</SelectItem>
            <SelectItem value="sucesso">Sucesso</SelectItem>
            <SelectItem value="parcial">Parcial</SelectItem>
            <SelectItem value="erro">Erro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {paged.length === 0 && (
          <div className="rounded-xl border border-border/30 bg-secondary/20 p-12 text-center">
            <FileText className="h-10 w-10 mx-auto opacity-30 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhuma importação encontrada</p>
          </div>
        )}

        {paged.map((log: any) => {
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

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">Página {page + 1} de {totalPages} • {filtered.length} resultados</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</Button>
            <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage(p => p + 1)}>Próximo</Button>
          </div>
        </div>
      )}
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
