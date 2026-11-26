// Style checks, run by `npm run check-styles` (and at the start of `npm run build`).
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { palettes } from '../theme/palettes.mjs';
import { parseHeader } from '../src/lib/layout-registry.mjs';

const problems = [];
const blank = (text) => text.replace(/[^\n]/g, ' ');

// Palettes: the list in palettes.mjs and the [data-palette="name"] rules in theme/ and src/styles must match.
function cssFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? cssFiles(join(dir, e.name)) : e.name.endsWith('.css') ? [join(dir, e.name)] : []);
}
const inCss = new Set();
for (const file of [...cssFiles('theme'), ...cssFiles('src/styles')]) {
  for (const [, name] of readFileSync(file, 'utf8').matchAll(/\[data-palette=["']([^"']+)["']\]/g)) inCss.add(name);
}
for (const name of palettes) {
  if (!inCss.has(name)) problems.push(`Palette "${name}" is in palettes.mjs but has no [data-palette="${name}"] rule in theme/ or src/styles`);
}
for (const name of inCss) {
  if (!palettes.includes(name)) problems.push(`Palette "${name}" has a [data-palette="${name}"] rule in theme/ or src/styles but is not listed in theme/palettes.mjs`);
}

// Layout and behaviour files (theme/layouts, theme/behaviours): a header comment that declares the inputs, and a few things they may not do.
// These come on top of the style rules below, which cover every file in theme/ too.
const definedIn = (file) => [...readFileSync(file, 'utf8').matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]);
const known = new Set([...definedIn('theme/tokens.css'), ...definedIn('theme/roles.css'), ...definedIn('src/styles/screen.css'),
  '--i', '--item-count', '--image-count', '--section-size', '--images']);
function ranges(code, opener) {
  // [start, end] of each `{ … }` block that follows a match of `opener`.
  const found = [];
  for (const m of code.matchAll(opener)) {
    let depth = 0;
    for (let i = m.index + m[0].length - 1; i < code.length; i++) {
      if (code[i] === '{') depth++;
      if (code[i] === '}' && --depth === 0) { found.push([m.index, i]); break; }
    }
  }
  return found;
}
function checkThemeFile(kind, dir, file) {
  const name = file.slice(dir.length + 1, -4);
  const source = readFileSync(file, 'utf8');
  const code = source.replace(/\/\*[\s\S]*?\*\//g, blank);
  const lineOf = (index) => source.slice(0, index).split('\n').length;
  const fail = (index, message) => problems.push(`${file}:${lineOf(index)}: ${message}`);
  const header = parseHeader(source);
  const comment = source.match(/^\s*\/\*([\s\S]*?)\*\//);
  if (!comment) problems.push(`${file}:1: start the file with a header comment: one plain-English line about what this ${kind} is for, then its "Variables:" and "Options:" lists`);
  else if (!header.summary) problems.push(`${file}:1: the header comment needs a first line saying what this ${kind} is for`);
  // Variables: the only custom properties other CSS may set. Names start with the file's name.
  const declared = new Set(header.variables.map((v) => v.name));
  for (const v of declared) {
    if (!v.startsWith(`--${name}-`)) problems.push(`${file}:1: declared variable ${v} must start with --${name}- so two ${kind}s can't clash`);
    if (!code.includes(`var(${v}`)) problems.push(`${file}:1: ${v} is declared in the header but never used`);
  }
  for (const m of code.matchAll(/var\(\s*(--[\w-]+)/g)) {
    if (!declared.has(m[1]) && !known.has(m[1])) fail(m.index, `var(${m[1]}) is not a token, a role, a contract variable, or declared under "Variables:" in the header`);
  }
  for (const m of code.matchAll(/(?:^|[{;])\s*(--[\w-]+)\s*:/g)) {
    if (!declared.has(m[1]) && m[1] !== '--images') fail(m.index, `${m[1]} is set here but not declared under "Variables:" in the header (a ${kind}'s own variables start with --${name}-)`);
  }
  const noMotion = kind === 'behaviour';
  const bans = [[/!important/g, '!important'], [/@import/g, '@import'], [/url\(/g, 'url()'], [/position\s*:\s*fixed/g, 'position: fixed'],
    [/(?<![\w.#-])(?:html|body|:root)(?![\w-])(?=[^{};]*\{)/g, 'a selector for html, body or :root']];
  if (!noMotion) bans.push([/@keyframes/g, '@keyframes (motion lives in behaviours)'], [/@media/g, '@media (ask a style query instead; motion lives in behaviours)']);
  for (const [pattern, what] of bans) for (const m of code.matchAll(pattern)) fail(m.index, `${what} is not allowed in a ${kind}`);
  if (noMotion) {
    for (const m of code.matchAll(/@media[^{]*/g)) {
      if (!/\(\s*prefers-reduced-motion\s*:\s*(?:reduce|no-preference)\s*\)/.test(m[0])) fail(m.index, `the only @media a behaviour may use is prefers-reduced-motion (${m[0].trim()})`);
    }
    for (const m of code.matchAll(/@keyframes\s+([\w-]+)/g)) {
      if (!m[1].startsWith(`${name}-`)) fail(m.index, `keyframes "${m[1]}" must start with "${name}-"`);
    }
    const calm = ranges(code, /@media\s*\(\s*prefers-reduced-motion\s*:\s*no-preference\s*\)[^{]*\{/g);
    for (const m of code.matchAll(/(?<![\w-])animation(?:-[\w-]+)?\s*:/g)) {
      if (!calm.some(([from, to]) => m.index > from && m.index < to)) fail(m.index, 'every animation must sit inside @media (prefers-reduced-motion: no-preference)');
    }
  }
}
const themeFiles = (dir) => (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.css')).map((f) => join(dir, f)) : []);
for (const file of themeFiles('theme/layouts')) checkThemeFile('layout', 'theme/layouts', file);
for (const file of themeFiles('theme/behaviours')) checkThemeFile('behaviour', 'theme/behaviours', file);

// Style rules: scan theme/**/*.css, src/**/*.css and the <style> blocks of src/**/*.astro.
const allFiles = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const path = join(dir, e.name);
  return e.isDirectory() ? allFiles(path) : /\.(css|astro)$/.test(e.name) ? [path] : [];
});
// Every section is two boxes: markup that makes a .section-outer must also make its .section-inner (see patterns/section.css).
const markup = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const path = join(dir, e.name);
  return e.isDirectory() ? markup(path) : /\.(astro|mjs|ts|mdx?)$/.test(e.name) ? [path] : [];
});
for (const file of markup('src')) {
  const text = readFileSync(file, 'utf8');
  if (text.includes('section-outer') && !text.includes('section-inner')) problems.push(`${file}: makes a section-outer but never a section-inner`);
}
const LENGTH = /(?<![\w.-])-?(?:\d+\.?\d*|\.\d+)(?:rem|px|em|vw|vh|vmin|vmax|ch|lh|svh|dvh)\b/g;
const STEPS = { '--space-3xs': .25, '--space-2xs': .5, '--space-sm': 1, '--space-md': 1.25, '--space-lg': 1.5, '--space-xl': 2 };
function suggest(prop, length) {
  const rem = parseFloat(length) / (length.endsWith('px') ? 16 : 1);
  if (/radius/.test(prop)) return '--radius-sm, --radius-md, --radius-round or --radius-pill';
  if (/border|outline|box-shadow/.test(prop) && rem <= .25) return '--line-thin, --line-medium, --line-thick or --line-bar';
  return Object.entries(STEPS).sort((a, b) => Math.abs(a[1] - rem) - Math.abs(b[1] - rem))[0][0];
}
const COLOUR = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(|\b(?:white|black|red|green|blue|gray|grey|yellow|orange|purple|pink|brown|navy|teal|silver)\b/i;
for (const file of [...allFiles('theme'), ...allFiles('src')]) {
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
    // Lengths: every length is a token, a role or a formula of them. Custom properties (CSS variables) may hold raw values.
    for (const m of css.matchAll(/([\w-]+)\s*:\s*([^;{}]+)/g)) {
      const [, prop, value] = m;
      if (prop.startsWith('--') || name === 'tokens.css' || name === 'roles.css') continue;
      const loose = (value.replace(/var\([^)]*\)/g, '').match(LENGTH) ?? []).filter((x) => !/^(1em|1lh)$/.test(x));
      if (loose.length) problems.push(`${where(m.index)}: raw length ${loose.join(', ')} in "${prop}: ${value.trim()}" (use ${suggest(prop, loose[0])}, or a role or CSS variable)`);
    }
    for (const m of css.matchAll(/@(?:media|container)[^{]*\b(?:width|inline-size)\b[^{]*/g)) {
      if (name !== 'screen.css' && name !== 'section.css') problems.push(`${where(m.index)}: width query "${m[0].trim()}" (only screen.css and section.css may have one; ask --screen instead)`);
    }
  }
}

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log('check-styles: ok');
