import { useState } from "react";
import { motion } from "framer-motion";
import { Ticket, Clock, CheckCircle, Timer, AlertTriangle, Activity, Users, TrendingUp, Mail, Loader2, Sparkles } from "lucide-react";
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
import { format, subDays, parseISO } from "date-fns";

const tooltipStyle = {
  background: "hsl(228 18% 9%)",
  border: "1px solid hsl(228 15% 16%)",
  borderRadius: "10px",
  color: "hsl(220 20% 92%)",
  fontSize: "12px",
  boxShadow: "0 8px 32px hsl(0 0% 0% / 0.4)",
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
        toast({ title: "✅ Email processado!", description: `Chamado criado com tipo "${data.tipo}" e prioridade "${data.prioridade}".` });
        queryClient.invalidateQueries({ queryKey: ["chamados"] });
        queryClient.invalidateQueries({ queryKey: ["chamados-with-clients"] });
        setShowSimulate(false);
        setSimForm({ subject: "", body: "" });
      } else {
        toast({ title: "⚠️ Email ignorado", description: data?.reason || "Não identificado como chamado válido.", variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Erro", description: e.message || "Falha ao processar email.", variant: "destructive" });
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

  const statusData = [
    { name: "Novo", value: statusCount.novo, color: "hsl(200, 100%, 60%)" },
    { name: "Em análise", value: statusCount.analise, color: "hsl(270, 100%, 70%)" },
    { name: "Execução", value: statusCount.execucao, color: "hsl(245, 80%, 65%)" },
    { name: "Validação", value: statusCount.validacao, color: "hsl(38, 92%, 55%)" },
    { name: "Finalizado", value: statusCount.finalizado, color: "hsl(145, 65%, 48%)" },
  ];

  const clienteData = clientes.map((c: any) => ({
    name: c.nome.split(" ")[0],
    chamados: chamados.filter(ch => ch.cliente_id === c.id).length,
  })).filter(c => c.chamados > 0);

  // Real trend data from chamados created_at
  const trendData = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dateStr = format(date, "dd/MM");
    const count = chamados.filter(c => {
      const d = parseISO(c.created_at);
      return format(d, "dd/MM") === dateStr;
    }).length;
    return { dia: dateStr, chamados: count };
  });

  const alertas = clientes
    .filter((c: any) => c.status !== "OK")
    .flatMap((c: any) => (c.problemas || []).map((p: string) => ({
      tipo: c.status === "CRITICO" ? "erro" as const : "alerta" as const,
      mensagem: p,
      cliente: c.nome,
    })));

  const alertaStyles = {
    erro: "border-critical/30 bg-critical/5 text-critical",
    alerta: "border-warning/30 bg-warning/5 text-warning",
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Visão geral do sistema PM Intelligence</p>
        </div>
        <div className="flex items-center gap-3">
          <Dialog open={showSimulate} onOpenChange={setShowSimulate}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 border-accent/30 text-accent hover:bg-accent/10 hover:text-accent shadow-lg shadow-accent/10 transition-all">
                <Mail className="h-4 w-4" /> Simular Email
              </Button>
            </DialogTrigger>
            <DialogContent className="glass border-border/50 max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-accent" /> Simular Entrada de Email
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <p className="text-xs text-muted-foreground">Simule a chegada de um email de suporte. A IA irá analisar, classificar e criar um chamado automaticamente.</p>
                <div>
                  <Label className="text-xs font-medium">Assunto</Label>
                  <Input value={simForm.subject} onChange={e => setSimForm(f => ({ ...f, subject: e.target.value }))} className="bg-secondary border-border/50 mt-1.5" placeholder="Ex: Erro no cálculo de folha do mês 03/2026" />
                </div>
                <div>
                  <Label className="text-xs font-medium">Descrição do Problema</Label>
                  <Textarea value={simForm.body} onChange={e => setSimForm(f => ({ ...f, body: e.target.value }))} className="bg-secondary border-border/50 mt-1.5 min-h-[120px]" placeholder="Descreva o problema em detalhes..." />
                </div>
                <div className="flex gap-3 justify-end pt-2">
                  <Button variant="outline" onClick={() => setShowSimulate(false)} className="border-border/50">Cancelar</Button>
                  <Button onClick={handleSimulate} disabled={!simForm.subject.trim() || !simForm.body.trim() || simulating} className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg shadow-accent/20">
                    {simulating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {simulating ? "Processando IA..." : "Simular"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Badge variant="outline" className="text-[10px] border-success/30 text-success gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> Online
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="Chamados Abertos" value={abertos} icon={Ticket} variant="accent" subtitle="Total ativos" />
        <StatCard title="Em Andamento" value={statusCount.analise + statusCount.execucao} icon={Clock} variant="warning" subtitle="Análise + Execução" />
        <StatCard title="Finalizados" value={statusCount.finalizado} icon={CheckCircle} variant="success" trend={chamados.length > 0 ? `${Math.round((statusCount.finalizado / Math.max(chamados.length, 1)) * 100)}% taxa resolução` : undefined} />
        <StatCard title="Clientes" value={clientes.length} icon={Users} variant="default" subtitle={clientesCriticos > 0 ? `${clientesCriticos} em estado crítico` : "Todos operacionais"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card-gradient rounded-xl border border-border/40 p-6">
          <h3 className="text-sm font-semibold mb-5">Chamados por Status</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value" strokeWidth={0}>
                {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
            {statusData.map(s => (
              <div key={s.name} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="h-2 w-2 rounded-full" style={{ background: s.color }} /> {s.name} ({s.value})
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="card-gradient rounded-xl border border-border/40 p-6">
          <h3 className="text-sm font-semibold mb-5">Chamados por Cliente</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={clienteData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(228 15% 14%)" />
              <XAxis dataKey="name" tick={{ fill: "hsl(220 10% 45%)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "hsl(220 10% 45%)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(228 15% 12%)" }} />
              <Bar dataKey="chamados" fill="hsl(245, 80%, 65%)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="card-gradient rounded-xl border border-border/40 p-6">
          <h3 className="text-sm font-semibold mb-5 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> Tendência Semanal
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="colorChamados" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(245, 80%, 65%)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="hsl(245, 80%, 65%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(228 15% 14%)" />
              <XAxis dataKey="dia" tick={{ fill: "hsl(220 10% 45%)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "hsl(220 10% 45%)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="chamados" stroke="hsl(245, 80%, 65%)" fill="url(#colorChamados)" strokeWidth={2.5} dot={{ r: 3, fill: "hsl(245, 80%, 65%)" }} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Alertas */}
      {alertas.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="card-gradient rounded-xl border border-border/40 p-6">
          <h3 className="text-sm font-semibold mb-5 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" /> Alertas Ativos
            <Badge variant="secondary" className="text-[9px] ml-2">{alertas.length}</Badge>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {alertas.map((a, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.05 }}
                className={`rounded-xl border p-4 ${alertaStyles[a.tipo]}`}>
                <p className="text-xs font-medium">{a.mensagem}</p>
                <p className="text-[10px] opacity-70 mt-1.5">{a.cliente}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
