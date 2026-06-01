
-- =========================
-- 1. pgvector
-- =========================
CREATE EXTENSION IF NOT EXISTS vector;

-- =========================
-- 2. Role supervisor
-- =========================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'supervisor'
                  AND enumtypid = 'public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'supervisor';
  END IF;
END$$;

-- =========================
-- 3. response_snippets
-- =========================
CREATE TABLE IF NOT EXISTS public.response_snippets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  shortcut TEXT,
  body TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  is_shared BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.response_snippets TO authenticated;
GRANT ALL ON public.response_snippets TO service_role;

ALTER TABLE public.response_snippets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view own or shared snippets" ON public.response_snippets
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_shared = true OR has_role(auth.uid(), 'admin'));

CREATE POLICY "insert own snippets" ON public.response_snippets
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "update own snippets" ON public.response_snippets
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "delete own snippets" ON public.response_snippets
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_snippets_updated
  BEFORE UPDATE ON public.response_snippets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- 4. chamado_time_entries
-- =========================
CREATE TABLE IF NOT EXISTS public.chamado_time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chamado_id UUID NOT NULL,
  user_id UUID NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_time_entries_chamado ON public.chamado_time_entries(chamado_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user ON public.chamado_time_entries(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chamado_time_entries TO authenticated;
GRANT ALL ON public.chamado_time_entries TO service_role;

ALTER TABLE public.chamado_time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view time entries scoped" ON public.chamado_time_entries
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'supervisor')
  );

CREATE POLICY "insert own time entry" ON public.chamado_time_entries
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "update own time entry" ON public.chamado_time_entries
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "delete own time entry" ON public.chamado_time_entries
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

-- =========================
-- 5. base_conhecimento_chunks (RAG)
-- =========================
CREATE TABLE IF NOT EXISTS public.base_conhecimento_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conhecimento_id UUID NOT NULL REFERENCES public.base_conhecimento(id) ON DELETE CASCADE,
  chunk TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chunks_conhecimento ON public.base_conhecimento_chunks(conhecimento_id);
CREATE INDEX IF NOT EXISTS idx_chunks_embedding
  ON public.base_conhecimento_chunks
  USING hnsw (embedding vector_cosine_ops);

GRANT SELECT ON public.base_conhecimento_chunks TO authenticated;
GRANT ALL ON public.base_conhecimento_chunks TO service_role;

ALTER TABLE public.base_conhecimento_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated view chunks" ON public.base_conhecimento_chunks
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin manage chunks" ON public.base_conhecimento_chunks
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- =========================
-- 6. knowledge_entries (aprendizado validado)
-- =========================
CREATE TABLE IF NOT EXISTS public.knowledge_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problema TEXT NOT NULL,
  contexto TEXT,
  solucao TEXT NOT NULL,
  resultado TEXT,
  validacao TEXT NOT NULL DEFAULT 'pendente' CHECK (validacao IN ('pendente','validada','rejeitada')),
  fonte TEXT,
  confianca TEXT NOT NULL DEFAULT 'medio' CHECK (confianca IN ('alto','medio','baixo')),
  chamado_origem_id UUID,
  proposed_by UUID,
  validated_by UUID,
  validated_at TIMESTAMPTZ,
  embedding vector(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ke_validacao ON public.knowledge_entries(validacao);
CREATE INDEX IF NOT EXISTS idx_ke_embedding
  ON public.knowledge_entries USING hnsw (embedding vector_cosine_ops);

GRANT SELECT, INSERT, UPDATE ON public.knowledge_entries TO authenticated;
GRANT ALL ON public.knowledge_entries TO service_role;

ALTER TABLE public.knowledge_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated view knowledge" ON public.knowledge_entries
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated propose knowledge" ON public.knowledge_entries
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "admin validate knowledge" ON public.knowledge_entries
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_ke_updated
  BEFORE UPDATE ON public.knowledge_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- 7. knowledge_gaps
-- =========================
CREATE TABLE IF NOT EXISTS public.knowledge_gaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pergunta TEXT NOT NULL,
  motivo TEXT,
  sugestao TEXT,
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','em_analise','resolvido','descartado')),
  origem TEXT,
  chamado_id UUID,
  conversation_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.knowledge_gaps TO authenticated;
GRANT ALL ON public.knowledge_gaps TO service_role;

ALTER TABLE public.knowledge_gaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated view gaps" ON public.knowledge_gaps
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated insert gaps" ON public.knowledge_gaps
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "admin update gaps" ON public.knowledge_gaps
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_gaps_updated
  BEFORE UPDATE ON public.knowledge_gaps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- 8. conversation_feedback
-- =========================
CREATE TABLE IF NOT EXISTS public.conversation_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID,
  chamado_id UUID,
  user_id UUID NOT NULL,
  resultado TEXT NOT NULL CHECK (resultado IN ('resolvido','parcial','nao_resolvido')),
  funcionou TEXT,
  faltou TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.conversation_feedback TO authenticated;
GRANT ALL ON public.conversation_feedback TO service_role;

ALTER TABLE public.conversation_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view own feedback or admin" ON public.conversation_feedback
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'supervisor'));

CREATE POLICY "insert own feedback" ON public.conversation_feedback
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- =========================
-- 9. ai_runtime_state (singleton)
-- =========================
CREATE TABLE IF NOT EXISTS public.ai_runtime_state (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  mode TEXT NOT NULL DEFAULT 'online' CHECK (mode IN ('online','offline','degraded')),
  reason TEXT,
  since TIMESTAMPTZ NOT NULL DEFAULT now(),
  credits_status TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.ai_runtime_state (id, mode, reason) VALUES (1, 'online', null)
ON CONFLICT (id) DO NOTHING;

GRANT SELECT ON public.ai_runtime_state TO authenticated;
GRANT ALL ON public.ai_runtime_state TO service_role;

ALTER TABLE public.ai_runtime_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated view ai state" ON public.ai_runtime_state
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin update ai state" ON public.ai_runtime_state
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- =========================
-- 10. audit_logs
-- =========================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON public.audit_logs(action);

GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin view audit" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "authenticated insert audit" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- =========================
-- 11. Funções RAG
-- =========================
CREATE OR REPLACE FUNCTION public.match_conhecimento(
  query_embedding vector(1536),
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  conhecimento_id UUID,
  chunk TEXT,
  similarity FLOAT,
  metadata JSONB
)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT
    c.id,
    c.conhecimento_id,
    c.chunk,
    1 - (c.embedding <=> query_embedding) AS similarity,
    c.metadata
  FROM public.base_conhecimento_chunks c
  WHERE c.embedding IS NOT NULL
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;

CREATE OR REPLACE FUNCTION public.match_knowledge_entries(
  query_embedding vector(1536),
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  problema TEXT,
  solucao TEXT,
  contexto TEXT,
  confianca TEXT,
  similarity FLOAT
)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT
    k.id, k.problema, k.solucao, k.contexto, k.confianca,
    1 - (k.embedding <=> query_embedding) AS similarity
  FROM public.knowledge_entries k
  WHERE k.validacao = 'validada' AND k.embedding IS NOT NULL
  ORDER BY k.embedding <=> query_embedding
  LIMIT match_count;
$$;
