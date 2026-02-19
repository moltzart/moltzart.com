// src/lib/newsletter-weeks.ts

/**
 * Returns the Monday ISO date for the week containing isoDate.
 * Sat/Sun roll forward to the next Monday.
 */
export function getWeekMonday(isoDate: string): string {
  const d = new Date(isoDate + "T12:00:00Z");
  const day = d.getUTCDay(); // 0=Sun, 1=Mon … 6=Sat
  const offset = day === 0 ? 1 : day === 6 ? 2 : -(day - 1);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

/** Returns { start: monday, end: friday } for a given Monday ISO date. */
export function getWeekBounds(monday: string): { start: string; end: string } {
  const d = new Date(monday + "T12:00:00Z");
  const start = d.toISOString().slice(0, 10);
  d.setUTCDate(d.getUTCDate() + 4);
  return { start, end: d.toISOString().slice(0, 10) };
}

/** Returns the Monday of the current week. */
export function getCurrentWeekMonday(): string {
  return getWeekMonday(new Date().toISOString().slice(0, 10));
}

/**
 * Formats a Monday ISO date as a human-readable label.
 * "2026-02-16" → "Feb 16–20, 2026"
 */
export function formatWeekLabel(monday: string): string {
  const d = new Date(monday + "T12:00:00Z");
  const friday = new Date(monday + "T12:00:00Z");
  friday.setUTCDate(friday.getUTCDate() + 4);
  const monMonth = d.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  const friMonth = friday.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  const fridayLabel =
    friMonth === monMonth
      ? `${friday.getUTCDate()}`
      : `${friMonth} ${friday.getUTCDate()}`;
  return `${monMonth} ${d.getUTCDate()}–${fridayLabel}, ${d.getUTCFullYear()}`;
}
