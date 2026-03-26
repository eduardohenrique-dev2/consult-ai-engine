import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Send, Bot, User, Sparkles, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useChat } from "@/hooks/useChat";
import { useLocation } from "react-router-dom";
import ReactMarkdown from "react-markdown";

const pageContextMap: Record<string, string> = {
  "/": "dashboard",
  "/chamados": "chamados",
  "/chat": "chat",
  "/clientes": "clientes",
  "/monitoramento": "monitoramento",
  "/conhecimento": "conhecimento",
  "/automacoes": "automacoes",
  "/configuracoes": "configuracoes",
};

const proactiveSuggestions: Record<string, string[]> = {
  dashboard: ["Resumir métricas do dashboard", "Quais chamados precisam de atenção?"],
  chamados: ["Sugerir solução para o chamado selecionado", "Gerar query SQL para diagnóstico"],
  clientes: ["Analisar saúde dos clientes", "Quais clientes têm problemas?"],
  monitoramento: ["Verificar status das integrações", "Diagnosticar alertas ativos"],
  conhecimento: ["Sugerir artigo para a base", "Buscar documentação técnica"],
  automacoes: ["Criar nova regra de automação", "Otimizar fluxos existentes"],
};

export function FloatingChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const location = useLocation();
  const pageContext = pageContextMap[location.pathname] || "chat";
  const { messages, isTyping, sendMessage } = useChat(pageContext);
  const scrollRef = useRef<HTMLDivElement>(null);
  const suggestions = proactiveSuggestions[pageContext] || proactiveSuggestions.dashboard;
  const isChatPage = location.pathname === "/chat";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Don't render on chat page
  if (isChatPage) return null;

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input);
    setInput("");
  };

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow"
            style={{ background: "var(--gradient-neon)" }}
          >
            <MessageSquare className="h-6 w-6 text-white" />
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-success border-2 border-background animate-pulse" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-6 right-6 z-50 w-[400px] h-[560px] rounded-2xl border border-border/50 bg-card shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/40" style={{ background: "var(--gradient-neon)" }}>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">PM Assistant</p>
                  <p className="text-[10px] text-white/70">Contexto: {pageContext}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors">
                  <Minimize2 className="h-4 w-4" />
                </button>
                <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-auto scrollbar-thin p-3 space-y-3">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <div className="p-3 rounded-xl bg-primary/10 mb-3">
                    <Bot className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-sm font-medium mb-1">Como posso ajudar?</p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Estou analisando a página de {pageContext}
                  </p>
                  <div className="space-y-2 w-full">
                    {suggestions.map(s => (
                      <button
                        key={s}
                        onClick={() => sendMessage(s)}
                        className="w-full text-left text-xs p-2.5 rounded-lg border border-border/40 bg-secondary/50 hover:border-primary/40 hover:bg-primary/5 transition-all"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map(msg => (
                <div key={msg.id} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : ""}`}>
                  {msg.role === "assistant" && (
                    <div className="h-6 w-6 rounded-md bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="h-3.5 w-3.5 text-primary" />
                    </div>
                  )}
                  <div className={`max-w-[80%] rounded-xl px-3 py-2 text-xs ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary/80 border border-border/30"
                  }`}>
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm prose-invert max-w-none [&>*]:m-0 [&>p]:mb-1">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : msg.content}
                  </div>
                  {msg.role === "user" && (
                    <div className="h-6 w-6 rounded-md bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                      <User className="h-3.5 w-3.5 text-primary" />
                    </div>
                  )}
                </div>
              ))}

              {isTyping && (
                <div className="flex gap-2">
                  <div className="h-6 w-6 rounded-md bg-primary/15 flex items-center justify-center shrink-0">
                    <Bot className="h-3.5 w-3.5 text-primary animate-pulse" />
                  </div>
                  <div className="bg-secondary/80 rounded-xl border border-border/30 px-3 py-2">
                    <div className="flex gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-border/40">
              <div className="flex gap-2">
                <Textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Pergunte algo..."
                  className="bg-secondary/60 border-border/40 resize-none min-h-[36px] max-h-[80px] text-xs"
                  rows={1}
                />
                <Button onClick={handleSend} disabled={!input.trim() || isTyping} size="icon" className="shrink-0 h-9 w-9">
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
