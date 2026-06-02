import { useEffect, useMemo, useState } from "react";
import { Play, Square, Timer, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Props {
  chamadoId: string;
}

function fmt(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map(n => String(n).padStart(2, "0")).join(":");
}

export default function ChamadoTimeTracker({ chamadoId }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [entries, setEntries] = useState<any[]>([]);
  const [active, setActive] = useState<any | null>(null);
  const [note, setNote] = useState("");
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("chamado_time_entries")
      .select("*")
      .eq("chamado_id", chamadoId)
      .order("started_at", { ascending: false });
    setEntries(data || []);
    setActive((data || []).find(e => !e.ended_at) || null);
  };

  useEffect(() => { load(); }, [chamadoId]);

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);

  const totalSeconds = useMemo(() => {
    const finished = entries.filter(e => e.ended_at).reduce((acc, e) => acc + (e.duration_seconds || 0), 0);
    const running = active ? Math.floor((now - new Date(active.started_at).getTime()) / 1000) : 0;
    return finished + running;
  }, [entries, active, now]);

  const start = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from("chamado_time_entries").insert({
      chamado_id: chamadoId, user_id: user.id, note: note || null,
    });
    setLoading(false);
    if (error) return toast({ title: "Erro ao iniciar", description: error.message, variant: "destructive" });
    setNote("");
    load();
  };

  const stop = async () => {
    if (!active) return;
    setLoading(true);
    const endedAt = new Date();
    const duration = Math.floor((endedAt.getTime() - new Date(active.started_at).getTime()) / 1000);
    const { error } = await supabase.from("chamado_time_entries")
      .update({ ended_at: endedAt.toISOString(), duration_seconds: duration })
      .eq("id", active.id);
    setLoading(false);
    if (error) return toast({ title: "Erro ao parar", description: error.message, variant: "destructive" });
    toast({ title: "⏱ Tempo registrado", description: fmt(duration) });
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("chamado_time_entries").delete().eq("id", id);
    load();
  };

  return (
    <div className="rounded-xl border border-border/30 bg-secondary/20 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold flex items-center gap-1.5">
          <Timer className="h-3.5 w-3.5 text-primary" /> Tempo trabalhado
        </h4>
        <span className="text-sm font-mono tabular-nums text-primary">{fmt(totalSeconds)}</span>
      </div>

      <div className="flex gap-2">
        {!active ? (
          <>
            <Input
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Nota (opcional)"
              className="h-8 text-xs bg-background border-border/50"
            />
            <Button size="sm" onClick={start} disabled={loading} className="gap-1.5 shrink-0">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
              Iniciar
            </Button>
          </>
        ) : (
          <Button size="sm" variant="destructive" onClick={stop} disabled={loading} className="gap-1.5">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Square className="h-3.5 w-3.5" />}
            Parar ({fmt(Math.floor((now - new Date(active.started_at).getTime()) / 1000))})
          </Button>
        )}
      </div>

      {entries.filter(e => e.ended_at).length > 0 && (
        <div className="pt-2 border-t border-border/20 space-y-1 max-h-32 overflow-auto">
          {entries.filter(e => e.ended_at).slice(0, 8).map(e => (
            <div key={e.id} className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span className="font-mono tabular-nums text-foreground/70 w-16">{fmt(e.duration_seconds || 0)}</span>
              <span>{new Date(e.started_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
              {e.note && <span className="italic truncate">— {e.note}</span>}
              <button onClick={() => remove(e.id)} className="ml-auto hover:text-destructive">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
