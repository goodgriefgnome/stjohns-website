import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { palettes } from './lib/palettes.mjs';

const percent = z.number().min(0).max(100);

const pages = defineCollection({
  loader: glob({ base: './src/content/pages', pattern: '*.md' }),
  schema: z.object({
    title: z.string().min(1),
    width: z.enum(['reading', 'standard']).default('reading'),
    hero: z.string().min(1).optional(),
    heroFocus: z.tuple([percent, percent]).optional(),
    heroSubtitle: z.string().optional(),
    palette: z.enum(palettes).optional(),
  }),
});

export const collections = { pages };
