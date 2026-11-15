/**
 * Builds a Google Calendar "new event" link. The user stays in control: the page
 * opens pre-filled and nothing is written until they press Save, so the app needs
 * no calendar permissions at all.
 */

/** Slot used when a planned meal has no time of its own. */
export const DEFAULT_MEAL_TIME = '19:00';
const DEFAULT_DURATION_MINUTES = 60;

export type CalendarEventLink = {
  title: string;
  /** `YYYY-MM-DD`. */
  date: string;
  /** `HH:MM`; falls back to {@link DEFAULT_MEAL_TIME}. */
  time?: string;
  details?: string;
};

/** `YYYYMMDDTHHMMSS`, the wall-clock format Google expects next to `ctz`. */
function stamp(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `T${pad(date.getHours())}${pad(date.getMinutes())}00`
  );
}

export function googleCalendarEventUrl(event: CalendarEventLink): string {
  const start = new Date(`${event.date}T${event.time || DEFAULT_MEAL_TIME}:00`);
  const end = new Date(start.getTime() + DEFAULT_DURATION_MINUTES * 60_000);

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${stamp(start)}/${stamp(end)}`,
    // The times above are local, so the viewer's zone has to travel with them.
    ctz: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
  if (event.details) {
    params.set('details', event.details);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
