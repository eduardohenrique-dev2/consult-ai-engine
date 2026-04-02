import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, CheckCheck, AlertTriangle, Info, X, Ticket, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Notification {
  id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  lida: boolean;
  chamado_id: string | null;
  created_at: string;
}

// Notification sound (subtle)
const playNotificationSound = () => {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.setValueAtTime(600, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch {}
};

export function NotificationsPanel() {
  const [open, setOpen] = useState(false);
  const [bellShake, setBellShake] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const prevCountRef = useRef(0);

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

  const handleNewNotification = useCallback((payload: any) => {
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    playNotificationSound();
    setBellShake(true);
    setTimeout(() => setBellShake(false), 600);

    const newRecord = payload.new as any;
    if (newRecord) {
      toast(newRecord.titulo, {
        description: newRecord.mensagem,
        action: newRecord.chamado_id ? {
          label: "Ver chamado",
          onClick: () => navigate("/chamados"),
        } : undefined,
      });
    }
  }, [queryClient, navigate]);

  useEffect(() => {
    const channel = supabase
      .channel("notifications-realtime-v2")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        handleNewNotification
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [handleNewNotification]);

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

  const handleNotificationClick = (n: Notification) => {
    if (!n.lida) markRead.mutate(n.id);
    if (n.chamado_id) {
      setOpen(false);
      navigate("/chamados");
    }
  };

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
        className="relative p-2 rounded-lg hover:bg-secondary/80 transition-all group"
      >
        <motion.div
          animate={bellShake ? { rotate: [0, -15, 15, -10, 10, -5, 5, 0] } : {}}
          transition={{ duration: 0.5 }}
        >
          <Bell className="h-4.5 w-4.5 text-muted-foreground group-hover:text-foreground transition-colors" />
        </motion.div>
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-0.5 -right-0.5 h-4.5 min-w-[18px] px-1 rounded-full bg-destructive text-[9px] text-destructive-foreground flex items-center justify-center font-bold"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              className="absolute right-0 top-full mt-2 w-[380px] max-h-[70vh] rounded-2xl border border-border/50 glass shadow-2xl shadow-black/50 z-50 overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-border/30">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold">Notificações</h3>
                  {unreadCount > 0 && (
                    <Badge className="text-[9px] h-5 bg-destructive/15 text-destructive border-destructive/30">{unreadCount} novas</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markAllRead.mutate()}
                      className="text-[10px] text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                    >
                      <CheckCheck className="h-3 w-3" /> Ler todas
                    </button>
                  )}
                  <button onClick={() => setOpen(false)} className="p-1 hover:bg-secondary rounded-lg transition-colors">
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>
              </div>

              <div className="overflow-auto max-h-[calc(70vh-60px)] scrollbar-thin">
                {notifications.length === 0 ? (
                  <div className="p-12 text-center">
                    <Bell className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Nenhuma notificação</p>
                  </div>
                ) : (
                  notifications.map((n, i) => {
                    const Icon = iconMap[n.tipo] || Info;
                    return (
                      <motion.div
                        key={n.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.02 }}
                        className={`flex items-start gap-3 p-3.5 border-b border-border/10 hover:bg-secondary/40 transition-all cursor-pointer ${
                          !n.lida ? "bg-primary/5 border-l-2 border-l-primary" : ""
                        }`}
                        onClick={() => handleNotificationClick(n)}
                      >
                        <div className={`mt-0.5 p-1.5 rounded-lg ${n.tipo === "alerta" ? "bg-warning/10" : "bg-accent/10"}`}>
                          <Icon className={`h-3.5 w-3.5 ${colorMap[n.tipo] || "text-muted-foreground"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs leading-snug ${!n.lida ? "font-semibold" : "font-medium"}`}>{n.titulo}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{n.mensagem}</p>
                          <p className="text-[10px] text-muted-foreground/50 mt-1.5">
                            {format(new Date(n.created_at), "dd/MM HH:mm")}
                          </p>
                        </div>
                        {!n.lida && (
                          <span className="h-2 w-2 rounded-full bg-primary mt-1.5 flex-shrink-0 animate-pulse" />
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
