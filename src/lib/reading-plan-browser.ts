// Browser side of the Bible reading plan: today's date, the reader's choices (version and bookmark), and redrawing a day.
// Choices are kept in this browser only (localStorage). If storage is blocked, the page still works; it just forgets.
import { longDate, passageUrl } from './reading-plan.mjs';

export interface Day { date: string; readings: (string | null)[] }
export interface Version { id: string; name: string; streams: string[]; days: Day[] }

export const today = (timeZone: string) => new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date());

function read(key: string) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function write(key: string, value: string | null) {
  try { value === null ? localStorage.removeItem(key) : localStorage.setItem(key, value); } catch { /* storage blocked: forget */ }
}

export const savedVersion = () => read('reading-plan-version');
export const saveVersion = (id: string) => write('reading-plan-version', id);
export const savedBookmark = (planId: string, versionId: string) => read(`reading-plan-bookmark:${planId}:${versionId}`);
export const saveBookmark = (planId: string, versionId: string, day: string | null) => write(`reading-plan-bookmark:${planId}:${versionId}`, day);

/** Redraw a ReadingDay.astro block for `day`. */
export function drawDay(root: HTMLElement, version: Version, day: Day, status: string) {
  root.dataset.version = version.id;
  root.querySelector('.reading-status')!.textContent = status;
  root.querySelector('.reading-date')!.textContent = longDate(day.date);
  const list = root.querySelector('.reading-list')!;
  list.replaceChildren(...version.streams.map((stream, i) => {
    const item = document.createElement('li');
    const label = Object.assign(document.createElement('span'), { className: 'label', textContent: stream });
    const reading = day.readings[i];
    const body = reading
      ? Object.assign(document.createElement('a'), { className: 'reading-passage', href: passageUrl(reading), target: '_blank', rel: 'noopener', textContent: reading })
      : Object.assign(document.createElement('span'), { className: 'reading-rest', textContent: 'No reading today' });
    item.append(label, body);
    return item;
  }));
}
