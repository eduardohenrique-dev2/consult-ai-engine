import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function SnippetsManager() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState<{ title: string; body: string; shortcut: string; is_shared: boolean }>({ title: "", body: "", shortcut: "", is_shared: false });

  const { data: snippets = [] } = useQuery({
    queryKey: ["snippets"],
    queryFn: async () => (await supabase.from("response_snippets").select("*").order("updated_at", { ascending: false })).data || [],
  });

  const save = async () => {
    if (!editing.title || !editing.body) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("response_snippets").insert({
      user_id: u.user.id, title: editing.title, body: editing.body,
      shortcut: editing.shortcut || null, is_shared: editing.is_shared,
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    setEditing({ title: "", body: "", shortcut: "", is_shared: false });
    qc.invalidateQueries({ queryKey: ["snippets"] });
    toast({ title: "Snippet criado" });
  };

  const remove = async (id: string) => {
    await supabase.from("response_snippets").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["snippets"] });
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2"><Plus className="h-4 w-4" /> Novo snippet</h3>
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Título" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
          <Input placeholder="Atalho (ex: /saudacao)" value={editing.shortcut} onChange={(e) => setEditing({ ...editing, shortcut: e.target.value })} />
        </div>
        <Textarea placeholder="Texto do snippet" rows={4} value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch id="shared" checked={editing.is_shared} onCheckedChange={(v) => setEditing({ ...editing, is_shared: v })} />
            <Label htmlFor="shared" className="text-xs">Compartilhar com a equipe</Label>
          </div>
          <Button size="sm" onClick={save}>Salvar</Button>
        </div>
      </Card>

      <div className="space-y-2">
        {snippets.map((s: any) => (
          <Card key={s.id} className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="h-3.5 w-3.5 text-primary" />
                  <span className="text-sm font-medium">{s.title}</span>
                  {s.shortcut && <Badge variant="outline" className="text-[10px]">{s.shortcut}</Badge>}
                  {s.is_shared && <Badge className="text-[10px]">Equipe</Badge>}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{s.body}</p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => remove(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          </Card>
        ))}
        {snippets.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">Nenhum snippet cadastrado.</p>}
      </div>
    </div>
  );
}
