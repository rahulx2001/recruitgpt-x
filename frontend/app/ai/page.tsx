"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, ArrowUp, User, FileText } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/app/AppShell";
import { api } from "@/lib/api";
import { mapApiCandidates } from "@/lib/candidateAdapter";
import type { ChatMessage } from "@/lib/types";

type ChatTurn = {
  role: "user" | "assistant";
  text: string;
  guardrail?: boolean;
  citations?: Array<{ id: string; candidate: string; detail: string }>;
};

export default function AiRecruiterPage() {
  const { data: jobs = [] } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => api.listJobs(),
  });
  const { data: apiCandidates } = useQuery({
    queryKey: ["candidates"],
    queryFn: () => api.listCandidates(),
  });
  const { data: rankings = [] } = useQuery({
    queryKey: ["challenge-rankings"],
    queryFn: () => api.challengeRankings(),
  });

  const topCandidates = React.useMemo(() => {
    if (!apiCandidates?.length) return [];
    return mapApiCandidates(apiCandidates, rankings).slice(0, 3);
  }, [apiCandidates, rankings]);

  const jobId = jobs[0]?.id;

  const initialTurns = React.useMemo((): ChatTurn[] => {
    if (topCandidates.length === 0) return [];
    const names = topCandidates.map((c) => c.name).join(", ");
    return [
      {
        role: "assistant",
        text: `I have access to your challenge pool of ${apiCandidates?.length ?? 0} ranked candidates. Your top matches right now are ${names}. Ask me who to interview, compare candidates, or explain rankings.`,
        citations: topCandidates.map((c) => ({
          id: c.id,
          candidate: c.name,
          detail: `${c.matchScore}% · ${c.recommendation} · ${c.stage}`,
        })),
      },
    ];
  }, [topCandidates, apiCandidates?.length]);

  const [turns, setTurns] = React.useState<ChatTurn[]>([]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const endRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (initialTurns.length > 0 && turns.length === 0) {
      setTurns(initialTurns);
    }
  }, [initialTurns, turns.length]);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, loading]);

  const suggestedQuestions = [
    "Who are the top 3 candidates in the pool?",
    "Which screened candidates should we advance?",
    "Summarize strengths of rank #1",
  ];

  const ask = async (q: string) => {
    if (!q.trim() || loading) return;

    const userTurn: ChatTurn = { role: "user", text: q };
    setTurns((t) => [...t, userTurn]);
    setInput("");
    setLoading(true);

    try {
      if (jobId) {
        const history: ChatMessage[] = turns.map((t) => ({
          role: t.role,
          content: t.text,
        }));
        const res = await api.chat(jobId, q, history);
        const replyLower = res.reply.toLowerCase();
        const citedFromApi = topCandidates.filter((c) =>
          res.referenced_candidates?.includes(c.id as string)
        );
        const citedFromText = topCandidates.filter((c) =>
          replyLower.includes(c.name.toLowerCase())
        );
        const cited = citedFromApi.length > 0 ? citedFromApi : citedFromText;
        setTurns((t) => [
          ...t,
          {
            role: "assistant",
            text: res.reply,
            guardrail: Boolean(res.guardrail_notice),
            citations:
              cited.length > 0
                ? cited.slice(0, 4).map((c) => ({
                    id: c.id,
                    candidate: c.name,
                    detail: `${c.matchScore}% · ${c.stage}`,
                  }))
                : undefined,
          },
        ]);
      } else if (topCandidates.length > 0) {
        const top = topCandidates[0];
        setTurns((t) => [
          ...t,
          {
            role: "assistant",
            text: `Based on your challenge rankings, ${top.name} is #1 with a ${top.matchScore}% match (${top.recommendation}). ${top.reasons[0] ?? "Strong profile in the imported pool."}`,
            citations: topCandidates.slice(0, 2).map((c) => ({
              id: c.id,
              candidate: c.name,
              detail: `${c.matchScore}% · ${c.stage}`,
            })),
          },
        ]);
      } else {
        setTurns((t) => [
          ...t,
          {
            role: "assistant",
            text: "No candidates in the database yet. Run ./scripts/import-challenge-candidates.sh first.",
          },
        ]);
      }
    } catch {
      setTurns((t) => [
        ...t,
        {
          role: "assistant",
          text: "Could not reach the ranking chat API. Ensure the backend is running on :8000.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell
      title="AI Recruiter"
      subtitle={`Grounded in your ${apiCandidates?.length ?? 0} imported challenge candidates`}
    >
      <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-160px)]">
        <div className="flex-1 overflow-y-auto pr-1 space-y-6">
          {turns.map((t, i) => (
            <Turn key={i} turn={t} />
          ))}
          {loading && (
            <p className="text-[13px] text-ink-muted pl-10">Thinking…</p>
          )}
          <div ref={endRef} />
        </div>

        <div className="flex flex-wrap gap-2 py-3">
          {suggestedQuestions.map((q) => (
            <button
              key={q}
              onClick={() => ask(q)}
              className="badge badge--neutral hover:border-accent/40 hover:text-accent transition-colors h-7"
            >
              {q}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
          className="relative"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about your candidates…"
            className="w-full h-13 py-3.5 pl-4 pr-14 rounded-xl border border-line-strong bg-surface text-[15px] shadow-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft transition"
          />
          <button
            type="submit"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 h-9 w-9 grid place-items-center rounded-lg bg-ink text-white hover:bg-ink-secondary disabled:opacity-40"
            disabled={!input.trim() || loading}
          >
            <ArrowUp size={17} />
          </button>
        </form>
        <p className="text-2xs text-ink-faint text-center mt-2">
          Guardrails: recruiting scope only · no PII · no discriminatory filtering.{" "}
          <Link href="/candidates" className="text-accent hover:underline">
            Verify in Candidates
          </Link>
        </p>
      </div>
    </AppShell>
  );
}

function Turn({ turn }: { turn: ChatTurn }) {
  if (turn.role === "user") {
    return (
      <div className="flex gap-3 justify-end">
        <div className="max-w-[80%] bg-ink text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-[14px] leading-relaxed">
          {turn.text}
        </div>
        <span className="avatar bg-subtle text-ink-muted" style={{ width: 30, height: 30 }}>
          <User size={15} />
        </span>
      </div>
    );
  }
  return (
    <div className="flex gap-3">
      <span
        className="avatar flex-shrink-0"
        style={{ width: 30, height: 30, background: "#4F46E5" }}
      >
        <Sparkles size={15} />
      </span>
      <div className="max-w-[85%] space-y-3">
        {turn.guardrail ? (
          <span className="inline-block text-[10px] font-medium uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-200/80 rounded px-2 py-0.5 mb-1">
            Guardrail
          </span>
        ) : null}
        <div className="text-[14px] text-ink-secondary leading-relaxed">
          {turn.text}
        </div>
        {turn.citations && (
          <div className="space-y-1.5">
            {turn.citations.map((c) => (
              <Link
                key={c.id + c.candidate}
                href={`/candidates?highlight=${c.id}`}
                className="card p-2.5 flex items-center gap-2.5 bg-subtle/60 hover:bg-subtle transition-colors"
              >
                <FileText size={15} className="text-accent flex-shrink-0" />
                <span className="text-[13px] font-semibold text-ink">
                  {c.candidate}
                </span>
                <span className="text-[12.5px] text-ink-muted ml-auto tnum">
                  {c.detail}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}