import {
  LayoutDashboard, Ticket, MessageSquareText, Users,
  Monitor, BookOpen, Zap, Settings, LogOut, BarChart3, Mail, Shield,
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
];

const systemItems = [
  { title: "Base de Conhecimento", url: "/conhecimento", icon: BookOpen },
  { title: "Relatórios", url: "/relatorios", icon: BarChart3 },
  { title: "Automações", url: "/automacoes", icon: Zap },
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
    : "??";

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <img src={logoPm} alt="PM Consultoria" className="h-9 w-9 rounded-lg object-cover" />
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-bold gold-gradient">PM Intelligence</span>
              <span className="text-[10px] text-muted-foreground">Pereira Marques Consultoria</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="scrollbar-thin">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
            Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} end={item.url === "/"} className="transition-colors hover:text-foreground" activeClassName="text-primary bg-primary/10">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
            Sistema
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} className="transition-colors hover:text-foreground" activeClassName="text-primary bg-primary/10">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
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
          <div className="glass rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                {initials}
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-xs font-medium truncate">{profile?.nome || "Usuário"}</span>
                <Badge variant="outline" className="text-[9px] w-fit border-primary/30 text-primary capitalize">
                  {role || "consultor"}
                </Badge>
              </div>
            </div>
            <button
              onClick={signOut}
              className="flex items-center gap-2 text-[10px] text-muted-foreground hover:text-destructive w-full py-1 transition-colors"
            >
              <LogOut className="h-3 w-3" /> Sair
            </button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
