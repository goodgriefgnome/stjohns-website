// Style checks, run by `npm run check-styles` (and at the start of `npm run build`).
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { palettes } from '../src/lib/palettes.mjs';

const problems = [];

// Palettes: the list in palettes.mjs and the [data-palette="name"] rules in src/styles must match.
function cssFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? cssFiles(join(dir, e.name)) : e.name.endsWith('.css') ? [join(dir, e.name)] : []);
}
const inCss = new Set();
for (const file of cssFiles('src/styles')) {
  for (const [, name] of readFileSync(file, 'utf8').matchAll(/\[data-palette=["']([^"']+)["']\]/g)) inCss.add(name);
}
for (const name of palettes) {
  if (!inCss.has(name)) problems.push(`Palette "${name}" is in palettes.mjs but has no [data-palette="${name}"] rule in src/styles`);
}
for (const name of inCss) {
  if (!palettes.includes(name)) problems.push(`Palette "${name}" has a [data-palette="${name}"] rule in src/styles but is not listed in src/lib/palettes.mjs`);
}

// Style rules: scan src/**/*.css and the <style> blocks of src/**/*.astro.
const blank = (text) => text.replace(/[^\n]/g, ' ');
const allFiles = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const path = join(dir, e.name);
  return e.isDirectory() ? allFiles(path) : /\.(css|astro)$/.test(e.name) ? [path] : [];
});
// Every band is two boxes: markup that makes a .band-outer must also make its .band-inner (see patterns/band.css).
const markup = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const path = join(dir, e.name);
  return e.isDirectory() ? markup(path) : /\.(astro|mjs|ts|mdx?)$/.test(e.name) ? [path] : [];
});
for (const file of markup('src')) {
  const text = readFileSync(file, 'utf8');
  if (text.includes('band-outer') && !text.includes('band-inner')) problems.push(`${file}: makes a band-outer but never a band-inner`);
}
const COLOUR = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(|\b(?:white|black|red|green|blue|gray|grey|yellow|orange|purple|pink|brown|navy|teal|silver)\b/i;
for (const file of allFiles('src')) {
  const name = file.split('/').pop();
  const source = readFileSync(file, 'utf8');
  const blocks = file.endsWith('.css') ? [[0, source]] : [...source.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => [m.index + m[0].indexOf(m[1]), m[1]]);
  for (const [offset, raw] of blocks) {
    const css = raw
      .replace(/\/\*[\s\S]*?\*\//g, blank)
      .replace(/@font-face\s*\{[^}]*\}/g, blank)
      .replace(/url\([^)]*\)/g, blank);
    const lineOf = (index) => source.slice(0, offset + index).split('\n').length;
    const where = (index) => `${file}:${lineOf(index)}`;
    for (const m of css.matchAll(/([\w-]+)\s*:\s*([^;{}]+)/g)) {
      const [, prop, value] = m;
      if (name !== 'tokens.css' && COLOUR.test(value.replace(/var\([^)]*\)/g, ''))) problems.push(`${where(m.index)}: raw colour in "${prop}: ${value.trim()}" (colours live in tokens.css)`);
      const rawValue = value.trim();
      if (/^font-(size|weight)$/.test(prop) && name !== 'tokens.css' && name !== 'roles.css' && !/^(inherit|1em|var\(--(font|weight)-[\w-]+\))$/.test(rawValue)) {
        problems.push(`${where(m.index)}: "${prop}: ${rawValue}" should use a --font-* or --weight-* role`);
      }
    }
    for (const m of css.matchAll(/@(?:media|container)[^{]*\b(?:width|inline-size)\b[^{]*/g)) {
      if (name !== 'tokens.css' && name !== 'band.css') problems.push(`${where(m.index)}: width query "${m[0].trim()}" (only tokens.css and band.css may have one; ask --screen instead)`);
    }
  }
}

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log('check-styles: ok');
