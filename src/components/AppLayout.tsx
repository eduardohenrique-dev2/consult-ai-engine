import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Badge } from "@/components/ui/badge";
import { NotificationsPanel } from "@/components/NotificationsPanel";
import { FloatingChat } from "@/components/FloatingChat";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border/40 px-5 bg-background/80 backdrop-blur-xl sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors" />
            </div>
            <div className="flex items-center gap-3">
              <NotificationsPanel />
              <Badge variant="outline" className="text-[10px] border-border/40 text-muted-foreground">
                v2.1
              </Badge>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6 lg:p-8 scrollbar-thin">
            {children}
          </main>
        </div>
        <FloatingChat />
      </div>
    </SidebarProvider>
  );
}
