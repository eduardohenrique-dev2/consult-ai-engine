import { motion } from "framer-motion";
import { Building2, AlertTriangle, CheckCircle, XCircle, Search } from "lucide-react";
import { clientes, chamados } from "@/data/mock-data";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useState } from "react";

const statusConfig = {
  OK: { icon: CheckCircle, color: "text-success", bg: "bg-success/10 border-success/30", label: "Operacional" },
  ALERTA: { icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10 border-warning/30", label: "Alerta" },
  CRITICO: { icon: XCircle, color: "text-critical", bg: "bg-critical/10 border-critical/30", label: "Crítico" },
};

export default function ClientesPage() {
  const [search, setSearch] = useState("");
  const filtered = clientes.filter(c => c.nome.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Clientes</h1>
        <p className="text-sm text-muted-foreground">Gestão e monitoramento de clientes</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente..." className="pl-9 bg-secondary border-border/50" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((cliente, i) => {
          const config = statusConfig[cliente.status];
          const Icon = config.icon;
          const numChamados = chamados.filter(c => c.clienteId === cliente.id).length;

          return (
            <motion.div
              key={cliente.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="card-gradient rounded-xl border border-border/40 p-5 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">{cliente.nome}</h3>
                    <p className="text-[10px] text-muted-foreground font-mono">{cliente.cnpj}</p>
                  </div>
                </div>
                <Badge variant="outline" className={`text-[10px] ${config.bg} ${config.color}`}>
                  <Icon className="h-3 w-3 mr-1" /> {config.label}
                </Badge>
              </div>

              <div className="flex gap-4 text-xs text-muted-foreground mb-3">
                <span>Chamados: <span className="text-foreground font-medium">{numChamados}</span></span>
                <span>Desde: <span className="text-foreground font-medium">{new Date(cliente.criadoEm).toLocaleDateString("pt-BR")}</span></span>
              </div>

              {cliente.problemas && cliente.problemas.length > 0 && (
                <div className="space-y-1">
                  {cliente.problemas.map((p, j) => (
                    <div key={j} className="flex items-center gap-2 text-[10px] text-warning bg-warning/5 rounded px-2 py-1">
                      <AlertTriangle className="h-3 w-3 shrink-0" /> {p}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
