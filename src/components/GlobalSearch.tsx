import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Ticket, Building2, BookOpen, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SearchResult {
  type: "chamado" | "cliente" | "conhecimento";
  id: string;
  title: string;
  subtitle: string;
}

const typeConfig = {
  chamado: { icon: Ticket, color: "text-primary", route: "/chamados" },
  cliente: { icon: Building2, color: "text-accent", route: "/clientes" },
  conhecimento: { icon: BookOpen, color: "text-neon-purple", route: "/conhecimento" },
};

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) { setQuery(""); setResults([]); }
  }, [open]);

  useEffect(() => {
    if (!query.trim() || query.length < 2) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      const q = `%${query}%`;
      const [chamados, clientes, conhecimento] = await Promise.all([
        supabase.from("chamados").select("id, titulo, tipo, status").ilike("titulo", q).limit(5),
        supabase.from("clientes").select("id, nome, cnpj, status").ilike("nome", q).limit(5),
        supabase.from("base_conhecimento").select("id, titulo, tipo").ilike("titulo", q).limit(5),
      ]);

      const r: SearchResult[] = [
        ...(chamados.data || []).map(c => ({ type: "chamado" as const, id: c.id, title: c.titulo, subtitle: `${c.tipo} · ${c.status}` })),
        ...(clientes.data || []).map(c => ({ type: "cliente" as const, id: c.id, title: c.nome, subtitle: c.cnpj || c.status })),
        ...(conhecimento.data || []).map(c => ({ type: "conhecimento" as const, id: c.id, title: c.titulo, subtitle: c.tipo })),
      ];
      setResults(r);
      setLoading(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (result: SearchResult) => {
    onOpenChange(false);
    navigate(typeConfig[result.type].route);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border-border/40 max-w-lg p-0 gap-0 overflow-hidden [&>button]:hidden">
        <div className="flex items-center gap-3 px-4 border-b border-border/30">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar chamados, clientes, base de conhecimento..."
            className="flex-1 bg-transparent border-0 py-3.5 text-sm outline-none placeholder:text-muted-foreground/50"
            autoFocus
          />
          <button onClick={() => onOpenChange(false)} className="p-1 rounded hover:bg-secondary transition-colors">
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>

        <div className="max-h-80 overflow-auto scrollbar-thin">
          {query.length < 2 ? (
            <div className="p-8 text-center text-xs text-muted-foreground/50">
              Digite pelo menos 2 caracteres para buscar
            </div>
          ) : loading ? (
            <div className="p-8 text-center text-xs text-muted-foreground">Buscando...</div>
          ) : results.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">Nenhum resultado encontrado</div>
          ) : (
            results.map((r) => {
              const config = typeConfig[r.type];
              const Icon = config.icon;
              return (
                <button
                  key={`${r.type}-${r.id}`}
                  onClick={() => handleSelect(r)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors text-left border-b border-border/10 last:border-0"
                >
                  <div className={`p-1.5 rounded-lg bg-secondary/80 ${config.color}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{r.title}</p>
                    <p className="text-[10px] text-muted-foreground">{r.subtitle}</p>
                  </div>
                  <span className="text-[9px] text-muted-foreground/50 capitalize">{r.type}</span>
                </button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
