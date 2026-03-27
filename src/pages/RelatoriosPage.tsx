import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Download, TrendingUp, Users, Ticket, Clock, BarChart3 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { format, subMonths, startOfMonth, endOfMonth, parseISO, differenceInHours } from "date-fns";

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

export default function RelatoriosPage() {
  const [monthOffset, setMonthOffset] = useState(0);

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

  // By type
  const byType = ["Folha", "Ponto", "Benefício", "eSocial"].map((tipo) => ({
    name: tipo,
    value: chamados.filter((c: any) => c.tipo === tipo).length,
  })).filter(t => t.value > 0);

  // By priority
  const byPriority = ["baixa", "media", "alta", "critica"].map((p) => ({
    name: p.charAt(0).toUpperCase() + p.slice(1),
    value: chamados.filter((c: any) => c.prioridade === p).length,
  })).filter(t => t.value > 0);

  // By client
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

  // Average resolution time (hours) for finalized tickets
  const resolvedTickets = chamados.filter((c: any) => c.status === "Finalizado");
  const avgResolutionHours = resolvedTickets.length > 0
    ? Math.round(
        resolvedTickets.reduce((sum: number, c: any) => {
          return sum + differenceInHours(parseISO(c.updated_at), parseISO(c.created_at));
        }, 0) / resolvedTickets.length
      )
    : 0;

  const monthLabel = format(targetDate, "MMMM yyyy");

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" /> Relatório Mensal
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Análise de performance e métricas</p>
        </div>
        <Select value={String(monthOffset)} onValueChange={(v) => setMonthOffset(Number(v))}>
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
