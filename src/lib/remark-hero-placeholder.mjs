// Notes which picture the hero shows first, so hero-placeholders.css can give it a blurred copy of itself.
// The copy is lined up with the picture's own :focus.
export default function remarkHeroPlaceholder() {
  return (tree, file) => {
    const hero = tree.children.find(node => node.type === 'hero');
    const image = hero?.children[0]?.children?.[0];
    if (!image?.url) return;
    const at = /object-position:\s*([^;]+)/.exec(image.data?.hProperties?.style ?? '')?.[1];
    const figure = hero.children[0].data.hProperties;
    if (at) figure.style = `${figure.style}; --placeholder-at: ${at}`;
    // Astro hands this back as part of the page's front matter (remarkPluginFrontmatter).
    file.data.astro.frontmatter.heroPicture = image.url;
  };
}
