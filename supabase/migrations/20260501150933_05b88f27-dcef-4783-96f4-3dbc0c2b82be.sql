
ALTER TABLE public.base_conhecimento
  ADD COLUMN IF NOT EXISTS categoria text NOT NULL DEFAULT 'Geral';

ALTER TABLE public.chamados
  ADD COLUMN IF NOT EXISTS eh_esocial boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS evento_esocial text;

CREATE INDEX IF NOT EXISTS idx_base_conhecimento_categoria ON public.base_conhecimento(categoria);
CREATE INDEX IF NOT EXISTS idx_chamados_eh_esocial ON public.chamados(eh_esocial) WHERE eh_esocial = true;
CREATE INDEX IF NOT EXISTS idx_chamados_prioridade ON public.chamados(prioridade);
