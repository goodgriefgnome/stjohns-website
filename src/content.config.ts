import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { palettes } from '../theme/palettes.mjs';

const pages = defineCollection({
  loader: glob({ base: './content', pattern: ['*.{md,mdx}', '!README.md', '!_*'] }),
  schema: z.object({
    title: z.string().min(1),
    width: z.enum(['reading', 'standard']).default('reading'),
    // The hero is written in the page itself now (see content/README.md); say so if an old page still uses these.
    hero: z.never({ error: 'Write the hero in the page: a `---` section starting with `::hero` (see content/README.md).' }).optional(),
    heroFocus: z.never({ error: 'Use `:focus{at="x% y%"}` after the picture in the `::hero` section.' }).optional(),
    heroSubtitle: z.never({ error: 'Write the subtitle as a paragraph in the `::hero` section.' }).optional(),
    palette: z.enum(palettes).optional(),
  }),
});

// Files starting with _ are parts of the site (the footer), not pages of their own.
const parts = defineCollection({
  loader: glob({ base: './content', pattern: '_*.md' }),
});

export const collections = { pages, parts };
