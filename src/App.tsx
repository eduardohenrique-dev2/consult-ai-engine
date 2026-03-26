import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Chamados from "./pages/Chamados";
import ChatIA from "./pages/ChatIA";
import ClientesPage from "./pages/ClientesPage";
import Monitoramento from "./pages/Monitoramento";
import BaseConhecimento from "./pages/BaseConhecimento";
import AutomacoesPage from "./pages/AutomacoesPage";
import Configuracoes from "./pages/Configuracoes";
import LoginPage from "./pages/LoginPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="*" element={
              <AppLayout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/chamados" element={<Chamados />} />
                  <Route path="/chat" element={<ChatIA />} />
                  <Route path="/clientes" element={<ClientesPage />} />
                  <Route path="/monitoramento" element={<Monitoramento />} />
                  <Route path="/conhecimento" element={<BaseConhecimento />} />
                  <Route path="/automacoes" element={<AutomacoesPage />} />
                  <Route path="/configuracoes" element={<Configuracoes />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </AppLayout>
            } />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
