import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Download, TrendingUp, Users, Ticket, Clock, BarChart3, Sparkles, Loader2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { format, subMonths, startOfMonth, endOfMonth, parseISO, differenceInHours } from "date-fns";
import { toast } from "sonner";

const tooltipStyle = {
  background: "hsl(228 18% 9%)",
  border: "1px solid hsl(228 15% 16%)",
  borderRadius: "10px",
  color: "hsl(220 20% 92%)",
  fontSize: "12px",
  boxShadow: "0 8px 32px hsl(0 0% 0% / 0.4)",
};

const COLORS = [
  "hsl(245, 80%, 65%)",
  "hsl(200, 100%, 60%)",
  "hsl(270, 100%, 70%)",
  "hsl(38, 92%, 55%)",
  "hsl(145, 65%, 48%)",
  "hsl(0, 80%, 58%)",
];

function generatePdfHtml(metrics: any, summary: string, monthLabel: string) {
  const { total, finalizados, abertos, taxaResolucao, byType, byPriority, byClient } = metrics;

  const typeRows = Object.entries(byType as Record<string, number>)
    .map(([k, v]) => `<tr><td style="padding:8px 12px;border-bottom:1px solid #2a2d3a">${k}</td><td style="padding:8px 12px;border-bottom:1px solid #2a2d3a;text-align:right;font-weight:600">${v}</td></tr>`)
    .join("");

  const priorityRows = Object.entries(byPriority as Record<string, number>)
    .map(([k, v]) => `<tr><td style="padding:8px 12px;border-bottom:1px solid #2a2d3a">${k}</td><td style="padding:8px 12px;border-bottom:1px solid #2a2d3a;text-align:right;font-weight:600">${v}</td></tr>`)
    .join("");

  const clientRows = Object.entries(byClient as Record<string, number>)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 10)
    .map(([k, v]) => `<tr><td style="padding:8px 12px;border-bottom:1px solid #2a2d3a">${k}</td><td style="padding:8px 12px;border-bottom:1px solid #2a2d3a;text-align:right;font-weight:600">${v}</td></tr>`)
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Relatório ${monthLabel}</title>
<style>
  @page { size: A4; margin: 20mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #0c0d14; color: #d4d8e8; font-size: 13px; line-height: 1.6; }
  .header { background: linear-gradient(135deg, #1a1b2e 0%, #2d1f54 100%); padding: 32px; border-radius: 12px; margin-bottom: 24px; }
  .header h1 { font-size: 22px; color: #fff; margin-bottom: 4px; }
  .header p { color: #9ea3b5; font-size: 12px; }
  .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 24px; }
  .card { background: #14151f; border: 1px solid #2a2d3a; border-radius: 10px; padding: 18px; }
  .card .label { font-size: 11px; color: #7c8195; text-transform: uppercase; letter-spacing: 0.5px; }
  .card .value { font-size: 26px; font-weight: 700; color: #fff; margin-top: 6px; }
  .tables { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 24px; }
  .table-card { background: #14151f; border: 1px solid #2a2d3a; border-radius: 10px; padding: 18px; }
  .table-card h3 { font-size: 13px; font-weight: 600; margin-bottom: 12px; color: #a5b0d0; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  .summary-card { background: linear-gradient(135deg, #14151f 0%, #1a1b30 100%); border: 1px solid #3b3f5c; border-radius: 12px; padding: 24px; }
  .summary-card h3 { font-size: 14px; font-weight: 600; color: #a78bfa; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
  .summary-card p { color: #c4c9db; font-size: 12.5px; line-height: 1.7; white-space: pre-wrap; }
  .footer { text-align: center; margin-top: 24px; color: #5a5e72; font-size: 10px; }
</style>
</head>
<body>
  <div class="header">
    <h1>📊 Relatório Mensal — ${monthLabel}</h1>
    <p>PM Intelligence Assistant • Pereira Marques Consultoria</p>
  </div>

  <div class="cards">
    <div class="card"><div class="label">Total Chamados</div><div class="value">${total}</div></div>
    <div class="card"><div class="label">Finalizados</div><div class="value" style="color:#4ade80">${finalizados}</div></div>
    <div class="card"><div class="label">Em Aberto</div><div class="value" style="color:#fbbf24">${abertos}</div></div>
    <div class="card"><div class="label">Taxa de Resolução</div><div class="value" style="color:#818cf8">${taxaResolucao}%</div></div>
  </div>

  <div class="tables">
    <div class="table-card"><h3>Por Tipo</h3><table>${typeRows || '<tr><td style="color:#5a5e72">Sem dados</td></tr>'}</table></div>
    <div class="table-card"><h3>Por Prioridade</h3><table>${priorityRows || '<tr><td style="color:#5a5e72">Sem dados</td></tr>'}</table></div>
    <div class="table-card"><h3>Por Cliente (Top 10)</h3><table>${clientRows || '<tr><td style="color:#5a5e72">Sem dados</td></tr>'}</table></div>
  </div>

  <div class="summary-card">
    <h3>✨ Resumo Inteligente (IA)</h3>
    <p>${summary.replace(/\n/g, "<br>")}</p>
  </div>

  <div class="footer">Gerado automaticamente por PM Intelligence Assistant em ${format(new Date(), "dd/MM/yyyy HH:mm")}</div>
</body>
</html>`;
}

export default function RelatoriosPage() {
  const [monthOffset, setMonthOffset] = useState(0);
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  const targetDate = subMonths(new Date(), monthOffset);
  const monthStart = startOfMonth(targetDate);
  const monthEnd = endOfMonth(targetDate);

  const { data: chamados = [] } = useQuery({
    queryKey: ["relatorio-chamados", monthOffset],
    queryFn: async () => {
      const { data } = await supabase
        .from("chamados")
        .select("*, clientes(nome)")
        .gte("created_at", monthStart.toISOString())
        .lte("created_at", monthEnd.toISOString());
      return data || [];
    },
  });

  const total = chamados.length;
  const finalizados = chamados.filter((c: any) => c.status === "Finalizado").length;
  const abertos = total - finalizados;
  const taxaResolucao = total > 0 ? Math.round((finalizados / total) * 100) : 0;

  const byType = ["Folha", "Ponto", "Benefício", "eSocial"].map((tipo) => ({
    name: tipo,
    value: chamados.filter((c: any) => c.tipo === tipo).length,
  })).filter(t => t.value > 0);

  const byPriority = ["baixa", "media", "alta", "critica"].map((p) => ({
    name: p.charAt(0).toUpperCase() + p.slice(1),
    value: chamados.filter((c: any) => c.prioridade === p).length,
  })).filter(t => t.value > 0);

  const byClient = Object.entries(
    chamados.reduce((acc: Record<string, number>, c: any) => {
      const name = c.clientes?.nome || "Sem cliente";
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {})
  )
    .map(([name, value]) => ({ name: name.split(" ")[0], value }))
    .sort((a, b) => (b.value as number) - (a.value as number))
    .slice(0, 8);

  const resolvedTickets = chamados.filter((c: any) => c.status === "Finalizado");
  const avgResolutionHours = resolvedTickets.length > 0
    ? Math.round(
        resolvedTickets.reduce((sum: number, c: any) => {
          return sum + differenceInHours(parseISO(c.updated_at), parseISO(c.created_at));
        }, 0) / resolvedTickets.length
      )
    : 0;

  const monthLabel = format(targetDate, "MMMM yyyy");

  const generateSummary = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("generate-report", {
        body: {
          monthStart: monthStart.toISOString(),
          monthEnd: monthEnd.toISOString(),
          monthLabel,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setAiSummary(data.summary);
      toast.success("Resumo inteligente gerado!");
    },
    onError: () => toast.error("Erro ao gerar resumo"),
  });

  const handleExportPdf = async () => {
    let summary = aiSummary;
    if (!summary) {
      toast.info("Gerando resumo inteligente antes de exportar...");
      try {
        const { data, error } = await supabase.functions.invoke("generate-report", {
          body: {
            monthStart: monthStart.toISOString(),
            monthEnd: monthEnd.toISOString(),
            monthLabel,
          },
        });
        if (error) throw error;
        summary = data.summary;
        setAiSummary(summary);
      } catch {
        summary = "Resumo não disponível.";
      }
    }

    const byTypeObj = Object.fromEntries(byType.map(t => [t.name, t.value]));
    const byPriorityObj = Object.fromEntries(byPriority.map(t => [t.name, t.value]));
    const byClientObj = Object.fromEntries(byClient.map(t => [t.name, t.value]));

    const html = generatePdfHtml(
      { total, finalizados, abertos, taxaResolucao, byType: byTypeObj, byPriority: byPriorityObj, byClient: byClientObj },
      summary || "Resumo não disponível.",
      monthLabel
    );

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 500);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" /> Relatório Mensal
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Análise de performance e métricas</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={String(monthOffset)} onValueChange={(v) => { setMonthOffset(Number(v)); setAiSummary(null); }}>
            <SelectTrigger className="w-48 bg-secondary border-border/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <SelectItem key={i} value={String(i)}>
                  {format(subMonths(new Date(), i), "MMMM yyyy")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => generateSummary.mutate()} disabled={generateSummary.isPending}>
            {generateSummary.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
            Resumo IA
          </Button>
          <Button size="sm" onClick={handleExportPdf}>
            <Download className="h-4 w-4 mr-1" /> Exportar PDF
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { label: "Total Chamados", value: total, icon: Ticket, color: "text-primary" },
          { label: "Finalizados", value: finalizados, icon: TrendingUp, color: "text-success" },
          { label: "Em Aberto", value: abertos, icon: Clock, color: "text-warning" },
          { label: "Tempo Médio (h)", value: avgResolutionHours, icon: Clock, color: "text-accent" },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="card-gradient rounded-xl border border-border/40 p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground">{item.label}</span>
              <item.icon className={`h-4 w-4 ${item.color}`} />
            </div>
            <p className="text-2xl font-bold">{item.value}</p>
          </motion.div>
        ))}
      </div>

      {/* AI Summary */}
      {aiSummary && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card-gradient rounded-xl border border-primary/30 p-6">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-primary">
            <Sparkles className="h-4 w-4" /> Resumo Inteligente (IA)
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{aiSummary}</p>
        </motion.div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card-gradient rounded-xl border border-border/40 p-6">
          <h3 className="text-sm font-semibold mb-5">Por Tipo</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={byType} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" strokeWidth={0}>
                {byType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
            {byType.map((s, i) => (
              <div key={s.name} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} /> {s.name} ({s.value})
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="card-gradient rounded-xl border border-border/40 p-6">
          <h3 className="text-sm font-semibold mb-5">Por Prioridade</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byPriority} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(228 15% 14%)" />
              <XAxis dataKey="name" tick={{ fill: "hsl(220 10% 45%)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "hsl(220 10% 45%)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(228 15% 12%)" }} />
              <Bar dataKey="value" fill="hsl(270, 100%, 70%)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="card-gradient rounded-xl border border-border/40 p-6">
          <h3 className="text-sm font-semibold mb-5">Por Cliente</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byClient} barSize={28} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(228 15% 14%)" />
              <XAxis type="number" tick={{ fill: "hsl(220 10% 45%)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: "hsl(220 10% 45%)", fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(228 15% 12%)" }} />
              <Bar dataKey="value" fill="hsl(200, 100%, 60%)" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Resolution rate */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="card-gradient rounded-xl border border-border/40 p-6">
        <h3 className="text-sm font-semibold mb-4">Resumo do Mês</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Taxa de Resolução</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                <div className="h-full rounded-full bg-success transition-all" style={{ width: `${taxaResolucao}%` }} />
              </div>
              <span className="text-sm font-bold text-success">{taxaResolucao}%</span>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Tipo mais frequente</p>
            <p className="text-sm font-semibold">{byType[0]?.name || "—"}</p>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Tempo médio de resolução</p>
            <p className="text-sm font-semibold">{avgResolutionHours}h</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
