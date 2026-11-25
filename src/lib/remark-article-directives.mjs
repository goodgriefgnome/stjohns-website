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
    let mediaCount = 0;
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
        let imageSide;
        if (node.name === 'section' && node.attributes?.layout === 'media') {
          // As on the live site, alternating image rows start with the image on the right.
          const imageSides = ['right', 'left'];
          imageSide = node.attributes.image ?? imageSides[mediaCount % 2];
          if (!imageSides.includes(imageSide)) {
            file.fail(`Unknown image side "${imageSide}". Choose left or right.`, node);
          }
          mediaCount += 1;
          // The first paragraph that holds only an image becomes the side image.
          const imageIndex = node.children.findIndex(child =>
            child.type === 'paragraph' &&
            child.children.filter(inline => inline.type !== 'text' || inline.value.trim()).every(inline => inline.type === 'image') &&
            child.children.some(inline => inline.type === 'image'));
          if (imageIndex === -1) file.fail('Put a Markdown image on its own line inside a media section.', node);
          const [image] = node.children.splice(imageIndex, 1);
          node.children = [
            { ...image, data: { hName: 'div', hProperties: { className: ['media-image'] } } },
            { type: 'containerDirective', name: 'media-body', data: { hName: 'div', hProperties: { className: ['media-body'] } }, children: node.children },
          ];
        }
        node.data = {
          hName: isLead ? 'div' : 'section',
          hProperties: {
            className: [
              'article-band',
              ...(isLead ? ['article-lead'] : []),
              ...(['columns', 'media'].includes(node.attributes?.layout) ? ['article-band-wide'] : []),
              ...(imageSide ? ['article-media'] : []),
            ],
            'data-palette': palette,
            ...(imageSide && { 'data-image': imageSide }),
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
