import { motion } from "framer-motion";
import { Monitor, CheckCircle, AlertTriangle, XCircle, Activity, Server, RefreshCw } from "lucide-react";
import { clientes } from "@/data/mock-data";
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
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Monitor className="h-6 w-6 text-accent" /> Monitoramento RM
          </h1>
          <p className="text-sm text-muted-foreground">Integração simulada com Oracle TOTVS RM</p>
        </div>
        <Button variant="outline" className="gap-2 border-border/50">
          <RefreshCw className="h-4 w-4" /> Atualizar
        </Button>
      </div>

      {/* Módulos RM */}
      <div>
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Server className="h-4 w-4 text-muted-foreground" /> Módulos TOTVS RM
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {modules.map((mod, i) => (
            <motion.div
              key={mod.nome}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="card-gradient rounded-lg border border-border/40 p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium">{mod.nome}</span>
                <span className={`h-2 w-2 rounded-full ${mod.status === "online" ? "bg-success" : mod.status === "degraded" ? "bg-warning animate-pulse" : "bg-critical"}`} />
              </div>
              <div className="flex items-center justify-between">
                <Badge className={`text-[9px] ${moduleStatusColors[mod.status as keyof typeof moduleStatusColors]}`}>
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
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" /> Status dos Clientes
        </h2>
        <div className="space-y-3">
          {clientes.map((cliente, i) => {
            const Icon = statusIcon[cliente.status];
            return (
              <motion.div
                key={cliente.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`card-gradient rounded-lg border p-4 ${statusBg[cliente.status]}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className={`h-5 w-5 ${statusColor[cliente.status]}`} />
                    <div>
                      <p className="text-sm font-medium">{cliente.nome}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{cliente.cnpj}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className={`text-[10px] ${statusColor[cliente.status]}`}>
                      {cliente.status}
                    </Badge>
                  </div>
                </div>
                {cliente.problemas && (
                  <div className="mt-3 space-y-1 pl-8">
                    {cliente.problemas.map((p, j) => (
                      <p key={j} className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <span className="h-1 w-1 rounded-full bg-warning" /> {p}
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
