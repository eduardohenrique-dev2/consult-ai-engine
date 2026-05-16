# Plano: Multiusuário com Email Individual por Usuário

Transformação grande, faseada em 4 etapas incrementais. Nada será removido — só ampliado.

## Visão geral

Hoje o sistema usa **1 conexão Gmail global** (connector Lovable) e **chamados compartilhados**. Vamos passar para:
- cada usuário conecta **seu próprio Gmail/Outlook/IMAP**
- chamados ficam **vinculados ao usuário dono da integração**
- RBAC controla quem vê o quê (consultor → seus, supervisor → equipe, admin → tudo)
- sessão persistente já existe via Supabase Auth (refresh token automático) — só ajustamos UX ("Lembrar de mim")

## Fase 1 — Banco de dados (migração base)

Novas tabelas:

- `user_integrations` — uma linha por integração conectada
  - `user_id`, `provider` (gmail/outlook/imap/smtp), `email_address`, `display_name`
  - `oauth_access_token`, `oauth_refresh_token`, `oauth_expires_at` (criptografados via pgsodium/vault)
  - `imap_host`, `imap_port`, `imap_user`, `imap_password_encrypted`, `smtp_*`
  - `status` (ativa/erro/expirada), `last_sync_at`, `sync_enabled`
- `user_settings` — preferências por usuário (assinatura, auto-reply individual, threshold)
- `user_sectors` — setor/cargo opcional (para "supervisor vê equipe")
- `access_logs` — auditoria de login (IP, user agent, timestamp)

Alterações:

- `chamados`: adicionar `owner_user_id` (NULL = legado/global), `integration_id`, `setor`
- `imported_emails`: adicionar `integration_id`
- `email_import_logs`: já tem `usuario_id` — passa a ser obrigatório

RLS atualizado:

- `chamados` SELECT: `owner_user_id = auth.uid()` OR `has_role(admin)` OR (`has_role(supervisor)` AND mesmo setor)
- `user_integrations`: só o dono vê/edita; admin pode listar
- chamados legados (`owner_user_id IS NULL`) ficam visíveis para admin apenas, com botão de redistribuir

## Fase 2 — Integração Gmail por usuário (OAuth próprio)

O connector Lovable Gmail é **uma conta só** — não serve para multiusuário. Caminho correto: **OAuth Google nativo no app**.

- O admin precisa criar credenciais OAuth no Google Cloud Console (Client ID + Secret) — pediremos via `add_secret` (`GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`).
- Edge function `gmail-oauth-start` → gera URL de consent com scopes `gmail.readonly`, `gmail.send`, `gmail.modify`, redirect para `/integrations/callback`.
- Edge function `gmail-oauth-callback` → troca code por tokens, salva criptografado em `user_integrations`.
- Edge function `refresh-gmail-token` → renovação automática quando expira.
- Refatorar `import-emails`: receber `integration_id`, usar token daquele usuário, criar chamados com `owner_user_id`.
- Connector global atual continua funcionando como fallback admin (não removemos para não quebrar).

Outlook/IMAP/SMTP: deixar **stub de UI + tabela preparada**, implementação real fica para fase posterior (escopo enorme).

## Fase 3 — RBAC + UI multiusuário

- Página **/perfil** — dados pessoais, foto, assinatura, troca de senha, lista de integrações conectadas, histórico de login
- Página **/integracoes** — "Conectar Gmail", "Conectar Outlook (em breve)", "IMAP customizado (em breve)", status de sync, botão desconectar
- **AdminPage** expandida — criar/remover usuários, atribuir role+setor, ver integrações de cada um, redistribuir chamados legados
- **Sidebar dinâmica** — Admin só aparece para admin (já é assim), adicionar Perfil + Integrações
- **Chamados** — filtro automático por `owner_user_id`, com toggle "Ver da equipe" (supervisor) e "Ver todos" (admin)
- **Dashboard** — métricas escopadas ao usuário; admin tem switch global

## Fase 4 — Sessão e segurança

- `signIn` ganha opção "Lembrar de mim" → controla `persistSession` (Supabase já persiste por padrão; quando desmarcado, usar `sessionStorage`)
- Refresh token já é automático no SDK Supabase — confirmar
- Trigger `log_user_login` → grava em `access_logs` no `auth.users` insert/sign-in (via edge function chamada pelo client)
- Criptografia de tokens: usar pgsodium com chave do Vault; helper RPC `decrypt_integration_token(integration_id)` SECURITY DEFINER restrito ao dono

## Técnico

```text
[Usuário] → /integracoes → "Conectar Gmail"
   → gmail-oauth-start (edge)
   → consent Google
   → /integrations/callback?code=...
   → gmail-oauth-callback (edge) → salva em user_integrations
   → import-emails(integration_id) roda por usuário (cron ou manual)
   → chamados criados com owner_user_id = user_id
   → RLS filtra automaticamente na listagem
```

Pré-requisitos do usuário:
1. Aprovar a migração SQL grande
2. Fornecer `GOOGLE_OAUTH_CLIENT_ID` e `GOOGLE_OAUTH_CLIENT_SECRET` (criar projeto no Google Cloud Console; passo a passo no chat quando chegarmos lá)
3. Adicionar `https://<projeto>.supabase.co/functions/v1/gmail-oauth-callback` aos Redirect URIs no Console

## Escopo desta entrega

Dado o tamanho, sugiro executar **Fase 1 + Fase 2 (só Gmail) + Fase 3** nesta rodada. Fase 4 (criptografia pgsodium completa + access_logs) em seguida. Outlook/IMAP ficam stubbed como "em breve".

## Não muda

- Chat IA, Reuniões, Base de Conhecimento, Relatórios, Automações: intocados
- Connector Gmail global atual continua disponível para admin (legado)
- Visual/tema/sidebar mantidos — só novos itens
