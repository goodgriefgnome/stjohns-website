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
  remarkPlugins: [articleDirectives, [remarkLayouts, { registry }]],
  rehypePlugins: [rehypeActions],
});
const render = async markdown => (await processor.render(markdown)).code;

test('the fixture page gives the committed HTML', async () => {
  const html = await render(readFileSync(new URL('fixture.md', import.meta.url), 'utf8'));
  const expectedUrl = new URL('expected.html', import.meta.url);
  if (process.env.UPDATE) writeFileSync(expectedUrl, html + '\n');
  assert.equal(html + '\n', readFileSync(expectedUrl, 'utf8'));
});

const failures = [
  ['a setext heading', '---\nText\n---\nMore', 'Put a blank line before `---`'],
  ['a level-one heading', '---\n# Title', 'The page title is the only level-one heading'],
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

test('a layout file cannot take a reserved name', () => {
  assert.throws(() => registryFrom({ layouts: { banner: '/* x */' } }), /already used/);
  assert.throws(() => registryFrom({ layouts: { Fancy: '/* x */' } }), /lower-case letters/);
});
