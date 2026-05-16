
-- =========================================================
-- FASE 1: Multiusuário + integrações de email individuais
-- =========================================================

-- 1) Coluna setor em profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS setor text,
  ADD COLUMN IF NOT EXISTS cargo text,
  ADD COLUMN IF NOT EXISTS assinatura text;

-- 2) user_integrations
CREATE TABLE IF NOT EXISTS public.user_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider text NOT NULL CHECK (provider IN ('gmail','outlook','imap','smtp')),
  email_address text NOT NULL,
  display_name text,
  oauth_access_token text,
  oauth_refresh_token text,
  oauth_expires_at timestamptz,
  oauth_scope text,
  imap_host text,
  imap_port int,
  imap_user text,
  imap_password_encrypted text,
  smtp_host text,
  smtp_port int,
  smtp_user text,
  smtp_password_encrypted text,
  status text NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa','erro','expirada','desconectada')),
  last_sync_at timestamptz,
  last_error text,
  sync_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider, email_address)
);

ALTER TABLE public.user_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own integrations"
  ON public.user_integrations FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users insert own integrations"
  ON public.user_integrations FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own integrations"
  ON public.user_integrations FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users delete own integrations"
  ON public.user_integrations FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER set_user_integrations_updated_at
  BEFORE UPDATE ON public.user_integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_user_integrations_user ON public.user_integrations(user_id);

-- 3) user_settings (preferências individuais)
CREATE TABLE IF NOT EXISTS public.user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  assinatura text,
  auto_reply_enabled boolean NOT NULL DEFAULT false,
  confidence_threshold numeric NOT NULL DEFAULT 0.85,
  notificacoes_email boolean NOT NULL DEFAULT true,
  notificacoes_push boolean NOT NULL DEFAULT true,
  tema text NOT NULL DEFAULT 'system',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own settings"
  ON public.user_settings FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER set_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) access_logs
CREATE TABLE IF NOT EXISTS public.access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  ip_address text,
  user_agent text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own access logs"
  ON public.access_logs FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated insert access logs"
  ON public.access_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_access_logs_user ON public.access_logs(user_id, created_at DESC);

-- 5) chamados: dono e integração
ALTER TABLE public.chamados
  ADD COLUMN IF NOT EXISTS owner_user_id uuid,
  ADD COLUMN IF NOT EXISTS integration_id uuid REFERENCES public.user_integrations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS setor text;

CREATE INDEX IF NOT EXISTS idx_chamados_owner ON public.chamados(owner_user_id);

-- Helper: setor do usuário
CREATE OR REPLACE FUNCTION public.user_setor(_user_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT setor FROM public.profiles WHERE user_id = _user_id LIMIT 1 $$;

-- Substituir policy de SELECT em chamados (manter as outras)
DROP POLICY IF EXISTS "Authenticated can view chamados" ON public.chamados;
CREATE POLICY "Scoped view chamados"
  ON public.chamados FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR owner_user_id = auth.uid()
    OR (
      public.has_role(auth.uid(), 'supervisor')
      AND setor IS NOT NULL
      AND setor = public.user_setor(auth.uid())
    )
    OR (owner_user_id IS NULL AND public.has_role(auth.uid(), 'admin'))
  );

-- 6) imported_emails: integração
ALTER TABLE public.imported_emails
  ADD COLUMN IF NOT EXISTS integration_id uuid REFERENCES public.user_integrations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS owner_user_id uuid;

CREATE INDEX IF NOT EXISTS idx_imported_emails_integration ON public.imported_emails(integration_id);

-- 7) Trigger: criar user_settings + profile já existe via handle_new_user; aumentar
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)), NEW.email)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'consultor')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- 8) Backfill: user_settings para usuários existentes
INSERT INTO public.user_settings (user_id)
SELECT user_id FROM public.profiles
ON CONFLICT DO NOTHING;
