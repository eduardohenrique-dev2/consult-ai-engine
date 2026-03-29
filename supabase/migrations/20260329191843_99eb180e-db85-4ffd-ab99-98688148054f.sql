
CREATE TABLE public.chamado_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chamado_id UUID NOT NULL REFERENCES public.chamados(id) ON DELETE CASCADE,
  pergunta TEXT NOT NULL,
  resposta TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.chamado_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view interactions" ON public.chamado_interactions FOR SELECT TO anon USING (true);
CREATE POLICY "Public can insert interactions" ON public.chamado_interactions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Authenticated can view interactions" ON public.chamado_interactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert interactions" ON public.chamado_interactions FOR INSERT TO authenticated WITH CHECK (true);
