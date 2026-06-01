# Plano — Produtividade do Consultor + Maturidade Operacional + IA Resiliente

Vou implementar três blocos em sequência, mas em uma única entrega coordenada, pois eles se reforçam: a IA com fallback alimenta o aprendizado, que alimenta as métricas, que alimentam a produtividade.

---

## Bloco A — Tier 2: Produtividade do Consultor

### A1. Editor de resposta enriquecido (no painel do chamado)
- Reescrever `EmailReplyPanel` com:
  - Botões de **tom**: Formal / Cordial / Técnico / Resumido.
  - Botão **"Gerar rascunho com IA"** usando contexto completo do chamado + interações anteriores + base local.
  - Botão **"Resumir thread"** (condensa histórico de e-mails do mesmo `thread_id`).
  - Inserção de **snippets/macros** salvos pelo consultor.
- Envio continua via `imap-send` ou Gmail conforme a integração ativa do consultor.

### A2. Snippets pessoais e compartilhados
- Nova tabela `response_snippets` (escopo: usuário e/ou equipe, com tags).
- UI de gerenciamento em `/configuracoes` aba **Snippets**.
- Atalho `/` dentro do editor para inserir.

### A3. Time tracker por chamado
- Nova tabela `chamado_time_entries` (`chamado_id`, `user_id`, `started_at`, `ended_at`, `duration_seconds`, `note`).
- Botão **Iniciar/Pausar** no detalhe do chamado.
- Coluna "tempo gasto" no Kanban e no relatório mensal.

### A4. Parser de log/erro TOTVS
- Edge function `analyze-totvs-log`:
  - Aceita texto colado ou arquivo (.log/.txt) anexado ao chamado.
  - Identifica padrões conhecidos (stack RM, erro de coligada, integração eSocial, SQL error).
  - Cruza com `base_conhecimento` (RAG local) antes de chamar IA externa.
  - Retorna: causa provável, query/passo sugerido, links da base interna.
- UI: card "Analisar log" dentro do chamado.

### A5. Busca semântica na base de conhecimento (RAG real)
- Habilitar `pgvector`.
- Tabela `base_conhecimento_chunks` (`conhecimento_id`, `chunk`, `embedding vector(3072)`, `metadata`).
- Função SQL `match_conhecimento(query_embedding, k)`.
- Edge function `embed-conhecimento` (gera embeddings via Lovable AI `google/gemini-embedding-001`) — disparada em INSERT/UPDATE.
- Substituir a busca textual atual por híbrida (full-text + vetorial).

---

## Bloco B — Nível 3: Maturidade Operacional

### B1. Dashboard de saúde operacional
- Página `/operacao` (admin/supervisor):
  - SLA em risco (próximos 2h), SLA estourado, backlog por categoria.
  - Carga por consultor (chamados abertos × tempo médio).
  - Taxa de auto-resposta da IA, taxa de aprovação humana, confiança média.
  - Status das integrações (já existe parcial — consolidar).

### B2. Relatórios executivos consolidados
- Ampliar `generate-report`:
  - Recorte por consultor, cliente, categoria, evento eSocial.
  - Inclui métricas de IA (créditos consumidos, fallback acionado, validações pendentes).
  - Export PDF/CSV.

### B3. Trilha de auditoria expandida
- `chamados_logs` já existe — adicionar `audit_logs` global cobrindo: login, alteração de role, edição de automação, edição de snippet, validação de aprendizado.

### B4. Roteamento inteligente
- Regra opcional em `automacoes`: ao criar chamado, atribuir ao consultor com menor carga **e** maior taxa de resolução naquela categoria (histórico).

---

## Bloco C — Arquitetura de Conhecimento, Fallback e Aprendizado Contínuo

Este é o coração da sua solicitação. Reescreve o motor de IA em camadas.

### C1. Orquestrador de IA em camadas (`ai-orchestrator`)
Nova edge function central que **toda chamada de IA do sistema passa a usar**. Substitui chamadas diretas espalhadas (`chat`, `process-email`, `analyze-image` continuam, mas delegam decisão de fonte ao orquestrador).

Pipeline por pergunta:

```text
1. Detectar intenção + entidades (cliente, módulo RM, evento eSocial)
2. Buscar Nível 1: docs oficiais TOTVS indexadas localmente
3. Buscar Nível 3: base interna (RAG vetorial)
4. Tentar Nível 2: web search (se habilitado e com créditos)
5. Compor resposta com LLM (se créditos)
6. Se SEM CRÉDITOS / SEM WEB → MODO FALLBACK
7. Calcular confiança (Alto/Médio/Baixo) por cobertura das fontes
8. Anexar metadados: fontes usadas, modo (online/offline), confiança
```

### C2. Modo Fallback (offline / sem créditos)
- Detectar 402 (sem créditos), 429 persistente, ou flag `ai_mode = "offline"`.
- Quando ativo:
  - **Não** chamar Lovable AI Gateway.
  - Resposta gerada por: template estruturado + RAG local + histórico do chamado + `chamado_interactions` + `ai_learning` validado.
  - Cabeçalho obrigatório na resposta:
    > *"Resposta gerada usando base local e histórico interno. Busca externa indisponível. Confiança: {nível}."*
  - Banner visível na UI do chat e do painel de chamado: **"Modo offline ativo"** com motivo.
- Nova tabela `ai_runtime_state` (singleton) com: `mode`, `reason`, `since`, `credits_remaining_estimate`.

### C3. Aprendizado contínuo controlado
Substituir `ai_learning` atual (genérico) por estrutura validada:

Nova tabela `knowledge_entries`:
- `problema`, `contexto`, `solucao`, `resultado`, `validacao` (enum: pendente/validada/rejeitada), `fonte`, `confianca` (alto/médio/baixo), `validated_by`, `created_at`, `chamado_origem_id`, `embedding vector(3072)`.

Regras:
- IA **propõe** entrada apenas quando: chamado resolvido + feedback positivo OU consultor clica "Salvar como conhecimento".
- Entrada entra como `validacao = 'pendente'`.
- Admin valida em `/conhecimento/validacoes`.
- Só entradas `validada` participam do RAG.
- **Nunca** armazenar: conflitantes, sem evidência, hipotéticas, baixa confiança não validada.

### C4. Gestão de feedback e fim de conversa
- Detector heurístico + LLM leve: sinais ("obrigado", "resolveu", "era isso", "valeu", inatividade > 10min).
- Ao detectar, injetar card no chat:
  > "Seu problema foi resolvido?
  > ( ) Resolvido ( ) Parcialmente ( ) Não resolvido
  > O que funcionou? ___  O que faltou? ___"
- Nova tabela `conversation_feedback` ligada a `conversations` e/ou `chamados`.
- Feedback "Não resolvido" → cria item em `knowledge_gaps` para melhoria.

### C5. Gaps e melhoria contínua
- Tabela `knowledge_gaps`: pergunta original, motivo da falha, sugestão de conteúdo, status (aberto/resolvido).
- Painel admin `/conhecimento/gaps` para priorizar criação de novo conteúdo na base.

### C6. Indexação de documentação oficial TOTVS
- Tipo novo em `base_conhecimento.tipo = 'oficial_totvs'`.
- Uploader em `/base-conhecimento` permite colar URL/markdown da TDN, Central de Atendimento etc.
- Marcadas como **Nível 1** e priorizadas no ranking RAG.

---

## Mudanças técnicas (resumo para revisão)

### Banco
Migração com:
- `CREATE EXTENSION vector`.
- Tabelas novas: `response_snippets`, `chamado_time_entries`, `base_conhecimento_chunks`, `knowledge_entries`, `knowledge_gaps`, `conversation_feedback`, `ai_runtime_state`, `audit_logs`.
- Função `match_conhecimento`, `match_knowledge_entries`.
- RLS rigoroso (snippets por usuário/equipe, restante via `has_role`).
- GRANTs explícitos.

### Edge functions
- `ai-orchestrator` (nova, central)
- `embed-conhecimento` (nova)
- `analyze-totvs-log` (nova)
- `detect-conversation-end` (nova, leve)
- Refatorar `chat`, `process-email`, `send-email-reply` para usar `ai-orchestrator`

### Frontend
- `EmailReplyPanel` (refatorado, tom + IA + snippets)
- `ChamadoDetail`: aba "Analisar log", botão "Salvar como conhecimento", time tracker
- `/conhecimento/validacoes` (nova)
- `/conhecimento/gaps` (nova)
- `/operacao` (nova)
- `useChat`: detecta fim, mostra card de feedback, exibe banner modo offline + nível de confiança
- Indicador global de modo IA (header)

---

## Ordem de entrega proposta

1. **Migração + pgvector + tabelas novas** (uma só, para revisão).
2. **C1+C2 orquestrador e fallback** — destrava todo o resto.
3. **C3+C4+C5 aprendizado, feedback, gaps.**
4. **A5 RAG semântico real.**
5. **A1+A2 editor + snippets.**
6. **A3 time tracker + A4 parser log.**
7. **B1+B2+B3+B4 maturidade operacional.**

Posso começar pela migração e pelo orquestrador (`ai-orchestrator` + modo fallback), que é o pilar de tudo. Confirma que sigo nessa ordem ou prefere reordenar?
