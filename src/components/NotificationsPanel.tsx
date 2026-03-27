import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, CheckCheck, AlertTriangle, Info, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface Notification {
  id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  lida: boolean;
  chamado_id: string | null;
  created_at: string;
}

export function NotificationsPanel() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      return (data || []) as Notification[];
    },
  });

  const unreadCount = notifications.filter((n) => !n.lida).length;

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("notifications").update({ lida: true }).eq("id", id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      await supabase.from("notifications").update({ lida: true }).eq("lida", false);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const iconMap: Record<string, typeof Info> = {
    info: Info,
    alerta: AlertTriangle,
  };

  const colorMap: Record<string, string> = {
    info: "text-accent",
    alerta: "text-warning",
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-secondary transition-colors group"
      >
        <Bell className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-critical text-[9px] text-white flex items-center justify-center font-bold animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              className="absolute right-0 top-full mt-2 w-96 max-h-[70vh] rounded-xl border border-border/50 bg-card shadow-2xl shadow-black/40 z-50 overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-border/30">
                <h3 className="text-sm font-semibold">Notificações</h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markAllRead.mutate()}
                      className="text-[10px] text-primary hover:underline flex items-center gap-1"
                    >
                      <CheckCheck className="h-3 w-3" /> Marcar todas como lidas
                    </button>
                  )}
                  <button onClick={() => setOpen(false)} className="p-1 hover:bg-secondary rounded">
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>
              </div>

              <div className="overflow-auto max-h-[calc(70vh-60px)] scrollbar-thin">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    Nenhuma notificação
                  </div>
                ) : (
                  notifications.map((n) => {
                    const Icon = iconMap[n.tipo] || Info;
                    return (
                      <motion.div
                        key={n.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`flex items-start gap-3 p-3.5 border-b border-border/20 hover:bg-secondary/30 transition-colors cursor-pointer ${
                          !n.lida ? "bg-primary/5" : ""
                        }`}
                        onClick={() => !n.lida && markRead.mutate(n.id)}
                      >
                        <div className={`mt-0.5 ${colorMap[n.tipo] || "text-muted-foreground"}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium leading-snug">{n.titulo}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{n.mensagem}</p>
                          <p className="text-[10px] text-muted-foreground/60 mt-1">
                            {format(new Date(n.created_at), "dd/MM HH:mm")}
                          </p>
                        </div>
                        {!n.lida && (
                          <span className="h-2 w-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                        )}
                      </motion.div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
