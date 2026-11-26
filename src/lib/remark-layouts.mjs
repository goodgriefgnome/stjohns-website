// Turns a page's Markdown into sections and layout blocks (see theme/layouts/README.md for the contract).
//
//   --- starts a new section.           ::section{…} / ::banner  settings, first line of a section.
//   :::name … :::                       a layout block (theme/layouts/name.css); inside it --- starts an item.
//
// Two separate passes, so the first can be switched off per page later (a front-matter
// switch where --- is a plain rule) without touching the second:
//   splitSections()  --- and ::section / ::banner
//   buildLayouts()   :::name blocks, their items and slots
import { visit } from 'unist-util-visit';
import { palettes } from '../../theme/palettes.mjs';
import { loadRegistry } from './layout-registry.mjs';

const isSectionSetting = node => node?.type === 'leafDirective' && (node.name === 'section' || node.name === 'banner');
const isEsm = node => node.type === 'mdxjsEsm';
const isBlankText = node => node.type === 'text' && !node.value.trim();
const oldSyntax = {
  section: 'A section now starts with `---`. Put `::section{palette="…"}` on the line under it.',
  banner: 'A banner is now `---` followed by `::banner`, then the text.',
  column: 'Columns are now items of a `:::columns` block, each starting with `---`.',
  lead: 'A `:::lead` is now `---` followed by `::banner`.',
};

export default function remarkLayouts({ registry } = {}) {
  let known = registry;
  return (tree, file) => {
    known ??= loadRegistry();
    const text = String(file.value ?? '');
    // Pages that use none of the new syntax are left alone for now (the old directives still handle them).
    if (!usesSections(tree)) return;
    checkHeadings(tree, file, text);
    checkBreaks(tree, file, known);
    checkOldSyntax(tree, file, known);
    splitSections(tree, file);
    buildLayouts(tree, file, known);
  };
}

function usesSections(tree) {
  return tree.children.some(child => child.type === 'thematicBreak' || isSectionSetting(child));
}

// ---- Guards --------------------------------------------------------------------

function checkHeadings(tree, file, text) {
  visit(tree, 'heading', node => {
    const start = node.position?.start.offset;
    if (start !== undefined && text[start] !== '#') {
      file.fail('Put a blank line before `---`, or use `##` for a heading.', node);
    }
    if (node.depth === 1) file.fail('The page title is the only level-one heading. Use `##`.', node);
  });
}

function checkBreaks(tree, file, known) {
  visit(tree, 'thematicBreak', (node, index, parent) => {
    const atTop = parent.type === 'root';
    const inLayout = parent.type === 'containerDirective' && known.layouts.has(parent.name);
    if (!atTop && !inLayout) file.fail('`---` only splits sections and layout items.', node);
  });
}

function checkOldSyntax(tree, file, known) {
  const list = [...known.layouts.keys()].sort().join(', ') || 'none yet';
  visit(tree, 'containerDirective', node => {
    if (node.name in oldSyntax) file.fail(oldSyntax[node.name], node);
    if (node.attributes?.layout !== undefined) {
      file.fail('`layout="…"` is gone. Use a layout block such as `:::columns` instead.', node);
    }
    if (!known.layouts.has(node.name) && node.name !== 'accordion' && node.name !== 'center') {
      file.fail(`Unknown block \`:::${node.name}\`. The layouts are: ${list}.`, node);
    }
  });
  visit(tree, 'leafDirective', node => {
    if (!isSectionSetting(node)) file.fail(`Unknown \`::${node.name}\`. Only \`::section{…}\` and \`::banner\` exist.`, node);
  });
}

function checkAttributes(node, file, allowed, what) {
  for (const [key, value] of Object.entries(node.attributes ?? {})) {
    const choices = allowed[key];
    if (!choices) file.fail(`${what} has no setting "${key}". Choose ${Object.keys(allowed).join(', ') || 'none'}.`, node);
    if (!choices.includes(value ?? '')) file.fail(`Unknown ${key} "${value}" in ${what}. Choose ${choices.join(', ')}.`, node);
  }
}

// ---- Pass 1: sections --------------------------------------------------------------

const sectionSettings = {
  section: { palette: palettes, align: ['left', 'center'], text: ['reading', 'wide'] },
  banner: { palette: palettes },
};

function splitSections(tree, file) {
  const head = [];
  const groups = [[]];
  for (const child of tree.children) {
    if (isEsm(child)) head.push(child);
    else if (child.type === 'thematicBreak') groups.push([]);
    else groups.at(-1).push(child);
  }
  const sections = [];
  for (const group of groups) {
    const setting = isSectionSetting(group[0]) ? group[0] : null;
    const content = setting ? group.slice(1) : group;
    for (const stray of content.filter(isSectionSetting)) {
      file.fail(`\`::${stray.name}\` must be the first line of a section, right under the \`---\`.`, stray);
    }
    if (!content.length) continue;
    const isBanner = setting?.name === 'banner';
    const attributes = setting?.attributes ?? {};
    if (setting) checkAttributes(setting, file, sectionSettings[setting.name], `::${setting.name}`);
    const palette = attributes.palette ?? (isBanner ? 'navy' : undefined);
    const align = isBanner ? 'center' : attributes.align;
    sections.push({
      type: 'section',
      data: {
        hName: isBanner ? 'div' : 'section',
        hProperties: {
          className: ['section-outer'],
          ...(palette && { 'data-palette': palette }),
          ...(align && { 'data-align': align }),
          ...(attributes.text && { 'data-text': attributes.text }),
        },
      },
      // Two boxes: the outer one is measured, the inner one carries --section-size (see section.css).
      children: [{ type: 'sectionInner', data: { hName: 'div', hProperties: { className: ['section-inner'] } }, children: content }],
    });
  }
  tree.children = [...head, ...sections];
}

// ---- Pass 2: layout blocks ----------------------------------------------------------

function imageOnly(node) {
  if (node.type !== 'paragraph') return false;
  const parts = node.children.filter(child => !isBlankText(child));
  return parts.length > 0 && parts.every(child => child.type === 'image');
}

function splitItems(node, file) {
  const { children } = node;
  if (!children.length) file.fail(`\`:::${node.name}\` is empty.`, node);
  const hasBreak = children.some(child => child.type === 'thematicBreak');
  if (!hasBreak && children[0].type === 'list') {
    if (children.length > 1) {
      file.fail('If a paragraph fell out of the list, indent it under its item (two spaces for `- `), or start the block with `---`.', children[1]);
    }
    return { items: children[0].children.map(item => item.children), ordered: Boolean(children[0].ordered) };
  }
  const items = [[]];
  for (const child of children) {
    if (child.type === 'thematicBreak') items.push([]);
    else items.at(-1).push(child);
  }
  return { items: items.filter(item => item.length), ordered: false };
}

function buildItem(blocks, index) {
  const content = [...blocks];
  const slots = [];
  if (content[0]?.type === 'heading') slots.push(content.shift());
  const figureAt = content.findIndex(imageOnly);
  if (figureAt !== -1) {
    const [paragraph] = content.splice(figureAt, 1);
    const images = paragraph.children.filter(child => child.type === 'image');
    images.forEach((image, i) => {
      image.data = { ...image.data, hProperties: { ...image.data?.hProperties, style: `--i: ${i}` } };
    });
    slots.push({
      type: 'layoutFigure',
      data: { hName: 'figure', hProperties: { className: ['layout-figure'], style: `--image-count: ${images.length}` } },
      children: images,
    });
  }
  if (content.length) {
    slots.push({ type: 'layoutBody', data: { hName: 'div', hProperties: { className: ['layout-body'] } }, children: content });
  }
  return {
    type: 'layoutItem',
    data: { hName: 'li', hProperties: { className: ['layout-item'], style: `--i: ${index}` } },
    children: slots,
  };
}

function buildLayouts(tree, file, known) {
  const counts = new Map();
  visit(tree, 'containerDirective', node => {
    const layout = known.layouts.get(node.name);
    if (!layout) return;
    const allowed = { images: [...known.behaviours], ...layout.options };
    checkAttributes(node, file, allowed, `\`:::${node.name}\``);

    const nth = (counts.get(node.name) ?? 0) + 1;
    counts.set(node.name, nth);
    const { items, ordered } = splitItems(node, file);
    const { images, ...options } = node.attributes ?? {};
    node.children = items.map((blocks, index) => buildItem(blocks, index));
    node.data = {
      hName: ordered ? 'ol' : 'ul',
      hProperties: {
        className: ['layout'],
        role: 'list',
        'data-layout': node.name,
        'data-nth': nth % 2 ? 'odd' : 'even',
        ...Object.fromEntries(Object.entries(options).map(([key, value]) => [`data-${key}`, value])),
        style: [`--item-count: ${items.length}`, ...(images ? [`--images: ${images}`] : [])].join('; '),
      },
    };
  });
}
