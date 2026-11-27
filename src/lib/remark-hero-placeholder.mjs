// Gives the hero's first picture a tiny blurred copy of itself (see hero-placeholder.mjs) as its background.
import { placeholderFor } from './hero-placeholder.mjs';

export default function remarkHeroPlaceholder() {
  return async tree => {
    const hero = tree.children.find(node => node.type === 'hero');
    const image = hero?.children[0]?.children?.[0];
    if (!image?.url) return;
    const props = image.data?.hProperties ?? {};
    const at = /object-position:\s*([^;]+)/.exec(props.style ?? '')?.[1];
    const style = [props.style, `--placeholder: ${await placeholderFor(image.url)}`, at && `--placeholder-at: ${at}`].filter(Boolean).join('; ');
    image.data = { ...image.data, hProperties: { ...props, style } };
  };
}
