import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isSameDay,
  isSameMonth,
  isToday,
  setHours,
  setMinutes,
  startOfDay,
  startOfMonth,
  subMonths,
} from "date-fns";
import type { InterviewRecord } from "./interviewUtils";

const DAY_ABBR: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export type ParsedInterviewSlot = {
  date: Date;
  timeLabel: string;
  dayLabel: string;
};

function parseTimeLabel(timeRaw: string): { hours: number; minutes: number; label: string } {
  const match = timeRaw.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) {
    return { hours: 9, minutes: 0, label: "9:00 AM" };
  }
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3]!.toUpperCase();
  if (meridiem === "PM" && hours < 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;
  return { hours, minutes, label: `${match[1]}:${match[2]} ${meridiem}` };
}

function resolveWeekday(abbr: string, ref: Date, preferPast: boolean): Date {
  const target = DAY_ABBR[abbr.slice(0, 3)];
  if (target == null) return startOfDay(ref);
  const current = getDay(ref);
  let diff = target - current;
  if (diff === 0) return startOfDay(ref);
  if (preferPast) {
    if (diff > 0) diff -= 7;
  } else if (diff < 0) {
    diff += 7;
  }
  return addDays(startOfDay(ref), diff);
}

/** Map backend `when` strings to a concrete calendar date. */
export function parseInterviewDate(
  when: string,
  ref: Date = new Date(),
  status?: InterviewRecord["status"]
): ParsedInterviewSlot {
  const base = startOfDay(ref);

  if (when === "Yesterday") {
    const date = addDays(base, -1);
    return { date, timeLabel: "Completed", dayLabel: "Yesterday" };
  }

  const parts = when.split(" · ");
  const dayPart = parts[0] ?? when;
  const timePart = parts[1];
  const time = parseTimeLabel(timePart ?? "9:00 AM");

  let date = base;
  if (dayPart.startsWith("Today")) {
    date = base;
  } else if (dayPart.startsWith("Tomorrow")) {
    date = addDays(base, 1);
  } else if (dayPart.startsWith("Next ")) {
    const abbr = dayPart.replace("Next ", "");
    date = addDays(resolveWeekday(abbr, base, false), 7);
  } else if (DAY_ABBR[dayPart.slice(0, 3)] != null) {
    date = resolveWeekday(dayPart, base, status === "Completed");
  }

  date = setMinutes(setHours(date, time.hours), time.minutes);
  return {
    date,
    timeLabel: time.label,
    dayLabel: dayPart,
  };
}

export function formatRescheduledWhen(date: Date): string {
  const today = startOfDay(new Date());
  const target = startOfDay(date);
  const dayDiff = Math.round(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
  const timeLabel = format(date, "h:mm a");

  if (dayDiff === 0) return `Today · ${timeLabel}`;
  if (dayDiff === 1) return `Tomorrow · ${timeLabel}`;
  if (dayDiff === -1) return "Yesterday";
  return `${format(date, "EEE")} · ${timeLabel}`;
}

export type CalendarInterview = InterviewRecord & {
  calendarDate: Date;
  calendarTime: string;
};

export function toCalendarInterviews(
  rows: InterviewRecord[],
  overrides?: Map<string, { date: Date; when: string }>
): CalendarInterview[] {
  return rows.map((row) => {
    const override = overrides?.get(row.id);
    if (override) {
      return {
        ...row,
        when: override.when,
        calendarDate: override.date,
        calendarTime: format(override.date, "h:mm a"),
      };
    }
    const parsed = parseInterviewDate(row.when, new Date(), row.status);
    return {
      ...row,
      calendarDate: parsed.date,
      calendarTime: parsed.timeLabel,
    };
  });
}

export function getMonthGrid(month: Date): Date[] {
  const start = startOfMonth(month);
  const end = endOfMonth(month);
  const gridStart = addDays(start, -getDay(start));
  const gridEnd = addDays(end, 6 - getDay(end));
  return eachDayOfInterval({ start: gridStart, end: gridEnd });
}

export function interviewsOnDay(
  rows: CalendarInterview[],
  day: Date
): CalendarInterview[] {
  return rows
    .filter((row) => isSameDay(row.calendarDate, day))
    .sort(
      (a, b) => a.calendarDate.getTime() - b.calendarDate.getTime()
    );
}

export function countOnDay(rows: CalendarInterview[], day: Date): number {
  return rows.filter((row) => isSameDay(row.calendarDate, day)).length;
}

export function uniqueInterviewers(rows: InterviewRecord[]): string[] {
  return [...new Set(rows.map((r) => r.interviewer))].sort();
}

export {
  addMonths,
  subMonths,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  eachDayOfInterval,
};