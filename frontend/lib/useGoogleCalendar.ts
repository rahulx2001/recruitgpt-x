"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { api } from "./api";

export type BusyBlock = {
  start: string;
  end: string;
  label: string;
  source: string;
};

export function useCalendarStatus() {
  return useQuery({
    queryKey: ["calendar-status"],
    queryFn: () => api.calendarStatus(),
    staleTime: 60_000,
  });
}

export function useInterviewerFreeBusy(
  interviewer: string,
  day: Date,
  enabled: boolean
) {
  const dateStr = format(day, "yyyy-MM-dd");
  return useQuery({
    queryKey: ["calendar-freebusy", interviewer, dateStr],
    queryFn: () => api.calendarFreeBusy(interviewer, dateStr),
    enabled: enabled && interviewer !== "all",
    staleTime: 30_000,
  });
}

export function parseBlockTime(iso: string): Date {
  return new Date(iso);
}

export function formatBlockRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  return `${format(s, "h:mm a")} – ${format(e, "h:mm a")}`;
}

/** True if proposed slot overlaps any Google Calendar busy block. */
export function conflictsWithBusy(
  proposed: Date,
  durationMinutes: number,
  blocks: BusyBlock[]
): BusyBlock | null {
  const start = proposed.getTime();
  const end = start + durationMinutes * 60 * 1000;
  for (const block of blocks) {
    const bStart = new Date(block.start).getTime();
    const bEnd = new Date(block.end).getTime();
    if (start < bEnd && end > bStart) return block;
  }
  return null;
}