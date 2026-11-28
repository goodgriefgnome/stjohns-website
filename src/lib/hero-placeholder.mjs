// A tiny, blurred copy of a picture, small enough (about 250 bytes) to send with the styles.
// The hero shows it behind its photo, so while the real photo downloads you see a soft version of it instead of a navy block.
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';

const cache = new Map();
const publicDir = pathToFileURL(`${process.cwd()}/public/`);  // the project folder: this file is bundled when Astro builds, so its own location moves

export function placeholderFor(url) {
  if (!cache.has(url)) cache.set(url, make(url));
  return cache.get(url);
}

// Every copy gets about the same number of dots (64 × 20, a laptop hero's shape), whatever the photo's shape, so each costs
// about the same. The whole photo is kept, not cropped, so the copy lines up with the photo on any screen.
// Quality 10 flattens the colour into soft muted tones; a little more quality (20) makes up colours that aren't there.
const dots = 64 * 20;
const quality = 10;

async function make(url) {
  const file = new URL(url.replace(/^\//, ''), publicDir);
  const photo = sharp(await readFile(file));
  const { width, height } = await photo.metadata();
  const across = Math.max(1, Math.round(Math.sqrt(dots * width / height)));
  const down = Math.max(1, Math.round(across * height / width));
  const tiny = await photo.resize(across, down).webp({ quality }).toBuffer();
  return { image: `url(data:image/webp;base64,${tiny.toString('base64')})`, across, down };
}
