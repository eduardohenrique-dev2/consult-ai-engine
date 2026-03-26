import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

export function useChat(pageContext: string = "chat") {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const { toast } = useToast();

  const loadConversation = useCallback(async (convId: string) => {
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });

    if (data) {
      setMessages(data.map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: new Date(m.created_at),
      })));
    }
    setConversationId(convId);
  }, []);

  const startNewConversation = useCallback(async () => {
    const { data } = await supabase
      .from("conversations")
      .insert({ title: "Nova conversa", page_context: pageContext })
      .select()
      .single();

    if (data) {
      setConversationId(data.id);
      setMessages([]);
      return data.id;
    }
    return null;
  }, [pageContext]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isTyping) return;

    let currentConvId = conversationId;
    if (!currentConvId) {
      currentConvId = await startNewConversation();
      if (!currentConvId) return;
    }

    const userMsg: ChatMessage = {
      id: `m${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    const allMessages = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: allMessages,
          pageContext,
          conversationId: currentConvId,
        }),
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

      // Flush remaining
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw || !raw.startsWith("data: ")) continue;
          const jsonStr = raw.replace(/\r$/, "").slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantSoFar += content;
              const final_ = assistantSoFar;
              setMessages(prev => prev.map((m, i) => i === prev.length - 1 && m.role === "assistant" ? { ...m, content: final_ } : m));
            }
          } catch { /* ignore */ }
        }
      }

      // Save assistant message to DB
      if (currentConvId && assistantSoFar) {
        await supabase.from("chat_messages").insert({
          conversation_id: currentConvId,
          role: "assistant",
          content: assistantSoFar,
        });
        // Auto-name conversation based on first user message
        const { data: conv } = await supabase
          .from("conversations")
          .select("title")
          .eq("id", currentConvId)
          .single();
        if (conv?.title === "Nova conversa") {
          const title = text.length > 50 ? text.slice(0, 50) + "..." : text;
          await supabase.from("conversations").update({ title, updated_at: new Date().toISOString() }).eq("id", currentConvId);
        }
      }
    } catch (e) {
      console.error("Chat error:", e);
      toast({ title: "Erro de conexão", description: "Não foi possível conectar ao assistente.", variant: "destructive" });
    }

    setIsTyping(false);
  }, [messages, isTyping, conversationId, pageContext, toast, startNewConversation]);

  return {
    messages,
    setMessages,
    isTyping,
    conversationId,
    setConversationId,
    sendMessage,
    loadConversation,
    startNewConversation,
  };
}
