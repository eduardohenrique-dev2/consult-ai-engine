
DROP POLICY IF EXISTS "Scoped view chamados" ON public.chamados;
CREATE POLICY "Scoped view chamados"
  ON public.chamados FOR SELECT TO authenticated
  USING (
    owner_user_id IS NULL
    OR public.has_role(auth.uid(), 'admin')
    OR owner_user_id = auth.uid()
    OR (
      public.has_role(auth.uid(), 'supervisor')
      AND setor IS NOT NULL
      AND setor = public.user_setor(auth.uid())
    )
  );
