import { far } from '@fortawesome/free-regular-svg-icons';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { directiveFromMarkdown } from 'mdast-util-directive';
import { directive } from 'micromark-extension-directive';
import { markdownLineEndingOrSpace } from 'micromark-util-character';
import { SKIP, visit } from 'unist-util-visit';
import { palettes } from './palettes.mjs';

const iconStyles = new Map([
  ['solid', new Map(Object.values(fas).map(({ iconName, icon }) => [iconName, icon]))],
  ['regular', new Map(Object.values(far).map(({ iconName, icon }) => [iconName, icon]))],
]);

export default function articleDirectives() {
  const data = this.data();
  const { flow, text } = directive();
  const colon = ':'.charCodeAt(0);
  const inline = text[colon];
  (data.micromarkExtensions ??= []).push({
    flow,
    text: {
      [colon]: {
        ...inline,
        previous(code) {
          // A colon inside a reference like John 3:16 starts no directive.
          const atBoundary = code === null || markdownLineEndingOrSpace(code);
          return atBoundary && inline.previous.call(this, code);
        },
      },
    },
  });
  (data.fromMarkdownExtensions ??= []).push(directiveFromMarkdown());

  return (tree, file) => {
    visit(tree, 'textDirective', (node, index, parent) => {
      if (node.name !== 'icon') {
        const { start, end } = node.position;
        parent.children[index] = {
          type: 'text',
          value: file.toString().slice(start.offset, end.offset),
        };
        return SKIP;
      }

      const [label] = node.children;
      if (node.children.length !== 1 || label?.type !== 'text') {
        file.fail('Use a Font Awesome icon name, such as :icon[credit-card].', node);
      }

      const style = node.attributes?.style ?? 'solid';
      const icons = iconStyles.get(style);
      if (!icons) file.fail(`Unknown icon style "${style}". Choose solid or regular.`, node);
      const icon = icons.get(label.value);
      if (!icon) file.fail(`Unknown Font Awesome ${style} icon "${label.value}".`, node);

      const [width, height, , , paths] = icon;
      const leadsHeading = parent.type === 'heading' && index === 0;
      node.data = {
        hName: 'span',
        hProperties: {
          className: ['icon', ...(leadsHeading ? ['icon-heading'] : [])],
          ariaHidden: 'true',
        },
        hChildren: [{
          type: 'element',
          tagName: 'svg',
          properties: { viewBox: `0 0 ${width} ${height}`, focusable: 'false' },
          children: [paths].flat().map(d => ({
            type: 'element', tagName: 'path', properties: { d }, children: [],
          })),
        }],
      };
    });

    let mediaCount = 0;
    visit(tree, 'containerDirective', node => {
      if (node.name === 'lead' || node.name === 'section') {
        const isLead = node.name === 'lead';
        const palette = node.attributes?.palette ?? (isLead ? 'navy' : 'cream');
        if (!palettes.includes(palette)) {
          file.fail(`Unknown palette "${palette}". Choose ${palettes.join(', ')}.`, node);
        }
        const alignment = node.attributes?.align;
        if (alignment !== undefined && alignment !== 'left' && alignment !== 'center') {
          file.fail(`Unknown alignment "${alignment}". Choose left or center.`, node);
        }
        // Cards are columns whose image fills the card behind the text.
        const isCards = node.name === 'section' && node.attributes?.layout === 'cards';
        if (node.name === 'section' && (node.attributes?.layout === 'columns' || isCards)) {
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
            data: {
              hName: 'div',
              hProperties: {
                className: [
                  'cols',
                  ...(isCards ? ['cards'] : []),
                ],
                style: `--column-count: ${columns.length}`,
              },
            },
            children: columns.map(children => {
              const [heading, ...body] = children;
              const hasHeading = !hasExplicitColumns && heading?.type === 'heading';
              return {
                type: 'containerDirective',
                name: 'column',
                data: { hName: 'div', hProperties: { className: [...(hasHeading ? ['col'] : []), ...(isCards ? ['photo-backdrop'] : [])] } },
                children: hasHeading ? [heading, {
                  type: 'containerDirective',
                  name: 'col-body',
                  data: { hName: 'div', hProperties: { className: ['col-body'] } },
                  children: body,
                }] : children,
              };
            }),
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
          node.children = [{
            type: 'containerDirective',
            name: 'media',
            data: { hName: 'div', hProperties: { className: ['media'], 'data-image': imageSide } },
            children: [
              { ...image, data: { hName: 'div', hProperties: { className: ['media-image'] } } },
              { type: 'containerDirective', name: 'media-body', data: { hName: 'div', hProperties: { className: ['media-body'] } }, children: node.children },
            ],
          }];
        }
        // Every band is two boxes: the outer one is measured, the inner one carries --band-size (see band.css).
        node.children = [{
          type: 'containerDirective',
          name: 'band-inner',
          data: { hName: 'div', hProperties: { className: ['band-inner'] } },
          children: node.children,
        }];
        node.data = {
          hName: isLead ? 'div' : 'section',
          hProperties: {
            className: [
              'band-outer',
              ...(isLead ? ['band-lead'] : []),
              ...(['columns', 'cards', 'media'].includes(node.attributes?.layout) ? ['band-wide'] : []),
              ...(isCards ? ['band-cards'] : []),
            ],
            'data-palette': palette,
            ...(alignment && { 'data-align': alignment }),
          },
        };
      }

      if (node.name === 'center') {
        node.data = { hName: 'div', hProperties: { className: ['band-center'] } };
      }

      if (node.name === 'gallery') {
        const images = node.children.flatMap(block => {
          if (block.type !== 'paragraph') file.fail('Use Markdown images inside :::gallery.', block);
          return block.children.filter(child => child.type !== 'text' || child.value.trim());
        });
        if (!images.length || images.some(image => image.type !== 'image')) {
          file.fail('Use Markdown images inside :::gallery.', node);
        }
        node.data = { hName: 'ul', hProperties: { className: ['gallery'], role: 'list' } };
        node.children = images.map(image => ({
          type: 'paragraph',
          data: { hName: 'li' },
          children: [image],
        }));
      }
    });
  };
}
