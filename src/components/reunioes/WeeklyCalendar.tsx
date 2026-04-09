import { useMemo } from "react";
import { motion } from "framer-motion";
import { format, startOfWeek, addDays, isSameDay, isWithinInterval, differenceInMinutes, addMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Reuniao } from "@/hooks/useReunioes";

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 06:00 - 21:00
const HOUR_H = 60; // px per hour

interface Props {
  currentDate: Date;
  reunioes: Reuniao[];
  onEventClick: (r: Reuniao) => void;
  onSlotClick: (date: Date) => void;
}

export function WeeklyCalendar({ currentDate, reunioes, onEventClick, onSlotClick }: Props) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const today = new Date();

  const getEventsForDay = (day: Date) =>
    reunioes.filter(r => {
      const start = new Date(r.data_inicio);
      return isSameDay(start, day);
    });

  const getEventStyle = (r: Reuniao) => {
    const start = new Date(r.data_inicio);
    const end = new Date(r.data_fim);
    const startMin = start.getHours() * 60 + start.getMinutes();
    const dur = Math.max(differenceInMinutes(end, start), 15);
    const top = ((startMin - 6 * 60) / 60) * HOUR_H;
    const height = (dur / 60) * HOUR_H;
    return { top: Math.max(top, 0), height: Math.max(height, 12) };
  };

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <div className="flex border-b border-border/20 sticky top-0 z-10 bg-background/95 backdrop-blur">
        <div className="w-16 shrink-0" />
        {days.map(day => {
          const isToday = isSameDay(day, today);
          return (
            <div key={day.toISOString()} className={`flex-1 text-center py-2 border-l border-border/5 ${isToday ? "bg-primary/[0.04]" : ""}`}>
              <div className="text-[10px] text-muted-foreground/70 uppercase">{format(day, "EEE", { locale: ptBR })}</div>
              <div className={`text-lg font-semibold ${isToday ? "text-primary/80" : "text-foreground/70"}`}>{format(day, "d")}</div>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="flex relative">
        {/* Time labels */}
        <div className="w-16 shrink-0">
          {HOURS.map(h => (
            <div key={h} style={{ height: HOUR_H }} className="flex items-start justify-end pr-2 text-[10px] text-muted-foreground/40 -mt-2">
              {String(h).padStart(2, "0")}:00
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map(day => {
          const events = getEventsForDay(day);
          const isToday = isSameDay(day, today);
          return (
            <div
              key={day.toISOString()}
              className={`flex-1 relative border-l border-border/5 cursor-pointer ${isToday ? "bg-primary/[0.015]" : ""}`}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const y = e.clientY - rect.top;
                const hour = Math.floor(y / HOUR_H) + 6;
                const mins = Math.floor((y % HOUR_H) / (HOUR_H / 2)) * 30;
                const clickDate = new Date(day);
                clickDate.setHours(hour, mins, 0, 0);
                onSlotClick(clickDate);
              }}
            >
              {HOURS.map(h => (
                <div key={h} style={{ height: HOUR_H }} className="border-b border-border/[0.03]" />
              ))}

              {/* Events */}
              {events.map(r => {
                const { top, height } = getEventStyle(r);
                return (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute left-0.5 right-0.5 rounded-md px-1.5 py-0.5 cursor-pointer overflow-hidden group hover:shadow-md transition-shadow z-10"
                    style={{ top, height, backgroundColor: r.cor + "99", minHeight: 20 }}
                    onClick={e => { e.stopPropagation(); onEventClick(r); }}
                  >
                    <p className="text-[10px] font-semibold text-white truncate leading-tight">{r.titulo}</p>
                    {height > 30 && (
                      <p className="text-[9px] text-white/80 truncate">
                        {format(new Date(r.data_inicio), "HH:mm")} - {format(new Date(r.data_fim), "HH:mm")}
                      </p>
                    )}
                    {height > 50 && r.clientes?.nome && (
                      <p className="text-[9px] text-white/70 truncate">{r.clientes.nome}</p>
                    )}
                  </motion.div>
                );
              })}

              {/* Now indicator */}
              {isToday && (() => {
                const now = new Date();
                const min = now.getHours() * 60 + now.getMinutes();
                const top = ((min - 6 * 60) / 60) * HOUR_H;
                if (top < 0 || top > HOURS.length * HOUR_H) return null;
                return (
                  <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top }}>
                    <div className="h-0.5 bg-destructive relative">
                      <div className="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full bg-destructive" />
                    </div>
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>
    </div>
  );
}
