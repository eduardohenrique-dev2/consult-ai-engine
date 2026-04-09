import { useMemo } from "react";
import { motion } from "framer-motion";
import { format, startOfMonth, endOfMonth, startOfWeek, addDays, isSameDay, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Reuniao } from "@/hooks/useReunioes";

interface Props {
  currentDate: Date;
  reunioes: Reuniao[];
  onEventClick: (r: Reuniao) => void;
  onDayClick: (date: Date) => void;
}

export function MonthlyCalendar({ currentDate, reunioes, onEventClick, onDayClick }: Props) {
  const today = new Date();
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });

  const weeks = useMemo(() => {
    const wks: Date[][] = [];
    let d = calStart;
    while (d <= monthEnd || wks.length < 6) {
      const week: Date[] = [];
      for (let i = 0; i < 7; i++) {
        week.push(d);
        d = addDays(d, 1);
      }
      wks.push(week);
      if (wks.length >= 6) break;
    }
    return wks;
  }, [currentDate]);

  const dayNames = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <div className="grid grid-cols-7 border-b border-border/10">
        {dayNames.map(d => (
          <div key={d} className="text-center py-2 text-[10px] text-muted-foreground/60 uppercase font-medium">{d}</div>
        ))}
      </div>
      <div className="flex-1 grid grid-rows-6">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b border-border/[0.03] min-h-[80px]">
            {week.map(day => {
              const isMonth = isSameMonth(day, currentDate);
              const isToday = isSameDay(day, today);
              const events = reunioes.filter(r => isSameDay(new Date(r.data_inicio), day));
              return (
                <div
                  key={day.toISOString()}
                  className={`border-r border-border/[0.03] p-1 cursor-pointer hover:bg-muted/10 transition-colors ${!isMonth ? "opacity-20" : ""}`}
                  onClick={() => onDayClick(day)}
                >
                  <div className={`text-xs font-medium mb-0.5 ${isToday ? "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center" : ""}`}>
                    {format(day, "d")}
                  </div>
                  <div className="space-y-0.5">
                    {events.slice(0, 3).map(r => (
                      <motion.div
                        key={r.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-[9px] px-1 py-0.5 rounded truncate text-white/90 cursor-pointer"
                        style={{ backgroundColor: r.cor + "88" }}
                        onClick={e => { e.stopPropagation(); onEventClick(r); }}
                      >
                        {r.titulo}
                      </motion.div>
                    ))}
                    {events.length > 3 && (
                      <div className="text-[9px] text-muted-foreground pl-1">+{events.length - 3} mais</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
