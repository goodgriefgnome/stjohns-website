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
        if (node.name === 'section' && node.attributes?.layout === 'columns') {
          const columns = [];
          const intro = [];
          const hasExplicitColumns = node.children.some(child => child.type === 'containerDirective' && child.name === 'column');
          for (const child of node.children) {
            if (child.type === 'containerDirective' && child.name === 'column') {
              columns.push(child.children);
              continue;
            }
            if (!hasExplicitColumns && child.type === 'heading' && child.depth === 3) columns.push([]);
            (columns.at(-1) ?? intro).push(child);
          }
          if (!columns.length) file.fail('Use :::column blocks or level-three headings to start columns.', node);
          node.children = [...intro, {
            type: 'containerDirective',
            name: 'column-grid',
            data: { hName: 'div', hProperties: { className: hasExplicitColumns ? ['section-columns', 'section-columns-explicit'] : ['section-columns'] } },
            children: columns.map(children => ({
              type: 'containerDirective',
              name: 'column',
              data: { hName: 'div' },
              children,
            })),
          }];
        }
        node.data = {
          hName: isLead ? 'div' : 'section',
          hProperties: {
            className: [
              'article-band',
              ...(isLead ? ['article-lead'] : []),
              ...(node.attributes?.layout === 'columns' ? ['article-band-wide'] : []),
            ],
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
