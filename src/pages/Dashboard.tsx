import { motion } from "framer-motion";
import { Ticket, Clock, CheckCircle, Timer, AlertTriangle, Activity } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";
import { Badge } from "@/components/ui/badge";

const tooltipStyle = { background: "hsl(228 18% 9%)", border: "1px solid hsl(228 15% 16%)", borderRadius: "8px", color: "hsl(220 20% 92%)" };

export default function Dashboard() {
  const { data: chamados = [] } = useQuery({
    queryKey: ["chamados"],
    queryFn: async () => {
      const { data } = await supabase.from("chamados").select("*");
      return data || [];
    },
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes"],
    queryFn: async () => {
      const { data } = await supabase.from("clientes").select("*");
      return data || [];
    },
  });

  const statusCount = {
    novo: chamados.filter(c => c.status === "Novo").length,
    analise: chamados.filter(c => c.status === "Em análise").length,
    execucao: chamados.filter(c => c.status === "Execução").length,
    validacao: chamados.filter(c => c.status === "Validação").length,
    finalizado: chamados.filter(c => c.status === "Finalizado").length,
  };

  const abertos = chamados.filter(c => c.status !== "Finalizado").length;

  const statusData = [
    { name: "Novo", value: statusCount.novo, color: "hsl(200, 100%, 60%)" },
    { name: "Em análise", value: statusCount.analise, color: "hsl(270, 100%, 70%)" },
    { name: "Execução", value: statusCount.execucao, color: "hsl(245, 80%, 65%)" },
    { name: "Validação", value: statusCount.validacao, color: "hsl(38, 92%, 55%)" },
    { name: "Finalizado", value: statusCount.finalizado, color: "hsl(145, 65%, 48%)" },
  ];

  const clienteData = clientes.map(c => ({
    name: c.nome.split(" ")[0],
    chamados: chamados.filter(ch => ch.cliente_id === c.id).length,
  })).filter(c => c.chamados > 0);

  const alertas = clientes
    .filter(c => c.status !== "OK")
    .flatMap(c => (c.problemas || []).map((p: string) => ({
      tipo: c.status === "CRITICO" ? "erro" as const : "alerta" as const,
      mensagem: p,
      cliente: c.nome,
    })));

  const alertaStyles = {
    erro: "border-critical/30 bg-critical/5 text-critical",
    alerta: "border-warning/30 bg-warning/5 text-warning",
    info: "border-accent/30 bg-accent/5 text-accent",
  };

  const trendData = Array.from({ length: 7 }, (_, i) => ({
    dia: `${19 + i}/03`,
    chamados: Math.floor(Math.random() * 5) + 2,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral do sistema PM Intelligence</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Chamados Abertos" value={abertos} icon={Ticket} variant="accent" subtitle="Total ativos" />
        <StatCard title="Em Andamento" value={statusCount.analise + statusCount.execucao} icon={Clock} variant="warning" subtitle="Análise + Execução" />
        <StatCard title="Finalizados" value={statusCount.finalizado} icon={CheckCircle} variant="success" trend="+12% este mês" />
        <StatCard title="SLA Médio" value="4.2h" icon={Timer} variant="default" subtitle="Tempo de resposta" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card-gradient rounded-xl border border-border/50 p-5">
          <h3 className="text-sm font-semibold mb-4">Chamados por Status</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 mt-2">
            {statusData.map(s => (
              <div key={s.name} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="h-2 w-2 rounded-full" style={{ background: s.color }} /> {s.name} ({s.value})
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="card-gradient rounded-xl border border-border/50 p-5">
          <h3 className="text-sm font-semibold mb-4">Chamados por Cliente</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={clienteData} barSize={24}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(228 15% 16%)" />
              <XAxis dataKey="name" tick={{ fill: "hsl(220 10% 50%)", fontSize: 11 }} />
              <YAxis tick={{ fill: "hsl(220 10% 50%)", fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="chamados" fill="hsl(245, 80%, 65%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="card-gradient rounded-xl border border-border/50 p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" /> Tendência Semanal
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="colorChamados" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(245, 80%, 65%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(245, 80%, 65%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(228 15% 16%)" />
              <XAxis dataKey="dia" tick={{ fill: "hsl(220 10% 50%)", fontSize: 11 }} />
              <YAxis tick={{ fill: "hsl(220 10% 50%)", fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="chamados" stroke="hsl(245, 80%, 65%)" fill="url(#colorChamados)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Alertas */}
      {alertas.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="card-gradient rounded-xl border border-border/50 p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" /> Alertas em Tempo Real
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {alertas.map((a, i) => (
              <div key={i} className={`rounded-lg border p-3 ${alertaStyles[a.tipo]}`}>
                <p className="text-xs font-medium">{a.mensagem}</p>
                <p className="text-[10px] opacity-70 mt-1">{a.cliente}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
