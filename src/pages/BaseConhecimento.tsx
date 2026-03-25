import { useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Search, Database, FileText, AlertCircle, Copy, Check } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

const tipoConfig: Record<string, any> = {
  SQL: { icon: Database, color: "text-accent bg-accent/10 border-accent/30" },
  Procedimento: { icon: FileText, color: "text-primary bg-primary/10 border-primary/30" },
  Erro: { icon: AlertCircle, color: "text-critical bg-critical/10 border-critical/30" },
  Documentação: { icon: BookOpen, color: "text-neon-purple bg-neon-purple/10 border-neon-purple/30" },
};

export default function BaseConhecimentoPage() {
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: items = [] } = useQuery({
    queryKey: ["base-conhecimento"],
    queryFn: async () => {
      const { data } = await supabase.from("base_conhecimento").select("*").order("created_at");
      return data || [];
    },
  });

  const filtered = items.filter((bc: any) =>
    bc.titulo.toLowerCase().includes(search.toLowerCase()) ||
    bc.conteudo.toLowerCase().includes(search.toLowerCase())
  );

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="h-6 w-6 text-primary" /> Base de Conhecimento</h1>
        <p className="text-sm text-muted-foreground">Queries, procedimentos e soluções para TOTVS RM</p>
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar na base..." className="pl-9 bg-secondary border-border/50" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((item: any, i: number) => {
          const config = tipoConfig[item.tipo] || tipoConfig.SQL;
          const Icon = config.icon;
          return (
            <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="card-gradient rounded-xl border border-border/40 p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-md ${config.color}`}><Icon className="h-4 w-4" /></div>
                  <h3 className="text-sm font-semibold">{item.titulo}</h3>
                </div>
                <Badge variant="outline" className={`text-[9px] ${config.color}`}>{item.tipo}</Badge>
              </div>
              <div className="relative rounded-lg bg-background/60 border border-border/30 p-3">
                <pre className="text-xs font-mono text-accent/90 whitespace-pre-wrap">{item.conteudo}</pre>
                <button onClick={() => copy(item.conteudo, item.id)} className="absolute top-2 right-2 p-1 rounded hover:bg-secondary transition-colors">
                  {copiedId === item.id ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
