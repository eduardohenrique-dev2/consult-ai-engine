
-- ============ Email Import Logs ============
CREATE TABLE public.email_import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_importacao TIMESTAMPTZ NOT NULL DEFAULT now(),
  usuario_id UUID,
  total_processados INT NOT NULL DEFAULT 0,
  total_importados INT NOT NULL DEFAULT 0,
  total_duplicados INT NOT NULL DEFAULT 0,
  total_erros INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'sucesso',
  classificacao_padrao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_email_import_logs_data ON public.email_import_logs(data_importacao DESC);
CREATE INDEX idx_email_import_logs_usuario ON public.email_import_logs(usuario_id);

ALTER TABLE public.email_import_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth view import logs" ON public.email_import_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert import logs" ON public.email_import_logs FOR INSERT TO authenticated WITH CHECK (true);

CREATE TABLE public.email_import_log_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id UUID NOT NULL REFERENCES public.email_import_logs(id) ON DELETE CASCADE,
  email_id TEXT NOT NULL,
  assunto TEXT,
  remetente TEXT,
  status TEXT NOT NULL,
  chamado_id UUID,
  mensagem_erro TEXT,
  anexos_processados INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_email_import_log_itens_log ON public.email_import_log_itens(log_id);

ALTER TABLE public.email_import_log_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth view import log itens" ON public.email_import_log_itens FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert import log itens" ON public.email_import_log_itens FOR INSERT TO authenticated WITH CHECK (true);

-- ============ Chamado Anexos ============
CREATE TABLE public.chamado_anexos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chamado_id UUID NOT NULL,
  nome_arquivo TEXT NOT NULL,
  url TEXT NOT NULL,
  storage_path TEXT,
  tipo TEXT NOT NULL DEFAULT 'outro',
  tamanho_bytes BIGINT,
  texto_extraido TEXT,
  origem TEXT NOT NULL DEFAULT 'email',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_chamado_anexos_chamado ON public.chamado_anexos(chamado_id);

ALTER TABLE public.chamado_anexos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth view anexos" ON public.chamado_anexos FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert anexos" ON public.chamado_anexos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth delete anexos" ON public.chamado_anexos FOR DELETE TO authenticated USING (true);

-- ============ Chamados extra fields ============
ALTER TABLE public.chamados
  ADD COLUMN IF NOT EXISTS nivel_risco TEXT DEFAULT 'baixo',
  ADD COLUMN IF NOT EXISTS motivo_bloqueio_auto TEXT;

-- ============ System settings extras ============
ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS categorias_permitidas_auto TEXT[] NOT NULL DEFAULT ARRAY['Geral','Folha','Ponto','Beneficios'],
  ADD COLUMN IF NOT EXISTS bloquear_valores_altos BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS bloquear_rescisoes BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS valor_limite NUMERIC NOT NULL DEFAULT 10000;

-- ============ Storage bucket ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('chamado-anexos', 'chamado-anexos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "auth read chamado anexos" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'chamado-anexos');
CREATE POLICY "auth upload chamado anexos" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'chamado-anexos');
CREATE POLICY "public read chamado anexos" ON storage.objects
  FOR SELECT TO anon USING (bucket_id = 'chamado-anexos');
