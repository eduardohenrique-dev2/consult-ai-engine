import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, ChevronLeft, ChevronRight, Calendar as CalIcon, Filter, Search } from "lucide-react";
import { format, addWeeks, subWeeks, addMonths, subMonths, addDays, subDays, startOfWeek, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { useReunioes, type Reuniao } from "@/hooks/useReunioes";
import { WeeklyCalendar } from "@/components/reunioes/WeeklyCalendar";
import { MonthlyCalendar } from "@/components/reunioes/MonthlyCalendar";
import { DailyCalendar } from "@/components/reunioes/DailyCalendar";
import { MeetingModal } from "@/components/reunioes/MeetingModal";
import { MeetingDetail } from "@/components/reunioes/MeetingDetail";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

type ViewMode = "week" | "month" | "day";

export default function ReunioesPage() {
  const { reunioes, isLoading, create, update, delete: deleteReuniao, isCreating, isUpdating } = useReunioes();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingReuniao, setEditingReuniao] = useState<Reuniao | null>(null);
  const [selectedReuniao, setSelectedReuniao] = useState<Reuniao | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [defaultDate, setDefaultDate] = useState<Date | null>(null);
  const [search, setSearch] = useState("");
  const [filterCliente, setFilterCliente] = useState<string>("");

  const filteredReunioes = useMemo(() => {
    let filtered = reunioes;
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(r => r.titulo.toLowerCase().includes(s) || r.descricao?.toLowerCase().includes(s));
    }
    if (filterCliente) {
      filtered = filtered.filter(r => r.cliente_id === filterCliente);
    }
    return filtered;
  }, [reunioes, search, filterCliente]);

  const clientes = useMemo(() => {
    const map = new Map<string, string>();
    reunioes.forEach(r => {
      if (r.cliente_id && r.clientes?.nome) map.set(r.cliente_id, r.clientes.nome);
    });
    return Array.from(map.entries());
  }, [reunioes]);

  const navigate = (dir: 1 | -1) => {
    if (viewMode === "week") setCurrentDate(d => dir === 1 ? addWeeks(d, 1) : subWeeks(d, 1));
    else if (viewMode === "month") setCurrentDate(d => dir === 1 ? addMonths(d, 1) : subMonths(d, 1));
    else setCurrentDate(d => dir === 1 ? addDays(d, 1) : subDays(d, 1));
  };

  const headerLabel = () => {
    if (viewMode === "month") return format(currentDate, "MMMM yyyy", { locale: ptBR });
    if (viewMode === "day") return format(currentDate, "dd 'de' MMMM, yyyy", { locale: ptBR });
    const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
    return `${format(ws, "dd MMM", { locale: ptBR })} — ${format(addDays(ws, 6), "dd MMM yyyy", { locale: ptBR })}`;
  };

  const openNewMeeting = (date?: Date) => {
    setEditingReuniao(null);
    setDefaultDate(date || null);
    setModalOpen(true);
  };

  const openEditMeeting = (r: Reuniao) => {
    setEditingReuniao(r);
    setDefaultDate(null);
    setModalOpen(true);
  };

  const handleSave = async (data: any) => {
    if (editingReuniao) {
      await update({ id: editingReuniao.id, ...data });
    } else {
      await create(data);
    }
  };

  const upcomingToday = useMemo(() => {
    const now = new Date();
    return reunioes.filter(r => {
      const start = new Date(r.data_inicio);
      return isSameDay(start, now) && start >= now;
    }).slice(0, 5);
  }, [reunioes]);

  const activeDetail = selectedReuniao ? reunioes.find(r => r.id === selectedReuniao.id) || null : null;

  return (
    <div className="h-full flex flex-col">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between p-4 border-b border-border/20">
        <div className="flex items-center gap-3">
          <CalIcon className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold">Reuniões</h1>
          <Badge variant="outline" className="text-xs">{reunioes.length} total</Badge>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input className="pl-8 h-9 w-48 text-xs" placeholder="Buscar reunião..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Button onClick={() => openNewMeeting()} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> Nova Reunião
          </Button>
        </div>
      </motion.div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-64 shrink-0 border-r border-border/20 p-3 space-y-4 hidden lg:block overflow-y-auto">
          <Button onClick={() => openNewMeeting()} className="w-full gap-2" size="sm">
            <Plus className="h-4 w-4" /> Nova Reunião
          </Button>

          <Calendar
            mode="single"
            selected={currentDate}
            onSelect={d => { if (d) { setCurrentDate(d); setViewMode("day"); } }}
            className="p-1 pointer-events-auto"
          />

          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 font-semibold">Filtros</p>
            <Select value={filterCliente} onValueChange={setFilterCliente}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Todos os clientes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                {clientes.map(([id, nome]) => (
                  <SelectItem key={id} value={id}>{nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {upcomingToday.length > 0 && (
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 font-semibold">Próximas hoje</p>
              <div className="space-y-1.5">
                {upcomingToday.map(r => (
                  <div key={r.id} className="glass rounded-lg p-2 cursor-pointer hover:bg-muted/20 transition-colors" onClick={() => setSelectedReuniao(r)}>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: r.cor }} />
                      <span className="text-[11px] font-medium truncate">{r.titulo}</span>
                    </div>
                    <span className="text-[9px] text-muted-foreground ml-3.5">{format(new Date(r.data_inicio), "HH:mm")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border/10">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(1)}><ChevronRight className="h-4 w-4" /></Button>
              <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => setCurrentDate(new Date())}>Hoje</Button>
              <span className="text-sm font-semibold capitalize">{headerLabel()}</span>
            </div>
            <div className="flex gap-1">
              {(["day", "week", "month"] as ViewMode[]).map(v => (
                <Button key={v} variant={viewMode === v ? "default" : "ghost"} size="sm" className="text-xs h-7 px-3" onClick={() => setViewMode(v)}>
                  {v === "day" ? "Dia" : v === "week" ? "Semana" : "Mês"}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 overflow-hidden flex flex-col">
              {viewMode === "week" && (
                <WeeklyCalendar currentDate={currentDate} reunioes={filteredReunioes} onEventClick={r => setSelectedReuniao(r)} onSlotClick={d => openNewMeeting(d)} />
              )}
              {viewMode === "month" && (
                <MonthlyCalendar currentDate={currentDate} reunioes={filteredReunioes} onEventClick={r => setSelectedReuniao(r)} onDayClick={d => { setCurrentDate(d); setViewMode("day"); }} />
              )}
              {viewMode === "day" && (
                <DailyCalendar currentDate={currentDate} reunioes={filteredReunioes} onEventClick={r => setSelectedReuniao(r)} onSlotClick={d => openNewMeeting(d)} />
              )}
            </div>

            <AnimatePresence>
              {activeDetail && (
                <MeetingDetail
                  reuniao={activeDetail}
                  onClose={() => setSelectedReuniao(null)}
                  onEdit={() => { openEditMeeting(activeDetail); setSelectedReuniao(null); }}
                  onDelete={() => { setDeleteId(activeDetail.id); setSelectedReuniao(null); }}
                  onUpdate={async (id, data) => { await update({ id, ...data } as any); }}
                />
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <MeetingModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        saving={isCreating || isUpdating}
        initial={editingReuniao}
        defaultDate={defaultDate}
      />

      <AlertDialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}>
        <AlertDialogContent className="glass">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir reunião?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={async () => { if (deleteId) { await deleteReuniao(deleteId); setDeleteId(null); } }} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
