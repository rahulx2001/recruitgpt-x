"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-8">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-ink mb-2">
          Something went wrong
        </h1>
        <p className="text-ink-muted text-sm mb-6">
          The page hit an unexpected error. Try refreshing or return to the dashboard.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <button type="button" onClick={reset} className="btn btn--primary btn--sm">
            Try again
          </button>
          <Link href="/dashboard" className="btn btn--secondary btn--sm">
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}