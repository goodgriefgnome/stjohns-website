// Events for the home summary and the /events page: which events to show, grouped the way the list and mini calendar need them.
import snapshot from '../../imported/snapshot.json';
import { events, type Event } from './content';

const timeZone = snapshot.timezone;
const isoDate = new Intl.DateTimeFormat('en-CA', { timeZone }); // en-CA formats as YYYY-MM-DD
const pad = (n: number) => String(n).padStart(2, '0');

/** The build day in the church's time zone, so a UTC build server doesn't start the window a day early. */
export const today = isoDate.format(new Date());

/** The window runs from the build day to the end of the month five months later (six months in all). */
const [year, month] = today.split('-').map(Number);
const windowEnd = new Date(Date.UTC(year, month + 5, 0)).toISOString().slice(0, 10);

export interface Day { date: string; day: number; weekday: number }
export interface Month { key: string; label: string; days: Day[] }

const monthLabel = new Intl.DateTimeFormat('en-AU', { month: 'long', year: 'numeric', timeZone: 'UTC' });
export const months: Month[] = [0, 1, 2, 3, 4, 5].map(offset => {
  const first = new Date(Date.UTC(year, month - 1 + offset, 1));
  const count = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  const key = first.toISOString().slice(0, 7);
  return {
    key,
    label: monthLabel.format(first),
    days: Array.from({ length: count }, (_, i) => ({ date: `${key}-${pad(i + 1)}`, day: i + 1, weekday: (first.getUTCDay() + i) % 7 })),
  };
});

export const upcoming = events.filter(event => event.endDate >= today && event.startDate <= windowEnd);

/** Occurrences grouped by month, then by the day they start. */
export const byMonth = Map.groupBy(upcoming, event => event.startDate.slice(0, 7));
export const byDay = (occurrences: Event[]) => Map.groupBy(occurrences, event => event.startDate);
/** An event is featured (shown under Save the date on the home page) when staff tag it "Featured" in Church Center. */
export const isFeatured = (event: Event) => !!event.tags?.includes('Featured');
export const eventDays = new Set(upcoming.map(event => event.startDate));

/** The first occurrence in the window of each repeating series carries its description; the page script moves it on as occurrences pass. */
export const series = (event: Event) => event.eventId ?? event.id;
const firstOfSeries = new Map(upcoming.toReversed().map(event => [series(event), event.id]));
export const describes = (event: Event) => !!event.description && firstOfSeries.get(series(event)) === event.id;

const dayHeading = new Intl.DateTimeFormat('en-AU', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'UTC' });
const shortDate = new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const utcDate = (date: string) => new Date(date + 'T00:00:00Z');
/** "Saturday 28 Nov" */
export const displayDay = (date: string) => dayHeading.format(utcDate(date)).replace(',', '');

const clockParts = new Intl.DateTimeFormat('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone });
function clock(iso: string) {
  const parts = Object.fromEntries(clockParts.formatToParts(new Date(iso)).map(part => [part.type, part.value]));
  return { time: parts.minute === '00' ? parts.hour : `${parts.hour}:${parts.minute}`, period: parts.dayPeriod.toLowerCase() };
}

/** Short times, as the live calendar writes them: "7–9pm", "11:30am–2pm", "at 7:30pm", "until 13 Dec". */
export function displayTimes(event: Event) {
  const until = event.endDate !== event.startDate ? `until ${shortDate.format(utcDate(event.endDate))}` : '';
  if (event.allDay) return until;
  const start = clock(event.start);
  const end = clock(event.end);
  // The source gives some events no real end: the same time, or a minute later.
  const time = Date.parse(event.end) - Date.parse(event.start) <= 60_000
    ? `at ${start.time}${start.period}`
    : start.period === end.period
      ? `${start.time}–${end.time}${end.period}`
      : `${start.time}${start.period}–${end.time}${end.period}`;
  return [time, until].filter(Boolean).join(' ');
}

/** "Every other Wednesday" or "Second Sunday of each month"; nothing for a one-off. */
export function displayRecurrence(event: Event) {
  const rule = event.recurrence?.split(' from ')[0] ?? '';
  if (!/^(the |every )/i.test(rule)) return '';
  const text = rule.replace(/^the /i, '').replace('every month', 'each month');
  return text[0].toUpperCase() + text.slice(1);
}
