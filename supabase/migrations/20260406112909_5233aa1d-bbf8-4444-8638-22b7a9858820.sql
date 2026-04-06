
-- Drop all anon policies on chamados
DROP POLICY IF EXISTS "Public can delete chamados" ON public.chamados;
DROP POLICY IF EXISTS "Public can insert chamados" ON public.chamados;
DROP POLICY IF EXISTS "Public can update chamados" ON public.chamados;
DROP POLICY IF EXISTS "Public can view chamados" ON public.chamados;

-- Drop all anon policies on clientes
DROP POLICY IF EXISTS "Public can delete clientes" ON public.clientes;
DROP POLICY IF EXISTS "Public can insert clientes" ON public.clientes;
DROP POLICY IF EXISTS "Public can update clientes" ON public.clientes;
DROP POLICY IF EXISTS "Public can view clientes" ON public.clientes;

-- Drop anon policies on chamado_interactions
DROP POLICY IF EXISTS "Public can insert interactions" ON public.chamado_interactions;
DROP POLICY IF EXISTS "Public can view interactions" ON public.chamado_interactions;

-- Tighten authenticated policies on chamados: delete only for admins
CREATE POLICY "Admins can delete chamados" ON public.chamados
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Tighten notifications: drop overly permissive anon policies, add authenticated
DROP POLICY IF EXISTS "Public can update notifications" ON public.notifications;
DROP POLICY IF EXISTS "Public can view notifications" ON public.notifications;

CREATE POLICY "Authenticated can view notifications" ON public.notifications
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can update notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (true);
