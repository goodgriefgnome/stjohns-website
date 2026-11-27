// The mini player (MiniPlayer.astro): a slim bar pinned to the top of the window while the navy sermon section is out of view.
// It has no audio of its own. It listens to, and controls, the audio element in the navy section, so play and pause in either
// place show in both. Call bindMiniPlayer() again whenever that section is swapped for another sermon's.
import { clock } from './sermon-format.mjs';

const current = () => document.querySelector<HTMLElement>('[data-sermon-feature]');
let mini: HTMLElement;
let observer: IntersectionObserver | undefined;
let listening: AbortController | undefined;

// Point the bar at the sermon section that is on the page now.
export function bindMiniPlayer() {
  const feature = current();
  const audio = feature?.querySelector('audio');
  if (!mini || !feature || !audio) return;
  const play = mini.querySelector<HTMLButtonElement>('.mini-play')!;
  const time = mini.querySelector<HTMLElement>('.mini-time')!;
  const bar = mini.querySelector<HTMLElement>('.mini-bar')!;
  mini.querySelector<HTMLElement>('.mini-title')!.textContent = feature.querySelector('h2')?.textContent ?? '';

  listening?.abort();
  listening = new AbortController();
  const { signal } = listening;
  const show = () => {
    const length = audio.duration && Number.isFinite(audio.duration) ? audio.duration : Number(feature.querySelector<HTMLInputElement>('.slider')?.max) || 1;
    time.textContent = clock(audio.currentTime);
    bar.style.setProperty('--played', String(audio.currentTime / length));
  };
  const showPlaying = () => {
    mini.toggleAttribute('data-playing', !audio.paused);
    play.setAttribute('aria-label', audio.paused ? 'Play' : 'Pause');
  };
  for (const name of ['timeupdate', 'durationchange', 'seeked']) audio.addEventListener(name, show, { signal });
  for (const name of ['play', 'pause', 'ended']) audio.addEventListener(name, showPlaying, { signal });
  play.addEventListener('click', () => { if (audio.paused) audio.play(); else audio.pause(); }, { signal });
  show();
  showPlaying();

  // Show the bar only while the section is completely out of view.
  observer?.disconnect();
  observer = new IntersectionObserver(([entry]) => {
    const shown = !entry.isIntersecting;
    mini.toggleAttribute('data-shown', shown);
    mini.inert = !shown;
  });
  observer.observe(feature);
}

export function startMiniPlayer() {
  const found = document.querySelector<HTMLElement>('[data-mini-player]');
  if (!found) return;
  mini = found;
  mini.hidden = false;
  // "↑ Details": back up to the sermon section, smoothly unless motion is reduced.
  mini.querySelector('.mini-details')!.addEventListener('click', () => {
    const feature = current();
    feature?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    feature?.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
  });
  bindMiniPlayer();
}
