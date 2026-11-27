// Picks a sermon without reloading the page: the navy section is fetched from that sermon's own page and swapped in,
// the address and title follow, and the player carries on (if it was playing, the new sermon starts straight away).
// Without JavaScript every link is an ordinary link to a full page. Anything that goes wrong falls back to that.
import { startPlayers } from './audio-player';

const sermonsPath = `${import.meta.env.BASE_URL.replace(/\/?$/, '/')}sermons/`;
const sections = new Map<string, { section: HTMLElement; title: string }>();

// "/stjohns-website/sermons/titus-1" -> "titus-1"; "/sermons" -> "" (the latest sermon); anything else -> null.
function slugOf(pathname: string) {
  const path = pathname.replace(/\/?$/, '/');
  if (path === sermonsPath) return '';
  if (!path.startsWith(sermonsPath)) return null;
  const slug = path.slice(sermonsPath.length).replace(/\/$/, '');
  return slug && !slug.includes('/') && slug !== 'list' ? slug : null;
}

const current = () => document.querySelector<HTMLElement>('[data-sermon-feature]')!;
const smooth = () => !matchMedia('(prefers-reduced-motion: reduce)').matches;

// Mark the list's row for the sermon being shown.
function markCurrent() {
  const { slug } = current().dataset;
  for (const link of document.querySelectorAll('[data-archive] [aria-current]')) link.removeAttribute('aria-current');
  document.querySelector(`[data-archive] li[data-slug="${slug}"] .sermon-title`)?.setAttribute('aria-current', 'true');
}

async function load(url: string) {
  const cached = sections.get(url);
  if (cached) return cached;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  const page = new DOMParser().parseFromString(await response.text(), 'text/html');
  const section = page.querySelector<HTMLElement>('[data-sermon-feature]');
  if (!section) throw new Error(`${url}: no sermon on the page`);
  const loaded = { section, title: page.title };
  sections.set(url, loaded);
  return loaded;
}

async function show(url: string, { push }: { push: boolean }) {
  const old = current();
  const oldAudio = old.querySelector('audio');
  const wasPlaying = !!oldAudio && !oldAudio.paused;
  const { section, title } = await load(url);
  const next = document.importNode(section, true);
  oldAudio?.pause();
  old.replaceWith(next);
  startPlayers(next);
  document.title = title;
  if (push) history.pushState({ slug: next.dataset.slug }, '', url);
  markCurrent();
  if (wasPlaying) next.querySelector('audio')?.play().catch(() => {});
  if (push) {
    next.scrollIntoView({ behavior: smooth() ? 'smooth' : 'auto', block: 'start' });
    next.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
  }
}

export function startSermonSwap() {
  history.replaceState({ slug: current().dataset.slug }, '');
  markCurrent();

  // Links in the list, and the title above, swap in place. Ctrl, Cmd, Shift and middle clicks are left to the browser.
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = (event.target as Element).closest<HTMLAnchorElement>('[data-archive] a, [data-sermon-feature] h2 a');
    if (!link || link.target) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || !slugOf(url.pathname)) return;
    event.preventDefault();
    show(url.pathname, { push: true }).catch(() => { location.href = link.href; });
  });

  // Back and Forward: show the sermon for the address (/sermons is the latest sermon).
  addEventListener('popstate', () => {
    if (slugOf(location.pathname) === null) return;
    show(location.pathname, { push: false }).catch(() => location.reload());
  });
}
