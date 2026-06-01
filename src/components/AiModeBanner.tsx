import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, WifiOff } from "lucide-react";

export function AiModeBanner() {
  const [state, setState] = useState<{ mode: string; reason: string | null } | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("ai_runtime_state").select("mode, reason").eq("id", 1).maybeSingle();
      if (data) setState(data);
    };
    load();
    const channel = supabase
      .channel("ai_runtime_state_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "ai_runtime_state" }, (payload: any) => {
        if (payload.new) setState({ mode: payload.new.mode, reason: payload.new.reason });
      })
      .subscribe();
    const interval = setInterval(load, 60_000);
    return () => { supabase.removeChannel(channel); clearInterval(interval); };
  }, []);

  if (!state || state.mode === "online") return null;

  const Icon = state.mode === "offline" ? WifiOff : AlertTriangle;
  const label = state.mode === "offline" ? "Modo offline" : "IA degradada";

  return (
    <div className="px-4 py-2 bg-warning/10 border-b border-warning/30 text-warning text-xs flex items-center gap-2">
      <Icon className="h-3.5 w-3.5" />
      <span className="font-medium">{label}:</span>
      <span className="text-muted-foreground">
        {state.reason || "IA externa indisponível. As respostas usam apenas a base local e o histórico interno."}
      </span>
    </div>
  );
}
