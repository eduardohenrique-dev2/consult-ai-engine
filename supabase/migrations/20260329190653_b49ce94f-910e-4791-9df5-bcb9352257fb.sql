
-- Allow public (anon) to read chamados, clientes, notifications
CREATE POLICY "Public can view chamados" ON public.chamados FOR SELECT TO anon USING (true);
CREATE POLICY "Public can insert chamados" ON public.chamados FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Public can view clientes" ON public.clientes FOR SELECT TO anon USING (true);
CREATE POLICY "Public can view notifications" ON public.notifications FOR SELECT TO anon USING (true);
CREATE POLICY "Public can update notifications" ON public.notifications FOR UPDATE TO anon USING (true);
