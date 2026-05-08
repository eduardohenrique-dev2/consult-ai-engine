import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, Database, Bot, User, Copy, Check, Plus, MessageSquare, Trash2, Code2, AlertTriangle, Lightbulb, Loader2, Image as ImageIcon, X, UploadCloud } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChat } from "@/hooks/useChat";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";

const quickActions = [
  "Como listar funcionários ativos no RM?",
  "Qual query para divergência de benefícios?",
  "Explique o evento S-1200 do eSocial",
  "Funcionários sem cálculo de folha",
];

const queryShortcuts = [
  { nome: "Funcionários ativos", prompt: "Gere a query para listar funcionários ativos" },
  { nome: "Sem benefício", prompt: "Gere a query para funcionários sem benefício" },
  { nome: "Divergência benefício", prompt: "Gere a query para divergência de benefícios" },
  { nome: "Sem cálculo folha", prompt: "Gere a query para funcionários sem cálculo de folha" },
  { nome: "eSocial S-1200", prompt: "Explique o evento S-1200 e como reenviar pelo Monitor eSocial" },
  { nome: "eSocial S-1210", prompt: "Explique o evento S-1210 e principais erros de pagamento" },
];

const intentChips = [
  { label: "Gerar SQL", prefix: "[GERAR SQL]", icon: Code2, color: "text-accent border-accent/40 hover:bg-accent/10" },
  { label: "Explicar erro", prefix: "[EXPLICAR ERRO]", icon: AlertTriangle, color: "text-warning border-warning/40 hover:bg-warning/10" },
  { label: "Sugerir solução", prefix: "[SUGERIR SOLUÇÃO]", icon: Lightbulb, color: "text-neon-purple border-neon-purple/40 hover:bg-neon-purple/10" },
];

export default function ChatIA() {
  const [input, setInput] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const {
    messages, isTyping, conversationId, sendMessage,
    loadConversation, startNewConversation, setConversationId, setMessages,
  } = useChat("chat");

  const { data: conversations = [] } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const { data } = await supabase
        .from("conversations")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(50);
      return data || [];
    },
    refetchInterval: 10000,
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = (text: string) => {
    if (!text.trim() || isTyping) return;
    sendMessage(text);
    setInput("");
    setTimeout(() => queryClient.invalidateQueries({ queryKey: ["conversations"] }), 2000);
  };

  const handleNewChat = () => {
    setConversationId(null);
    setMessages([]);
  };

  const handleSelectConversation = (id: string) => {
    loadConversation(id);
  };

  const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await supabase.from("conversations").delete().eq("id", id);
    if (conversationId === id) handleNewChat();
    queryClient.invalidateQueries({ queryKey: ["conversations"] });
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Sidebar - Conversation History */}
      <div className="w-72 shrink-0 rounded-xl border border-border/30 bg-card/50 flex flex-col overflow-hidden">
        <div className="p-3 border-b border-border/30">
          <Button onClick={handleNewChat} className="w-full gap-2" size="sm" variant="outline">
            <Plus className="h-4 w-4" /> Nova conversa
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {conversations.map((conv: any) => (
              <button
                key={conv.id}
                onClick={() => handleSelectConversation(conv.id)}
                className={`w-full text-left p-2.5 rounded-lg text-xs transition-all group flex items-center justify-between gap-2 ${
                  conversationId === conv.id
                    ? "bg-primary/10 border border-primary/30 text-foreground"
                    : "hover:bg-secondary/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{conv.title}</span>
                </div>
                <button
                  onClick={(e) => handleDeleteConversation(e, conv.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all shrink-0"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </button>
            ))}
            {conversations.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8">Nenhuma conversa ainda</p>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Assistente IA
            </h1>
            <p className="text-xs text-muted-foreground">Especialista TOTVS RM com RAG e histórico persistente</p>
          </div>
          <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px]">IA Ativa • RAG</Badge>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-auto scrollbar-thin rounded-xl border border-border/30 bg-muted/20 p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="p-4 rounded-2xl bg-primary/10 mb-4">
                <Bot className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-1">PM Intelligence Assistant</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md">
                Pergunte sobre TOTVS RM, gere queries SQL, resolva erros e obtenha sugestões inteligentes.
              </p>
              <div className="grid grid-cols-2 gap-2 max-w-lg">
                {quickActions.map(q => (
                  <button key={q} onClick={() => handleSend(q)} className="text-left text-xs p-3 rounded-lg border border-border/40 bg-card/50 hover:border-primary/40 hover:bg-primary/5 transition-all">
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
                  <div className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center shrink-0 mt-1">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div className={`max-w-[75%] rounded-xl px-4 py-3 text-sm ${
                  msg.role === "user" ? "bg-primary text-primary-foreground" : "card-gradient border border-border/40"
                }`}>
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm prose-invert max-w-none [&_pre]:bg-background/80 [&_pre]:border [&_pre]:border-border/50 [&_pre]:rounded-lg [&_pre]:p-3 [&_code]:text-accent [&_code]:text-xs">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : msg.content}
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
              <div className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4 text-primary animate-pulse" />
              </div>
              <div className="card-gradient rounded-xl border border-border/40 px-4 py-3 flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                <span className="text-[11px] text-muted-foreground">Consultando base de conhecimento e gerando resposta...</span>
              </div>
            </motion.div>
          )}
        </div>

        {/* Intent chips (Gerar SQL / Explicar erro / Sugerir solução) */}
        <div className="flex gap-2 mt-3 flex-wrap">
          {intentChips.map(chip => {
            const Icon = chip.icon;
            const apply = () => {
              const base = input.trim();
              setInput(`${chip.prefix} ${base}`.trim() + " ");
            };
            return (
              <button
                key={chip.label}
                onClick={apply}
                disabled={isTyping}
                className={`flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-full border bg-card/40 transition-all disabled:opacity-50 ${chip.color}`}
              >
                <Icon className="h-3 w-3" /> {chip.label}
              </button>
            );
          })}
        </div>

        {/* Quick queries */}
        <div className="flex gap-2 mt-2 overflow-x-auto scrollbar-thin pb-1">
          {queryShortcuts.map(q => (
            <button
              key={q.nome}
              onClick={() => handleSend(q.prompt)}
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
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(input); } }}
            placeholder="Pergunte sobre TOTVS RM, gere SQL, resolva erros..."
            className="bg-secondary border-border/50 resize-none min-h-[44px] max-h-[120px]"
            rows={1}
          />
          <Button onClick={() => handleSend(input)} disabled={!input.trim() || isTyping} className="shrink-0 h-auto">
            {isTyping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
