
-- Create reunioes table
CREATE TABLE public.reunioes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT,
  data_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
  data_fim TIMESTAMP WITH TIME ZONE NOT NULL,
  cor TEXT NOT NULL DEFAULT '#6366f1',
  status TEXT NOT NULL DEFAULT 'agendada',
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  chamado_id UUID REFERENCES public.chamados(id) ON DELETE SET NULL,
  participantes TEXT[] DEFAULT '{}',
  notas TEXT,
  resumo_ia TEXT,
  pauta_ia TEXT,
  proximos_passos_ia TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reunioes ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated can view reunioes" ON public.reunioes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert reunioes" ON public.reunioes
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update reunioes" ON public.reunioes
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Admins can delete reunioes" ON public.reunioes
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_reunioes_updated_at
  BEFORE UPDATE ON public.reunioes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.reunioes;
