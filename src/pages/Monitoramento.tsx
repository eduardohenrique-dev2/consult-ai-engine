import { motion } from "framer-motion";
import { Monitor, CheckCircle, AlertTriangle, XCircle, Activity, Server, RefreshCw, Wifi } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const statusIcon = { OK: CheckCircle, ALERTA: AlertTriangle, CRITICO: XCircle };
const statusColor = { OK: "text-success", ALERTA: "text-warning", CRITICO: "text-critical" };
const statusBg = { OK: "border-success/30", ALERTA: "border-warning/30", CRITICO: "border-critical/30" };

const modules = [
  { nome: "Folha de Pagamento", status: "online", latency: "45ms" },
  { nome: "Ponto Eletrônico", status: "online", latency: "32ms" },
  { nome: "Benefícios", status: "degraded", latency: "320ms" },
  { nome: "eSocial", status: "online", latency: "78ms" },
  { nome: "Relatórios", status: "online", latency: "55ms" },
];

const moduleStatusColors = {
  online: "text-success bg-success/10",
  degraded: "text-warning bg-warning/10",
  offline: "text-critical bg-critical/10",
};

export default function Monitoramento() {
  const { data: clientes = [], refetch, isFetching } = useQuery({
    queryKey: ["clientes-monitor"],
    queryFn: async () => {
      const { data } = await supabase.from("clientes").select("*").order("created_at");
      return data || [];
    },
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Monitor className="h-6 w-6 text-accent" /> Monitoramento RM
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Status de integração e saúde dos clientes</p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching} className="gap-2 border-border/50 hover:border-primary/40 transition-colors">
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Atualizar
        </Button>
      </div>

      {/* System Status Banner */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 px-5 py-3 rounded-xl border border-success/20 bg-success/5">
        <Wifi className="h-4 w-4 text-success" />
        <span className="text-sm font-medium text-success">Sistema Operacional</span>
        <span className="text-xs text-muted-foreground ml-auto">Última verificação: agora</span>
      </motion.div>

      {/* Módulos RM */}
      <div>
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Server className="h-4 w-4 text-muted-foreground" /> Módulos TOTVS RM
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {modules.map((mod, i) => (
            <motion.div
              key={mod.nome}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="card-gradient rounded-xl border border-border/40 p-5 hover:border-primary/30 transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold">{mod.nome}</span>
                <span className={`h-2.5 w-2.5 rounded-full ${mod.status === "online" ? "bg-success" : mod.status === "degraded" ? "bg-warning animate-pulse" : "bg-critical"}`} />
              </div>
              <div className="flex items-center justify-between">
                <Badge className={`text-[9px] font-medium ${moduleStatusColors[mod.status as keyof typeof moduleStatusColors]}`}>
                  {mod.status}
                </Badge>
                <span className="text-[10px] text-muted-foreground font-mono">{mod.latency}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Status dos Clientes */}
      <div>
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" /> Status dos Clientes
        </h2>
        <div className="space-y-3">
          {clientes.map((cliente: any, i: number) => {
            const Icon = statusIcon[cliente.status as keyof typeof statusIcon] || CheckCircle;
            const color = statusColor[cliente.status as keyof typeof statusColor] || "text-success";
            const bg = statusBg[cliente.status as keyof typeof statusBg] || "border-success/30";
            return (
              <motion.div
                key={cliente.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`card-gradient rounded-xl border p-5 hover:shadow-lg transition-all duration-300 ${bg}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${cliente.status === "CRITICO" ? "bg-critical/10" : cliente.status === "ALERTA" ? "bg-warning/10" : "bg-success/10"}`}>
                      <Icon className={`h-5 w-5 ${color}`} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{cliente.nome}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{cliente.cnpj}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={`text-[10px] ${color}`}>
                    {cliente.status}
                  </Badge>
                </div>
                {cliente.problemas && cliente.problemas.length > 0 && (
                  <div className="mt-4 space-y-1.5 pl-14">
                    {cliente.problemas.map((p: string, j: number) => (
                      <p key={j} className="text-[11px] text-muted-foreground flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-warning shrink-0" /> {p}
                      </p>
                    ))}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
