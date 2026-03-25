export interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: "admin" | "consultor";
  avatar?: string;
}

export interface Cliente {
  id: string;
  nome: string;
  cnpj: string;
  status: "OK" | "ALERTA" | "CRITICO";
  criadoEm: string;
  problemas?: string[];
}

export interface Chamado {
  id: string;
  titulo: string;
  descricao: string;
  tipo: "Folha" | "Ponto" | "Benefício" | "eSocial";
  prioridade: "baixa" | "media" | "alta" | "critica";
  status: "Novo" | "Em análise" | "Execução" | "Validação" | "Finalizado";
  clienteId: string;
  clienteNome: string;
  responsavelId: string;
  responsavelNome: string;
  sugestaoIa?: string;
  querySugerida?: string;
  criadoEm: string;
}

export interface BaseConhecimento {
  id: string;
  titulo: string;
  conteudo: string;
  tipo: "SQL" | "Procedimento" | "Erro" | "Documentação";
}

export interface Automacao {
  id: string;
  nome: string;
  fluxo: { trigger: string; actions: string[] };
  ativo: boolean;
}

export interface Alerta {
  id: string;
  tipo: "erro" | "alerta" | "info";
  mensagem: string;
  cliente: string;
  timestamp: string;
}

export const usuarios: Usuario[] = [
  { id: "u1", nome: "Carlos Pereira", email: "carlos@pm.com.br", perfil: "admin" },
  { id: "u2", nome: "Ana Marques", email: "ana@pm.com.br", perfil: "consultor" },
  { id: "u3", nome: "Pedro Silva", email: "pedro@pm.com.br", perfil: "consultor" },
  { id: "u4", nome: "Julia Santos", email: "julia@pm.com.br", perfil: "consultor" },
];

export const clientes: Cliente[] = [
  { id: "c1", nome: "TechCorp S.A.", cnpj: "12.345.678/0001-90", status: "OK", criadoEm: "2024-01-15" },
  { id: "c2", nome: "Indústria Nova Ltda", cnpj: "98.765.432/0001-10", status: "ALERTA", criadoEm: "2024-02-20", problemas: ["Divergência de benefícios detectada"] },
  { id: "c3", nome: "Grupo Horizonte", cnpj: "11.222.333/0001-44", status: "CRITICO", criadoEm: "2024-03-10", problemas: ["Falha no cálculo de folha", "Funcionários sem benefício"] },
  { id: "c4", nome: "Construtora ABC", cnpj: "55.666.777/0001-88", status: "OK", criadoEm: "2024-04-05" },
  { id: "c5", nome: "Logística Express", cnpj: "33.444.555/0001-22", status: "ALERTA", criadoEm: "2024-05-12", problemas: ["Atraso no envio eSocial"] },
  { id: "c6", nome: "Farmácia Popular", cnpj: "77.888.999/0001-66", status: "OK", criadoEm: "2024-06-01" },
];

export const chamados: Chamado[] = [
  { id: "ch1", titulo: "Erro cálculo folha - Janeiro", descricao: "Funcionários com horas extras não estão sendo calculados corretamente", tipo: "Folha", prioridade: "critica", status: "Novo", clienteId: "c3", clienteNome: "Grupo Horizonte", responsavelId: "u2", responsavelNome: "Ana Marques", sugestaoIa: "Verificar tabela PFFINANC para registros faltantes", querySugerida: "SELECT F.CHAPA, F.NOME FROM PFUNC F LEFT JOIN PFFINANC FIN ON FIN.CHAPA = F.CHAPA WHERE FIN.CHAPA IS NULL", criadoEm: "2025-03-20" },
  { id: "ch2", titulo: "Divergência de benefícios", descricao: "Valores de benefícios não conferem com o padrão cadastrado", tipo: "Benefício", prioridade: "alta", status: "Em análise", clienteId: "c2", clienteNome: "Indústria Nova Ltda", responsavelId: "u3", responsavelNome: "Pedro Silva", sugestaoIa: "Comparar PBENEFICIO.VALOR com VALOR_PADRAO", querySugerida: "SELECT * FROM PBENEFICIO WHERE VALOR <> VALOR_PADRAO", criadoEm: "2025-03-18" },
  { id: "ch3", titulo: "Integração eSocial falhando", descricao: "Envio de eventos S-1200 retornando erro de validação", tipo: "eSocial", prioridade: "alta", status: "Execução", clienteId: "c5", clienteNome: "Logística Express", responsavelId: "u4", responsavelNome: "Julia Santos", criadoEm: "2025-03-15" },
  { id: "ch4", titulo: "Configurar ponto eletrônico", descricao: "Novos terminais de ponto precisam ser configurados no RM", tipo: "Ponto", prioridade: "media", status: "Validação", clienteId: "c1", clienteNome: "TechCorp S.A.", responsavelId: "u2", responsavelNome: "Ana Marques", criadoEm: "2025-03-12" },
  { id: "ch5", titulo: "Funcionários sem benefício", descricao: "Alguns funcionários ativos não possuem benefícios cadastrados", tipo: "Benefício", prioridade: "media", status: "Novo", clienteId: "c3", clienteNome: "Grupo Horizonte", responsavelId: "u3", responsavelNome: "Pedro Silva", querySugerida: "SELECT F.CHAPA FROM PFUNC F LEFT JOIN PBENEFICIO B ON B.CHAPA = F.CHAPA WHERE B.CHAPA IS NULL", criadoEm: "2025-03-22" },
  { id: "ch6", titulo: "Relatório de férias", descricao: "Gerar relatório de férias vencidas para todos os funcionários", tipo: "Folha", prioridade: "baixa", status: "Finalizado", clienteId: "c4", clienteNome: "Construtora ABC", responsavelId: "u4", responsavelNome: "Julia Santos", criadoEm: "2025-03-01" },
  { id: "ch7", titulo: "Ajuste cálculo INSS", descricao: "Alíquota progressiva do INSS com erro na faixa 3", tipo: "Folha", prioridade: "alta", status: "Em análise", clienteId: "c6", clienteNome: "Farmácia Popular", responsavelId: "u2", responsavelNome: "Ana Marques", criadoEm: "2025-03-19" },
  { id: "ch8", titulo: "Importação de marcações", descricao: "Importar marcações de ponto do mês anterior", tipo: "Ponto", prioridade: "media", status: "Execução", clienteId: "c1", clienteNome: "TechCorp S.A.", responsavelId: "u3", responsavelNome: "Pedro Silva", criadoEm: "2025-03-14" },
];

export const baseConhecimento: BaseConhecimento[] = [
  { id: "bc1", titulo: "Funcionários ativos", conteudo: "SELECT F.CHAPA, F.NOME FROM PFUNC F WHERE F.SITUACAO = 'A'", tipo: "SQL" },
  { id: "bc2", titulo: "Funcionário sem benefício", conteudo: "SELECT F.CHAPA FROM PFUNC F LEFT JOIN PBENEFICIO B ON B.CHAPA = F.CHAPA WHERE B.CHAPA IS NULL", tipo: "SQL" },
  { id: "bc3", titulo: "Divergência de benefício", conteudo: "SELECT * FROM PBENEFICIO WHERE VALOR <> VALOR_PADRAO", tipo: "SQL" },
  { id: "bc4", titulo: "Sem cálculo de folha", conteudo: "SELECT F.CHAPA FROM PFUNC F LEFT JOIN PFFINANC FIN ON FIN.CHAPA = F.CHAPA WHERE FIN.CHAPA IS NULL", tipo: "SQL" },
  { id: "bc5", titulo: "Procedimento: Recálculo de Folha", conteudo: "1. Acessar módulo Folha de Pagamento\n2. Selecionar período\n3. Marcar 'Recalcular todos'\n4. Verificar log de erros\n5. Conferir relatório sintético", tipo: "Procedimento" },
  { id: "bc6", titulo: "Erro: S-1200 Remuneração", conteudo: "O evento S-1200 pode falhar se:\n- CPF do funcionário inválido\n- Rubrica sem correspondência na tabela de naturezas\n- Período de apuração incorreto\n\nSolução: Verificar cadastro na PFUNC e tabela de rubricas PRUBRICAS", tipo: "Erro" },
];

export const automacoes: Automacao[] = [
  { id: "a1", nome: "Erro de Folha → Chamado Automático", fluxo: { trigger: "erro_folha", actions: ["criar_chamado", "notificar", "executar_ia"] }, ativo: true },
  { id: "a2", nome: "Benefício Divergente → Alerta", fluxo: { trigger: "divergencia_beneficio", actions: ["notificar", "criar_chamado"] }, ativo: true },
  { id: "a3", nome: "eSocial Falha → Reprocessar", fluxo: { trigger: "esocial_erro", actions: ["reprocessar", "notificar"] }, ativo: false },
  { id: "a4", nome: "SLA Excedido → Escalar", fluxo: { trigger: "sla_excedido", actions: ["escalar_chamado", "notificar_admin"] }, ativo: true },
];

export const alertas: Alerta[] = [
  { id: "al1", tipo: "erro", mensagem: "Falha no cálculo de folha detectada", cliente: "Grupo Horizonte", timestamp: "2025-03-25T10:30:00" },
  { id: "al2", tipo: "alerta", mensagem: "Divergência de benefícios encontrada", cliente: "Indústria Nova Ltda", timestamp: "2025-03-25T09:15:00" },
  { id: "al3", tipo: "alerta", mensagem: "SLA próximo de expirar - Chamado #ch3", cliente: "Logística Express", timestamp: "2025-03-25T08:45:00" },
  { id: "al4", tipo: "info", mensagem: "Envio eSocial concluído com sucesso", cliente: "TechCorp S.A.", timestamp: "2025-03-25T07:00:00" },
];

export const queriesRM = [
  { nome: "Funcionários ativos", sql: "SELECT F.CHAPA, F.NOME FROM PFUNC F WHERE F.SITUACAO = 'A'" },
  { nome: "Sem benefício", sql: "SELECT F.CHAPA FROM PFUNC F LEFT JOIN PBENEFICIO B ON B.CHAPA = F.CHAPA WHERE B.CHAPA IS NULL" },
  { nome: "Divergência benefício", sql: "SELECT * FROM PBENEFICIO WHERE VALOR <> VALOR_PADRAO" },
  { nome: "Sem cálculo folha", sql: "SELECT F.CHAPA FROM PFUNC F LEFT JOIN PFFINANC FIN ON FIN.CHAPA = F.CHAPA WHERE FIN.CHAPA IS NULL" },
];
