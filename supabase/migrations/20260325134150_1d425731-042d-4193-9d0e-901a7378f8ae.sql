
-- Enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'consultor');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'consultor',
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Profiles RLS
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- User roles RLS
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Auto-create profile and default role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)), NEW.email);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'consultor');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Clientes table
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cnpj TEXT,
  status TEXT NOT NULL DEFAULT 'OK' CHECK (status IN ('OK', 'ALERTA', 'CRITICO')),
  problemas TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view clientes" ON public.clientes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage clientes" ON public.clientes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Consultors can insert clientes" ON public.clientes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Consultors can update clientes" ON public.clientes FOR UPDATE TO authenticated USING (true);

-- Chamados table
CREATE TABLE public.chamados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('Folha', 'Ponto', 'Benefício', 'eSocial')),
  prioridade TEXT NOT NULL DEFAULT 'media' CHECK (prioridade IN ('baixa', 'media', 'alta', 'critica')),
  status TEXT NOT NULL DEFAULT 'Novo' CHECK (status IN ('Novo', 'Em análise', 'Execução', 'Validação', 'Finalizado')),
  cliente_id UUID REFERENCES public.clientes(id),
  responsavel_id UUID REFERENCES auth.users(id),
  sugestao_ia TEXT,
  query_sugerida TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.chamados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view chamados" ON public.chamados FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert chamados" ON public.chamados FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update chamados" ON public.chamados FOR UPDATE TO authenticated USING (true);

-- Chamados logs
CREATE TABLE public.chamados_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chamado_id UUID NOT NULL REFERENCES public.chamados(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  alterado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.chamados_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view logs" ON public.chamados_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert logs" ON public.chamados_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Base de conhecimento
CREATE TABLE public.base_conhecimento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('SQL', 'Procedimento', 'Erro', 'Documentação')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.base_conhecimento ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view conhecimento" ON public.base_conhecimento FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage conhecimento" ON public.base_conhecimento FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Consultors can insert conhecimento" ON public.base_conhecimento FOR INSERT TO authenticated WITH CHECK (true);

-- Automacoes table
CREATE TABLE public.automacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  fluxo JSONB NOT NULL DEFAULT '{}',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.automacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view automacoes" ON public.automacoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage automacoes" ON public.automacoes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_chamados_updated_at
  BEFORE UPDATE ON public.chamados
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed base_conhecimento with RM queries
INSERT INTO public.base_conhecimento (titulo, conteudo, tipo) VALUES
('Funcionários ativos', 'SELECT F.CHAPA, F.NOME FROM PFUNC F WHERE F.SITUACAO = ''A''', 'SQL'),
('Funcionário sem benefício', 'SELECT F.CHAPA FROM PFUNC F LEFT JOIN PBENEFICIO B ON B.CHAPA = F.CHAPA WHERE B.CHAPA IS NULL', 'SQL'),
('Divergência de benefício', 'SELECT * FROM PBENEFICIO WHERE VALOR <> VALOR_PADRAO', 'SQL'),
('Sem cálculo de folha', 'SELECT F.CHAPA FROM PFUNC F LEFT JOIN PFFINANC FIN ON FIN.CHAPA = F.CHAPA WHERE FIN.CHAPA IS NULL', 'SQL'),
('Procedimento: Recálculo de Folha', E'1. Acessar módulo Folha de Pagamento\n2. Selecionar período\n3. Marcar ''Recalcular todos''\n4. Verificar log de erros\n5. Conferir relatório sintético', 'Procedimento'),
('Erro: S-1200 Remuneração', E'O evento S-1200 pode falhar se:\n- CPF do funcionário inválido\n- Rubrica sem correspondência na tabela de naturezas\n- Período de apuração incorreto\n\nSolução: Verificar cadastro na PFUNC e tabela de rubricas PRUBRICAS', 'Erro'),
('Listar rubricas sem natureza', 'SELECT R.CODRUBRICA, R.DESCRICAO, R.NATUREZA FROM PRUBRICAS R WHERE R.NATUREZA IS NULL', 'SQL'),
('Funcionários em férias', 'SELECT F.CHAPA, F.NOME, FER.DTINICIO, FER.DTFIM FROM PFUNC F INNER JOIN PFERIAS FER ON FER.CHAPA = F.CHAPA WHERE FER.DTFIM >= CURRENT_DATE', 'SQL');

-- Seed clientes
INSERT INTO public.clientes (nome, cnpj, status, problemas) VALUES
('TechCorp S.A.', '12.345.678/0001-90', 'OK', '{}'),
('Indústria Nova Ltda', '98.765.432/0001-10', 'ALERTA', ARRAY['Divergência de benefícios detectada']),
('Grupo Horizonte', '11.222.333/0001-44', 'CRITICO', ARRAY['Falha no cálculo de folha', 'Funcionários sem benefício']),
('Construtora ABC', '55.666.777/0001-88', 'OK', '{}'),
('Logística Express', '33.444.555/0001-22', 'ALERTA', ARRAY['Atraso no envio eSocial']),
('Farmácia Popular', '77.888.999/0001-66', 'OK', '{}');

-- Seed automacoes
INSERT INTO public.automacoes (nome, fluxo, ativo) VALUES
('Erro de Folha → Chamado Automático', '{"trigger": "erro_folha", "actions": ["criar_chamado", "notificar", "executar_ia"]}', true),
('Benefício Divergente → Alerta', '{"trigger": "divergencia_beneficio", "actions": ["notificar", "criar_chamado"]}', true),
('eSocial Falha → Reprocessar', '{"trigger": "esocial_erro", "actions": ["reprocessar", "notificar"]}', false),
('SLA Excedido → Escalar', '{"trigger": "sla_excedido", "actions": ["escalar_chamado", "notificar_admin"]}', true);
