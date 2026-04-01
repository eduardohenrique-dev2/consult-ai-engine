

# Plano de Evolução Profissional — PM Assistant AI

Este plano organiza as melhorias em fases incrementais, priorizando funcionalidades estruturais primeiro, depois administração, e por último refinamento visual.

---

## Fase 1: Chamados — Estrutura Completa

**Objetivo:** Tornar a gestão de chamados profissional com edição, exclusão e detalhe organizado.

- **Editar chamado:** Adicionar botão "Editar" no detalhe do chamado com formulário inline para alterar título, descrição, tipo, prioridade, cliente, responsável e observações internas
- **Excluir chamado:** Botão com confirmação (AlertDialog). Requer nova RLS policy `DELETE` na tabela `chamados`
- **Alterar status no detalhe:** Dropdown de status dentro do modal de detalhe, com `updateStatus` mutation que já existe — ao mudar, invalida queries automaticamente (realtime já está ativo)
- **Layout do detalhe reorganizado:** Seções visuais claras:
  - 📌 Informações Gerais (título, cliente, responsável, datas)
  - 📊 Status (dropdown interativo)
  - 🤖 Análise da IA (sugestão + query SQL)
  - 🧠 Histórico IA (interações anteriores)
- **Adicionar campo `observacoes`:** Migration para adicionar coluna `observacoes TEXT` na tabela `chamados`

**Arquivos:** `src/pages/Chamados.tsx`, nova migration

---

## Fase 2: Clientes — CRUD Completo

**Objetivo:** Transformar a página de clientes de visualização para gestão completa.

- **Cadastrar cliente:** Modal com campos: nome, CNPJ, contato (novo campo), status
- **Editar cliente:** Modal de edição com os mesmos campos
- **Excluir cliente:** Botão com confirmação. Requer RLS policy `DELETE` para `clientes`
- **Adicionar campo `contato`:** Migration para nova coluna `contato TEXT` na tabela `clientes`
- **Ver chamados por cliente:** Ao clicar no card, expandir/modal mostrando lista de chamados vinculados
- **RLS:** Adicionar policies `INSERT`, `UPDATE`, `DELETE` para `anon` (sistema sem login obrigatório)

**Arquivos:** `src/pages/ClientesPage.tsx`, nova migration

---

## Fase 3: Área Administrativa

**Objetivo:** Criar aba Admin com gestão de usuários e permissões.

- **Nova rota `/admin`** com página `AdminPage.tsx`
- **Listar usuários** com perfil e role
- **Editar role** (admin/consultor) via dropdown
- **Excluir usuário** (soft: remover da tabela profiles/roles)
- **Cadastrar novo usuário** via `supabase.auth.admin` (edge function para criar usuário)
- **Controle de acesso:** Verificar `role === 'admin'` no componente. Esconder link do sidebar para não-admins
- **Adicionar link condicional na sidebar**

**Arquivos:** novo `src/pages/AdminPage.tsx`, `src/components/AppSidebar.tsx`, nova edge function `admin-users`

---

## Fase 4: Configurações Expandidas

**Objetivo:** Expandir a tela de configurações com seções organizadas.

- **Perfil do usuário:** Editar nome e avatar
- **Preferências de notificação:** Toggle para tipos de alerta
- **Configurações da IA:** Modelo preferido, nível de detalhe das respostas
- **Organizar em tabs:** Perfil | Notificações | IA | Sistema

**Arquivos:** `src/pages/Configuracoes.tsx`

---

## Fase 5: Dashboard e Visual Premium

**Objetivo:** Melhorar hierarquia visual, reorganizar métricas e polir UI.

- **Reorganizar cards:** Métricas mais relevantes no topo (chamados abertos, taxa resolução, tempo médio)
- **Adicionar card "Tempo Médio de Resolução"**
- **Melhorar gráficos:** Cores mais consistentes, labels mais claras
- **Polish geral em todas as páginas:**
  - Espaçamento uniforme
  - Tipografia hierárquica
  - Cards com `hover` e transições suaves
  - Separadores visuais entre seções
- **Melhorar sidebar footer:** Avatar e informações mais limpos

**Arquivos:** `src/pages/Dashboard.tsx`, `src/index.css`, `src/components/StatCard.tsx`

---

## Alterações no Banco de Dados

```text
Migration 1:
  - ALTER TABLE chamados ADD COLUMN observacoes TEXT;
  - CREATE POLICY "Public can delete chamados" ON chamados FOR DELETE TO anon USING (true);
  - CREATE POLICY "Public can update chamados" ON chamados FOR UPDATE TO anon USING (true);

Migration 2:
  - ALTER TABLE clientes ADD COLUMN contato TEXT;
  - CREATE POLICY "Public can insert clientes" ON clientes FOR INSERT TO anon WITH CHECK (true);
  - CREATE POLICY "Public can update clientes" ON clientes FOR UPDATE TO anon USING (true);
  - CREATE POLICY "Public can delete clientes" ON clientes FOR DELETE TO anon USING (true);
```

---

## Ordem de Implementação

1. Migrations (banco de dados)
2. Chamados — edição, exclusão, detalhe reorganizado
3. Clientes — CRUD completo
4. Admin — nova página com gestão de usuários
5. Configurações — expandir com tabs
6. Dashboard e visual — polish final

