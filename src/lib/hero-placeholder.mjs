// A tiny, blurred copy of a picture, small enough (about 150 bytes) to send with the styles.
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

async function make(url) {
  const file = new URL(url.replace(/^\//, ''), publicDir);
  const tiny = await sharp(await readFile(file)).resize(16).webp({ quality: 50 }).toBuffer();
  return `url(data:image/webp;base64,${tiny.toString('base64')})`;
}
