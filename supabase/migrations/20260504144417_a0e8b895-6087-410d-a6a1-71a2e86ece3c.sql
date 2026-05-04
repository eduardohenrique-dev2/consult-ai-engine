
-- System settings (single row)
CREATE TABLE IF NOT EXISTS public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auto_reply_enabled boolean NOT NULL DEFAULT false,
  confidence_threshold numeric NOT NULL DEFAULT 0.85,
  check_interval_minutes integer NOT NULL DEFAULT 5,
  signature text DEFAULT 'Resposta automática gerada pelo Assistente PM (revisada por IA)',
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view settings" ON public.system_settings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage settings" ON public.system_settings
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

INSERT INTO public.system_settings (auto_reply_enabled) VALUES (false);

-- Add columns to chamados
ALTER TABLE public.chamados
  ADD COLUMN IF NOT EXISTS thread_id text,
  ADD COLUMN IF NOT EXISTS confianca_ia numeric,
  ADD COLUMN IF NOT EXISTS resposta_enviada boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS categoria text;

CREATE INDEX IF NOT EXISTS idx_chamados_thread_id ON public.chamados(thread_id);

-- Add columns to imported_emails
ALTER TABLE public.imported_emails
  ADD COLUMN IF NOT EXISTS thread_id text,
  ADD COLUMN IF NOT EXISTS data_email timestamptz,
  ADD COLUMN IF NOT EXISTS processed_status text NOT NULL DEFAULT 'created';

CREATE INDEX IF NOT EXISTS idx_imported_emails_thread ON public.imported_emails(thread_id);

-- Email logs
CREATE TABLE IF NOT EXISTS public.email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chamado_id uuid,
  direction text NOT NULL, -- 'inbound' | 'outbound'
  status text NOT NULL,    -- 'enviado' | 'aguardando_revisao' | 'erro'
  destinatario text,
  assunto text,
  conteudo text,
  erro text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view email_logs" ON public.email_logs
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert email_logs" ON public.email_logs
  FOR INSERT TO authenticated WITH CHECK (true);

-- AI learning (corrections)
CREATE TABLE IF NOT EXISTS public.ai_learning (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chamado_id uuid,
  resposta_original text,
  resposta_corrigida text,
  corrigido_por uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_learning ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view ai_learning" ON public.ai_learning
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert ai_learning" ON public.ai_learning
  FOR INSERT TO authenticated WITH CHECK (true);
