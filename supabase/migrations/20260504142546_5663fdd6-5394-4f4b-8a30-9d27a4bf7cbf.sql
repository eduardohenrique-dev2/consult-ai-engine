CREATE TABLE public.imported_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gmail_message_id text NOT NULL UNIQUE,
  chamado_id uuid REFERENCES public.chamados(id) ON DELETE SET NULL,
  assunto text,
  remetente text,
  imported_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_imported_emails_gmail_id ON public.imported_emails(gmail_message_id);

ALTER TABLE public.imported_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view imported_emails"
  ON public.imported_emails FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated can insert imported_emails"
  ON public.imported_emails FOR INSERT
  TO authenticated WITH CHECK (true);