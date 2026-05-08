import { useState } from "react";
import { motion } from "framer-motion";
import { Ticket, Clock, CheckCircle, Timer, AlertTriangle, Activity, Users, TrendingUp, Mail, Loader2, Sparkles, Zap, BarChart3, Target } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { format, subDays, parseISO, differenceInHours } from "date-fns";
import AutomationMetrics from "@/components/AutomationMetrics";
import NewChamadoDialog from "@/components/NewChamadoDialog";

const tooltipStyle = {
  background: "hsl(228 18% 9% / 0.95)",
  border: "1px solid hsl(228 15% 18%)",
  borderRadius: "12px",
  color: "hsl(220 20% 92%)",
  fontSize: "11px",
  boxShadow: "0 8px 32px hsl(0 0% 0% / 0.5)",
  backdropFilter: "blur(12px)",
};

const statusColorMap: Record<string, string> = {
  "Novo": "hsl(200, 100%, 60%)",
  "Em análise": "hsl(270, 100%, 70%)",
  "Execução": "hsl(38, 92%, 55%)",
  "Validação": "hsl(50, 90%, 55%)",
  "Finalizado": "hsl(145, 65%, 48%)",
};

export default function Dashboard() {
  const [showSimulate, setShowSimulate] = useState(false);
  const [simForm, setSimForm] = useState({ subject: "", body: "" });
  const [simulating, setSimulating] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

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

  const handleSimulate = async () => {
    if (!simForm.subject.trim() || !simForm.body.trim()) return;
    setSimulating(true);
    try {
      const { data, error } = await supabase.functions.invoke("process-email", {
        body: {
          subject: simForm.subject,
          body: simForm.body,
          sender: "simulacao@empresa.com",
          sender_name: "Simulação Manual",
        },
      });
      if (error) throw error;
      if (data?.success) {
        toast({ title: "✅ Email processado!", description: `Chamado criado: ${data.tipo} | ${data.prioridade}` });
        queryClient.invalidateQueries({ queryKey: ["chamados"] });
        queryClient.invalidateQueries({ queryKey: ["chamados-with-clients"] });
        setShowSimulate(false);
        setSimForm({ subject: "", body: "" });
      } else {
        toast({ title: "⚠️ Email ignorado", description: data?.reason || "Não identificado.", variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setSimulating(false);
    }
  };

  const statusCount = {
    novo: chamados.filter(c => c.status === "Novo").length,
    analise: chamados.filter(c => c.status === "Em análise").length,
    execucao: chamados.filter(c => c.status === "Execução").length,
    validacao: chamados.filter(c => c.status === "Validação").length,
    finalizado: chamados.filter(c => c.status === "Finalizado").length,
  };

  const abertos = chamados.filter(c => c.status !== "Finalizado").length;
  const clientesCriticos = clientes.filter((c: any) => c.status === "CRITICO").length;

  const finalizados = chamados.filter(c => c.status === "Finalizado" && c.created_at && c.updated_at);
  const avgHours = finalizados.length > 0
    ? Math.round(finalizados.reduce((sum, c) => {
        try { return sum + differenceInHours(new Date(c.updated_at), new Date(c.created_at)); } catch { return sum; }
      }, 0) / finalizados.length)
    : 0;

  const taxaResolucao = chamados.length > 0 ? Math.round((statusCount.finalizado / chamados.length) * 100) : 0;

  const statusData = [
    { name: "Novo", value: statusCount.novo, color: statusColorMap["Novo"] },
    { name: "Análise", value: statusCount.analise, color: statusColorMap["Em análise"] },
    { name: "Execução", value: statusCount.execucao, color: statusColorMap["Execução"] },
    { name: "Validação", value: statusCount.validacao, color: statusColorMap["Validação"] },
    { name: "Finalizado", value: statusCount.finalizado, color: statusColorMap["Finalizado"] },
  ];

  const clienteData = clientes.map((c: any) => ({
    name: c.nome.length > 10 ? c.nome.slice(0, 10) + "…" : c.nome,
    chamados: chamados.filter(ch => ch.cliente_id === c.id).length,
  })).filter(c => c.chamados > 0).sort((a, b) => b.chamados - a.chamados).slice(0, 8);

  const trendData = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dateStr = format(date, "dd/MM");
    const count = chamados.filter(c => {
      if (!c.created_at) return false;
      try { return format(parseISO(c.created_at), "dd/MM") === dateStr; } catch { return false; }
    }).length;
    return { dia: dateStr, chamados: count };
  });

  // SLA: chamados abertos > 24h
  const slaViolated = chamados.filter(c => {
    if (c.status === "Finalizado" || !c.created_at) return false;
    try { return differenceInHours(new Date(), new Date(c.created_at)) > 24; } catch { return false; }
  }).length;

  // Most frequent types
  const tipoCount = chamados.reduce((acc: Record<string, number>, c) => {
    acc[c.tipo] = (acc[c.tipo] || 0) + 1;
    return acc;
  }, {});

  const alertas = clientes
    .filter((c: any) => c.status !== "OK")
    .flatMap((c: any) => (c.problemas || []).map((p: string) => ({
      tipo: c.status === "CRITICO" ? "erro" as const : "alerta" as const,
      mensagem: p,
      cliente: c.nome,
    })));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-1">Visão operacional em tempo real</p>
        </div>
        <div className="flex items-center gap-3">
          <Dialog open={showSimulate} onOpenChange={setShowSimulate}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 border-accent/30 text-accent hover:bg-accent/10 transition-all text-xs h-9">
                <Mail className="h-3.5 w-3.5" /> Simular Email
              </Button>
            </DialogTrigger>
            <DialogContent className="glass border-border/40 max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base">
                  <Mail className="h-4 w-4 text-accent" /> Simular Entrada de Email
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <p className="text-[10px] text-muted-foreground">A IA irá analisar, classificar e criar um chamado automaticamente.</p>
                <div>
                  <Label className="text-xs">Assunto</Label>
                  <Input value={simForm.subject} onChange={e => setSimForm(f => ({ ...f, subject: e.target.value }))} className="bg-secondary/60 border-border/40 mt-1.5" placeholder="Ex: Erro no cálculo de folha" />
                </div>
                <div>
                  <Label className="text-xs">Descrição</Label>
                  <Textarea value={simForm.body} onChange={e => setSimForm(f => ({ ...f, body: e.target.value }))} className="bg-secondary/60 border-border/40 mt-1.5 min-h-[100px]" placeholder="Descreva o problema..." />
                </div>
                <div className="flex gap-3 justify-end pt-1">
                  <Button variant="outline" onClick={() => setShowSimulate(false)} className="border-border/40 h-9 text-xs">Cancelar</Button>
                  <Button onClick={handleSimulate} disabled={!simForm.subject.trim() || !simForm.body.trim() || simulating} className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground h-9 text-xs">
                    {simulating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    {simulating ? "Processando..." : "Simular"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Badge variant="outline" className="text-[9px] border-success/30 text-success gap-1.5 font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> Online
          </Badge>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard title="Abertos" value={abertos} icon={Ticket} variant="accent" subtitle="Chamados ativos" />
        <StatCard title="Em Andamento" value={statusCount.analise + statusCount.execucao} icon={Clock} variant="warning" subtitle="Análise + Execução" />
        <StatCard title="Finalizados" value={statusCount.finalizado} icon={CheckCircle} variant="success" subtitle={`${taxaResolucao}% resolução`} />
        <StatCard title="Tempo Médio" value={avgHours > 0 ? `${avgHours}h` : "—"} icon={Timer} variant="default" subtitle="Resolução" />
        <StatCard title="SLA Violado" value={slaViolated} icon={AlertTriangle} variant={slaViolated > 0 ? "critical" : "default"} subtitle="> 24h abertos" />
        <StatCard title="Clientes" value={clientes.length} icon={Users} variant={clientesCriticos > 0 ? "critical" : "default"} subtitle={clientesCriticos > 0 ? `${clientesCriticos} crítico(s)` : "Operacionais"} />
      </div>

      <AutomationMetrics />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-2xl border border-border/30 p-5">
          <h3 className="text-xs font-semibold mb-4 text-muted-foreground uppercase tracking-wider">Status dos Chamados</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={78} paddingAngle={3} dataKey="value" strokeWidth={0}>
                {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
            {statusData.map(s => (
              <div key={s.name} className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} /> {s.name} ({s.value})
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="glass rounded-2xl border border-border/30 p-5">
          <h3 className="text-xs font-semibold mb-4 text-muted-foreground uppercase tracking-wider">Por Cliente</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={clienteData} barSize={24}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(228 15% 14%)" />
              <XAxis dataKey="name" tick={{ fill: "hsl(220 10% 40%)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "hsl(220 10% 40%)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(228 15% 10%)" }} />
              <Bar dataKey="chamados" fill="hsl(245, 80%, 65%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="glass rounded-2xl border border-border/30 p-5">
          <h3 className="text-xs font-semibold mb-4 flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
            <TrendingUp className="h-3.5 w-3.5 text-primary" /> Tendência 7 dias
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="colorChamados" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(245, 80%, 65%)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(245, 80%, 65%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(228 15% 14%)" />
              <XAxis dataKey="dia" tick={{ fill: "hsl(220 10% 40%)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "hsl(220 10% 40%)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="chamados" stroke="hsl(245, 80%, 65%)" fill="url(#colorChamados)" strokeWidth={2} dot={{ r: 3, fill: "hsl(245, 80%, 65%)", strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Bottom Row: Alerts + Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Alerts */}
        {alertas.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-2xl border border-border/30 p-5">
            <h3 className="text-xs font-semibold mb-4 flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
              <AlertTriangle className="h-3.5 w-3.5 text-warning" /> Alertas Ativos
              <Badge variant="secondary" className="text-[8px] ml-1">{alertas.length}</Badge>
            </h3>
            <div className="space-y-2">
              {alertas.slice(0, 6).map((a, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                  className={`rounded-xl border p-3 text-xs ${a.tipo === "erro" ? "border-critical/20 bg-critical/5 text-critical" : "border-warning/20 bg-warning/5 text-warning"}`}>
                  <p className="font-medium">{a.mensagem}</p>
                  <p className="text-[10px] opacity-60 mt-1">{a.cliente}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Types Distribution */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-2xl border border-border/30 p-5">
          <h3 className="text-xs font-semibold mb-4 flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
            <BarChart3 className="h-3.5 w-3.5 text-primary" /> Distribuição por Tipo
          </h3>
          <div className="space-y-3">
            {Object.entries(tipoCount).sort(([, a], [, b]) => (b as number) - (a as number)).map(([tipo, count]) => {
              const pct = chamados.length > 0 ? Math.round(((count as number) / chamados.length) * 100) : 0;
              const colors: Record<string, string> = { Folha: "bg-primary", Ponto: "bg-accent", Benefício: "bg-neon-purple", eSocial: "bg-warning" };
              return (
                <div key={tipo} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">{tipo}</span>
                    <span className="text-muted-foreground">{count as number} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary/80 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, delay: 0.3 }}
                      className={`h-full rounded-full ${colors[tipo] || "bg-primary"}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
