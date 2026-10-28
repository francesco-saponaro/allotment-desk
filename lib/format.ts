import { WEEKDAY_SHORT, parseISO, weekday } from "@/data/clock";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "€36,644" */
export function euros(n: number): string {
  return "€" + Math.round(n).toLocaleString("en-GB");
}

/** "42.4%", or a dash when there is nothing to divide by */
export function percent(ratio: number | null): string {
  return ratio === null ? "–" : (ratio * 100).toFixed(1) + "%";
}

/** "28 Oct" */
export function shortDate(iso: string): string {
  const d = parseISO(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** "Wed 28 Oct" */
export function dayDate(iso: string): string {
  return `${WEEKDAY_SHORT[weekday(iso)]} ${shortDate(iso)}`;
}

/** "26 Oct to 6 Dec" */
export function dateRange(from: string, to: string): string {
  return `${shortDate(from)} to ${shortDate(to)}`;
}

/** "20 Oct, 19:42" from "2026-10-20T19:42" */
export function bookedAt(stamp: string): string {
  const [date, time] = stamp.split("T");
  return `${shortDate(date)}, ${time}`;
}

/** "in 4 days", "today", "tomorrow" */
export function inDays(n: number): string {
  if (n === 0) return "today";
  if (n === 1) return "tomorrow";
  return `in ${n} days`;
}

export function monthName(iso: string): string {
  return MONTHS[parseISO(iso).getUTCMonth()];
}
