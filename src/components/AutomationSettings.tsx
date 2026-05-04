import { useEffect, useState } from "react";
import { Bot, Save, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function AutomationSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("system_settings").select("*").limit(1).maybeSingle();
      setSettings(data);
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    const { error } = await supabase.from("system_settings").update({
      auto_reply_enabled: settings.auto_reply_enabled,
      confidence_threshold: Number(settings.confidence_threshold),
      check_interval_minutes: Number(settings.check_interval_minutes),
      signature: settings.signature,
      updated_at: new Date().toISOString(),
    }).eq("id", settings.id);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✅ Configurações salvas" });
    }
  };

  if (loading) return <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Carregando...</div>;
  if (!settings) return <p className="text-xs text-muted-foreground">Configurações indisponíveis.</p>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/20">
        <div className="flex-1">
          <p className="text-xs font-medium flex items-center gap-1.5"><Bot className="h-3.5 w-3.5 text-neon-purple" /> Automação de resposta IA</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {settings.auto_reply_enabled ? "🔴 MODO AUTOMÁTICO — IA responde sem revisão" : "🟡 MODO ASSISTIDO — IA gera sugestão, consultor revisa"}
          </p>
        </div>
        <Switch
          checked={settings.auto_reply_enabled}
          onCheckedChange={v => setSettings((s: any) => ({ ...s, auto_reply_enabled: v }))}
        />
      </div>

      <div>
        <Label className="text-xs">Limiar de confiança para envio automático ({Math.round(settings.confidence_threshold * 100)}%)</Label>
        <Input
          type="number" min="0" max="1" step="0.05"
          value={settings.confidence_threshold}
          onChange={e => setSettings((s: any) => ({ ...s, confidence_threshold: e.target.value }))}
          className="bg-secondary border-border/50 mt-1"
        />
        <p className="text-[10px] text-muted-foreground mt-1">Abaixo deste valor, a IA cai em modo assistido por segurança.</p>
      </div>

      <div>
        <Label className="text-xs">Assinatura nas respostas</Label>
        <Textarea
          value={settings.signature || ""}
          onChange={e => setSettings((s: any) => ({ ...s, signature: e.target.value }))}
          className="bg-secondary border-border/50 mt-1 text-xs"
        />
      </div>

      <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
        <p className="text-[10px] text-primary">⏱️ Verificação automática de emails: a cada 5 minutos</p>
      </div>

      <Button onClick={save} disabled={saving} className="gap-2">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar
      </Button>
    </div>
  );
}
