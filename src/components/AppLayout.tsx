import { useState, useEffect, useRef, useCallback } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Badge } from "@/components/ui/badge";
import { NotificationsPanel } from "@/components/NotificationsPanel";
import { FloatingChat } from "@/components/FloatingChat";
import { GlobalSearch } from "@/components/GlobalSearch";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Search } from "lucide-react";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [showSearch, setShowSearch] = useState(false);

  // Keyboard shortcut for global search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowSearch(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border/30 px-5 bg-background/60 backdrop-blur-2xl sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors" />
              <button
                onClick={() => setShowSearch(true)}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/50 border border-border/30 text-muted-foreground hover:border-primary/30 hover:text-foreground transition-all text-xs"
              >
                <Search className="h-3.5 w-3.5" />
                <span>Buscar...</span>
                <kbd className="ml-4 text-[9px] font-mono bg-background/60 px-1.5 py-0.5 rounded border border-border/30">⌘K</kbd>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <NotificationsPanel />
              <Badge variant="outline" className="text-[9px] border-border/30 text-muted-foreground/60 font-mono">
                v3.0
              </Badge>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-5 lg:p-7 scrollbar-thin">
            {children}
          </main>
        </div>
        <FloatingChat />
        <GlobalSearch open={showSearch} onOpenChange={setShowSearch} />
      </div>
    </SidebarProvider>
  );
}
