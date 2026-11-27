// One small stylesheet holding a blurred copy of every hero's first picture. Every page loads it, and the browser keeps it,
// so after the first visit each page change has its blur ready before the photo arrives. Kept apart from the main styles,
// so that changing a photo doesn't make everyone download all the styles again.
import { getCollection, render } from 'astro:content';
import church from '../../imported/church.json';
import { placeholderFor } from '../lib/hero-placeholder.mjs';

export async function GET() {
  const pictures = new Set([church.defaultHero]);
  for (const page of await getCollection('pages')) {
    const { remarkPluginFrontmatter } = await render(page);
    if (remarkPluginFrontmatter.heroPicture) pictures.add(remarkPluginFrontmatter.heroPicture);
  }
  const rules = await Promise.all([...pictures].sort().map(async url =>
    `.hero figure:has(> img:first-child[src$="${url}"]) { --placeholder: ${await placeholderFor(url)}; }`));
  return new Response(`/* Made by the build from the hero pictures: see src/pages/hero-placeholders.css.ts */\n${rules.join('\n')}\n`,
    { headers: { 'Content-Type': 'text/css' } });
}
