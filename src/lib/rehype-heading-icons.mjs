import { visit } from 'unist-util-visit';

// One emoji (with any variation selector or ZWJ sequence) followed by a space.
const leadingEmoji = /^(\p{Extended_Pictographic}️?(?:‍\p{Extended_Pictographic}️?)*)\s+/u;

// Turns `### 🍞 Food` into an icon above the heading text, so authors add
// icons by typing an emoji. The emoji moves into a data attribute that CSS
// draws, which keeps it out of the heading's text and its generated id.
export default function rehypeHeadingIcons() {
  return tree => {
    visit(tree, 'element', node => {
      if (!/^h[2-4]$/.test(node.tagName)) return;
      const first = node.children[0];
      if (first?.type !== 'text') return;
      const match = first.value.match(leadingEmoji);
      if (!match) return;
      first.value = first.value.slice(match[0].length);
      node.children.unshift({
        type: 'element',
        tagName: 'span',
        // Drop U+FE0F, which asks browsers for the colour emoji font.
        properties: { className: ['heading-icon'], dataIcon: match[1].replaceAll('\uFE0F', '') },
        children: [],
      });
    });
  };
}
