import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, Database, Bot, User, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { baseConhecimento, queriesRM } from "@/data/mock-data";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sql?: string;
  timestamp: Date;
}

const quickActions = [
  "Como listar funcionários ativos no RM?",
  "Qual query para encontrar divergência de benefícios?",
  "Explique o evento S-1200 do eSocial",
  "Funcionários sem cálculo de folha",
];

function simulateRAG(query: string): string {
  const lowerQuery = query.toLowerCase();
  const matched = baseConhecimento.filter(bc =>
    bc.titulo.toLowerCase().includes(lowerQuery) ||
    bc.conteudo.toLowerCase().includes(lowerQuery) ||
    lowerQuery.includes(bc.titulo.toLowerCase().split(" ").slice(0, 2).join(" "))
  );

  if (matched.length > 0) {
    const item = matched[0];
    if (item.tipo === "SQL") {
      return `**📋 Encontrado na Base de Conhecimento:**\n\n**${item.titulo}**\n\nA query SQL para essa consulta é:\n\n\`\`\`sql\n${item.conteudo}\n\`\`\`\n\n**Explicação:**\nEssa query consulta as tabelas do TOTVS RM para obter os dados solicitados. Certifique-se de que as tabelas estejam acessíveis e os índices otimizados para melhor performance.\n\n💡 *Resultado obtido da base de conhecimento interna (RAG)*`;
    }
    return `**📋 Encontrado na Base de Conhecimento:**\n\n**${item.titulo}**\n\n${item.conteudo}\n\n💡 *Resultado obtido da base de conhecimento interna (RAG)*`;
  }

  if (lowerQuery.includes("funcionário") && lowerQuery.includes("ativo")) {
    return `Para listar funcionários ativos no TOTVS RM, utilize a query:\n\n\`\`\`sql\nSELECT F.CHAPA, F.NOME FROM PFUNC F WHERE F.SITUACAO = 'A'\n\`\`\`\n\n**Tabela PFUNC:** Armazena dados cadastrais dos funcionários.\n**Campo SITUACAO:** 'A' = Ativo, 'D' = Demitido, 'F' = Férias.\n\n🔍 *Consulta baseada em conhecimento interno do sistema RM*`;
  }

  if (lowerQuery.includes("s-1200") || lowerQuery.includes("esocial")) {
    return `**Evento S-1200 - Remuneração do Trabalhador**\n\nO S-1200 é o evento do eSocial responsável por informar a remuneração de cada trabalhador.\n\n**Causas comuns de erro:**\n- CPF inválido no cadastro\n- Rubrica sem correspondência na tabela de naturezas\n- Período de apuração incorreto\n\n**Solução:**\nVerificar cadastro na PFUNC e tabela de rubricas PRUBRICAS:\n\n\`\`\`sql\nSELECT R.CODRUBRICA, R.DESCRICAO, R.NATUREZA\nFROM PRUBRICAS R\nWHERE R.NATUREZA IS NULL\n\`\`\`\n\n⚠️ *Se o problema persistir, verifique o layout do XML gerado*`;
  }

  return `Analisando sua pergunta sobre: "${query}"\n\n**Recomendações:**\n\n1. Verifique a documentação do TOTVS RM relacionada ao módulo em questão\n2. Consulte os chamados anteriores com problemas similares\n3. Execute queries de diagnóstico nas tabelas PFUNC, PFFINANC e PBENEFICIO\n\n\`\`\`sql\n-- Query de diagnóstico geral\nSELECT COUNT(*) as total,\n  SUM(CASE WHEN SITUACAO = 'A' THEN 1 ELSE 0 END) as ativos\nFROM PFUNC\n\`\`\`\n\n💡 *Para resultados mais precisos, forneça detalhes como módulo, mensagem de erro e cliente*`;
}

export default function ChatIA() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { id: `m${Date.now()}`, role: "user", content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const response = simulateRAG(text);
      const assistantMsg: Message = { id: `m${Date.now() + 1}`, role: "assistant", content: response, timestamp: new Date() };
      setMessages(prev => [...prev, assistantMsg]);
      setIsTyping(false);
    }, 1200);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const renderContent = (content: string) => {
    const parts = content.split(/(```[\s\S]*?```)/g);
    return parts.map((part, i) => {
      if (part.startsWith("```")) {
        const code = part.replace(/```\w*\n?/g, "").replace(/```$/g, "").trim();
        return (
          <div key={i} className="my-3 rounded-lg bg-background/80 border border-border/50 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/30">
              <span className="text-[10px] text-muted-foreground font-mono">SQL</span>
              <button onClick={() => copyToClipboard(code, `code-${i}`)} className="text-muted-foreground hover:text-foreground transition-colors">
                {copiedId === `code-${i}` ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
              </button>
            </div>
            <pre className="p-3 text-xs font-mono text-accent overflow-x-auto">{code}</pre>
          </div>
        );
      }
      return (
        <span key={i} className="whitespace-pre-wrap">
          {part.split(/(\*\*.*?\*\*)/g).map((p2, j) =>
            p2.startsWith("**") && p2.endsWith("**")
              ? <strong key={j} className="text-foreground">{p2.slice(2, -2)}</strong>
              : p2
          )}
        </span>
      );
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-neon-purple" /> Assistente IA
          </h1>
          <p className="text-sm text-muted-foreground">Especialista TOTVS RM com base de conhecimento interna</p>
        </div>
        <Badge className="bg-neon-purple/15 text-neon-purple border-neon-purple/30">RAG Ativo</Badge>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-auto scrollbar-thin rounded-xl border border-border/30 bg-muted/20 p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="p-4 rounded-2xl bg-neon-purple/10 mb-4">
              <Bot className="h-10 w-10 text-neon-purple" />
            </div>
            <h3 className="text-lg font-semibold mb-1">PM Intelligence Assistant</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md">
              Pergunte sobre TOTVS RM, gere queries SQL, resolva erros e obtenha sugestões inteligentes.
            </p>
            <div className="grid grid-cols-2 gap-2 max-w-lg">
              {quickActions.map(q => (
                <button key={q} onClick={() => sendMessage(q)} className="text-left text-xs p-3 rounded-lg border border-border/40 bg-card/50 hover:border-primary/40 hover:bg-primary/5 transition-all">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence>
          {messages.map(msg => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
            >
              {msg.role === "assistant" && (
                <div className="h-7 w-7 rounded-lg bg-neon-purple/15 flex items-center justify-center shrink-0 mt-1">
                  <Bot className="h-4 w-4 text-neon-purple" />
                </div>
              )}
              <div className={`max-w-[75%] rounded-xl px-4 py-3 text-sm ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "card-gradient border border-border/40"
              }`}>
                {msg.role === "assistant" ? renderContent(msg.content) : msg.content}
              </div>
              {msg.role === "user" && (
                <div className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center shrink-0 mt-1">
                  <User className="h-4 w-4 text-primary" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {isTyping && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
            <div className="h-7 w-7 rounded-lg bg-neon-purple/15 flex items-center justify-center shrink-0">
              <Bot className="h-4 w-4 text-neon-purple animate-pulse" />
            </div>
            <div className="card-gradient rounded-xl border border-border/40 px-4 py-3">
              <div className="flex gap-1">
                <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Quick queries */}
      <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-thin pb-1">
        {queriesRM.map(q => (
          <button
            key={q.nome}
            onClick={() => sendMessage(`Gere a query para: ${q.nome}`)}
            className="flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-full border border-border/40 bg-card/50 hover:border-accent/40 text-muted-foreground hover:text-accent transition-all whitespace-nowrap shrink-0"
          >
            <Database className="h-3 w-3" /> {q.nome}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-2 mt-3">
        <Textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
          placeholder="Pergunte sobre TOTVS RM, gere SQL, resolva erros..."
          className="bg-secondary border-border/50 resize-none min-h-[44px] max-h-[120px]"
          rows={1}
        />
        <Button onClick={() => sendMessage(input)} disabled={!input.trim() || isTyping} className="shrink-0 bg-primary hover:bg-primary/90 h-auto">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
