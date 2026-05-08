import { useEffect, useState } from "react";
import { Bot, Save, Loader2, ShieldAlert, Mail, ScanText, Sparkles } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const ALL_CATEGORIES = ["Geral", "Folha", "eSocial", "Financeiro", "Ponto", "Beneficios"];

export default function AutomationSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [importEnabled, setImportEnabled] = useState(true);
  const [ocrEnabled, setOcrEnabled] = useState(true);
  const [iaClassifyEnabled, setIaClassifyEnabled] = useState(true);
  const { toast } = useToast();
  const { role } = useAuth();
  const isAdmin = role === "admin";

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("system_settings").select("*").limit(1).maybeSingle();
      setSettings(data);
      // local storage para flags simples (até virarem colunas)
      setImportEnabled(localStorage.getItem("pm_import_enabled") !== "false");
      setOcrEnabled(localStorage.getItem("pm_ocr_enabled") !== "false");
      setIaClassifyEnabled(localStorage.getItem("pm_ia_classify_enabled") !== "false");
      setLoading(false);
    })();
  }, []);

  const toggleCategory = (cat: string) => {
    if (!isAdmin) return;
    setSettings((s: any) => {
      const list: string[] = s.categorias_permitidas_auto || [];
      const next = list.includes(cat) ? list.filter(c => c !== cat) : [...list, cat];
      return { ...s, categorias_permitidas_auto: next };
    });
  };

  const save = async () => {
    if (!settings || !isAdmin) return;
    setSaving(true);
    const { error } = await supabase.from("system_settings").update({
      auto_reply_enabled: settings.auto_reply_enabled,
      confidence_threshold: Number(settings.confidence_threshold),
      check_interval_minutes: Number(settings.check_interval_minutes),
      signature: settings.signature,
      categorias_permitidas_auto: settings.categorias_permitidas_auto,
      valor_limite: Number(settings.valor_limite),
      bloquear_rescisoes: settings.bloquear_rescisoes,
      bloquear_valores_altos: settings.bloquear_valores_altos,
      updated_at: new Date().toISOString(),
    }).eq("id", settings.id);

    localStorage.setItem("pm_import_enabled", String(importEnabled));
    localStorage.setItem("pm_ocr_enabled", String(ocrEnabled));
    localStorage.setItem("pm_ia_classify_enabled", String(iaClassifyEnabled));

    setSaving(false);
    if (error) toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    else toast({ title: "✅ Configurações salvas" });
  };

  if (loading) return <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Carregando...</div>;
  if (!settings) return <p className="text-xs text-muted-foreground">Configurações indisponíveis.</p>;

  const fieldDisabled = !isAdmin;

  return (
    <div className="space-y-5">
      {!isAdmin && (
        <div className="rounded-lg bg-warning/5 border border-warning/30 p-2.5 text-[10px] text-warning">
          🔒 Apenas administradores podem alterar essas configurações.
        </div>
      )}

      {/* Auto reply */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/20">
        <div className="flex-1">
          <p className="text-xs font-medium flex items-center gap-1.5"><Bot className="h-3.5 w-3.5 text-neon-purple" /> Automação de resposta IA</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {settings.auto_reply_enabled ? "🔴 MODO AUTOMÁTICO — IA responde sem revisão" : "🟡 MODO ASSISTIDO — consultor revisa"}
          </p>
        </div>
        <Switch disabled={fieldDisabled} checked={settings.auto_reply_enabled}
          onCheckedChange={v => setSettings((s: any) => ({ ...s, auto_reply_enabled: v }))} />
      </div>

      {/* Threshold */}
      <div>
        <Label className="text-xs">Limiar de confiança ({Math.round(settings.confidence_threshold * 100)}%)</Label>
        <Input type="number" min="0" max="1" step="0.05" disabled={fieldDisabled}
          value={settings.confidence_threshold}
          onChange={e => setSettings((s: any) => ({ ...s, confidence_threshold: e.target.value }))}
          className="bg-secondary border-border/50 mt-1" />
      </div>

      {/* Categorias */}
      <div>
        <Label className="text-xs">Categorias permitidas para envio automático</Label>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {ALL_CATEGORIES.map(cat => {
            const on = (settings.categorias_permitidas_auto || []).includes(cat);
            return (
              <button key={cat} type="button" disabled={fieldDisabled} onClick={() => toggleCategory(cat)}
                className={`px-2.5 py-1 rounded-full text-[10px] border transition-all ${
                  on ? "bg-primary/15 text-primary border-primary/40" : "bg-secondary/40 text-muted-foreground border-border/30"
                } ${fieldDisabled ? "opacity-60 cursor-not-allowed" : "hover:border-primary/40"}`}>
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bloqueios de risco */}
      <div className="space-y-2.5 p-3 rounded-lg bg-critical/5 border border-critical/20">
        <p className="text-xs font-semibold flex items-center gap-1.5 text-critical"><ShieldAlert className="h-3.5 w-3.5" /> Proteções de risco</p>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px]">Bloquear rescisões</p>
            <p className="text-[9px] text-muted-foreground">Nunca enviar resposta automática para rescisões.</p>
          </div>
          <Switch disabled={fieldDisabled} checked={settings.bloquear_rescisoes}
            onCheckedChange={v => setSettings((s: any) => ({ ...s, bloquear_rescisoes: v }))} />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px]">Bloquear valores altos</p>
            <p className="text-[9px] text-muted-foreground">Bloqueia auto-resposta acima do valor limite.</p>
          </div>
          <Switch disabled={fieldDisabled} checked={settings.bloquear_valores_altos}
            onCheckedChange={v => setSettings((s: any) => ({ ...s, bloquear_valores_altos: v }))} />
        </div>

        <div>
          <Label className="text-[10px]">Valor limite (R$)</Label>
          <Input type="number" min="0" step="100" disabled={fieldDisabled}
            value={settings.valor_limite}
            onChange={e => setSettings((s: any) => ({ ...s, valor_limite: e.target.value }))}
            className="bg-secondary border-border/50 mt-1 h-8 text-xs" />
        </div>
      </div>

      {/* Integrações */}
      <div className="space-y-2.5 p-3 rounded-lg bg-secondary/20 border border-border/30">
        <p className="text-xs font-semibold flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-primary" /> Integrações</p>

        <div className="flex items-center justify-between">
          <p className="text-[11px] flex items-center gap-1.5"><Mail className="h-3 w-3" /> Importação de e-mail
            {importEnabled ? <Badge className="text-[8px] bg-success/15 text-success border-success/30 ml-1">Ativo</Badge> : <Badge variant="outline" className="text-[8px] ml-1">Pausado</Badge>}
          </p>
          <Switch disabled={fieldDisabled} checked={importEnabled} onCheckedChange={setImportEnabled} />
        </div>

        <div className="flex items-center justify-between">
          <p className="text-[11px] flex items-center gap-1.5"><ScanText className="h-3 w-3" /> OCR em anexos</p>
          <Switch disabled={fieldDisabled} checked={ocrEnabled} onCheckedChange={setOcrEnabled} />
        </div>

        <div className="flex items-center justify-between">
          <p className="text-[11px] flex items-center gap-1.5"><Bot className="h-3 w-3" /> Classificação automática IA</p>
          <Switch disabled={fieldDisabled} checked={iaClassifyEnabled} onCheckedChange={setIaClassifyEnabled} />
        </div>
      </div>

      {/* Assinatura */}
      <div>
        <Label className="text-xs">Assinatura nas respostas</Label>
        <Textarea disabled={fieldDisabled} value={settings.signature || ""}
          onChange={e => setSettings((s: any) => ({ ...s, signature: e.target.value }))}
          className="bg-secondary border-border/50 mt-1 text-xs" />
      </div>

      <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
        <p className="text-[10px] text-primary">⏱️ Verificação automática de emails: a cada {settings.check_interval_minutes} minutos</p>
      </div>

      <Button onClick={save} disabled={saving || fieldDisabled} className="gap-2">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar configurações
      </Button>
    </div>
  );
}
