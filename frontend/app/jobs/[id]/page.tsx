"use client";

import { Suspense } from "react";
import { JobDetailView } from "@/components/app/JobDetailView";

export default function JobDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-canvas flex items-center justify-center text-ink-muted text-sm">
          Loading job analysis…
        </div>
      }
    >
      <JobDetailView />
    </Suspense>
  );
}