// Brings the compact audio players (AudioPlayer.astro) to life. Call startPlayers() on the page, and again on any
// markup swapped in later. Without it, the browser's own audio player stays.
import { clock } from './sermon-format.mjs';

function start(player: HTMLElement) {
  const audio = player.querySelector('audio')!;
  const controls = player.querySelector<HTMLElement>('.controls')!;
  const button = player.querySelector<HTMLButtonElement>('.play')!;
  const elapsed = player.querySelector<HTMLElement>('.elapsed')!;
  const total = player.querySelector<HTMLElement>('.total')!;
  const slider = player.querySelector<HTMLInputElement>('.slider')!;

  // Take over from the browser's own player.
  audio.removeAttribute('controls');
  controls.hidden = false;

  const show = () => {
    const length = Number(slider.max) || 1;
    slider.value = String(Math.floor(audio.currentTime));
    slider.style.setProperty('--played', String(audio.currentTime / length));
    slider.setAttribute('aria-valuetext', `${clock(audio.currentTime)} of ${clock(length)}`);
    elapsed.textContent = clock(audio.currentTime);
  };
  const showPlaying = (playing: boolean) => {
    player.toggleAttribute('data-playing', playing);
    button.setAttribute('aria-label', playing ? 'Pause' : 'Play');
  };

  button.addEventListener('click', () => { if (audio.paused) audio.play(); else audio.pause(); });
  slider.addEventListener('input', () => { audio.currentTime = Number(slider.value); show(); });
  audio.addEventListener('timeupdate', show);
  // The real length is known once the file starts loading; until then the build's length is used.
  audio.addEventListener('durationchange', () => {
    if (!Number.isFinite(audio.duration)) return;
    slider.max = String(Math.floor(audio.duration));
    total.textContent = clock(audio.duration);
    show();
  });
  audio.addEventListener('pause', () => showPlaying(false));
  audio.addEventListener('ended', () => showPlaying(false));
  audio.addEventListener('play', () => {
    showPlaying(true);
    // Starting one player pauses any other.
    for (const other of document.querySelectorAll('audio')) if (other !== audio) other.pause();
    if ('mediaSession' in navigator) {
      const { title, artist, album, artwork } = player.dataset;
      navigator.mediaSession.metadata = new MediaMetadata({
        title, artist, album,
        artwork: artwork ? [{ src: new URL(artwork, location.href).href, sizes: '1400x1400', type: 'image/jpeg' }] : [],
      });
      navigator.mediaSession.setActionHandler('play', () => audio.play());
      navigator.mediaSession.setActionHandler('pause', () => audio.pause());
    }
  });
  show();
}

export function startPlayers(root: ParentNode = document) {
  for (const player of root.querySelectorAll<HTMLElement>('[data-player]:not([data-ready])')) {
    player.setAttribute('data-ready', '');
    start(player);
  }
}
