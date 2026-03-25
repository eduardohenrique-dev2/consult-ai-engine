import { motion } from "framer-motion";
import { Ticket, Clock, CheckCircle, Timer, AlertTriangle, Activity } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { chamados, alertas, clientes } from "@/data/mock-data";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";
import { Badge } from "@/components/ui/badge";

const statusCount = {
  novo: chamados.filter(c => c.status === "Novo").length,
  analise: chamados.filter(c => c.status === "Em análise").length,
  execucao: chamados.filter(c => c.status === "Execução").length,
  validacao: chamados.filter(c => c.status === "Validação").length,
  finalizado: chamados.filter(c => c.status === "Finalizado").length,
};

const statusData = [
  { name: "Novo", value: statusCount.novo, color: "hsl(200, 100%, 60%)" },
  { name: "Em análise", value: statusCount.analise, color: "hsl(270, 100%, 70%)" },
  { name: "Execução", value: statusCount.execucao, color: "hsl(245, 80%, 65%)" },
  { name: "Validação", value: statusCount.validacao, color: "hsl(38, 92%, 55%)" },
  { name: "Finalizado", value: statusCount.finalizado, color: "hsl(145, 65%, 48%)" },
];

const clienteData = clientes.map(c => ({
  name: c.nome.split(" ")[0],
  chamados: chamados.filter(ch => ch.clienteId === c.id).length,
})).filter(c => c.chamados > 0);

const performanceData = [
  { name: "Ana", resolvidos: 12, pendentes: 3 },
  { name: "Pedro", resolvidos: 9, pendentes: 4 },
  { name: "Julia", resolvidos: 11, pendentes: 2 },
];

const trendData = Array.from({ length: 7 }, (_, i) => ({
  dia: `${19 + i}/03`,
  chamados: Math.floor(Math.random() * 5) + 2,
}));

const alertaStyles = {
  erro: "border-critical/30 bg-critical/5 text-critical",
  alerta: "border-warning/30 bg-warning/5 text-warning",
  info: "border-accent/30 bg-accent/5 text-accent",
};

export default function Dashboard() {
  const abertos = chamados.filter(c => c.status !== "Finalizado").length;

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
        {/* Chamados por Status */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card-gradient rounded-xl border border-border/50 p-5">
          <h3 className="text-sm font-semibold mb-4">Chamados por Status</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "hsl(228 18% 9%)", border: "1px solid hsl(228 15% 16%)", borderRadius: "8px", color: "hsl(220 20% 92%)" }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 mt-2">
            {statusData.map(s => (
              <div key={s.name} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                {s.name} ({s.value})
              </div>
            ))}
          </div>
        </motion.div>

        {/* Chamados por Cliente */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="card-gradient rounded-xl border border-border/50 p-5">
          <h3 className="text-sm font-semibold mb-4">Chamados por Cliente</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={clienteData} barSize={24}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(228 15% 16%)" />
              <XAxis dataKey="name" tick={{ fill: "hsl(220 10% 50%)", fontSize: 11 }} />
              <YAxis tick={{ fill: "hsl(220 10% 50%)", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "hsl(228 18% 9%)", border: "1px solid hsl(228 15% 16%)", borderRadius: "8px", color: "hsl(220 20% 92%)" }} />
              <Bar dataKey="chamados" fill="hsl(245, 80%, 65%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Performance */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="card-gradient rounded-xl border border-border/50 p-5">
          <h3 className="text-sm font-semibold mb-4">Performance Consultores</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={performanceData} barSize={16}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(228 15% 16%)" />
              <XAxis dataKey="name" tick={{ fill: "hsl(220 10% 50%)", fontSize: 11 }} />
              <YAxis tick={{ fill: "hsl(220 10% 50%)", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "hsl(228 18% 9%)", border: "1px solid hsl(228 15% 16%)", borderRadius: "8px", color: "hsl(220 20% 92%)" }} />
              <Bar dataKey="resolvidos" fill="hsl(145, 65%, 48%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="pendentes" fill="hsl(38, 92%, 55%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Trend */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="card-gradient rounded-xl border border-border/50 p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" /> Tendência Semanal
          </h3>
          <ResponsiveContainer width="100%" height={200}>
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
              <Tooltip contentStyle={{ background: "hsl(228 18% 9%)", border: "1px solid hsl(228 15% 16%)", borderRadius: "8px", color: "hsl(220 20% 92%)" }} />
              <Area type="monotone" dataKey="chamados" stroke="hsl(245, 80%, 65%)" fill="url(#colorChamados)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Alertas */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="card-gradient rounded-xl border border-border/50 p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" /> Alertas em Tempo Real
          </h3>
          <div className="space-y-3">
            {alertas.map(a => (
              <div key={a.id} className={`rounded-lg border p-3 ${alertaStyles[a.tipo]}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium">{a.mensagem}</p>
                    <p className="text-[10px] opacity-70 mt-1">{a.cliente}</p>
                  </div>
                  <Badge variant="outline" className="text-[9px] border-current/30">
                    {new Date(a.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
