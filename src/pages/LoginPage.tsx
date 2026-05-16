import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Eye, EyeOff } from "lucide-react";
import logoPm from "@/assets/logo-pm.png";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const { user, loading, signIn, signUp, resetPassword } = useAuth();
  const { toast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [forgotMode, setForgotMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [remember, setRemember] = useState(true);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (forgotMode) {
      const { error } = await resetPassword(email);
      if (error) {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "📧 Email enviado!", description: "Verifique sua caixa de entrada para redefinir a senha." });
        setForgotMode(false);
      }
    } else if (isLogin) {
      try { localStorage.setItem("pm_remember", remember ? "1" : "0"); } catch {}
      const { error } = await signIn(email, password);
      if (error) {
        toast({ title: "Erro ao entrar", description: error.message, variant: "destructive" });
      } else {
        // log access
        try {
          const { data: { user: u } } = await (await import("@/integrations/supabase/client")).supabase.auth.getUser();
          if (u) {
            await (await import("@/integrations/supabase/client")).supabase.from("access_logs").insert({
              user_id: u.id, event_type: "login", user_agent: navigator.userAgent,
            });
          }
        } catch {}
      }
    } else {
      const { error } = await signUp(email, password, nome);
      if (error) {
        toast({ title: "Erro ao cadastrar", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Conta criada!", description: "Verifique seu email para confirmar o cadastro." });
      }
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-accent/5 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md px-6"
      >
        <div className="card-gradient rounded-2xl border border-border/50 p-8 shadow-2xl">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <img src={logoPm} alt="PM Consultoria" className="h-16 w-16 rounded-xl object-cover mb-4" />
            <h1 className="text-xl font-bold gold-gradient">PM Intelligence</h1>
            <p className="text-xs text-muted-foreground mt-1">Pereira Marques Consultoria</p>
          </div>

          {/* Toggle */}
          {!forgotMode && (
            <div className="flex rounded-lg bg-secondary p-1 mb-6">
              <button
                onClick={() => setIsLogin(true)}
                className={`flex-1 text-xs font-medium py-2 rounded-md transition-all ${isLogin ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                Entrar
              </button>
              <button
                onClick={() => setIsLogin(false)}
                className={`flex-1 text-xs font-medium py-2 rounded-md transition-all ${!isLogin ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                Cadastrar
              </button>
            </div>
          )}

          {forgotMode && (
            <div className="mb-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-xs text-muted-foreground">Informe seu email cadastrado. Enviaremos um link para você redefinir sua senha.</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && !forgotMode && (
              <div>
                <Label className="text-xs text-muted-foreground">Nome</Label>
                <Input
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="Seu nome completo"
                  className="bg-secondary border-border/50 mt-1"
                  required={!isLogin}
                />
              </div>
            )}
            <div>
              <Label className="text-xs text-muted-foreground">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="bg-secondary border-border/50 mt-1"
                required
              />
            </div>
            {!forgotMode && (
              <div>
                <Label className="text-xs text-muted-foreground">Senha</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="bg-secondary border-border/50 mt-1 pr-10"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => setForgotMode(true)}
                    className="text-[10px] text-primary hover:underline mt-2"
                  >
                    Esqueci minha senha
                  </button>
                )}
              </div>
            )}

            {isLogin && !forgotMode && (
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="accent-primary" />
                Lembrar de mim
              </label>
            )}

            <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={submitting}>
              {submitting ? (
                <span className="flex items-center gap-2"><span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> Aguarde...</span>
              ) : (
                <span className="flex items-center gap-2"><Sparkles className="h-4 w-4" /> {forgotMode ? "Enviar email" : isLogin ? "Entrar" : "Criar conta"}</span>
              )}
            </Button>
            {forgotMode && (
              <button
                type="button"
                onClick={() => setForgotMode(false)}
                className="w-full text-[10px] text-muted-foreground hover:text-foreground mt-2"
              >
                ← Voltar ao login
              </button>
            )}
          </form>

          <p className="text-center text-[10px] text-muted-foreground mt-6">
            Sistema interno — acesso restrito a consultores autorizados
          </p>
        </div>
      </motion.div>
    </div>
  );
}
