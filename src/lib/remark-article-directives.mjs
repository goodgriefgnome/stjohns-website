import { directiveFromMarkdown } from 'mdast-util-directive';
import { directive } from 'micromark-extension-directive';
import { visit } from 'unist-util-visit';
import { palettes } from './palettes.mjs';

export default function articleDirectives() {
  const data = this.data();
  // Register block syntax only. Inline colons are used in verse references.
  (data.micromarkExtensions ??= []).push({ flow: directive().flow });
  (data.fromMarkdownExtensions ??= []).push(directiveFromMarkdown());

  return (tree, file) => {
    visit(tree, 'containerDirective', node => {
      if (node.name === 'lead' || node.name === 'section') {
        const isLead = node.name === 'lead';
        const palette = node.attributes?.palette ?? (isLead ? 'navy' : 'cream');
        if (!palettes.includes(palette)) {
          file.fail(`Unknown palette "${palette}". Choose ${palettes.join(', ')}.`, node);
        }
        node.data = {
          hName: isLead ? 'div' : 'section',
          hProperties: {
            className: isLead ? ['article-band', 'article-lead'] : ['article-band'],
            'data-palette': palette,
          },
        };
      }

      if (node.name === 'gallery') {
        const images = node.children.flatMap(block => {
          if (block.type !== 'paragraph') file.fail('Use Markdown images inside :::gallery.', block);
          return block.children.filter(child => child.type !== 'text' || child.value.trim());
        });
        if (!images.length || images.some(image => image.type !== 'image')) {
          file.fail('Use Markdown images inside :::gallery.', node);
        }
        node.data = { hName: 'ul', hProperties: { className: ['article-gallery'], role: 'list' } };
        node.children = images.map(image => ({
          type: 'paragraph',
          data: { hName: 'li' },
          children: [image],
        }));
      }
    });
  };
}
