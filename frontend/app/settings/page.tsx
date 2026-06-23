"use client";

import * as React from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { Avatar } from "@/components/app/Atoms";
import { GoogleCalendarConnect } from "@/components/app/GoogleCalendarConnect";
import { teamMembers } from "@/lib/mock";
import { WORKSPACE_USER } from "@/lib/userProfile";

const SECTIONS = [
  { id: "profile", label: "Profile" },
  { id: "workspace", label: "Workspace" },
  { id: "team", label: "Team" },
  { id: "preferences", label: "Preferences" },
] as const;

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-canvas" />}>
      <SettingsView />
    </Suspense>
  );
}

function SettingsView() {
  const searchParams = useSearchParams();
  const sectionParam = searchParams.get("section");
  const active =
    SECTIONS.find((s) => s.id === sectionParam)?.id ?? "workspace";

  const [toast, setToast] = React.useState<string | null>(null);
  const [prefs, setPrefs] = React.useState({
    availability: true,
    keyword: true,
    hiddenGems: true,
    honeypot: true,
  });

  React.useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(t);
  }, [toast]);

  return (
    <AppShell title="Settings" subtitle="Workspace, team, and ranking preferences">
      <div className="flex flex-col lg:flex-row gap-5 max-w-4xl">
        <nav className="lg:w-44 shrink-0 flex lg:flex-col gap-1 overflow-x-auto">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`/settings?section=${s.id}`}
              className={`px-3 py-2 rounded-lg text-[13px] font-medium whitespace-nowrap transition-colors ${
                active === s.id
                  ? "bg-subtle text-ink"
                  : "text-ink-muted hover:text-ink hover:bg-subtle/60"
              }`}
            >
              {s.label}
            </a>
          ))}
        </nav>

        <div className="flex-1 space-y-5 min-w-0">
          {(active === "profile" || active === "workspace") && (
            <div className="card p-5">
              <h3 className="text-[14px] font-semibold text-ink mb-4">
                {active === "profile" ? "Profile" : "Workspace"}
              </h3>
              <div className="space-y-4">
                {active === "profile" && (
                  <div className="flex items-center gap-3 mb-2">
                    <Avatar
                      name={WORKSPACE_USER.name}
                      color={WORKSPACE_USER.color}
                      src={WORKSPACE_USER.avatarSrc}
                      size={48}
                    />
                    <div>
                      <div className="text-[15px] font-semibold text-ink">
                        {WORKSPACE_USER.name}
                      </div>
                      <div className="text-[13px] text-ink-muted">
                        {WORKSPACE_USER.role} · {WORKSPACE_USER.company}
                      </div>
                    </div>
                  </div>
                )}
                <Field label="Company name" value="Northwind" />
                <Field label="Workspace URL" value="northwind.recruitgpt.com" />
                <Field label="Default location" value="Pune, India" />
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  onClick={() => setToast("Settings saved")}
                >
                  Save changes
                </button>
              </div>
            </div>
          )}

          {active === "workspace" && (
            <div className="card p-5">
              <h3 className="text-[14px] font-semibold text-ink mb-1">
                Calendar integrations
              </h3>
              <p className="text-[12.5px] text-ink-muted mb-4">
                Connect Google Workspace so interviewer busy times block scheduling
                conflicts. HR, interviewers, and candidates all see the same slots.
              </p>
              <GoogleCalendarConnect
                onConnect={() => setToast("Google Calendar demo sync enabled")}
                onError={(msg) => setToast(msg)}
              />
              <ul className="text-[12px] text-ink-muted mt-4 space-y-1.5 list-disc pl-4">
                <li>Reads free/busy from each interviewer&apos;s Google Calendar</li>
                <li>Creates interview events with Google Meet links on schedule</li>
                <li>Sends calendar invites to candidates automatically</li>
              </ul>
            </div>
          )}

          {active === "team" && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[14px] font-semibold text-ink">Team</h3>
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  onClick={() => setToast("Invite link copied to clipboard")}
                >
                  Invite
                </button>
              </div>
              <div className="divide-y divide-line -mx-1">
                {teamMembers.map((m) => (
                  <div
                    key={m.name}
                    className="flex items-center gap-3 px-1 py-3"
                  >
                    <Avatar name={m.name} color={m.color} size={34} />
                    <div className="flex-1">
                      <div className="text-[14px] font-medium text-ink">
                        {m.name}
                      </div>
                      <div className="text-[12.5px] text-ink-muted">{m.role}</div>
                    </div>
                    <span className="badge badge--neutral">Active</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {active === "preferences" && (
            <div className="card p-5">
              <h3 className="text-[14px] font-semibold text-ink mb-1">
                Ranking preferences
              </h3>
              <p className="text-[12.5px] text-ink-muted mb-4">
                Tune how candidates are scored across every requisition.
              </p>
              <div className="space-y-3">
                <Toggle
                  label="Prioritise actively-available candidates"
                  on={prefs.availability}
                  onChange={(v) =>
                    setPrefs((p) => ({ ...p, availability: v }))
                  }
                />
                <Toggle
                  label="Down-weight keyword-stuffed profiles"
                  on={prefs.keyword}
                  onChange={(v) => setPrefs((p) => ({ ...p, keyword: v }))}
                />
                <Toggle
                  label="Surface hidden gems below rank 20"
                  on={prefs.hiddenGems}
                  onChange={(v) =>
                    setPrefs((p) => ({ ...p, hiddenGems: v }))
                  }
                />
                <Toggle
                  label="Flag impossible / inconsistent profiles"
                  on={prefs.honeypot}
                  onChange={(v) => setPrefs((p) => ({ ...p, honeypot: v }))}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div
          role="status"
          className="toast"
        >
          {toast}
        </div>
      )}
    </AppShell>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="text-[12.5px] font-medium text-ink-muted">{label}</label>
      <input
        defaultValue={value}
        className="mt-1.5 w-full h-10 px-3 rounded-lg border border-line bg-surface text-[14px] outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft transition"
      />
    </div>
  );
}

function Toggle({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      className="flex items-center justify-between w-full text-left rounded-lg px-1 py-1 hover:bg-subtle transition-colors"
      onClick={() => onChange(!on)}
    >
      <span className="text-[13.5px] text-ink-secondary">{label}</span>
      <span
        className={`w-9 h-5 rounded-full p-0.5 transition-colors shrink-0 ${
          on ? "bg-accent" : "bg-line-strong"
        }`}
      >
        <span
          className={`block w-4 h-4 rounded-full bg-white transition-transform ${
            on ? "translate-x-4" : ""
          }`}
        />
      </span>
    </button>
  );
}