import { fab } from '@fortawesome/free-brands-svg-icons';
import { far } from '@fortawesome/free-regular-svg-icons';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { directiveFromMarkdown } from 'mdast-util-directive';
import { directive } from 'micromark-extension-directive';
import { markdownLineEndingOrSpace } from 'micromark-util-character';
import { SKIP, visit } from 'unist-util-visit';

const iconStyles = new Map([
  ['solid', new Map(Object.values(fas).map(({ iconName, icon }) => [iconName, icon]))],
  ['regular', new Map(Object.values(far).map(({ iconName, icon }) => [iconName, icon]))],
  ['brands', new Map(Object.values(fab).map(({ iconName, icon }) => [iconName, icon]))],
]);

export default function articleDirectives() {
  const data = this.data();
  const { flow, text } = directive();
  const colon = ':'.charCodeAt(0);
  const openBracket = '['.charCodeAt(0);
  const closeParen = ')'.charCodeAt(0);
  const inline = text[colon];
  (data.micromarkExtensions ??= []).push({
    flow,
    text: {
      [colon]: {
        ...inline,
        previous(code) {
          // A colon inside a reference like John 3:16 starts no directive.
          // An icon can start a link's text: [:icon[bell]](/x). A picture's :focus may follow its closing bracket.
          const atBoundary = code === null || markdownLineEndingOrSpace(code) || code === openBracket || code === closeParen;
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
      if (!icons) file.fail(`Unknown icon style "${style}". Choose solid, regular or brands.`, node);
      const icon = icons.get(label.value);
      if (!icon) file.fail(`Unknown Font Awesome ${style} icon "${label.value}".`, node);

      const [width, height, , , paths] = icon;
      const leadsHeading = parent.type === 'heading' && index === 0;
      const svg = {
        type: 'element',
        tagName: 'svg',
        properties: { viewBox: `0 0 ${width} ${height}`, focusable: 'false' },
        children: [paths].flat().map(d => ({
          type: 'element', tagName: 'path', properties: { d }, children: [],
        })),
      };
      const iconSpan = {
        type: 'element',
        tagName: 'span',
        properties: {
          className: ['icon', ...(leadsHeading ? ['icon-heading'] : []), ...(node.attributes && 'accent' in node.attributes ? ['icon-accent'] : [])],
          ariaHidden: 'true',
        },
        children: [svg],
      };
      // label="..." gives an icon-only link a name for screen readers: the icon stays hidden from them
      // and the label is read instead (it is hidden on screen).
      const accessibleName = node.attributes?.label;
      node.data = accessibleName
        ? {
            hName: 'span',
            hChildren: [iconSpan, {
              type: 'element',
              tagName: 'span',
              properties: { className: ['visually-hidden'] },
              children: [{ type: 'text', value: accessibleName }],
            }],
          }
        : { hName: iconSpan.tagName, hProperties: iconSpan.properties, hChildren: iconSpan.children };
    });

    visit(tree, 'containerDirective', node => {
      if (node.name === 'accordion') {
        const [list, ...extra] = node.children;
        if (list?.type !== 'list' || extra.length) {
          file.fail('An :::accordion holds one list and nothing else. If a paragraph fell out of the list, indent it under its item.', extra[0] ?? list ?? node);
        }
        node.data = { hName: 'div', hProperties: { className: ['accordion'] } };
        node.children = list.children.map(item => {
          const [title, ...body] = item.children;
          if (title?.type !== 'paragraph') file.fail('Each accordion item starts with its title as a paragraph.', item);
          if (!body.length) file.fail('Each accordion item needs body text, indented under its title.', item);
          return {
            type: 'containerDirective',
            name: 'accordion-item',
            data: { hName: 'details' },
            children: [{ type: 'paragraph', data: { hName: 'summary' }, children: title.children }, ...body],
          };
        });
      }

      if (node.name === 'center') {
        node.data = { hName: 'div', hProperties: { 'data-align': 'center' } };
      }
    });
  };
}
