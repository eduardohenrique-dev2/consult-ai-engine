import { motion } from "framer-motion";
import { format, isSameDay, differenceInMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Reuniao } from "@/hooks/useReunioes";

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6);
const HOUR_H = 72;

interface Props {
  currentDate: Date;
  reunioes: Reuniao[];
  onEventClick: (r: Reuniao) => void;
  onSlotClick: (date: Date) => void;
}

export function DailyCalendar({ currentDate, reunioes, onEventClick, onSlotClick }: Props) {
  const events = reunioes.filter(r => isSameDay(new Date(r.data_inicio), currentDate));
  const today = new Date();
  const isToday = isSameDay(currentDate, today);

  return (
    <div className="flex-1 overflow-auto">
      <div className="text-center py-3 border-b border-border/20 bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="text-xs text-muted-foreground">{format(currentDate, "EEEE", { locale: ptBR })}</div>
        <div className="text-2xl font-bold">{format(currentDate, "dd 'de' MMMM", { locale: ptBR })}</div>
      </div>
      <div className="flex">
        <div className="w-20 shrink-0">
          {HOURS.map(h => (
            <div key={h} style={{ height: HOUR_H }} className="flex items-start justify-end pr-3 text-xs text-muted-foreground/40 -mt-2">
              {String(h).padStart(2, "0")}:00
            </div>
          ))}
        </div>
        <div
          className="flex-1 relative border-l border-border/5"
          onClick={e => {
            const rect = e.currentTarget.getBoundingClientRect();
            const y = e.clientY - rect.top;
            const hour = Math.floor(y / HOUR_H) + 6;
            const mins = Math.floor((y % HOUR_H) / (HOUR_H / 2)) * 30;
            const d = new Date(currentDate);
            d.setHours(hour, mins, 0, 0);
            onSlotClick(d);
          }}
        >
          {HOURS.map(h => (
            <div key={h} style={{ height: HOUR_H }} className="border-b border-border/[0.03]" />
          ))}
          {events.map(r => {
            const start = new Date(r.data_inicio);
            const end = new Date(r.data_fim);
            const startMin = start.getHours() * 60 + start.getMinutes();
            const dur = Math.max(differenceInMinutes(end, start), 15);
            const top = ((startMin - 360) / 60) * HOUR_H;
            const height = (dur / 60) * HOUR_H;
            return (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="absolute left-1 right-1 rounded-lg px-3 py-2 cursor-pointer hover:shadow-lg transition-shadow"
                style={{ top: Math.max(top, 0), height: Math.max(height, 24), backgroundColor: r.cor + "99" }}
                onClick={e => { e.stopPropagation(); onEventClick(r); }}
              >
                <p className="text-sm font-semibold text-white truncate">{r.titulo}</p>
                <p className="text-xs text-white/80">{format(start, "HH:mm")} - {format(end, "HH:mm")}</p>
                {r.clientes?.nome && <p className="text-xs text-white/70">{r.clientes.nome}</p>}
              </motion.div>
            );
          })}
          {isToday && (() => {
            const now = new Date();
            const min = now.getHours() * 60 + now.getMinutes();
            const top = ((min - 360) / 60) * HOUR_H;
            if (top < 0) return null;
            return (
              <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top }}>
                <div className="h-0.5 bg-destructive"><div className="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full bg-destructive" /></div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
