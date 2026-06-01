import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { CheckCircle2, AlertCircle, XCircle } from "lucide-react";

type Resultado = "resolvido" | "parcial" | "nao_resolvido";

export function EndOfConversationCard({
  onSubmit,
  onDismiss,
}: {
  onSubmit: (p: { resultado: Resultado; funcionou?: string; faltou?: string }) => void;
  onDismiss: () => void;
}) {
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [funcionou, setFuncionou] = useState("");
  const [faltou, setFaltou] = useState("");

  return (
    <Card className="p-4 border-primary/30 bg-primary/5">
      <p className="text-sm font-medium mb-3">Seu problema foi resolvido?</p>
      <div className="flex gap-2 mb-3">
        <Button size="sm" variant={resultado === "resolvido" ? "default" : "outline"}
          onClick={() => setResultado("resolvido")} className="gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5" /> Resolvido
        </Button>
        <Button size="sm" variant={resultado === "parcial" ? "default" : "outline"}
          onClick={() => setResultado("parcial")} className="gap-1.5">
          <AlertCircle className="h-3.5 w-3.5" /> Parcial
        </Button>
        <Button size="sm" variant={resultado === "nao_resolvido" ? "default" : "outline"}
          onClick={() => setResultado("nao_resolvido")} className="gap-1.5">
          <XCircle className="h-3.5 w-3.5" /> Não resolvido
        </Button>
      </div>
      {resultado && (
        <div className="space-y-2 mb-3">
          <Textarea placeholder="O que funcionou?" value={funcionou} onChange={(e) => setFuncionou(e.target.value)} rows={2} className="text-xs" />
          <Textarea placeholder="O que faltou?" value={faltou} onChange={(e) => setFaltou(e.target.value)} rows={2} className="text-xs" />
        </div>
      )}
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="ghost" onClick={onDismiss}>Dispensar</Button>
        <Button size="sm" disabled={!resultado}
          onClick={() => resultado && onSubmit({ resultado, funcionou: funcionou || undefined, faltou: faltou || undefined })}>
          Enviar feedback
        </Button>
      </div>
    </Card>
  );
}
