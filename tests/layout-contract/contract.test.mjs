// The layout contract: the fixture page goes through the real Markdown pipeline and must give
// exactly expected.html, and each guard has a tiny input that must fail with its message.
//
// If you change the contract on purpose, update expected.html:  UPDATE=1 npm test
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { test } from 'node:test';
import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import { registryFrom } from '../../src/lib/layout-registry.mjs';
import articleDirectives from '../../src/lib/remark-article-directives.mjs';
import remarkLayouts from '../../src/lib/remark-layouts.mjs';
import rehypeActions from '../../src/lib/rehype-actions.mjs';

// A small registry made from header comments, so these tests don't depend on the real layouts.
const registry = registryFrom({
  layouts: {
    quotes: '/* Quotes: short testimonials.\n   Options:\n     size = normal | large   (large is bigger) */',
    media: '/* Media: an image beside text.\n   Options:\n     image = left | right */',
  },
  behaviours: ['cycle'],
});
const processor = await createMarkdownProcessor({
  remarkPlugins: [[remarkLayouts, { registry, defaultHero: '/media/default.webp' }], articleDirectives],
  rehypePlugins: [rehypeActions],
});
// Pages get their title from front matter, which the hero uses (a page with no title gets no default hero).
const render = async (markdown, frontmatter = {}) => (await processor.render(markdown, { frontmatter })).code;

test('the fixture page gives the committed HTML', async () => {
  const html = await render(readFileSync(new URL('fixture.md', import.meta.url), 'utf8'), { title: 'Fixture page' });
  const expectedUrl = new URL('expected.html', import.meta.url);
  if (process.env.UPDATE) writeFileSync(expectedUrl, html + '\n');
  assert.equal(html + '\n', readFileSync(expectedUrl, 'utf8'));
});

const failures = [
  ['a setext heading', '---\nText\n---\nMore', 'Put a blank line before `---`'],
  ['a level-one heading outside the hero', '---\n# Title', 'A `#` heading is only for the hero'],
  ['a level-one heading in a later section', '---\n::hero\n\n![](/a.webp)\n\n# Own\n\n---\n# Title', 'A `#` heading is only for the hero'],
  ['::hero not in the first section', '---\nText\n\n---\n::hero\n\n![](/a.webp)', '`::hero` is only for the first section'],
  ['::hero not first in its section', '---\nText\n\n::hero\n', 'must be the first line of a section'],
  ['several hero pictures without images', '---\n::hero\n\n- ![](/a.webp)\n- ![](/b.webp)', 'need `images="cycle"`'],
  ['two picture groups in a hero', '---\n::hero\n\n![](/a.webp)\n\n![](/b.webp)', 'one list of pictures'],
  ['an unknown hero setting', '---\n::hero{palette="blue"}\n\n![](/a.webp)', 'no setting "palette"'],
  ['an unknown images behaviour in a section', '---\n::section{images="spin"}\n\nx', 'Unknown images "spin"'],
  ['a bad aspect', '---\n::section{aspect="wide"}\n\nx', 'must be two numbers with a slash'],
  ['an unknown section width', '---\n::section{width="huge"}\n\nx', 'Unknown width "huge"'],
  ['a :focus not after a picture', '---\nText :focus{at="50% 50%"}', '`:focus{…}` goes right after a picture'],
  ['a :focus with bad numbers', '---\n![](/a.webp) :focus{at="50 50"}', 'two percentages'],
  ['a :focus over 100%', '---\n![](/a.webp) :focus{at="150% 50%"}', 'two percentages'],
  ['a :focus with no at', '---\n![](/a.webp) :focus', 'two percentages'],
  ['--- inside a list', '- one\n\n  ---\n\n  two\n\n---\nx', '`---` only splits sections and layout items.'],
  ['--- inside an accordion', ':::accordion\n- Q\n\n  ---\n\n  A\n:::\n\n---\nx', '`---` only splits sections and layout items.'],
  ['--- inside a blockquote', '> a\n>\n> ---\n\n---\nx', '`---` only splits sections and layout items.'],
  ['::section not first', '---\nText\n\n::section{palette="blue"}\n', 'must be the first line of a section'],
  ['an unknown section setting', '---\n::section{colour="blue"}\nText', 'no setting "colour"'],
  ['an unknown palette', '---\n::section{palette="pink"}\nText', 'Unknown palette "pink"'],
  ['an unknown text width', '---\n::section{text="huge"}\nText', 'Unknown text "huge"'],
  ['an unknown ::name', '---\n::sparkle\nText', 'Unknown `::sparkle`'],
  ['the old :::section', '---\nx\n\n:::section{palette="blue"}\nText\n:::', 'A section now starts with `---`'],
  ['the old :::banner', '---\nx\n\n:::banner\nText\n:::', 'A banner is now'],
  ['the old :::column', '---\nx\n\n:::column\nText\n:::', 'Columns are now items'],
  ['the old :::lead', '---\nx\n\n:::lead\nText\n:::', '`:::lead` is now'],
  ['layout="…"', '---\nx\n\n:::quotes{layout="media"}\n- a\n:::', '`layout="…"` is gone'],
  ['an unknown :::name', '---\nx\n\n:::sparkle\n- a\n:::', 'The layouts are: media, quotes.'],
  ['an unknown option', '---\nx\n\n:::quotes{colour="red"}\n- a\n:::', 'no setting "colour"'],
  ['an unknown option value', '---\nx\n\n:::quotes{size="huge"}\n- a\n:::', 'Unknown size "huge"'],
  ['an unknown behaviour', '---\nx\n\n:::quotes{images="spin"}\n- a\n:::', 'Unknown images "spin"'],
  ['a list followed by a paragraph', '---\nx\n\n:::quotes\n- a\n- b\n\nfell out\n:::', 'If a paragraph fell out of the list'],
  ['an empty image', '---\nx\n\n![]()', 'Use `::no-background`.'],
  ['an empty image in a layout', '---\nx\n\n:::quotes\n- ![]()\n:::', 'Use `::no-background`.'],
  ['::no-background not first in an item', '---\nx\n\n:::quotes\n---\nText\n\n::no-background\n:::', '`::no-background` only goes first'],
  ['::no-background outside a layout', '---\nx\n\n::no-background\n', '`::no-background` only goes first'],
  ['an empty layout block', '---\nx\n\n:::quotes\n:::', 'is empty'],
];
for (const [name, markdown, message] of failures) {
  test(`fails on ${name}`, async () => {
    await assert.rejects(render(markdown), error => {
      assert.ok(String(error.message).includes(message), `Expected "${message}" in: ${error.message}`);
      return true;
    });
  });
}

// The hero: written under ::hero as the page's first section, or made from the defaults.
const heroOf = html => html.match(/<header class="hero[\s\S]*?<\/header>/)?.[0];
const hero = async (markdown, frontmatter = { title: 'Give' }) => heroOf(await render(markdown, frontmatter));

test('a page with no ::hero gets the default picture and its title', async () => {
  const html = await hero('---\n::section\n\nText');
  assert.match(html, /<img src="\/media\/default.webp"/);
  assert.match(html, /<h1[^>]*>Give<\/h1>/);
});

test('a hero with its own # heading uses it, not the title', async () => {
  const html = await hero('---\n::hero\n\n![](/a.webp)\n\n# A quote\n\nSubtitle\n\n**[Go](/go)**');
  assert.match(html, /<h1[^>]*>A quote<\/h1><p>Subtitle<\/p><p class="actions">/);
  assert.doesNotMatch(html, />Give</);
});

test('a hero without a # heading gets the title as h1, above its other text', async () => {
  const html = await hero('---\n::hero\n\n![](/a.webp)\n\nSubtitle');
  assert.match(html, /<h1[^>]*>Give<\/h1><p>Subtitle<\/p>/);
});

test('a picture list in a hero is one cycling figure, with focus per picture', async () => {
  const html = await hero('---\n::hero{images="cycle" aspect="3/2"}\n\n- ![](/a.webp)\n- ![](/b.webp) :focus{at="53% 39%"}\n- ![](/c.webp):focus{at="10.5% 90%"}');
  assert.match(html, /<header class="hero photo-backdrop" data-palette="navy" style="--images: cycle; aspect-ratio: 3 \/ 2">/);
  assert.match(html, /<figure class="layout-figure" style="--image-count: 3">/);
  assert.match(html, /<img src="\/a.webp" alt="" fetchpriority="high" style="--i: 0">/);
  assert.match(html, /style="object-position: 53% 39%; --i: 1"/);
  assert.match(html, /style="object-position: 10.5% 90%; --i: 2"/);
});

test('focus with and without a space after the picture', async () => {
  for (const focus of [' :focus{at="20% 30%"}', ':focus{at="20% 30%"}']) {
    const html = await hero(`---\n::hero\n\n![](/a.webp)${focus}`);
    assert.match(html, /style="object-position: 20% 30%; --i: 0"/);
  }
});

test('a section can hold a cycling, shaped, full-bleed figure', async () => {
  const html = await render('---\n::section{width="full-bleed" aspect="7/5" images="cycle"}\n\n- ![](/a.webp)\n- ![](/b.webp)');
  assert.match(html, /<section class="section-outer" data-width="full-bleed" style="--images: cycle">/);
  assert.match(html, /<figure class="layout-figure" data-aspect="7\/5" style="--image-count: 2; aspect-ratio: 7 \/ 5">/);
});

test('a picture list inside a layout block is still the list of items', async () => {
  const html = await render('---\n::section\n\n:::quotes\n- ![](/a.webp)\n- ![](/b.webp)\n:::');
  assert.equal(html.match(/<li class="layout-item"/g).length, 2);
});

test('a layout item can hold a list of pictures as one figure', async () => {
  const html = await render('---\n::section\n\n:::quotes\n---\n- ![](/a.webp)\n- ![](/b.webp)\n\nText\n:::');
  assert.match(html, /<figure class="layout-figure" style="--image-count: 2">/);
});

test('a layout file cannot take a reserved name', () => {
  assert.throws(() => registryFrom({ layouts: { banner: '/* x */' } }), /already used/);
  assert.throws(() => registryFrom({ layouts: { Fancy: '/* x */' } }), /lower-case letters/);
});
