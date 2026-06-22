"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Sparkles, AlertCircle } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/app/AppShell";
import { api } from "@/lib/api";

const SAMPLE = `We're hiring a Senior ML Engineer for our platform team to design, build and deploy production ML systems powering real-time ranking and personalization.

Required
- 5+ years with Python and PyTorch or TensorFlow
- Strong data-engineering fundamentals and SQL
- Experience deploying models to production at scale
- AWS or GCP

Nice to have
- Startup / scale-up background
- Leadership of small teams
- Open-source contributions`;

function buildDescription(
  description: string,
  dept: string,
  location: string
): string {
  const parts: string[] = [];
  if (dept.trim()) parts.push(`Department: ${dept.trim()}`);
  if (location.trim()) parts.push(`Location: ${location.trim()}`);
  if (parts.length > 0) {
    return `${parts.join("\n")}\n\n${description.trim()}`;
  }
  return description.trim();
}

export default function NewJobPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [title, setTitle] = React.useState("Senior Machine Learning Engineer");
  const [dept, setDept] = React.useState("Engineering");
  const [location, setLocation] = React.useState("Pune / Remote");
  const [description, setDescription] = React.useState(SAMPLE);

  const create = useMutation({
    mutationFn: () =>
      api.createJob({
        title: title.trim(),
        description: buildDescription(description, dept, location),
      }),
    onSuccess: (job) => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["workspace-jobs-overview"] });
      router.push(`/jobs/${job.id}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || create.isPending) return;
    create.mutate();
  };

  return (
    <AppShell
      title="Create a job"
      subtitle="Describe the role — candidates are ranked automatically"
    >
      <div className="max-w-3xl">
        <Link
          href="/jobs"
          className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted hover:text-ink mb-5"
        >
          <ArrowLeft size={15} /> Back to jobs
        </Link>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="card p-6 space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Job title" required>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="inp"
                  required
                  disabled={create.isPending}
                />
              </Field>
              <Field label="Department">
                <input
                  value={dept}
                  onChange={(e) => setDept(e.target.value)}
                  className="inp"
                  disabled={create.isPending}
                />
              </Field>
            </div>
            <Field label="Location">
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="inp"
                disabled={create.isPending}
              />
            </Field>
            <Field label="Job description" required>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={12}
                className="inp resize-none leading-relaxed"
                required
                disabled={create.isPending}
              />
            </Field>
          </div>

          <div className="card p-4 bg-accent-soft/50 border-accent/20 flex items-start gap-3">
            <Sparkles size={16} className="text-accent mt-0.5 flex-shrink-0" />
            <p className="text-[13px] text-ink-secondary leading-relaxed">
              On create, RecruitGPT extracts the role&apos;s requirements and ranks
              your candidate pool with transparent reasoning — usually in under a
              minute.
            </p>
          </div>

          {create.isError && (
            <div className="card p-4 border-critical/20 bg-critical/5 flex items-start gap-3">
              <AlertCircle size={18} className="text-critical mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[14px] font-medium text-critical">
                  Could not create job
                </p>
                <p className="text-[13px] text-ink-muted mt-1">
                  {(create.error as Error)?.message ??
                    "Is the backend running on http://localhost:8000?"}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="btn btn--primary"
              disabled={
                create.isPending || !title.trim() || !description.trim()
              }
            >
              {create.isPending ? (
                <>Parsing JD &amp; creating…</>
              ) : (
                <>
                  Create &amp; rank candidates <ArrowRight size={16} />
                </>
              )}
            </button>
            <Link
              href="/jobs"
              className={`btn btn--ghost ${create.isPending ? "pointer-events-none opacity-50" : ""}`}
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>

      <style jsx>{`
        .inp {
          width: 100%;
          height: 40px;
          padding: 0 12px;
          border-radius: 9px;
          border: 1px solid var(--line);
          background: var(--surface);
          font-size: 14px;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        textarea.inp {
          height: auto;
          padding: 10px 12px;
        }
        .inp:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 4px var(--accent-soft);
        }
        .inp:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </AppShell>
  );
}

function Field({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[12.5px] font-medium text-ink-muted">
        {label}
        {required && <span className="text-critical"> *</span>}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}