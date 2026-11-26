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

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log('check-styles: ok');
