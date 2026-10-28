// The desk reads a snapshot of the group's bookings taken on one morning. Every "today" in the app
// comes from here, so the grid, the finding and the tests agree on which dates are past, which is
// today and which are ahead.
export const AS_OF = "2026-10-28";

// Six whole weeks, Monday to Sunday, starting on the Monday of the as-of week.
export const WINDOW_WEEKS = 6;

export function windowStart(asOf: string = AS_OF): string {
  const d = parseISO(asOf);
  const day = (d.getUTCDay() + 6) % 7; // Monday = 0
  d.setUTCDate(d.getUTCDate() - day);
  return toISO(d);
}

export function windowDates(asOf: string = AS_OF): string[] {
  const start = parseISO(windowStart(asOf));
  return Array.from({ length: WINDOW_WEEKS * 7 }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    return toISO(d);
  });
}

export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(iso: string, n: number): string {
  const d = parseISO(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return toISO(d);
}

/** 0 = Monday … 6 = Sunday */
export function weekday(iso: string): number {
  return (parseISO(iso).getUTCDay() + 6) % 7;
}

export const WEEKDAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export const WEEKDAY_LONG = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
