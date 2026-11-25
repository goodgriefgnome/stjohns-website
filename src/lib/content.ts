import snapshot from '../../inputs/snapshot.json';

export interface Sermon {
  id: string;
  slug: string;
  title: string;
  date: string;
  /** Local start time ("HH:MM", Sydney) of the service the sermon was recorded at. */
  service: string;
  scripture: string;
  series: string;
  preacher: string;
  description: string[];
  audioUrl: string;
  /** Size of the audio file in bytes, required by the podcast feed's <enclosure>. */
  audioBytes: number;
  durationSeconds: number;
  /** `podcastSrc` is a square JPEG (1400–3000px) for podcast apps, which don't accept WebP. */
  artwork?: { src: string; alt: string; podcastSrc?: string };
}
export interface Event {
  id: string;
  /** The Church Center event that a repeating occurrence belongs to. */
  eventId?: string;
  title: string;
  start: string;
  end: string;
  startDate: string;
  endDate: string;
  /** Church Center's description of the schedule, e.g. "Every other Wednesday from 10:00am to 11:00am beginning 04/11/2026". */
  recurrence?: string;
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
export const displayDate = (value: string) => date.format(new Date(value.length === 10 ? value + 'T00:00:00Z' : value));

// The moment a sermon was preached: its date at its service's local start time.
export function sermonStart({ date, service }: Sermon) {
  if (!/^\d{2}:\d{2}$/.test(service)) throw new Error(`Sermon on ${date} needs a service time like "10:00", not "${service}"`);
  // Read the wall-clock time as if it were UTC, then subtract Sydney's offset from UTC at that moment.
  const asUtc = new Date(`${date}T${service}:00Z`);
  const offset = (instant: Date) => {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat('en-US', { timeZone: snapshot.timezone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
        .formatToParts(instant).map(part => [part.type, part.value]),
    );
    return Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second) - instant.getTime();
  };
  return new Date(asUtc.getTime() - offset(new Date(asUtc.getTime() - offset(asUtc))));
}

export function safeHref(href: string) {
  try {
    const url = new URL(href);
    if (['https:', 'mailto:', 'tel:'].includes(url.protocol) && !url.username && !url.password) return href;
  } catch {
    return undefined;
  }
}
