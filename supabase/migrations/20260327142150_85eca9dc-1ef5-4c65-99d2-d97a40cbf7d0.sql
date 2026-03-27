
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL DEFAULT 'info',
  titulo text NOT NULL,
  mensagem text NOT NULL,
  lida boolean NOT NULL DEFAULT false,
  chamado_id uuid REFERENCES public.chamados(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view notifications" ON public.notifications FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert notifications" ON public.notifications FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update notifications" ON public.notifications FOR UPDATE TO public USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.chamados;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

CREATE OR REPLACE FUNCTION public.notify_new_chamado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.notifications (tipo, titulo, mensagem, chamado_id)
  VALUES (
    CASE WHEN NEW.prioridade IN ('alta', 'critica') THEN 'alerta' ELSE 'info' END,
    'Novo chamado: ' || NEW.titulo,
    'Tipo: ' || NEW.tipo || ' | Prioridade: ' || NEW.prioridade,
    NEW.id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_chamado
  AFTER INSERT ON public.chamados
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_chamado();

CREATE OR REPLACE FUNCTION public.notify_chamado_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.notifications (tipo, titulo, mensagem, chamado_id)
    VALUES (
      'info',
      'Chamado atualizado: ' || NEW.titulo,
      'Status: ' || OLD.status || ' → ' || NEW.status,
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_chamado_update
  AFTER UPDATE ON public.chamados
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_chamado_update();
