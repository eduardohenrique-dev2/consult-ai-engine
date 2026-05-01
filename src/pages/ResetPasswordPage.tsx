import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, KeyRound, CheckCircle2 } from "lucide-react";
import logoPm from "@/assets/logo-pm.png";
import { useToast } from "@/hooks/use-toast";

export default function ResetPasswordPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [validSession, setValidSession] = useState<boolean | null>(null);
  const [done, setDone] = useState(false);

  // Detect recovery session: Supabase puts a `type=recovery` token in the URL hash
  useEffect(() => {
    const hash = window.location.hash;
    const isRecovery = hash.includes("type=recovery") || hash.includes("access_token");

    // Listen for PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setValidSession(true);
    });

    // Also check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && isRecovery) setValidSession(true);
      else if (!isRecovery) setValidSession(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Senha muito curta", description: "Use pelo menos 6 caracteres", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "Senhas não conferem", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    setDone(true);
    await supabase.auth.signOut();
    setTimeout(() => navigate("/login", { replace: true }), 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
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
          <div className="flex flex-col items-center mb-6">
            <img src={logoPm} alt="PM Consultoria" className="h-14 w-14 rounded-xl object-cover mb-3" />
            <h1 className="text-lg font-bold gold-gradient">Redefinir Senha</h1>
            <p className="text-xs text-muted-foreground mt-1">Defina sua nova senha de acesso</p>
          </div>

          {validSession === false && !done && (
            <div className="text-center py-6 space-y-3">
              <p className="text-xs text-muted-foreground">
                Link inválido ou expirado. Solicite um novo email de recuperação.
              </p>
              <Button onClick={() => navigate("/login")} className="w-full" size="sm">Voltar ao login</Button>
            </div>
          )}

          {validSession !== false && !done && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Nova senha</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Confirmar senha</Label>
                <Input
                  type={showPassword ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="bg-secondary border-border/50 mt-1"
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 gap-2" disabled={submitting}>
                {submitting ? (
                  <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <KeyRound className="h-4 w-4" />
                )}
                Redefinir senha
              </Button>
            </form>
          )}

          {done && (
            <div className="text-center py-6 space-y-3">
              <CheckCircle2 className="h-10 w-10 text-success mx-auto" />
              <p className="text-sm font-medium">Senha redefinida com sucesso!</p>
              <p className="text-xs text-muted-foreground">Redirecionando para o login...</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
