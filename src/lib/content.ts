import snapshot from '../../inputs/snapshot.json';

export interface Sermon {
  id: string;
  slug: string;
  title: string;
  date: string;
  scripture: string;
  series: string;
  preacher: string;
  description: string[];
  audioUrl: string;
  durationSeconds: number;
  artwork?: { src: string; alt: string };
}
export interface Event {
  id: string;
  title: string;
  start: string;
  end: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
  location: string;
  description: string;
  detailsUrl: string | null;
  registrationUrl: string | null;
}

export const sermons = Object.values(import.meta.glob<Sermon>('../../inputs/sermons/*.json', { eager: true, import: 'default' }))
  .sort((a, b) => b.date.localeCompare(a.date));
export const events = Object.values(import.meta.glob<Event>('../../inputs/events/*.json', { eager: true, import: 'default' }))
  .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));

const date = new Intl.DateTimeFormat('en-AU', { dateStyle: 'long', timeZone: snapshot.timezone });
const clock = new Intl.DateTimeFormat('en-AU', { timeStyle: 'short', timeZone: snapshot.timezone });
export const displayDate = (value: string) => date.format(new Date(value.length === 10 ? value + 'T00:00:00Z' : value));
export const displayTime = (value: string) => clock.format(new Date(value));

export function safeHref(href: string) {
  try {
    const url = new URL(href);
    if (['https:', 'mailto:', 'tel:'].includes(url.protocol) && !url.username && !url.password) return href;
  } catch {
    return undefined;
  }
}
