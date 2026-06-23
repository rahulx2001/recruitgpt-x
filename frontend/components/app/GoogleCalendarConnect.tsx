"use client";

import * as React from "react";
import Link from "next/link";
import { Calendar, Check, ExternalLink } from "lucide-react";
import { useCalendarStatus } from "@/lib/useGoogleCalendar";
import { api } from "@/lib/api";

export function GoogleCalendarConnect({
  onConnect,
  onError,
}: {
  onConnect?: () => void;
  onError?: (message: string) => void;
}) {
  const { data: status, isLoading } = useCalendarStatus();
  const [connecting, setConnecting] = React.useState(false);
  const [localMessage, setLocalMessage] = React.useState<string | null>(null);

  const handleConnect = async () => {
    setConnecting(true);
    setLocalMessage(null);
    try {
      const oauth = await api.calendarOAuthUrl();
      if (oauth.url) {
        window.location.href = oauth.url;
        return;
      }
      onConnect?.();
      setLocalMessage(oauth.message ?? "Demo calendar sync enabled.");
    } catch {
      const msg = "Could not connect Google Calendar — try again.";
      onError?.(msg);
      setLocalMessage(msg);
    } finally {
      setConnecting(false);
    }
  };

  if (isLoading || !status) {
    return (
      <div className="gcal-connect gcal-connect--loading">
        <div className="skeleton h-4 w-48" />
      </div>
    );
  }

  return (
    <div
      className={`gcal-connect${status.connected ? " is-connected" : ""}`}
    >
      <div className="gcal-connect__icon" aria-hidden>
        <Calendar size={18} />
      </div>
      <div className="gcal-connect__body min-w-0">
        <div className="gcal-connect__title">
          {status.connected
            ? "Google Workspace calendar synced"
            : "Connect Google Workspace calendar"}
        </div>
        <p className="gcal-connect__hint">
          {status.connected
            ? status.account_email
              ? `${status.account_email} · busy times block scheduling conflicts`
              : "Busy times from Google Calendar block double-booking"
            : "Sync interviewer availability — meetings, OOO, and focus blocks prevent conflicts"}
        </p>
      </div>
      {status.connected ? (
        <span className="gcal-connect__badge">
          <Check size={14} /> Synced
        </span>
      ) : (
        <button
          type="button"
          className="btn btn--secondary btn--sm shrink-0"
          disabled={connecting}
          onClick={handleConnect}
        >
          {connecting ? "Connecting…" : "Connect Google"}
        </button>
      )}
      <Link
        href="/settings?section=workspace"
        className="gcal-connect__settings"
        aria-label="Calendar settings"
      >
        <ExternalLink size={14} />
      </Link>
      {localMessage ? (
        <p className="gcal-connect__message text-[12px] text-ink-muted mt-2 w-full">
          {localMessage}
        </p>
      ) : null}
    </div>
  );
}