"use client";

import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { ChatInterface } from "@/components/ChatInterface";
import { JobPicker } from "@/components/JobSelector";
import { Badge } from "@/components/ui/Badge";
import { MessageSquare, Sparkles } from "lucide-react";

export default function ChatPage() {
  const [jobId, setJobId] = useState<string | null>(null);

  return (
    <>
      <Navbar />
      <main className="container mx-auto px-6 py-8 max-w-5xl">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="violet">
              <MessageSquare className="h-3 w-3" /> AI Recruiter
            </Badge>
            <Badge variant="cyan">
              <Sparkles className="h-3 w-3" /> LLM-powered
            </Badge>
          </div>
          <h1 className="text-3xl font-bold text-ink mb-1">AI Recruiter Chat</h1>
          <p className="text-sm text-ink-muted">
            Ask in plain English. The agent reasons across all 7 signals — skills,
            behavior, trajectory, semantic fit — and cites the candidates it refers to.
          </p>
        </div>

        {!jobId ? (
          <JobPicker selectedId={jobId} onSelect={setJobId} />
        ) : (
          <div className="space-y-4">
            <button
              onClick={() => setJobId(null)}
              className="text-xs text-ink-muted hover:text-brand-300"
            >
              ← Switch job
            </button>
            <ChatInterface jobId={jobId} />
          </div>
        )}
      </main>
    </>
  );
}
