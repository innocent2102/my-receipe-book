/** Week helpers for the meal planner. Dates are plain `YYYY-MM-DD` strings. */

/** Local calendar date, not the UTC one `toISOString` would give. */
export function isoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Monday of the week the given date falls in. */
export function startOfWeek(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const weekday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - weekday);
  return start;
}

export function addDays(date: string | Date, days: number): Date {
  const base = typeof date === 'string' ? new Date(`${date}T00:00:00`) : new Date(date);
  base.setDate(base.getDate() + days);
  return base;
}

/** The seven days of the week starting at `weekStart`, Monday first. */
export function weekDays(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, index) => isoDate(addDays(weekStart, index)));
}
