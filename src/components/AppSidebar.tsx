import {
  LayoutDashboard, Ticket, MessageSquareText, Users,
  Monitor, BookOpen, Zap, Settings, LogOut, BarChart3, Shield, CalendarDays, FileText,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import logoPm from "@/assets/logo-pm.png";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";

const mainItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Chamados", url: "/chamados", icon: Ticket },
  { title: "Assistente IA", url: "/chat", icon: MessageSquareText },
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Monitoramento", url: "/monitoramento", icon: Monitor },
  { title: "Reuniões", url: "/reunioes", icon: CalendarDays },
];

const systemItems = [
  { title: "Base de Conhecimento", url: "/conhecimento", icon: BookOpen },
  { title: "Relatórios", url: "/relatorios", icon: BarChart3 },
  { title: "Automações", url: "/automacoes", icon: Zap },
  { title: "Logs de Importação", url: "/logs-importacao", icon: FileText },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
  { title: "Admin", url: "/admin", icon: Shield, adminOnly: true },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { profile, role, signOut } = useAuth();
  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  const initials = profile?.nome
    ? profile.nome.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : "PM";

  return (
    <Sidebar collapsible="icon" className="border-r border-border/30">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <img src={logoPm} alt="PM Consultoria" className="h-8 w-8 rounded-lg object-cover ring-1 ring-border/30" />
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-extrabold gold-gradient leading-tight">PM Intelligence</span>
              <span className="text-[9px] text-muted-foreground/60">Pereira Marques</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="scrollbar-thin px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground/50 font-semibold px-2">
            Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} end={item.url === "/"} className="transition-all hover:text-foreground rounded-xl" activeClassName="text-primary bg-primary/10">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span className="text-[13px]">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground/50 font-semibold px-2">
            Sistema
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemItems.filter((item: any) => !item.adminOnly || role === "admin").map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} className="transition-all hover:text-foreground rounded-xl" activeClassName="text-primary bg-primary/10">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span className="text-[13px]">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        {!collapsed && (
          <div className="glass rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/30 to-accent/20 flex items-center justify-center text-[10px] font-bold text-primary ring-1 ring-primary/20">
                {initials}
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-xs font-semibold truncate">{profile?.nome || "Usuário"}</span>
                <Badge variant="outline" className="text-[8px] w-fit border-primary/20 text-primary/80 capitalize px-1.5">
                  {role || "consultor"}
                </Badge>
              </div>
            </div>
            <button
              onClick={signOut}
              className="flex items-center gap-2 text-[10px] text-muted-foreground/60 hover:text-destructive w-full py-1 transition-colors"
            >
              <LogOut className="h-3 w-3" /> Sair
            </button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
