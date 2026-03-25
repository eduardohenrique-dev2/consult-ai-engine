import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, Database, Bot, User, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const quickActions = [
  "Como listar funcionários ativos no RM?",
  "Qual query para encontrar divergência de benefícios?",
  "Explique o evento S-1200 do eSocial",
  "Funcionários sem cálculo de folha",
];

const queryShortcuts = [
  { nome: "Funcionários ativos", prompt: "Gere a query para listar funcionários ativos" },
  { nome: "Sem benefício", prompt: "Gere a query para encontrar funcionários sem benefício" },
  { nome: "Divergência benefício", prompt: "Gere a query para divergência de benefícios" },
  { nome: "Sem cálculo folha", prompt: "Gere a query para funcionários sem cálculo de folha" },
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

export default function ChatIA() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isTyping) return;
    const userMsg: Message = { id: `m${Date.now()}`, role: "user", content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    const allMessages = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: allMessages }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Erro desconhecido" }));
        toast({ title: "Erro", description: err.error || `Erro ${resp.status}`, variant: "destructive" });
        setIsTyping(false);
        return;
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let assistantSoFar = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              const currentContent = assistantSoFar;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: currentContent } : m);
                }
                return [...prev, { id: `m${Date.now()}`, role: "assistant", content: currentContent, timestamp: new Date() }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantSoFar += content;
              const finalContent = assistantSoFar;
              setMessages(prev => prev.map((m, i) => i === prev.length - 1 && m.role === "assistant" ? { ...m, content: finalContent } : m));
            }
          } catch { /* ignore */ }
        }
      }
    } catch (e) {
      console.error("Chat error:", e);
      toast({ title: "Erro de conexão", description: "Não foi possível conectar ao assistente.", variant: "destructive" });
    }

    setIsTyping(false);
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
          <p className="text-sm text-muted-foreground">Especialista TOTVS RM com base de conhecimento interna (RAG)</p>
        </div>
        <Badge className="bg-neon-purple/15 text-neon-purple border-neon-purple/30">IA Ativa • RAG</Badge>
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
              Pergunte sobre TOTVS RM, gere queries SQL, resolva erros e obtenha sugestões inteligentes com IA real.
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
                msg.role === "user" ? "bg-primary text-primary-foreground" : "card-gradient border border-border/40"
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
        {queryShortcuts.map(q => (
          <button
            key={q.nome}
            onClick={() => sendMessage(q.prompt)}
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
