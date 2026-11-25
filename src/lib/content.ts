import snapshot from '../../inputs/snapshot.json';

export interface Run {
  text: string;
  href?: string;
}
export interface Section {
  image?: { src: string; alt: string };
  blocks: { kind: 'heading' | 'text' | 'item' | 'link'; runs: Run[] }[];
}
export interface Page {
  route: string;
  label: string;
  title: string;
  sections: Section[];
}
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

export const pages = Object.values(import.meta.glob<Page>('../../inputs/pages/*.json', { eager: true, import: 'default' }));
export const sermons = Object.values(import.meta.glob<Sermon>('../../inputs/sermons/*.json', { eager: true, import: 'default' }))
  .sort((a, b) => b.date.localeCompare(a.date));
export const events = Object.values(import.meta.glob<Event>('../../inputs/events/*.json', { eager: true, import: 'default' }))
  .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));

const date = new Intl.DateTimeFormat('en-AU', { dateStyle: 'long', timeZone: snapshot.timezone });
const clock = new Intl.DateTimeFormat('en-AU', { timeStyle: 'short', timeZone: snapshot.timezone });
export const displayDate = (value: string) => date.format(new Date(value.length === 10 ? value + 'T00:00:00Z' : value));
export const displayTime = (value: string) => clock.format(new Date(value));

export function safeHref(href: string) {
  if (/^\/(?![\/\\])|^#/.test(href) && !/[\x00-\x20\\]/.test(href)) {
    const path = new URL(href, snapshot.sources.pages).pathname;
    if (href.startsWith('#') || path === '/' || path === '/home' || pages.some(page => page.route === path)) return href;
    return new URL(href, snapshot.sources.pages).href;
  }
  try {
    const url = new URL(href);
    if (['https:', 'mailto:', 'tel:'].includes(url.protocol) && !url.username && !url.password) return href;
  } catch {
    return undefined;
  }
}
