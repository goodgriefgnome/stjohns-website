// Turns a page's Markdown into sections and layout blocks (see theme/layouts/README.md for the contract).
//
//   --- starts a new section.           ::section{…} / ::banner  settings, first line of a section.
//   ::hero{…}                           the settings line of the page's FIRST section: it is the hero.
//   :focus{at="x% y%"}                  right after a picture: which part of it to keep when cropped.
//   :::name … :::                       a layout block (theme/layouts/name.css); inside it --- starts an item.
//
// Two separate passes, so the first can be switched off per page later (a front-matter
// switch where --- is a plain rule) without touching the second:
//   splitSections()  --- and ::section / ::banner / ::hero
//   buildLayouts()   :::name blocks, their items and slots
import { SKIP, visit } from 'unist-util-visit';
import { palettes } from '../../theme/palettes.mjs';
import { loadRegistry } from './layout-registry.mjs';

const isSectionSetting = node => node?.type === 'leafDirective' && ['section', 'banner', 'hero'].includes(node.name);
const isEsm = node => node.type === 'mdxjsEsm';
const isBlankText = node => node.type === 'text' && !node.value.trim();
const oldSyntax = {
  section: 'A section now starts with `---`. Put `::section{palette="…"}` on the line under it.',
  banner: 'A banner is now `---` followed by `::banner`, then the text.',
  column: 'Columns are now items of a `:::columns` block, each starting with `---`.',
  lead: 'A `:::lead` is now `---` followed by `::banner`.',
};

export default function remarkLayouts({ registry, defaultHero } = {}) {
  let known = registry;
  return (tree, file) => {
    known ??= loadRegistry();
    const text = String(file.value ?? '');
    checkHeadings(tree, file, text);
    checkImages(tree, file);
    checkBreaks(tree, file, known);
    checkOldSyntax(tree, file, known);
    applyFocus(tree, file);
    splitSections(tree, file, known, defaultHero);
    buildLayouts(tree, file, known);
  };
}

// ---- Guards --------------------------------------------------------------------

function checkHeadings(tree, file, text) {
  visit(tree, 'heading', node => {
    const start = node.position?.start.offset;
    if (start !== undefined && text[start] !== '#') {
      file.fail('Put a blank line before `---`, or use `##` for a heading.', node);
    }
  });
}

// A `#` heading is the page's title, and it belongs in the hero (the first section, under `::hero`).
// Called once the hero is known; `allowed` holds the hero's own headings.
function checkTitles(tree, file, allowed) {
  visit(tree, 'heading', node => {
    if (node.depth === 1 && !allowed.has(node)) {
      file.fail('A `#` heading is only for the hero: write it in the first section, under `::hero`. Use `##` anywhere else.', node);
    }
  });
}

function checkImages(tree, file) {
  visit(tree, 'image', node => {
    if (!node.url) file.fail('Use `::no-background`.', node);
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
    if (!isSectionSetting(node) && node.name !== 'no-background') {
      file.fail(`Unknown \`::${node.name}\`. Only \`::section{…}\`, \`::banner\`, \`::hero{…}\` and \`::no-background\` exist.`, node);
    }
  });
}

function checkAttributes(node, file, allowed, what) {
  for (const [key, value] of Object.entries(node.attributes ?? {})) {
    const choices = allowed[key];
    if (!choices) file.fail(`${what} has no setting "${key}". Choose ${Object.keys(allowed).join(', ') || 'none'}.`, node);
    // A setting is a list of choices, or a pattern with a sentence saying what it wants (aspect="7/5").
    if (Array.isArray(choices) ? !choices.includes(value ?? '') : !choices.pattern.test(value ?? '')) {
      file.fail(Array.isArray(choices) ? `Unknown ${key} "${value}" in ${what}. Choose ${choices.join(', ')}.` : `${key} "${value}" in ${what} ${choices.wants}.`, node);
    }
  }
}

// ---- Focus: which part of a picture to keep when it is cropped ----------------------

const focusAt = /^(\d+(?:\.\d+)?)% (\d+(?:\.\d+)?)%$/;

// `![](/media/x.webp) :focus{at="53% 39%"}`: the directive belongs to the picture written right before it
// (a space between them is fine). It becomes that picture's object-position and is removed from the tree.
function applyFocus(tree, file) {
  visit(tree, 'textDirective', (node, index, parent) => {
    if (node.name !== 'focus') return;
    let at = index - 1;
    if (isBlankText(parent.children[at])) at--;
    const image = parent.children[at];
    if (image?.type !== 'image') file.fail('`:focus{…}` goes right after a picture, for example `![](/media/x.webp) :focus{at="50% 20%"}`.', node);
    const attributes = Object.entries(node.attributes ?? {});
    const match = String(node.attributes?.at ?? '').match(focusAt);
    if (attributes.length !== 1 || !match || Number(match[1]) > 100 || Number(match[2]) > 100) {
      file.fail('`:focus` needs `at` with two percentages from 0% to 100%: `:focus{at="50% 20%"}` (across, then down).', node);
    }
    image.data = { ...image.data, hProperties: { ...image.data?.hProperties, style: `object-position: ${match[1]}% ${match[2]}%` } };
    parent.children.splice(at + 1, index - at);
    return [SKIP, at + 1];
  });
}

// ---- Pictures that become a figure ---------------------------------------------------

const isImage = node => node.type === 'image';

function imageOnly(node) {
  if (node.type !== 'paragraph') return false;
  const parts = node.children.filter(child => !isBlankText(child));
  return parts.length > 0 && parts.every(isImage);
}

// The pictures of a picture paragraph, or of a list holding nothing but one picture per item; otherwise null.
function pictures(node) {
  if (imageOnly(node)) return node.children.filter(isImage);
  const single = item => item.children.length === 1 && imageOnly(item.children[0]) && item.children[0].children.filter(isImage).length === 1;
  if (node.type === 'list' && node.children.length && node.children.every(single)) {
    return node.children.map(item => item.children[0].children.find(isImage));
  }
  return null;
}

// Several pictures in one figure share --image-count and take --i in turn, which behaviours like cycle use.
// `aspect` ("7/5") gives the figure that shape and every picture fills it.
function makeFigure(images, file, { aspect } = {}) {
  images.forEach((image, i) => {
    if (!image.url) file.fail('Use `::no-background`.', image);
    const { style, ...rest } = image.data?.hProperties ?? {};
    image.data = { ...image.data, hProperties: { ...rest, style: [style, `--i: ${i}`].filter(Boolean).join('; ') } };
  });
  return {
    type: 'layoutFigure',
    data: {
      hName: 'figure',
      hProperties: {
        className: ['layout-figure'],
        ...(aspect && { 'data-aspect': aspect }),
        style: [`--image-count: ${images.length}`, ...(aspect ? [`aspect-ratio: ${aspect.replace('/', ' / ')}`] : [])].join('; '),
      },
    },
    children: images,
  };
}

// ---- Pass 1: sections --------------------------------------------------------------

const aspectSetting = { pattern: /^\d+(?:\.\d+)?\/\d+(?:\.\d+)?$/, wants: 'must be two numbers with a slash, such as "7/5"' };
const settingsFor = known => ({
  section: {
    palette: palettes,
    align: ['left', 'center'],
    text: ['reading', 'wide'],
    width: ['full-bleed'],
    aspect: aspectSetting,
    images: [...known.behaviours],
  },
  banner: { palette: palettes },
  hero: { aspect: aspectSetting, images: [...known.behaviours] },
});

// The hero: the page's first section, written under `::hero` (or made from the defaults when it isn't written).
// Its picture, or list of pictures, becomes one figure that fills the hero behind the text.
function buildHero(attributes, content, file, { title, defaultHero }, titles, at) {
  let images = null;
  const rest = [];
  for (const node of content) {
    const found = pictures(node);
    if (!found) rest.push(node);
    else if (images) file.fail('A hero has one picture, or one list of pictures. Put every picture in the one list.', node);
    else images = found;
  }
  if (!images) {
    if (!defaultHero) file.fail('This hero has no picture and the site has no default one.', at);
    images = [{ type: 'image', url: defaultHero, alt: '', title: null }];
  }
  if (images.length > 1 && !attributes.images) {
    file.fail('Several pictures in a hero need `images="cycle"`: write `::hero{images="cycle"}`.', at);
  }
  const own = rest.find(node => node.type === 'heading' && node.depth === 1);
  if (own) titles.add(own);
  else if (!title) file.fail('A page whose hero has no `#` heading needs a `title:` in its front matter.', at);
  const heading = { type: 'heading', depth: 1, children: [{ type: 'text', value: title }] };
  images[0].data = { ...images[0].data, hProperties: { ...images[0].data?.hProperties, fetchpriority: 'high' } };
  const figure = makeFigure(images, file);
  return {
    type: 'hero',
    data: {
      hName: 'header',
      hProperties: {
        className: ['hero', 'photo-backdrop'],
        'data-palette': 'navy',
        style: [...(attributes.images ? [`--images: ${attributes.images}`] : []), ...(attributes.aspect ? [`aspect-ratio: ${attributes.aspect.replace('/', ' / ')}`] : [])].join('; ') || undefined,
      },
    },
    children: [figure, { type: 'heroBody', data: { hName: 'div' }, children: own ? rest : [heading, ...rest] }],
  };
}

function splitSections(tree, file, known, defaultHero) {
  const head = [];
  const groups = [[]];
  for (const child of tree.children) {
    if (isEsm(child)) head.push(child);
    else if (child.type === 'thematicBreak') groups.push([]);
    else groups.at(-1).push(child);
  }
  const settings = settingsFor(known);
  const title = file.data?.astro?.frontmatter?.title;
  const titles = new Set();
  const sections = [];
  let hero = null;
  let first = true;
  for (const group of groups) {
    const setting = isSectionSetting(group[0]) ? group[0] : null;
    const content = setting ? group.slice(1) : group;
    for (const stray of content.filter(isSectionSetting)) {
      file.fail(`\`::${stray.name}\` must be the first line of a section, right under the \`---\`.`, stray);
    }
    if (!content.length && setting?.name !== 'hero') continue;
    const isFirst = first;
    first = false;
    if (setting?.name === 'hero' && !isFirst) file.fail('`::hero` is only for the first section of the page.', setting);
    if (setting) checkAttributes(setting, file, settings[setting.name], `::${setting.name}`);
    const attributes = setting?.attributes ?? {};
    if (setting?.name === 'hero') {
      hero = buildHero(attributes, content, file, { title, defaultHero }, titles, setting);
      continue;
    }
    const isBanner = setting?.name === 'banner';
    const palette = attributes.palette ?? (isBanner ? 'navy' : undefined);
    const align = isBanner ? 'center' : attributes.align;
    const shaped = content.map(node => {
      const images = pictures(node);
      return images ? makeFigure(images, file, { aspect: attributes.aspect }) : node;
    });
    sections.push({
      type: 'section',
      data: {
        hName: isBanner ? 'div' : 'section',
        hProperties: {
          className: ['section-outer'],
          ...(palette && { 'data-palette': palette }),
          ...(align && { 'data-align': align }),
          ...(attributes.text && { 'data-text': attributes.text }),
          ...(attributes.width && { 'data-width': attributes.width }),
          ...(attributes.images && { style: `--images: ${attributes.images}` }),
        },
      },
      // Two boxes: the outer one is measured, the inner one carries --section-size (see section.css).
      children: [{ type: 'sectionInner', data: { hName: 'div', hProperties: { className: ['section-inner'] } }, children: shaped }],
    });
  }
  // A page that doesn't write its own hero gets the default one: the site's picture and the page's title.
  if (!hero && title) hero = buildHero({}, [], file, { title, defaultHero }, titles, tree);
  checkTitles(tree, file, titles);
  tree.children = [...head, ...(hero ? [hero] : []), ...sections];
}

// ---- Pass 2: layout blocks ----------------------------------------------------------

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

// An item keeps its blocks in the order they were written. A paragraph holding only pictures (or a list of
// them) becomes a <figure>, a ::no-background line becomes an empty one, and the first block stays outside .layout-body so a
// layout can line it up across items (or use a leading figure as a background).
function buildItem(blocks, index, file) {
  const content = blocks.map((block, at) => {
    if (block.type === 'leafDirective' && block.name === 'no-background') {
      if (at !== 0) file.fail('`::no-background` only goes first in an item of a layout block.', block);
      return { type: 'layoutFigure', data: { hName: 'figure', hProperties: { className: ['layout-figure'] } }, children: [] };
    }
    const images = pictures(block);
    return images ? makeFigure(images, file) : block;
  });
  const [first, ...rest] = content;
  return {
    type: 'layoutItem',
    data: { hName: 'li', hProperties: { className: ['layout-item'], style: `--i: ${index}` } },
    children: [first, ...(rest.length ? [{ type: 'layoutBody', data: { hName: 'div', hProperties: { className: ['layout-body'] } }, children: rest }] : [])],
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
    node.children = items.map((blocks, index) => buildItem(blocks, index, file));
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
  visit(tree, 'leafDirective', node => {
    if (node.name === 'no-background') file.fail('`::no-background` only goes first in an item of a layout block.', node);
  });
}
