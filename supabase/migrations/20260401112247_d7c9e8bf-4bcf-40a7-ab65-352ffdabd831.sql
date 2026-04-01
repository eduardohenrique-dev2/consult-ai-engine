
ALTER TABLE public.chamados ADD COLUMN IF NOT EXISTS observacoes TEXT;

CREATE POLICY "Public can delete chamados" ON public.chamados FOR DELETE TO anon USING (true);
CREATE POLICY "Public can update chamados" ON public.chamados FOR UPDATE TO anon USING (true);

ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS contato TEXT;

CREATE POLICY "Public can insert clientes" ON public.clientes FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Public can update clientes" ON public.clientes FOR UPDATE TO anon USING (true);
CREATE POLICY "Public can delete clientes" ON public.clientes FOR DELETE TO anon USING (true);
