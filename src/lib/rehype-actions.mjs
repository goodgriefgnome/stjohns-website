import { visit } from 'unist-util-visit';

const emphasis = new Set(['strong', 'em']);
const isBlank = node => node.type === 'text' && !node.value.trim();
const isEl = (node, names) => node.type === 'element' && names.has(node.tagName);
const only = (node, names) => {
  const kids = node.children.filter(child => !isBlank(child));
  return kids.length === 1 && isEl(kids[0], names) ? kids[0] : null;
};

// Finds the <a> and the emphasis kind from `<strong><a>` or `<a><strong>`.
function readAction(node) {
  if (!isEl(node, new Set(['strong', 'em', 'a']))) return null;
  if (node.tagName === 'a') {
    const inner = only(node, emphasis);
    return inner && { link: node, kind: inner.tagName, inner };
  }
  const link = only(node, new Set(['a']));
  return link && { link, kind: node.tagName };
}

// A paragraph holding nothing but `**[x](url)**` or `*[x](url)*` links becomes a
// row of action links: strong = filled button, em = bar link. Emphasised links
// in running prose are left alone.
export default function rehypeActions() {
  return tree => {
    visit(tree, 'element', node => {
      if (node.tagName !== 'p') return;
      const items = node.children.filter(child => !isBlank(child));
      if (!items.length) return;
      const actions = items.map(readAction);
      if (actions.some(action => !action)) return;
      node.properties = { ...node.properties, className: ['actions'] };
      node.children = actions.map(({ link, kind, inner }) => {
        if (inner) link.children = inner.children;
        link.properties = { ...link.properties, className: ['action', kind === 'strong' ? 'action-filled' : 'action-bar'] };
        return link;
      });
    });
  };
}
