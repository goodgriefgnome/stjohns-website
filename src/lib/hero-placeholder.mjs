// A tiny, blurred copy of a picture, small enough (a few hundred bytes) to write straight into the page.
// The hero shows it behind its photo, so while the real photo downloads you see a soft version of it instead of a navy block.
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';

const cache = new Map();
import { pathToFileURL } from 'node:url';
const publicDir = pathToFileURL(`${process.cwd()}/public/`);  // the project folder: this file is bundled when Astro builds, so its own location moves

export function placeholderFor(url) {
  if (!cache.has(url)) cache.set(url, make(url));
  return cache.get(url);
}

async function make(url) {
  const file = new URL(url.replace(/^\//, ''), publicDir);
  const tiny = await sharp(await readFile(file)).resize(16).webp({ quality: 50 }).toBuffer();
  const { width, height } = await sharp(tiny).metadata();
  // The browser would stretch a 16-pixel picture into blocks; an SVG wrapper blurs it smoothly instead.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">`
    + `<filter id="b" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="1"/><feComponentTransfer><feFuncA type="discrete" tableValues="1 1"/></feComponentTransfer></filter>`
    + `<image width="100%" height="100%" preserveAspectRatio="none" href="data:image/webp;base64,${tiny.toString('base64')}" filter="url(#b)"/></svg>`;
  return `url("data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}")`;
}
