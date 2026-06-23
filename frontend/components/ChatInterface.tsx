"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, Bot, User as UserIcon, Sparkles } from "lucide-react";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { api } from "@/lib/api";
import type { ChatMessage } from "@/lib/types";

const SUGGESTIONS = [
  "Why is the top candidate ranked first?",
  "Who has the best career trajectory?",
  "Show me candidates from non-IIT backgrounds",
  "Who's the hidden gem in this shortlist?",
  "Compare the top 3 candidates",
];

export function ChatInterface({ jobId }: { jobId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm your AI recruiting partner. Ask me anything about the shortlist — why someone is ranked where they are, who's the hidden gem, who's most likely to grow, etc.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput("");
    const next = [...messages, { role: "user", content: msg } as ChatMessage];
    setMessages(next);
    setLoading(true);
    try {
      const resp = await api.chat(jobId, msg, messages);
      const prefix = resp.guardrail_notice ? "⚠️ Guardrail: " : "";
      setMessages([...next, { role: "assistant", content: `${prefix}${resp.reply}` }]);
    } catch (e) {
      setMessages([
        ...next,
        {
          role: "assistant",
          content:
            "Sorry, I couldn't reach the AI service. Make sure the backend is running on http://localhost:8000.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="flex flex-col h-[640px]">
      <div className="px-5 py-4 border-b border-bg-border flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-accent-violet to-brand-500 flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div>
          <div className="text-sm font-semibold text-ink">AI Recruiter Chat</div>
          <div className="text-[10px] text-ink-subtle">
            Recruiting scope only · guardrails on PII &amp; bias
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}
          >
            {m.role === "assistant" && (
              <div className="h-7 w-7 shrink-0 rounded-lg bg-gradient-to-br from-accent-violet to-brand-500 flex items-center justify-center">
                <Bot className="h-3.5 w-3.5 text-white" />
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-lg px-4 py-2.5 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-brand-500/15 text-ink border border-brand-500/30"
                  : "bg-bg-elevated text-ink border border-bg-border"
              }`}
            >
              {m.content}
            </div>
            {m.role === "user" && (
              <div className="h-7 w-7 shrink-0 rounded-lg bg-bg-elevated flex items-center justify-center">
                <UserIcon className="h-3.5 w-3.5 text-ink-muted" />
              </div>
            )}
          </motion.div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="h-7 w-7 shrink-0 rounded-lg bg-gradient-to-br from-accent-violet to-brand-500 flex items-center justify-center">
              <Bot className="h-3.5 w-3.5 text-white" />
            </div>
            <div className="bg-bg-elevated border border-bg-border rounded-lg px-4 py-3 flex items-center gap-2 text-sm text-ink-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Thinking across 7 agents...
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-bg-border p-4 space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s, i) => (
            <button
              key={i}
              onClick={() => send(s)}
              disabled={loading}
              className="rounded-full bg-bg-elevated border border-bg-border hover:border-brand-400/40 hover:bg-brand-500/5 px-3 py-1 text-[11px] text-ink-muted hover:text-ink transition-all disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about candidates..."
            disabled={loading}
            className="flex-1"
          />
          <Button type="submit" size="md" disabled={loading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </Card>
  );
}
