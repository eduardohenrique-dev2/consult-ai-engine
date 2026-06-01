import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export type AiMode = "online" | "offline" | "unknown";
export type AiConfidence = "alto" | "medio" | "baixo" | null;

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

export function useChat(pageContext: string = "chat") {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [aiMode, setAiMode] = useState<AiMode>("unknown");
  const [aiConfidence, setAiConfidence] = useState<AiConfidence>(null);
  const [aiFallbackReason, setAiFallbackReason] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const { toast } = useToast();

  const loadConversation = useCallback(async (convId: string) => {
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });

    if (data) {
      setMessages(data.map((m: any) => ({
        id: m.id, role: m.role, content: m.content, timestamp: new Date(m.created_at),
      })));
    }
    setConversationId(convId);
    setShowFeedback(false);
  }, []);

  const startNewConversation = useCallback(async () => {
    const { data } = await supabase
      .from("conversations").insert({ title: "Nova conversa", page_context: pageContext })
      .select().single();
    if (data) { setConversationId(data.id); setMessages([]); return data.id; }
    return null;
  }, [pageContext]);

  const detectEndOfConversation = useCallback(async (text: string) => {
    try {
      const { data } = await supabase.functions.invoke("detect-conversation-end", { body: { text } });
      if (data?.isEnding) setShowFeedback(true);
    } catch { /* silent */ }
  }, []);

  const submitFeedback = useCallback(async (payload: {
    resultado: "resolvido" | "parcial" | "nao_resolvido";
    funcionou?: string;
    faltou?: string;
    chamadoId?: string;
  }) => {
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) return;
    await supabase.from("conversation_feedback").insert({
      conversation_id: conversationId,
      chamado_id: payload.chamadoId || null,
      user_id: u.user.id,
      resultado: payload.resultado,
      funcionou: payload.funcionou || null,
      faltou: payload.faltou || null,
    });
    if (payload.resultado === "nao_resolvido") {
      const lastUser = [...messages].reverse().find(m => m.role === "user");
      await supabase.from("knowledge_gaps").insert({
        pergunta: lastUser?.content || "(sem texto)",
        motivo: payload.faltou || "Usuário marcou como não resolvido",
        origem: "feedback",
        conversation_id: conversationId,
        chamado_id: payload.chamadoId || null,
      });
    }
    setShowFeedback(false);
    toast({ title: "Obrigado pelo feedback!", description: "Vai nos ajudar a melhorar." });
  }, [conversationId, messages, toast]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isTyping) return;

    let currentConvId = conversationId;
    if (!currentConvId) {
      currentConvId = await startNewConversation();
      if (!currentConvId) return;
    }

    const userMsg: ChatMessage = { id: `m${Date.now()}`, role: "user", content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);
    setShowFeedback(false);

    const allMessages = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: allMessages, pageContext, conversationId: currentConvId }),
      });

      // Captura headers de modo
      const mode = (resp.headers.get("X-AI-Mode") as AiMode) || "unknown";
      const conf = resp.headers.get("X-AI-Confidence") as AiConfidence;
      const reason = resp.headers.get("X-AI-Fallback-Reason");
      setAiMode(mode);
      setAiConfidence(conf);
      setAiFallbackReason(reason);

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
              const cur = assistantSoFar;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: cur } : m);
                }
                return [...prev, { id: `m${Date.now()}`, role: "assistant", content: cur, timestamp: new Date() }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      if (currentConvId && assistantSoFar) {
        await supabase.from("chat_messages").insert({
          conversation_id: currentConvId, role: "assistant", content: assistantSoFar,
        });
        const { data: conv } = await supabase
          .from("conversations").select("title").eq("id", currentConvId).single();
        if (conv?.title === "Nova conversa") {
          const title = text.length > 50 ? text.slice(0, 50) + "..." : text;
          await supabase.from("conversations").update({ title, updated_at: new Date().toISOString() }).eq("id", currentConvId);
        }
      }

      // Detecta fim de conversa no input do usuário
      await detectEndOfConversation(text);
    } catch (e) {
      console.error("Chat error:", e);
      toast({ title: "Erro de conexão", description: "Não foi possível conectar ao assistente.", variant: "destructive" });
    }

    setIsTyping(false);
  }, [messages, isTyping, conversationId, pageContext, toast, startNewConversation, detectEndOfConversation]);

  return {
    messages, setMessages, isTyping, conversationId, setConversationId,
    sendMessage, loadConversation, startNewConversation,
    aiMode, aiConfidence, aiFallbackReason,
    showFeedback, setShowFeedback, submitFeedback,
  };
}
