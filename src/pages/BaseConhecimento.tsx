import { useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Search, Database, FileText, AlertCircle, Copy, Check, Star, Plus, Loader2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const tipoConfig: Record<string, any> = {
  SQL: { icon: Database, color: "text-accent bg-accent/10 border-accent/20" },
  Procedimento: { icon: FileText, color: "text-primary bg-primary/10 border-primary/20" },
  Erro: { icon: AlertCircle, color: "text-critical bg-critical/10 border-critical/20" },
  Documentação: { icon: BookOpen, color: "text-neon-purple bg-neon-purple/10 border-neon-purple/20" },
};

const CATEGORIAS = ["Folha", "eSocial", "Financeiro", "Ponto", "Benefícios", "Geral"] as const;

const categoriaColors: Record<string, string> = {
  Folha: "bg-primary/10 text-primary border-primary/30",
  eSocial: "bg-warning/10 text-warning border-warning/30",
  Financeiro: "bg-success/10 text-success border-success/30",
  Ponto: "bg-accent/10 text-accent border-accent/30",
  "Benefícios": "bg-neon-purple/10 text-neon-purple border-neon-purple/30",
  Geral: "bg-muted text-muted-foreground border-border/40",
};

export default function BaseConhecimentoPage() {
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [filterCategoria, setFilterCategoria] = useState<string>("all");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: items = [] } = useQuery({
    queryKey: ["base-conhecimento"],
    queryFn: async () => {
      const { data } = await supabase.from("base_conhecimento").select("*").order("created_at");
      return data || [];
    },
  });

  const filtered = items
    .filter((bc: any) =>
      (bc.titulo.toLowerCase().includes(search.toLowerCase()) ||
       bc.conteudo.toLowerCase().includes(search.toLowerCase())) &&
      (filterType === "all" || bc.tipo === filterType) &&
      (filterCategoria === "all" || (bc.categoria || "Geral") === filterCategoria)
    )
    .sort((a: any, b: any) => {
      // Favoritos primeiro
      const aFav = favorites.has(a.id) ? -2 : 0;
      const bFav = favorites.has(b.id) ? -2 : 0;
      if (aFav !== bFav) return aFav - bFav;
      // Match exato no título tem prioridade
      const q = search.toLowerCase();
      if (q) {
        const aMatch = a.titulo.toLowerCase().includes(q) ? -1 : 0;
        const bMatch = b.titulo.toLowerCase().includes(q) ? -1 : 0;
        return aMatch - bMatch;
      }
      return 0;
    });

  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: "📋 Copiado!", description: "Conteúdo copiado para a área de transferência" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" /> Base de Conhecimento
          </h1>
          <p className="text-xs text-muted-foreground mt-1">Queries, procedimentos e soluções TOTVS RM</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-primary hover:bg-primary/90 h-9 text-xs"><Plus className="h-3.5 w-3.5" /> Novo Artigo</Button>
          </DialogTrigger>
          <DialogContent className="glass border-border/40 max-w-md">
            <DialogHeader><DialogTitle className="text-base">Novo Artigo</DialogTitle></DialogHeader>
            <CreateArticleForm onSuccess={() => {
              setShowCreate(false);
              queryClient.invalidateQueries({ queryKey: ["base-conhecimento"] });
              toast({ title: "✅ Artigo adicionado" });
            }} onCancel={() => setShowCreate(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar na base..." className="pl-9 bg-secondary/60 border-border/40 h-9 text-xs" />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {["all", "SQL", "Procedimento", "Erro", "Documentação"].map(t => (
              <Button key={t} variant={filterType === t ? "default" : "outline"} size="sm"
                onClick={() => setFilterType(t)}
                className={`h-7 text-[10px] px-2.5 ${filterType === t ? "" : "border-border/30 text-muted-foreground"}`}>
                {t === "all" ? "Todos" : t}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <span className="text-[10px] text-muted-foreground self-center mr-1">Categoria:</span>
          {["all", ...CATEGORIAS].map(c => (
            <Button key={c} variant={filterCategoria === c ? "default" : "outline"} size="sm"
              onClick={() => setFilterCategoria(c)}
              className={`h-7 text-[10px] px-2.5 ${filterCategoria === c ? "" : "border-border/30 text-muted-foreground"}`}>
              {c === "all" ? "Todas" : c}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((item: any, i: number) => {
          const config = tipoConfig[item.tipo] || tipoConfig.SQL;
          const Icon = config.icon;
          const isFav = favorites.has(item.id);
          const cat = item.categoria || "Geral";
          return (
            <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="glass rounded-2xl border border-border/30 p-5 hover:border-primary/20 transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${config.color}`}><Icon className="h-4 w-4" /></div>
                  <h3 className="text-sm font-semibold">{item.titulo}</h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => toggleFavorite(item.id)} className="p-1 rounded hover:bg-secondary transition-colors">
                    <Star className={`h-3.5 w-3.5 ${isFav ? "fill-warning text-warning" : "text-muted-foreground/40"}`} />
                  </button>
                  <Badge variant="outline" className={`text-[8px] ${config.color}`}>{item.tipo}</Badge>
                  <Badge variant="outline" className={`text-[8px] ${categoriaColors[cat] || categoriaColors.Geral}`}>{cat}</Badge>
                </div>
              </div>
              <div className="relative rounded-xl bg-background/40 border border-border/20 p-3">
                <pre className="text-[11px] font-mono text-accent/80 whitespace-pre-wrap leading-relaxed">{item.conteudo}</pre>
                <button onClick={() => copy(item.conteudo, item.id)} className="absolute top-2 right-2 p-1.5 rounded-lg hover:bg-secondary/80 transition-colors">
                  {copiedId === item.id ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3 text-muted-foreground/50" />}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function CreateArticleForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({ titulo: "", conteudo: "", tipo: "SQL" });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.titulo.trim() || !form.conteudo.trim()) return;
    setSaving(true);
    await supabase.from("base_conhecimento").insert(form as any);
    setSaving(false);
    onSuccess();
  };

  return (
    <div className="space-y-4">
      <div><Label className="text-xs">Título</Label><Input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} className="bg-secondary/60 border-border/40 mt-1" placeholder="Ex: Query auditoria de folha" /></div>
      <div>
        <Label className="text-xs">Tipo</Label>
        <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
          <SelectTrigger className="bg-secondary/60 border-border/40 mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>{["SQL", "Procedimento", "Erro", "Documentação"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div><Label className="text-xs">Conteúdo</Label><Textarea value={form.conteudo} onChange={e => setForm(f => ({ ...f, conteudo: e.target.value }))} className="bg-secondary/60 border-border/40 mt-1 font-mono text-xs min-h-[120px]" placeholder="SELECT * FROM..." /></div>
      <div className="flex gap-3 justify-end pt-1">
        <Button variant="outline" onClick={onCancel} className="border-border/40 h-9 text-xs">Cancelar</Button>
        <Button onClick={handleSubmit} disabled={!form.titulo.trim() || !form.conteudo.trim() || saving} className="gap-2 h-9 text-xs">
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Salvar
        </Button>
      </div>
    </div>
  );
}
