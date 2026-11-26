// The list of layouts and behaviours the site knows, read from the theme folders.
// Dropping theme/layouts/<name>.css in makes `:::<name>` exist; dropping
// theme/behaviours/<name>.css in makes `images="<name>"` exist. Nothing else to edit.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const layoutsDir = fileURLToPath(new URL('../../theme/layouts/', import.meta.url));
export const behavioursDir = fileURLToPath(new URL('../../theme/behaviours/', import.meta.url));

// Directive names that already mean something else. A layout file can't take one.
export const reserved = ['band', 'banner', 'section', 'accordion', 'center', 'column', 'icon', 'lead'];
const namePattern = /^[a-z0-9-]+$/;

// Reads a layout's header comment: a line saying what it is for, then optional
// `Variables:` and `Options:` lists (see theme/layouts/README.md).
//   Options:
//     size = normal | large   (what each choice does)
export function parseHeader(css) {
  const comment = css.match(/^\s*\/\*([\s\S]*?)\*\//)?.[1];
  const header = { summary: '', variables: [], options: {} };
  if (comment === undefined) return header;
  let section = 'summary';
  for (const raw of comment.split('\n')) {
    const line = raw.trim();
    if (/^Variables:/.test(line)) { section = 'variables'; continue; }
    if (/^Options:/.test(line)) { section = 'options'; continue; }
    if (!line) continue;
    if (section === 'summary') {
      header.summary += (header.summary ? ' ' : '') + line;
    } else if (section === 'variables') {
      const variable = line.match(/^(--[a-z0-9-]+)\s*(.*)$/);
      if (variable) header.variables.push({ name: variable[1], note: variable[2] });
    } else {
      const option = line.match(/^([a-z][a-z0-9-]*)\s*=\s*([a-z0-9-]+(?:\s*\|\s*[a-z0-9-]+)*)/);
      if (option) header.options[option[1]] = option[2].split('|').map(value => value.trim());
    }
  }
  return header;
}

// Builds a registry from CSS text (layouts: { name: css }) and a list of behaviour names.
export function registryFrom({ layouts = {}, behaviours = [] } = {}) {
  const map = new Map();
  for (const [name, css] of Object.entries(layouts)) {
    if (!namePattern.test(name)) throw new Error(`theme/layouts/${name}.css: layout names use lower-case letters, digits and hyphens.`);
    if (reserved.includes(name)) throw new Error(`theme/layouts/${name}.css: "${name}" is already used by the site. Choose another name.`);
    map.set(name, parseHeader(css));
  }
  for (const name of behaviours) {
    if (!namePattern.test(name)) throw new Error(`theme/behaviours/${name}.css: behaviour names use lower-case letters, digits and hyphens.`);
  }
  return { layouts: map, behaviours: new Set(behaviours) };
}

const cssNames = dir => existsSync(dir)
  ? readdirSync(dir).filter(file => file.endsWith('.css')).map(file => file.slice(0, -4)).sort()
  : [];

export function loadRegistry({ layouts = layoutsDir, behaviours = behavioursDir } = {}) {
  return registryFrom({
    layouts: Object.fromEntries(cssNames(layouts).map(name => [name, readFileSync(`${layouts}${name}.css`, 'utf8')])),
    behaviours: cssNames(behaviours),
  });
}
