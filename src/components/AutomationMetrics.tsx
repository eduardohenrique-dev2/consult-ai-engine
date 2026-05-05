import { useQuery } from "@tanstack/react-query";
import { Mail, Bot, CheckCircle2, AlertTriangle, Pencil, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { subDays } from "date-fns";

function StatTile({ icon: Icon, label, value, sub, tone = "default" }: any) {
  const toneClass = {
    default: "text-foreground",
    primary: "text-primary",
    success: "text-success",
    warning: "text-warning",
    purple: "text-neon-purple",
    critical: "text-critical",
  }[tone as string];
  return (
    <div className="glass rounded-xl border border-border/30 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-3.5 w-3.5 ${toneClass}`} />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${toneClass}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

export default function AutomationMetrics() {
  const since30 = subDays(new Date(), 30).toISOString();
  const since7 = subDays(new Date(), 7).toISOString();

  const { data: stats } = useQuery({
    queryKey: ["automation-stats"],
    refetchInterval: 30000,
    queryFn: async () => {
      const [emails30, emails7, importLogs, aiLearning, autoSent, manualSent, blocked] = await Promise.all([
        supabase.from("imported_emails").select("id", { count: "exact", head: true }).gte("imported_at", since30),
        supabase.from("imported_emails").select("id", { count: "exact", head: true }).gte("imported_at", since7),
        supabase.from("email_import_logs").select("total_importados, status").gte("data_importacao", since30),
        supabase.from("ai_learning").select("id", { count: "exact", head: true }).gte("created_at", since30),
        supabase.from("email_logs").select("id", { count: "exact", head: true }).eq("direction", "outbound").eq("status", "enviado").gte("created_at", since30),
        supabase.from("chamados").select("id", { count: "exact", head: true }).gte("created_at", since30).eq("resposta_enviada", true),
        supabase.from("chamados").select("id", { count: "exact", head: true }).gte("created_at", since30).not("motivo_bloqueio_auto", "is", null),
      ]);

      const importedTotal = (importLogs.data || []).reduce((s: number, r: any) => s + (r.total_importados || 0), 0);
      const respostas = autoSent.count || 0;
      const learningCount = aiLearning.count || 0;
      const taxaEdicao = respostas > 0 ? Math.round((learningCount / respostas) * 100) : 0;

      return {
        emails30: emails30.count || 0,
        emails7: emails7.count || 0,
        importedTotal,
        respostas,
        taxaEdicao,
        bloqueados: blocked.count || 0,
        manuais: manualSent.count || 0,
      };
    },
  });

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
        <Bot className="h-3.5 w-3.5 text-neon-purple" /> Métricas de Automação (últimos 30 dias)
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatTile icon={Mail} label="Emails 30d" value={stats?.emails30 ?? 0} sub={`${stats?.emails7 ?? 0} nos últimos 7d`} tone="primary" />
        <StatTile icon={CheckCircle2} label="Chamados criados" value={stats?.importedTotal ?? 0} sub="via importação" tone="success" />
        <StatTile icon={Bot} label="Respostas IA" value={stats?.respostas ?? 0} sub="enviadas" tone="purple" />
        <StatTile icon={Pencil} label="Edição humana" value={`${stats?.taxaEdicao ?? 0}%`} sub="ajustes em IA" tone="warning" />
        <StatTile icon={ShieldAlert} label="Bloqueados" value={stats?.bloqueados ?? 0} sub="por proteção" tone="critical" />
        <StatTile icon={AlertTriangle} label="Auto vs Manual" value={`${(stats?.respostas ?? 0)} / ${(stats?.manuais ?? 0)}`} sub="respondidos" />
      </div>
    </div>
  );
}
