"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { api } from "@/lib/api";
import { Briefcase, ArrowRight, Plus, Sparkles } from "lucide-react";

export default function JobsListPage() {
  const { data: jobs = [], isLoading } = useQuery({ queryKey: ["jobs"], queryFn: api.listJobs });

  return (
    <>
      <Navbar />
      <main className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-ink mb-1">Jobs</h1>
            <p className="text-ink-muted text-sm">
              All job postings with rankings & insights.
            </p>
          </div>
          <Link href="/jobs/new">
            <Button>
              <Plus className="h-4 w-4" /> New Job
            </Button>
          </Link>
        </div>

        {isLoading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 skeleton rounded-xl" />
            ))}
          </div>
        )}

        <div className="space-y-3">
          {jobs.map((j) => (
            <Link key={j.id} href={`/jobs/${j.id}`}>
              <Card className="p-5 hover:border-brand-400/40 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-brand-500/20 to-accent-violet/20 border border-brand-500/30 flex items-center justify-center">
                    <Briefcase className="h-5 w-5 text-brand-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-ink">{j.title}</h3>
                      {j.blueprint && (
                        <Badge variant="cyan">
                          <Sparkles className="h-3 w-3" /> Blueprint ready
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-ink-muted line-clamp-1">
                      {j.description.slice(0, 150)}...
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {j.blueprint?.hard_skills?.slice(0, 5).map((s, i) => (
                        <Badge key={i} variant="default" className="text-[10px]">{s}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[10px] text-ink-subtle uppercase tracking-wider mb-1">
                      Created
                    </div>
                    <div className="text-xs text-ink-muted">
                      {new Date(j.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-ink-subtle group-hover:text-brand-400 group-hover:translate-x-1 transition-all" />
                </div>
              </Card>
            </Link>
          ))}
          {jobs.length === 0 && !isLoading && (
            <Card className="p-12 text-center border-dashed">
              <Briefcase className="h-10 w-10 text-ink-subtle mx-auto mb-3" />
              <div className="text-sm text-ink-muted">No jobs yet. Create your first one!</div>
              <Link href="/jobs/new" className="inline-block mt-4">
                <Button>
                  <Plus className="h-4 w-4" /> Create Job
                </Button>
              </Link>
            </Card>
          )}
        </div>
      </main>
    </>
  );
}
