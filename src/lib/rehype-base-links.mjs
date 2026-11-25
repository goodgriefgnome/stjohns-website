import { visit } from 'unist-util-visit';
import { addBase } from './base-path.mjs';

const urlAttributes = ['href', 'src', 'poster'];

// Adds the site's base folder to root links and images in Markdown and MDX.
export default function rehypeBaseLinks({ base = '/' } = {}) {
  return tree => {
    if (base === '/') return;
    visit(tree, node => {
      if (node.type === 'element') {
        for (const name of urlAttributes) {
          if (name in node.properties) node.properties[name] = addBase(base, node.properties[name]);
        }
      } else if (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') {
        for (const attribute of node.attributes) {
          if (urlAttributes.includes(attribute.name)) attribute.value = addBase(base, attribute.value);
        }
      }
    });
  };
}
